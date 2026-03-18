<?php
/**
 * api/index.php — Point d'entrée de l'API REST
 * 
 * ═══════════════════════════════════════════════════════════════
 * ENDPOINTS :
 * ═══════════════════════════════════════════════════════════════
 * 
 * AUTH :
 *   POST   /api/auth/register       → Inscription (email Dauphine)
 *   POST   /api/auth/login          → Connexion
 *   POST   /api/auth/logout         → Déconnexion
 *   GET    /api/auth/me             → Profil utilisateur courant
 * 
 * COURSES (public) :
 *   GET    /api/courses             → Liste des formations publiées
 *   GET    /api/courses/{id}        → Détail d'une formation
 * 
 * COURSES (admin) :
 *   GET    /api/admin/courses       → Toutes les formations (publiées ou non)
 *   POST   /api/admin/courses       → Créer une formation
 *   PUT    /api/admin/courses/{id}  → Modifier une formation
 *   DELETE /api/admin/courses/{id}  → Supprimer une formation
 * 
 * ═══════════════════════════════════════════════════════════════
 * LANCER EN DEV :
 *   php -S localhost:8000 -t api/
 * ═══════════════════════════════════════════════════════════════
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Course.php';
require_once __DIR__ . '/../middleware/auth.php';

// ── CORS ──
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, CORS_ALLOWED_ORIGINS)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

// ── Preflight ──
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Routing ──
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Supprimer le préfixe /api si présent
$uri = preg_replace('#^/api#', '', $uri);

/**
 * Helper : lire le body JSON
 */
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Corps de requête JSON invalide.']);
        exit;
    }
    return $data ?? [];
}

/**
 * Helper : réponse JSON
 */
function jsonResponse(mixed $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Helper : extraire un ID de l'URI
 * Ex: "/courses/42" → 42
 */
function extractId(string $uri, string $prefix): ?int {
    if (preg_match("#^{$prefix}/(\d+)$#", $uri, $m)) {
        return (int) $m[1];
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

try {

    // ─── AUTH ─────────────────────────────────────────────────

    if ($uri === '/auth/register' && $method === 'POST') {
        $data = getJsonBody();
        $user = new User();
        $result = $user->register(
            $data['name'] ?? '',
            $data['email'] ?? '',
            $data['password'] ?? ''
        );
        // Auto-login après inscription
        $login = $user->login($data['email'], $data['password']);
        jsonResponse($login, 201);
    }

    if ($uri === '/auth/login' && $method === 'POST') {
        $data = getJsonBody();
        $user = new User();
        $result = $user->login($data['email'] ?? '', $data['password'] ?? '');
        jsonResponse($result);
    }

    if ($uri === '/auth/logout' && $method === 'POST') {
        $token = getBearerToken();
        if ($token) {
            $user = new User();
            $user->logout($token);
        }
        jsonResponse(['message' => 'Déconnecté.']);
    }

    if ($uri === '/auth/me' && $method === 'GET') {
        $user = requireAuth();
        jsonResponse(['user' => $user]);
    }

    // ─── COURSES (PUBLIC) ────────────────────────────────────

    if ($uri === '/courses' && $method === 'GET') {
        $course = new Course();
        $search = $_GET['search'] ?? null;
        $list = $course->list(publishedOnly: true, search: $search);
        jsonResponse(['courses' => $list]);
    }

    $courseId = extractId($uri, '/courses');
    if ($courseId && $method === 'GET') {
        $course = new Course();
        $result = $course->getById($courseId);
        if (!$result || !$result['is_published']) {
            jsonResponse(['error' => 'Formation non trouvée.'], 404);
        }
        jsonResponse(['course' => $result]);
    }

    // ─── ADMIN: COURSES ──────────────────────────────────────

    if ($uri === '/admin/courses' && $method === 'GET') {
        $admin = requireAdmin();
        $course = new Course();
        $list = $course->list(publishedOnly: false);
        jsonResponse(['courses' => $list]);
    }

    if ($uri === '/admin/courses' && $method === 'POST') {
        $admin = requireAdmin();
        $data = getJsonBody();
        $course = new Course();
        $result = $course->create($data, $admin['id']);
        jsonResponse(['course' => $result], 201);
    }

    $adminCourseId = extractId($uri, '/admin/courses');
    if ($adminCourseId && $method === 'PUT') {
        $admin = requireAdmin();
        $data = getJsonBody();
        $course = new Course();
        $result = $course->update($adminCourseId, $data);
        jsonResponse(['course' => $result]);
    }

    if ($adminCourseId && $method === 'DELETE') {
        $admin = requireAdmin();
        $course = new Course();
        $course->delete($adminCourseId);
        jsonResponse(['message' => 'Formation supprimée.']);
    }

    // ─── 404 ─────────────────────────────────────────────────
    jsonResponse(['error' => 'Endpoint non trouvé.'], 404);

} catch (InvalidArgumentException $e) {
    jsonResponse(['error' => $e->getMessage()], 400);
} catch (RuntimeException $e) {
    jsonResponse(['error' => $e->getMessage()], 409);
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    jsonResponse(['error' => 'Erreur serveur. Veuillez réessayer.'], 500);
} catch (Throwable $e) {
    error_log("Unexpected error: " . $e->getMessage());
    if (APP_ENV === 'development') {
        jsonResponse(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
    }
    jsonResponse(['error' => 'Erreur interne du serveur.'], 500);
}
