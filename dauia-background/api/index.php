<?php
/**
 * api/index.php — Routeur principal de l'API DAU'IA
 * 
 * Point d'entrée unique. Toutes les requêtes passent par ici.
 * 
 * ═══════════════════════════════════════════════════════════════
 * ENDPOINTS
 * ═══════════════════════════════════════════════════════════════
 * 
 * AUTH :
 *   POST   /api/auth/register            → Inscription (email Dauphine)
 *   POST   /api/auth/login               → Connexion
 *   POST   /api/auth/logout              → Déconnexion
 *   GET    /api/auth/verify?token=xxx    → Vérification email
 *   POST   /api/auth/resend-verify       → Renvoyer l'email de vérif.
 *   POST   /api/auth/forgot-password     → Demander un reset mdp
 *   POST   /api/auth/reset-password      → Réinitialiser le mdp
 *   GET    /api/auth/me                  → Profil utilisateur courant
 * 
 * COURSES (publiques, auth requise) :
 *   GET    /api/courses                  → Liste des formations publiées
 *   GET    /api/courses/tags             → Liste des tags disponibles
 *   GET    /api/courses/{id}             → Détail d'une formation
 * 
 * ENROLLMENTS (étudiants + modérateurs) :
 *   GET    /api/enrollments              → Mes inscriptions + progression
 *   POST   /api/enrollments              → S'inscrire à une formation
 *   GET    /api/enrollments/{courseId}    → Ma progression détaillée
 *   DELETE /api/enrollments/{courseId}    → Se désinscrire
 *   POST   /api/progress/{stepId}        → Marquer une étape comme faite
 *   DELETE /api/progress/{stepId}        → Annuler la complétion
 * 
 * ADMIN (modérateurs uniquement) :
 *   GET    /api/admin/stats              → Statistiques plateforme
 *   GET    /api/admin/users              → Liste des utilisateurs
 *   GET    /api/admin/moderators         → Voir la liste modérateurs
 *   POST   /api/admin/sync-roles         → Synchroniser moderators.json
 *   GET    /api/admin/courses            → Toutes les formations
 *   POST   /api/admin/courses            → Créer une formation
 *   PUT    /api/admin/courses/{id}       → Modifier une formation
 *   DELETE /api/admin/courses/{id}       → Supprimer une formation
 *   GET    /api/admin/courses/{id}/stats → Stats d'une formation
 * 
 * ═══════════════════════════════════════════════════════════════
 * Lancer en dev :
 *   php -S localhost:8000 api/index.php
 * ═══════════════════════════════════════════════════════════════
 */

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/Course.php';
require_once __DIR__ . '/../models/Enrollment.php';

// ── CORS + Sécurité ──
setupCORS();

// ── Routing ──
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = rtrim($uri, '/');

/**
 * Helper : extraire un ID numérique à la fin d'un prefix
 * Ex: "/api/courses/42" avec prefix "/api/courses" → 42
 */
