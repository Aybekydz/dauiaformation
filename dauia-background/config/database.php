<?php
/**
 * config/database.php — Configuration BDD + utilitaires
 * 
 * Charge le .env, expose la connexion PDO et les constantes.
 */

// ── Charger le .env ──────────────────────────────────────────
function loadEnv(string $path): void {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!getenv($key)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

loadEnv(__DIR__ . '/../.env');

// ── Constantes applicatives ──────────────────────────────────
define('APP_ENV',       getenv('APP_ENV') ?: 'development');
define('APP_URL',       getenv('APP_URL') ?: 'http://localhost:8000');
define('FRONTEND_URL',  getenv('FRONTEND_URL') ?: 'http://localhost:3000');
define('APP_SECRET',    getenv('APP_SECRET') ?: 'CHANGEZ_MOI_EN_PRODUCTION');

// ── Base de données ──────────────────────────────────────────
define('DB_HOST',    getenv('DB_HOST') ?: 'localhost');
define('DB_PORT',    getenv('DB_PORT') ?: '3306');
define('DB_NAME',    getenv('DB_NAME') ?: 'dauia');
define('DB_USER',    getenv('DB_USER') ?: 'root');
define('DB_PASS',    getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ── Authentification ─────────────────────────────────────────
define('BCRYPT_COST',      12);
define('SESSION_LIFETIME',  86400 * 7);           // 7 jours
define('VERIFY_TOKEN_TTL',  86400);               // 24h pour vérifier l'email
define('RESET_TOKEN_TTL',   3600);                // 1h pour reset mot de passe
define('MAX_FAILED_LOGINS', 5);                   // Verrouillage après 5 échecs
define('LOCKOUT_DURATION',  900);                 // 15 min de verrouillage

// ── Emails Dauphine autorisés ────────────────────────────────
define('DAUPHINE_EMAIL_REGEX', '/^[a-zA-Z0-9._%+-]+@(dauphine\.psl\.eu|dauphine\.eu|dauphine\.psl\.fr)$/i');

// ── SMTP ─────────────────────────────────────────────────────
define('SMTP_HOST',       getenv('SMTP_HOST') ?: 'smtp.dauphine.psl.eu');
define('SMTP_PORT',       (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER',       getenv('SMTP_USER') ?: '');
define('SMTP_PASS',       getenv('SMTP_PASS') ?: '');
define('SMTP_FROM_NAME',  getenv('SMTP_FROM_NAME') ?: "DAU'IA");
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: 'noreply@dauphine.psl.eu');
define('SMTP_ENCRYPTION', getenv('SMTP_ENCRYPTION') ?: 'tls');

// ── Rate Limiting ────────────────────────────────────────────
define('RATE_LIMIT_REGISTER', (int)(getenv('RATE_LIMIT_REGISTER') ?: 5));
define('RATE_LIMIT_LOGIN',    (int)(getenv('RATE_LIMIT_LOGIN') ?: 10));
define('RATE_LIMIT_VERIFY',   (int)(getenv('RATE_LIMIT_VERIFY') ?: 10));
define('RATE_LIMIT_RESET',    (int)(getenv('RATE_LIMIT_RESET') ?: 5));

// ── CORS ─────────────────────────────────────────────────────
define('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dauia.com',
    'https://www.dauia.com',
]);

// ═══════════════════════════════════════════════════════════════
// Connexion PDO singleton
// ═══════════════════════════════════════════════════════════════

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
            );

            self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$instance;
    }
}

// ═══════════════════════════════════════════════════════════════
// Liste des modérateurs (chargée depuis moderators.json)
// ═══════════════════════════════════════════════════════════════

/**
 * Gère la liste des modérateurs depuis le fichier config/moderators.json.
 *
 * Structure attendue du JSON :
 *   { "moderators": ["email1@..."] }
 *
 * Logique de détermination du rôle à l'inscription :
 *   1. Si l'email figure dans "moderators" → rôle "moderateur"
 *   2. Sinon                               → rôle "etudiant" (défaut sécurisé)
 *
 * Le rôle n'est JAMAIS choisi par l'utilisateur côté client.
 */
class ModeratorList {
    /** @var array|null Cache des emails modérateurs (normalisés en minuscules) */
    private static ?array $moderators = null;

    private const FILE_PATH = __DIR__ . '/moderators.json';

    /**
     * Charge le fichier JSON et peuple le cache interne.
     * Appelé automatiquement au premier accès.
     */
    private static function load(): void {
        if (self::$moderators !== null) return;

        self::$moderators = [];

        if (!file_exists(self::FILE_PATH)) return;

        $json = json_decode(file_get_contents(self::FILE_PATH), true);
        if (!is_array($json)) return;

        if (isset($json['moderators']) && is_array($json['moderators'])) {
            self::$moderators = array_map('strtolower', $json['moderators']);
        }
    }

    /**
     * Retourne la liste des emails modérateurs
     */
    public static function getEmails(): array {
        self::load();
        return self::$moderators;
    }

    /**
     * Vérifie si un email est dans la liste des modérateurs
     */
    public static function isModerator(string $email): bool {
        self::load();
        return in_array(strtolower(trim($email)), self::$moderators, true);
    }

    /**
     * Détermine le rôle à attribuer pour un email donné.
     * moderateur si dans la liste, etudiant sinon.
     */
    public static function getRoleForEmail(string $email): string {
        self::load();
        $normalized = strtolower(trim($email));

        if (in_array($normalized, self::$moderators, true)) {
            return 'moderateur';
        }
        return 'etudiant';
    }

    /**
     * Force le rechargement (utile si le fichier change en runtime)
     */
    public static function reload(): void {
        self::$moderators = null;
    }
}
