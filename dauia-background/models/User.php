<?php
/**
 * models/User.php — Modèle utilisateur
 * 
 * Gère : inscription, connexion, vérification email, sessions, sécurité.
 * 
 * RÔLES :
 *   etudiant   → Rôle par défaut pour tout inscrit Dauphine
 *   moderateur → Attribué automatiquement si l'email est dans moderators.json
 * 
 * SÉCURITÉ :
 *   ✓ Validation email Dauphine stricte
 *   ✓ Bcrypt cost 12
 *   ✓ Token de vérification avec expiration (24h)
 *   ✓ Protection brute-force (verrouillage après 5 échecs)
 *   ✓ Sessions avec token opaque (128 hex chars)
 *   ✓ Nettoyage automatique des sessions expirées
 */

require_once __DIR__ . '/../config/database.php';

class User {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Valide qu'un email est un email Dauphine autorisé
     */
    public static function isDauphineEmail(string $email): bool {
        return (bool) preg_match(DAUPHINE_EMAIL_REGEX, $email);
    }

    /**
     * Valide la robustesse d'un mot de passe
     */
    public static function validatePassword(string $password): ?string {
        if (strlen($password) < 8) {
            return "Le mot de passe doit contenir au moins 8 caractères.";
        }
        if (!preg_match('/[A-Z]/', $password)) {
            return "Le mot de passe doit contenir au moins une majuscule.";
        }
        if (!preg_match('/[a-z]/', $password)) {
            return "Le mot de passe doit contenir au moins une minuscule.";
        }
        if (!preg_match('/[0-9]/', $password)) {
            return "Le mot de passe doit contenir au moins un chiffre.";
        }
        return null; // Valide
    }

    // ═══════════════════════════════════════════════════════════
    // INSCRIPTION
    // ═══════════════════════════════════════════════════════════

    /**
     * Inscription d'un nouvel utilisateur
     * 
     * Le rôle est déterminé automatiquement :
     *   → moderateur si l'email est dans config/moderators.json
     *   → etudiant sinon
     * 
     * Un token de vérification est généré (valable 24h).
     * L'utilisateur doit vérifier son email avant de pouvoir se connecter.
     * 
     * @return array L'utilisateur créé (sans password_hash)
     */
    public function register(string $name, string $email, string $password): array {
        // ── Nettoyage ──
        $name  = htmlspecialchars(trim($name), ENT_QUOTES, 'UTF-8');
        $email = strtolower(trim($email));

        // ── Validations ──
        if (empty($name) || mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            throw new InvalidArgumentException("Le nom doit contenir entre 2 et 100 caractères.");
        }

        if (!self::isDauphineEmail($email)) {
            throw new InvalidArgumentException(
                "Seules les adresses email Dauphine (@dauphine.psl.eu, @dauphine.eu, @dauphine.psl.fr) sont acceptées."
            );
        }

        $pwdError = self::validatePassword($password);
        if ($pwdError) {
            throw new InvalidArgumentException($pwdError);
        }

        // ── Vérifier l'unicité ──
        $stmt = $this->db->prepare("SELECT id, email_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            if (!$existing['email_verified']) {
                // Compte non vérifié existant → on le supprime pour permettre réinscription
                $this->db->prepare("DELETE FROM users WHERE id = ?")->execute([$existing['id']]);
            } else {
                throw new RuntimeException("Un compte avec cet email existe déjà.");
            }
        }

        // ── Déterminer le rôle ──
        $role = ModeratorList::getRoleForEmail($email);

        // ── Créer l'utilisateur ──
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $verifyToken = bin2hex(random_bytes(32)); // 64 chars hex
        $verifyExpires = date('Y-m-d H:i:s', time() + VERIFY_TOKEN_TTL);

        $stmt = $this->db->prepare(
            "INSERT INTO users (name, email, password_hash, role, verify_token, verify_token_expires) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$name, $email, $hash, $role, $verifyToken, $verifyExpires]);

        $userId = (int) $this->db->lastInsertId();

        // ── Envoyer l'email de vérification ──
        $this->sendVerificationEmail($email, $name, $verifyToken);

        return $this->getSafeUser($userId);
    }

    // ═══════════════════════════════════════════════════════════
    // VÉRIFICATION EMAIL
    // ═══════════════════════════════════════════════════════════

