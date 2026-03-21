-- ═══════════════════════════════════════════════════════════════
-- DAU'IA — Schéma de base de données MySQL (v3)
-- ═══════════════════════════════════════════════════════════════
--
-- Exécuter :
--   mysql -u root -p < schema.sql
--
-- RÔLES (2 uniquement) :
--   etudiant    → Tout étudiant Dauphine inscrit et vérifié
--   moderateur  → Gère la plateforme (liste configurable dans moderators.json)
--
-- SÉCURITÉ :
--   ✓ Emails @dauphine.psl.eu / @dauphine.eu / @dauphine.psl.fr uniquement
--   ✓ Vérification email obligatoire
--   ✓ Mots de passe hashés bcrypt (cost 12)
--   ✓ Tokens de session aléatoires (128 hex chars)
--   ✓ Rate limiting intégré
--   ✓ Protection brute-force (verrouillage temporaire)
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS dauia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dauia;


-- ─── USERS ───────────────────────────────────────────────────
-- Un email Dauphine = un compte, pas plus.
-- Le rôle est attribué automatiquement :
--   → moderateur si l'email est dans moderators.json
--   → etudiant sinon

CREATE TABLE IF NOT EXISTS users (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100)    NOT NULL,
    email               VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       VARCHAR(255)    NOT NULL,
    role                ENUM('etudiant', 'moderateur')
                        NOT NULL DEFAULT 'etudiant',

    -- Vérification email
    email_verified      BOOLEAN         NOT NULL DEFAULT FALSE,
    verify_token        VARCHAR(64)     NULL,
    verify_token_expires TIMESTAMP      NULL,

    -- Sécurité anti brute-force
    failed_login_count  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP       NULL,

    -- Métadonnées
    avatar_url          VARCHAR(500)    NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at       TIMESTAMP       NULL,

    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_verify_token (verify_token)
) ENGINE=InnoDB;


-- ─── USER SESSIONS ───────────────────────────────────────────
-- Sessions avec token opaque (pas de JWT côté client)

