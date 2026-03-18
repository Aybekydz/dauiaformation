<?php
/**
 * models/User.php — Modèle utilisateur
 * 
 * Gère : inscription, connexion, validation email Dauphine, sessions.
 */

require_once __DIR__ . '/../config/database.php';

class User {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Valide qu'un email est un email Dauphine autorisé
     */
    public static function isDauphineEmail(string $email): bool {
        return (bool) preg_match(DAUPHINE_EMAIL_REGEX, $email);
    }

    /**
     * Inscription d'un nouvel utilisateur
     * 
     * @throws InvalidArgumentException si les données sont invalides
     * @throws RuntimeException si l'email existe déjà
     */
    public function register(string $name, string $email, string $password): array {
        // ── Validations ──
        $name = trim($name);
        $email = strtolower(trim($email));

        if (empty($name) || strlen($name) < 2) {
            throw new InvalidArgumentException("Le nom doit contenir au moins 2 caractères.");
        }
        if (!self::isDauphineEmail($email)) {
            throw new InvalidArgumentException("Seules les adresses @dauphine.psl.eu sont acceptées.");
        }
        if (strlen($password) < 8) {
            throw new InvalidArgumentException("Le mot de passe doit contenir au moins 8 caractères.");
        }

        // ── Vérifier l'unicité ──
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            throw new RuntimeException("Un compte avec cet email existe déjà.");
        }

        // ── Créer l'utilisateur ──
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $verifyToken = bin2hex(random_bytes(32));

        $stmt = $this->db->prepare(
            "INSERT INTO users (name, email, password_hash, role, verify_token) 
             VALUES (?, ?, ?, 'student', ?)"
        );
        $stmt->execute([$name, $email, $hash, $verifyToken]);

        $userId = (int) $this->db->lastInsertId();

        // TODO: Envoyer un email de vérification avec $verifyToken

        return $this->getById($userId);
    }

    /**
     * Connexion
     * 
     * @return array{user: array, token: string}
     * @throws InvalidArgumentException si identifiants incorrects
     */
    public function login(string $email, string $password): array {
        $email = strtolower(trim($email));

        if (!self::isDauphineEmail($email)) {
            throw new InvalidArgumentException("Seules les adresses @dauphine.psl.eu sont acceptées.");
        }

        $stmt = $this->db->prepare(
            "SELECT id, name, email, password_hash, role, email_verified FROM users WHERE email = ?"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new InvalidArgumentException("Email ou mot de passe incorrect.");
        }

        // ── Mettre à jour last_login ──
        $this->db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([$user['id']]);

        // ── Créer une session ──
        $token = $this->createSession($user['id']);

        unset($user['password_hash']);
        return ['user' => $user, 'token' => $token];
    }

    /**
     * Créer un token de session
     */
    private function createSession(int $userId): string {
        // Nettoyer les sessions expirées
        $this->db->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()")->execute();

        $token = bin2hex(random_bytes(64));
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
            "SELECT u.id, u.name, u.email, u.role, u.email_verified, u.avatar_url
             FROM user_sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.token = ? AND s.expires_at > NOW()"
        );
        $stmt->execute([$token]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Déconnexion (supprimer la session)
     */
    public function logout(string $token): void {
        $this->db->prepare("DELETE FROM user_sessions WHERE token = ?")->execute([$token]);
    }

    /**
     * Récupérer un utilisateur par ID
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT id, name, email, role, email_verified, avatar_url, created_at 
             FROM users WHERE id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Promouvoir un utilisateur en admin
     */
    public function setRole(int $userId, string $role): void {
        if (!in_array($role, ['student', 'admin'])) {
            throw new InvalidArgumentException("Rôle invalide.");
        }
        $this->db->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$role, $userId]);
    }
}