    /**
     * Vérifie l'email d'un utilisateur via le token reçu par mail
     */
    public function verifyEmail(string $token): array {
        if (empty($token) || strlen($token) !== 64) {
            throw new InvalidArgumentException("Token de vérification invalide.");
        }

        $stmt = $this->db->prepare(
            "SELECT id, name, email, verify_token_expires 
             FROM users 
             WHERE verify_token = ? AND email_verified = FALSE"
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new InvalidArgumentException("Token invalide ou déjà utilisé.");
        }

        // Vérifier l'expiration
        if (strtotime($user['verify_token_expires']) < time()) {
            throw new RuntimeException("Ce lien de vérification a expiré. Veuillez vous réinscrire.");
        }

        // ── Activer le compte ──
        $stmt = $this->db->prepare(
            "UPDATE users 
             SET email_verified = TRUE, verify_token = NULL, verify_token_expires = NULL 
             WHERE id = ?"
        );
        $stmt->execute([$user['id']]);

        return $this->getSafeUser($user['id']);
    }

    /**
     * Renvoyer un email de vérification
     */
    public function resendVerification(string $email): void {
        $email = strtolower(trim($email));

        $stmt = $this->db->prepare(
            "SELECT id, name, email_verified FROM users WHERE email = ?"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || $user['email_verified']) {
            // Ne pas révéler si le compte existe ou non
            return;
        }

        // Nouveau token
        $verifyToken = bin2hex(random_bytes(32));
        $verifyExpires = date('Y-m-d H:i:s', time() + VERIFY_TOKEN_TTL);

        $stmt = $this->db->prepare(
            "UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?"
        );
        $stmt->execute([$verifyToken, $verifyExpires, $user['id']]);

        $this->sendVerificationEmail($email, $user['name'], $verifyToken);
    }

    // ═══════════════════════════════════════════════════════════
    // CONNEXION
    // ═══════════════════════════════════════════════════════════

    /**
     * Connexion d'un utilisateur
     * 
     * @return array{user: array, token: string}
     */
    public function login(string $email, string $password): array {
        $email = strtolower(trim($email));

        if (!self::isDauphineEmail($email)) {
            throw new InvalidArgumentException("Seules les adresses email Dauphine sont acceptées.");
        }

        // ── Récupérer l'utilisateur ──
        $stmt = $this->db->prepare(
            "SELECT id, name, email, password_hash, role, email_verified, 
                    failed_login_count, locked_until
             FROM users WHERE email = ?"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Timing constant pour ne pas révéler l'existence du compte
            password_verify($password, '$2y$12$fakehashtopreventtimingattacks000000000000000000000');
            throw new InvalidArgumentException("Identifiants incorrects.");
        }

        // ── Vérifier le verrouillage ──
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            $remaining = ceil((strtotime($user['locked_until']) - time()) / 60);
            throw new RuntimeException(
                "Compte temporairement verrouillé. Réessayez dans {$remaining} minute(s)."
            );
        }

        // ── Vérifier le mot de passe ──
        if (!password_verify($password, $user['password_hash'])) {
            $this->incrementFailedLogin($user['id'], $user['failed_login_count']);
            throw new InvalidArgumentException("Identifiants incorrects.");
        }

        // ── Vérifier que l'email est validé ──
        if (!$user['email_verified']) {
            throw new RuntimeException(
                "Veuillez vérifier votre email avant de vous connecter. "
                . "Vérifiez votre boîte de réception (et spam)."
            );
        }

        // ── Reset des échecs de connexion ──
        $this->db->prepare(
            "UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?"
        )->execute([$user['id']]);