CREATE TABLE IF NOT EXISTS user_sessions (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    token       VARCHAR(128)    NOT NULL UNIQUE,
    ip_address  VARCHAR(45)     NULL,
    user_agent  VARCHAR(500)    NULL,
    expires_at  TIMESTAMP       NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;


-- ─── PASSWORD RESETS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_resets (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    token       VARCHAR(64)     NOT NULL UNIQUE,
    expires_at  TIMESTAMP       NOT NULL,
    used        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;


-- ─── RATE LIMITING ──────────────────────────────────────────
-- Protection contre l'abus d'API (inscription, login, etc.)

CREATE TABLE IF NOT EXISTS rate_limits (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address  VARCHAR(45)     NOT NULL,
    action      VARCHAR(50)     NOT NULL,
    attempts    INT UNSIGNED    NOT NULL DEFAULT 1,
    window_start TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_ip_action (ip_address, action),
    INDEX idx_window (window_start)
) ENGINE=InnoDB;


-- ─── COURSES (Formations) ────────────────────────────────────
-- Créées et gérées uniquement par les modérateurs

CREATE TABLE IF NOT EXISTS courses (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)    NOT NULL,
    subtitle    VARCHAR(300)    NULL,
    description TEXT            NULL,
    icon        VARCHAR(10)     NOT NULL DEFAULT '📘',
    level       ENUM('Débutant', 'Intermédiaire', 'Avancé',
                     'Débutant → Intermédiaire', 'Intermédiaire → Avancé')
                NOT NULL DEFAULT 'Débutant',
    duration    VARCHAR(20)     NULL,
    is_published BOOLEAN        NOT NULL DEFAULT FALSE,
    created_by  INT UNSIGNED    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_published (is_published),
    INDEX idx_created_by (created_by),
    FULLTEXT idx_search (title, subtitle, description)
) ENGINE=InnoDB;


-- ─── COURSE TAGS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_tags (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   INT UNSIGNED    NOT NULL,
    tag         VARCHAR(50)     NOT NULL,

    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_course_tag (course_id, tag),
    INDEX idx_tag (tag)
) ENGINE=InnoDB;


-- ─── COURSE MODULES (Chapitres) ─────────────────────────────
-- Un module regroupe plusieurs étapes au sein d'un cours.
-- Pont entre courses et course_steps.

CREATE TABLE IF NOT EXISTS course_modules (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   INT UNSIGNED    NOT NULL,
    sort_order  INT UNSIGNED    NOT NULL DEFAULT 0,
    title       VARCHAR(200)    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_order (course_id, sort_order)
) ENGINE=InnoDB;


-- ─── COURSE STEPS (Étapes) ──────────────────────────────────
-- Chaque module = une série d'étapes ordonnées
-- Types : video | lesson | code
--
-- Colonnes par type :
--   video  → url, transcription, resources
--   lesson → content
--   code   → description (consigne), code (départ), solution_code (correction)

CREATE TABLE IF NOT EXISTS course_steps (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id       INT UNSIGNED    NOT NULL,
    sort_order      INT UNSIGNED    NOT NULL DEFAULT 0,
    step_type       ENUM('video', 'lesson', 'code') NOT NULL DEFAULT 'lesson',
    title           VARCHAR(200)    NOT NULL,

    -- video
    url             VARCHAR(500)    NULL,
    transcription   TEXT            NULL,
    resources       TEXT            NULL,

    -- lesson
    content         TEXT            NULL,

    -- code
    description     TEXT            NULL,
    code            TEXT            NULL,
    solution_code   TEXT            NULL,

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    INDEX idx_module_order (module_id, sort_order)
) ENGINE=InnoDB;


-- ─── ENROLLMENTS (Inscriptions étudiants) ───────────────────

CREATE TABLE IF NOT EXISTS enrollments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    course_id       INT UNSIGNED    NOT NULL,
    status          ENUM('enrolled', 'in_progress', 'completed')
                    NOT NULL DEFAULT 'enrolled',
    enrolled_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP       NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_course (user_id, course_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;


-- ─── STEP PROGRESS (Progression par étape) ──────────────────

CREATE TABLE IF NOT EXISTS step_progress (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED    NOT NULL,
    step_id      INT UNSIGNED    NOT NULL,
    completed_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES course_steps(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_step (user_id, step_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;


-- ═══════════════════════════════════════════════════════════════
-- VUES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_courses_overview AS
SELECT
    c.*,
    u.name AS creator_name,
    COUNT(DISTINCT cs.id) AS step_count,
    COUNT(DISTINCT e.id) AS enrollment_count,
    GROUP_CONCAT(DISTINCT ct.tag ORDER BY ct.tag SEPARATOR ', ') AS tags_list
FROM courses c
LEFT JOIN users u ON c.created_by = u.id
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN course_steps cs ON cs.module_id = cm.id
LEFT JOIN enrollments e ON e.course_id = c.id
LEFT JOIN course_tags ct ON ct.course_id = c.id
GROUP BY c.id;

CREATE OR REPLACE VIEW v_student_progress AS
SELECT
    e.user_id,
    e.course_id,
    c.title AS course_title,
    COUNT(DISTINCT cs.id) AS total_steps,
    COUNT(DISTINCT sp.id) AS completed_steps,
    ROUND(
        CASE WHEN COUNT(DISTINCT cs.id) = 0 THEN 0
        ELSE COUNT(DISTINCT sp.id) / COUNT(DISTINCT cs.id) * 100
        END, 1
    ) AS progress_pct,
    e.status,
    e.enrolled_at
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN course_steps cs ON cs.module_id = cm.id
LEFT JOIN step_progress sp ON sp.step_id = cs.id AND sp.user_id = e.user_id
GROUP BY e.user_id, e.course_id;


-- ═══════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMO
-- ═══════════════════════════════════════════════════════════════
-- Mot de passe : "Dauphine2026!" → bcrypt hash
-- ⚠️ Changez en production

INSERT INTO users (name, email, password_hash, role, email_verified) VALUES
('Modérateur DAU''IA', 'admin@dauphine.psl.eu',
 '$2y$12$LJ3m4yS2J0k8G5g8t6U5/.QGv9xk7B2hE3zCdPyqp0wK1M3j8x5Hy',
 'moderateur', TRUE);

INSERT INTO users (name, email, password_hash, role, email_verified) VALUES
('Étudiant Test', 'etudiant.test@dauphine.psl.eu',
 '$2y$12$LJ3m4yS2J0k8G5g8t6U5/.QGv9xk7B2hE3zCdPyqp0wK1M3j8x5Hy',
 'etudiant', TRUE);

-- Formation exemple
INSERT INTO courses (title, subtitle, description, icon, level, duration, is_published, created_by) VALUES
('Python pour la Data Science',
 'De zéro à Pandas',
 'Apprenez Python et ses bibliothèques de data science. Manipulez, analysez et visualisez des données.',
 '🐍', 'Débutant', '12h', TRUE, 1);

INSERT INTO course_tags (course_id, tag) VALUES
(1, 'Python'), (1, 'Pandas'), (1, 'NumPy'), (1, 'Matplotlib');

-- Module exemple
INSERT INTO course_modules (course_id, sort_order, title) VALUES
(1, 0, 'Les bases de Python');

-- Étapes rattachées au module (module_id = 1)
INSERT INTO course_steps (module_id, sort_order, step_type, title, url) VALUES
(1, 0, 'video', 'Introduction à Python', 'https://www.youtube.com/watch?v=kqtD5dpn9C8');

INSERT INTO course_steps (module_id, sort_order, step_type, title, content) VALUES
(1, 1, 'lesson', 'Variables et types de données',
'En Python, une variable est un nom qui pointe vers une valeur en mémoire.\n\nLes types fondamentaux :\n- int : nombres entiers\n- float : nombres décimaux\n- str : chaînes de caractères\n- bool : booléens\n- list : listes\n- dict : dictionnaires');

INSERT INTO course_steps (module_id, sort_order, step_type, title, description, code) VALUES
(1, 2, 'code', 'Premier script Python',
'Créez deux variables et affichez-les avec print().',
'# Créez vos variables ici\nnom = "votre_nom"\nage = 20\n\nprint(f"Je m''appelle {nom} et j''ai {age} ans.")');


-- ═══════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════
--
--  ACTION                      | etudiant | moderateur
-- ─────────────────────────────|──────────|───────────
--  Voir formations publiées    |    ✓     |     ✓
--  S'inscrire / progresser     |    ✓     |     ✓
--  Créer une formation         |    ✗     |     ✓
--  Modifier toute formation    |    ✗     |     ✓
--  Supprimer toute formation   |    ✗     |     ✓
--  Gérer les utilisateurs      |    ✗     |     ✓
--  Synchroniser les rôles      |    ✗     |     ✓
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- NETTOYAGE AUTOMATIQUE (cron recommandé)
-- ═══════════════════════════════════════════════════════════════
--
--   DELETE FROM user_sessions WHERE expires_at < NOW();
--   DELETE FROM password_resets WHERE expires_at < NOW() OR used = TRUE;
--   DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR);
--   DELETE FROM users WHERE email_verified = FALSE AND verify_token_expires < NOW();
-- ═══════════════════════════════════════════════════════════════