function extractId(string $uri, string $prefix): ?int {
    if (preg_match("#^" . preg_quote($prefix, '#') . "/(\d+)$#", $uri, $m)) {
        return (int) $m[1];
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// Bloc try/catch global
// ═══════════════════════════════════════════════════════════════

try {

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

if ($method === 'POST' && $uri === '/api/auth/register') {
    checkRateLimit('register', RATE_LIMIT_REGISTER);
    $body = getJsonBody();
    $user = (new User())->register($body['name'] ?? '', $body['email'] ?? '', $body['password'] ?? '');
    jsonResponse(201, [
        'message' => 'Inscription réussie ! Vérifiez votre boîte email (et spam) pour activer votre compte.',
        'user'    => $user,
    ]);
}

if ($method === 'POST' && $uri === '/api/auth/login') {
    checkRateLimit('login', RATE_LIMIT_LOGIN);
    $body = getJsonBody();
    $result = (new User())->login($body['email'] ?? '', $body['password'] ?? '');
    jsonResponse(200, ['message' => 'Connexion réussie.', 'user' => $result['user'], 'token' => $result['token']]);
}

if ($method === 'POST' && $uri === '/api/auth/logout') {
    $token = getBearerToken();
    if ($token) (new User())->logout($token);
    jsonResponse(200, ['message' => 'Déconnexion réussie.']);
}

if ($method === 'GET' && $uri === '/api/auth/verify') {
    checkRateLimit('verify', RATE_LIMIT_VERIFY);
    $user = (new User())->verifyEmail($_GET['token'] ?? '');
    jsonResponse(200, ['message' => 'Email vérifié avec succès !', 'user' => $user]);
}

if ($method === 'POST' && $uri === '/api/auth/resend-verify') {
    checkRateLimit('verify', RATE_LIMIT_VERIFY);
    $body = getJsonBody();
    (new User())->resendVerification($body['email'] ?? '');
    jsonResponse(200, ['message' => 'Si un compte non vérifié existe, un nouveau lien a été envoyé.']);
}

if ($method === 'POST' && $uri === '/api/auth/forgot-password') {
    checkRateLimit('reset', RATE_LIMIT_RESET);
    $body = getJsonBody();
    (new User())->requestPasswordReset($body['email'] ?? '');
    jsonResponse(200, ['message' => 'Si un compte vérifié existe, un lien de réinitialisation a été envoyé.']);
}

if ($method === 'POST' && $uri === '/api/auth/reset-password') {
    checkRateLimit('reset', RATE_LIMIT_RESET);
    $body = getJsonBody();
    (new User())->resetPassword($body['token'] ?? '', $body['password'] ?? '');
    jsonResponse(200, ['message' => 'Mot de passe réinitialisé avec succès.']);
}

if ($method === 'GET' && $uri === '/api/auth/me') {
    jsonResponse(200, ['user' => requireVerified()]);
}


// ─────────────────────────────────────────────────────────────
// COURSES (publiques, utilisateur vérifié requis)
// ─────────────────────────────────────────────────────────────

if ($method === 'GET' && $uri === '/api/courses/tags') {
    requireVerified();
    jsonResponse(200, ['tags' => (new Course())->getAllTags()]);
}

if ($method === 'GET' && $uri === '/api/courses') {
    requireVerified();
    $courses = (new Course())->list(
        publishedOnly: true,
        search: $_GET['search'] ?? null,
        level:  $_GET['level']  ?? null,
        tag:    $_GET['tag']    ?? null
    );
    jsonResponse(200, ['courses' => $courses]);
}

$courseId = extractId($uri, '/api/courses');
if ($courseId && $method === 'GET') {
    requireVerified();
    $course = (new Course())->getById($courseId);
    if (!$course || !$course['is_published']) {
        jsonResponse(404, ['error' => 'Formation introuvable.']);
    }
    jsonResponse(200, ['course' => $course]);
}


// ─────────────────────────────────────────────────────────────
// ENROLLMENTS (étudiants + modérateurs, utilisateur vérifié)
// ─────────────────────────────────────────────────────────────

if ($method === 'GET' && $uri === '/api/enrollments') {
    $user = requireVerified();
    jsonResponse(200, ['enrollments' => (new Enrollment())->getUserEnrollments($user['id'])]);
}

if ($method === 'POST' && $uri === '/api/enrollments') {
    $user = requireVerified();
    $body = getJsonBody();
    $cid = (int)($body['course_id'] ?? 0);
    if ($cid <= 0) jsonResponse(400, ['error' => 'course_id requis.']);
    $enrollment = (new Enrollment())->enroll($user['id'], $cid);
    jsonResponse(201, ['message' => 'Inscription réussie !', 'enrollment' => $enrollment]);
}

$enrollCourseId = extractId($uri, '/api/enrollments');
if ($enrollCourseId && $method === 'GET') {
    $user = requireVerified();
    $enrollment = (new Enrollment())->getEnrollment($user['id'], $enrollCourseId);
    if (!$enrollment) jsonResponse(404, ['error' => 'Inscription introuvable.']);
    jsonResponse(200, ['enrollment' => $enrollment]);
}
if ($enrollCourseId && $method === 'DELETE') {
    $user = requireVerified();
    (new Enrollment())->unenroll($user['id'], $enrollCourseId);
    jsonResponse(200, ['message' => 'Désinscription effectuée.']);
}


// ─────────────────────────────────────────────────────────────
// PROGRESS (complétion d'étapes)
// ─────────────────────────────────────────────────────────────

$stepId = extractId($uri, '/api/progress');
if ($stepId && $method === 'POST') {
    $user = requireVerified();
    $enrollment = (new Enrollment())->completeStep($user['id'], $stepId);
    jsonResponse(200, ['message' => 'Étape complétée.', 'enrollment' => $enrollment]);
}
if ($stepId && $method === 'DELETE') {
    $user = requireVerified();
    $enrollment = (new Enrollment())->uncompleteStep($user['id'], $stepId);
    jsonResponse(200, ['message' => 'Complétion annulée.', 'enrollment' => $enrollment]);
}


// ─────────────────────────────────────────────────────────────
// ADMIN (modérateurs uniquement)
// ─────────────────────────────────────────────────────────────

if ($method === 'GET' && $uri === '/api/admin/stats') {
    requireModerator();
    jsonResponse(200, ['stats' => (new Enrollment())->getPlatformStats()]);
}

if ($method === 'GET' && $uri === '/api/admin/users') {
    requireModerator();
    jsonResponse(200, (new User())->listUsers(max(1, (int)($_GET['page'] ?? 1))));
}

if ($method === 'GET' && $uri === '/api/admin/moderators') {
    requireModerator();
    jsonResponse(200, ['moderators' => ModeratorList::getEmails()]);
}

if ($method === 'POST' && $uri === '/api/admin/sync-roles') {
    requireModerator();
    ModeratorList::reload();
    $db = Database::getConnection();
    $users = $db->query("SELECT id, email, role FROM users WHERE email_verified = TRUE")->fetchAll();
    
    $promoted = $demoted = $unchanged = 0;
    foreach ($users as $u) {
        $expected = ModeratorList::getRoleForEmail($u['email']);
        if ($u['role'] !== $expected) {
            $db->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$expected, $u['id']]);
            $expected === 'moderateur' ? $promoted++ : $demoted++;
        } else {
            $unchanged++;
        }
    }
    jsonResponse(200, ['message' => 'Synchronisation terminée.', 'promoted' => $promoted, 'demoted' => $demoted, 'unchanged' => $unchanged]);
}

if ($method === 'GET' && $uri === '/api/admin/courses') {
    requireModerator();
    $courses = (new Course())->list(
        publishedOnly: false,
        search: $_GET['search'] ?? null,
        level:  $_GET['level']  ?? null,
        tag:    $_GET['tag']    ?? null
    );
    jsonResponse(200, ['courses' => $courses]);
}

if ($method === 'POST' && $uri === '/api/admin/courses') {
    $mod = requireModerator();
    $course = (new Course())->create(getJsonBody(), $mod['id']);
    jsonResponse(201, ['message' => 'Formation créée.', 'course' => $course]);
}

// ── GET /api/admin/courses/{id}/stats ──
if (preg_match('#^/api/admin/courses/(\d+)/stats$#', $uri, $m) && $method === 'GET') {
    requireModerator();
    jsonResponse(200, ['stats' => (new Enrollment())->getCourseStats((int)$m[1])]);
}

$adminCourseId = extractId($uri, '/api/admin/courses');
if ($adminCourseId && $method === 'PUT') {
    requireModerator();
    $course = (new Course())->update($adminCourseId, getJsonBody());
    jsonResponse(200, ['message' => 'Formation mise à jour.', 'course' => $course]);
}
if ($adminCourseId && $method === 'DELETE') {
    requireModerator();
    (new Course())->delete($adminCourseId);
    jsonResponse(200, ['message' => 'Formation supprimée.']);
}
if ($adminCourseId && $method === 'GET') {
    requireModerator();
    $course = (new Course())->getById($adminCourseId);
    if (!$course) jsonResponse(404, ['error' => 'Formation introuvable.']);
    jsonResponse(200, ['course' => $course]);
}


// ─────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────

jsonResponse(404, ['error' => 'Endpoint introuvable.', 'path' => $uri, 'method' => $method]);


} catch (InvalidArgumentException $e) {
    jsonResponse(422, ['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    jsonResponse(409, ['error' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log("[DAUIA] DB: " . $e->getMessage());
    jsonResponse(500, ['error' => 'Erreur serveur. Veuillez réessayer.']);
} catch (Throwable $e) {
    error_log("[DAUIA] Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    if (APP_ENV === 'development') {
        jsonResponse(500, ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    }
    jsonResponse(500, ['error' => 'Erreur interne du serveur.']);
}
