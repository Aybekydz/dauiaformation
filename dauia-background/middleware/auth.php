<?php
/**
 * middleware/auth.php — Middleware d'authentification + rate limiting
 * 
 * Fonctions disponibles :
 *   getCurrentUser()     → Retourne l'user ou null
 *   requireAuth()        → Bloque 401 si non authentifié
 *   requireVerified()    → Bloque 403 si email non vérifié
 *   requireModerator()   → Bloque 403 si non modérateur
 *   checkRateLimit()     → Bloque 429 si trop de requêtes
 */

require_once __DIR__ . '/../models/User.php';

// ═══════════════════════════════════════════════════════════════
// AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Extraire le token Bearer du header Authorization
 */
function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
            ?? '';
    if (preg_match('/Bearer\s+([a-f0-9]{128})$/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Authentifier l'utilisateur courant (sans bloquer)
 */
function getCurrentUser(): ?array {
    $token = getBearerToken();
    if (!$token) return null;

    $userModel = new User();
    return $userModel->getBySessionToken($token);
}

/**
 * Exiger une authentification — renvoie 401 si non connecté
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        jsonResponse(401, ['error' => 'Authentification requise.']);
    }
    return $user;
}

/**
 * Exiger un email vérifié — renvoie 403 si non vérifié
 */
function requireVerified(): array {
    $user = requireAuth();
    if (!$user['email_verified']) {
        jsonResponse(403, ['error' => 'Veuillez vérifier votre email avant de continuer.']);
    }
    return $user;
}

/**
 * Exiger le rôle modérateur — renvoie 403 si étudiant
 */
function requireModerator(): array {
    $user = requireVerified();
    if ($user['role'] !== 'moderateur') {
        jsonResponse(403, ['error' => 'Accès réservé aux modérateurs.']);
    }
    return $user;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifier et incrémenter le rate limit pour une action
 * 
 * @param string $action   Identifiant de l'action (login, register, etc.)
 * @param int    $maxAttempts  Nombre max de tentatives
 * @param int    $windowSeconds  Fenêtre de temps en secondes (défaut 15 min)
 */
function checkRateLimit(string $action, int $maxAttempts, int $windowSeconds = 900): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $db = Database::getConnection();

    // Nettoyer les entrées périmées (1 fois sur 20)
    if (random_int(1, 20) === 1) {
        $db->prepare(
            "DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? SECOND)"
        )->execute([$windowSeconds]);
    }

    // Vérifier le compteur existant
    $stmt = $db->prepare(
        "SELECT attempts, window_start FROM rate_limits WHERE ip_address = ? AND action = ?"
    );
    $stmt->execute([$ip, $action]);
    $record = $stmt->fetch();

    if ($record) {
        $windowStart = strtotime($record['window_start']);
        
        // Fenêtre expirée → reset
        if (time() - $windowStart > $windowSeconds) {
            $db->prepare(
                "UPDATE rate_limits SET attempts = 1, window_start = NOW() WHERE ip_address = ? AND action = ?"
            )->execute([$ip, $action]);
            return;
        }

        // Trop de tentatives
        if ($record['attempts'] >= $maxAttempts) {
            $retryAfter = $windowSeconds - (time() - $windowStart);
            header("Retry-After: {$retryAfter}");
            jsonResponse(429, [
                'error' => "Trop de tentatives. Réessayez dans " . ceil($retryAfter / 60) . " minute(s).",
                'retry_after' => $retryAfter,
            ]);
        }

        // Incrémenter
        $db->prepare(
            "UPDATE rate_limits SET attempts = attempts + 1 WHERE ip_address = ? AND action = ?"
        )->execute([$ip, $action]);
    } else {
        // Première tentative
        $db->prepare(
            "INSERT INTO rate_limits (ip_address, action, attempts) VALUES (?, ?, 1)"
        )->execute([$ip, $action]);
    }
}

// ═══════════════════════════════════════════════════════════════
// CORS & SÉCURITÉ
// ═══════════════════════════════════════════════════════════════

/**
 * Configurer les headers CORS
 */
function setupCORS(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, CORS_ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Access-Control-Allow-Credentials: true");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 86400");
    
    // Headers de sécurité
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    header("X-XSS-Protection: 1; mode=block");
    header("Referrer-Policy: strict-origin-when-cross-origin");

    // Pré-vol OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Répondre en JSON et terminer
 */
function jsonResponse(int $status, array $data): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

/**
 * Lire le body JSON de la requête
 */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(400, ['error' => 'JSON invalide.']);
    }
    return $data;
}