        // ── Synchroniser le rôle avec moderators.json ──
        $expectedRole = ModeratorList::getRoleForEmail($email);
        if ($user['role'] !== $expectedRole) {
            $this->db->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$expectedRole, $user['id']]);
            $user['role'] = $expectedRole;
        }

        // ── Créer une session ──
        $token = $this->createSession($user['id']);

        return [
            'user'  => $this->getSafeUser($user['id']),
            'token' => $token,
        ];
    }

    /**
     * Incrémenter les échecs de connexion et verrouiller si nécessaire
     */
    private function incrementFailedLogin(int $userId, int $currentFails): void {
        $newCount = $currentFails + 1;
        $lockedUntil = null;

        if ($newCount >= MAX_FAILED_LOGINS) {
            $lockedUntil = date('Y-m-d H:i:s', time() + LOCKOUT_DURATION);
            $newCount = 0; // Reset le compteur après verrouillage
        }

        $stmt = $this->db->prepare(
            "UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?"
        );
        $stmt->execute([$newCount, $lockedUntil, $userId]);
    }

    // ═══════════════════════════════════════════════════════════
    // SESSIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Créer un token de session
     */
    private function createSession(int $userId): string {
        // Nettoyer les sessions expirées (1 fois sur 10 pour la perf)
        if (random_int(1, 10) === 1) {
            $this->db->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()")->execute();
        }

        $token = bin2hex(random_bytes(64)); // 128 chars hex
        $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);

        $stmt = $this->db->prepare(
            "INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId,
            $token,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $expiresAt,
        ]);

        return $token;
    }

    /**
     * Valider un token de session et retourner l'utilisateur
     */
    public function getBySessionToken(string $token): ?array {
        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.role, u.email_verified, u.avatar_url, u.created_at
             FROM user_sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.token = ? AND s.expires_at > NOW()"
        );
        $stmt->execute([$token]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Déconnexion (supprime la session courante)
     */
    public function logout(string $token): void {
        $this->db->prepare("DELETE FROM user_sessions WHERE token = ?")->execute([$token]);
    }

    /**
     * Déconnexion totale (supprime toutes les sessions d'un user)
     */
    public function logoutAll(int $userId): void {
        $this->db->prepare("DELETE FROM user_sessions WHERE user_id = ?")->execute([$userId]);
    }

    // ═══════════════════════════════════════════════════════════
    // RESET MOT DE PASSE
    // ═══════════════════════════════════════════════════════════

    /**
     * Demander un reset de mot de passe
     */
    public function requestPasswordReset(string $email): void {
        $email = strtolower(trim($email));

        $stmt = $this->db->prepare("SELECT id, name FROM users WHERE email = ? AND email_verified = TRUE");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Même si le compte n'existe pas, on ne révèle rien
        if (!$user) return;

        // Invalider les anciens tokens
        $this->db->prepare(
            "UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE"
        )->execute([$user['id']]);

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + RESET_TOKEN_TTL);

        $stmt = $this->db->prepare(
            "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)"
        );
        $stmt->execute([$user['id'], $token, $expiresAt]);

        $this->sendPasswordResetEmail($email, $user['name'], $token);
    }

    /**
     * Réinitialiser le mot de passe avec un token
     */
    public function resetPassword(string $token, string $newPassword): void {
        $pwdError = self::validatePassword($newPassword);
        if ($pwdError) {
            throw new InvalidArgumentException($pwdError);
        }

        $stmt = $this->db->prepare(
            "SELECT pr.id AS reset_id, pr.user_id 
             FROM password_resets pr
             WHERE pr.token = ? AND pr.used = FALSE AND pr.expires_at > NOW()"
        );
        $stmt->execute([$token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            throw new InvalidArgumentException("Lien de réinitialisation invalide ou expiré.");
        }

        // ── Mettre à jour le mot de passe ──
        $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $reset['user_id']]);
            $this->db->prepare("UPDATE password_resets SET used = TRUE WHERE id = ?")->execute([$reset['reset_id']]);
            // Invalider toutes les sessions existantes
            $this->db->prepare("DELETE FROM user_sessions WHERE user_id = ?")->execute([$reset['user_id']]);
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════

    /**
     * Récupérer un utilisateur par ID (sans données sensibles)
     */
    public function getSafeUser(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT id, name, email, role, email_verified, avatar_url, created_at 
             FROM users WHERE id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Lister tous les utilisateurs (modérateurs uniquement)
     */
    public function listUsers(int $page = 1, int $perPage = 50): array {
        $offset = ($page - 1) * $perPage;
        
        $countStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE email_verified = TRUE");
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT id, name, email, role, email_verified, created_at, last_login_at 
             FROM users 
             WHERE email_verified = TRUE
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$perPage, $offset]);
        
        return [
            'users'    => $stmt->fetchAll(),
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // EMAILS
    // ═══════════════════════════════════════════════════════════

    /**
     * Envoyer l'email de vérification
     */
    private function sendVerificationEmail(string $email, string $name, string $token): void {
        $verifyUrl = FRONTEND_URL . '/verify-email?token=' . urlencode($token);
        
        $subject = "DAU'IA — Vérifiez votre adresse email";
        $htmlBody = $this->buildEmailTemplate(
            "Bienvenue sur DAU'IA, {$name} !",
            "Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous. Ce lien expire dans 24 heures.",
            $verifyUrl,
            "Vérifier mon email"
        );

        $this->sendEmail($email, $subject, $htmlBody);
    }

    /**
     * Envoyer l'email de reset mot de passe
     */
    private function sendPasswordResetEmail(string $email, string $name, string $token): void {
        $resetUrl = FRONTEND_URL . '/reset-password?token=' . urlencode($token);
        
        $subject = "DAU'IA — Réinitialisation de votre mot de passe";
        $htmlBody = $this->buildEmailTemplate(
            "Réinitialisation demandée",
            "Bonjour {$name}, vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous. Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.",
            $resetUrl,
            "Réinitialiser mon mot de passe"
        );

        $this->sendEmail($email, $subject, $htmlBody);
    }

    /**
     * Template HTML d'email
     */
    private function buildEmailTemplate(string $title, string $body, string $url, string $buttonText): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#1a237e,#3949ab);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">DAU'IA</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a237e;margin:0 0 16px;">{$title}</h2>
      <p style="color:#374151;line-height:1.6;margin:0 0 24px;">{$body}</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{$url}" style="background:#1a237e;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">{$buttonText}</a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">Si le bouton ne fonctionne pas, copiez ce lien :<br>
        <a href="{$url}" style="color:#3949ab;word-break:break-all;">{$url}</a>
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© DAU'IA — Université Paris-Dauphine PSL</p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    /**
     * Envoyer un email (dev → log, production → SMTP via PHPMailer ou mail() en fallback)
     */
    private function sendEmail(string $to, string $subject, string $htmlBody): void {
        // ── Développement : log au lieu d'envoyer ──
        if (APP_ENV === 'development') {
            $logDir = __DIR__ . '/../logs';
            if (!is_dir($logDir)) mkdir($logDir, 0755, true);
            $logFile = $logDir . '/emails.log';
            $logEntry = sprintf(
                "[%s] TO: %s | SUBJECT: %s\n%s\n%s\n",
                date('Y-m-d H:i:s'), $to, $subject,
                str_repeat('─', 60),
                strip_tags($htmlBody)
            );
            file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
            return;
        }

        // ── Production : envoi SMTP via PHPMailer ──
        if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            $this->sendWithPHPMailer($to, $subject, $htmlBody);
            return;
        }

        // ── Fallback : mail() natif avec headers ──
        error_log("[DAUIA] PHPMailer non installé — fallback sur mail(). Installez-le : composer require phpmailer/phpmailer");
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: =?UTF-8?B?' . base64_encode(SMTP_FROM_NAME) . '?= <' . SMTP_FROM_EMAIL . '>',
            'Reply-To: ' . SMTP_FROM_EMAIL,
            'X-Mailer: DAUIA-Platform/2.0',
        ];

        if (!mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $htmlBody, implode("\r\n", $headers))) {
            error_log("[DAUIA] Échec d'envoi d'email à {$to}");
        }
    }

    /**
     * Envoi SMTP authentifié via PHPMailer
     */
    private function sendWithPHPMailer(string $to, string $subject, string $htmlBody): void {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        try {
            // ── Configuration SMTP ──
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';

            if (!empty(SMTP_USER) && !empty(SMTP_PASS)) {
                $mail->SMTPAuth = true;
                $mail->Username = SMTP_USER;
                $mail->Password = SMTP_PASS;
            }

            if (SMTP_ENCRYPTION === 'tls') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } elseif (SMTP_ENCRYPTION === 'ssl') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            }

            // ── Expéditeur & destinataire ──
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($to);
            $mail->addReplyTo(SMTP_FROM_EMAIL, SMTP_FROM_NAME);

            // ── Contenu ──
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

            $mail->send();
        } catch (\PHPMailer\PHPMailer\Exception $e) {
            error_log("[DAUIA] Échec SMTP vers {$to} : " . $e->getMessage());
            // On ne throw pas pour ne pas bloquer l'inscription/reset
        }
    }
}
