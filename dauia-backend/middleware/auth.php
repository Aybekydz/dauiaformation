<?php
/**
 * middleware/auth.php — Middleware d'authentification
 * 
 * Vérifie le token Bearer dans le header Authorization.
 * Expose deux fonctions :
 *   - requireAuth()     → bloque si non authentifié
 *   - requireAdmin()    → bloque si non admin
 */

require_once __DIR__ . '/../models/User.php';

/**
 * Extraire le token Bearer du header Authorization
 */
function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)$/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Authentifier l'utilisateur courant
 * 
 * @return array|null L'utilisateur ou null
 */
function getCurrentUser(): ?array {
    $token = getBearerToken();
    if (!$token) return null;

    $userModel = new User();
    return $userModel->getBySessionToken($token);
}

/**
 * Exiger une authentification — renvoie 401 si non connecté
 * 
 * @return array L'utilisateur authentifié
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentification requise.']);
        exit;
    }
    return $user;
}

/**
 * Exiger un rôle admin — renvoie 403 si non admin
 * 
 * @return array L'utilisateur admin
 */
function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès réservé aux administrateurs.']);
        exit;
    }
    return $user;
}
