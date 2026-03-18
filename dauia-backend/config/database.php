<?php
/**
 * config/database.php — Configuration base de données et constantes
 * 
 * ⚠️  EN PRODUCTION :
 * - Utilisez des variables d'environnement (pas de valeurs en dur)
 * - Activez les connexions SSL vers MySQL
 * - Changez le JWT_SECRET
 */

// ── Environnement ──
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_URL', getenv('APP_URL') ?: 'http://localhost:8000');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost:3000');

// ── Base de données ──
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'dauia');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ── Authentification ──
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'CHANGEZ_MOI_EN_PRODUCTION_64_chars_minimum_svp');
define('SESSION_LIFETIME', 86400 * 7); // 7 jours
define('BCRYPT_COST', 12);

// ── Emails Dauphine autorisés ──
// Regex pour valider les domaines Dauphine acceptés
define('DAUPHINE_EMAIL_REGEX', '/^[a-zA-Z0-9._%+-]+@(dauphine\.psl\.eu|dauphine\.eu|dauphine\.psl\.fr)$/i');

// ── CORS ──
define('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dauia.com',
    'https://www.dauia.com',
]);

/**
 * Connexion PDO singleton
 */
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
                // En production, activez les connexions SSL :
                // PDO::MYSQL_ATTR_SSL_CA => '/path/to/ca-cert.pem',
            ]);
        }
        return self::$instance;
    }
}
