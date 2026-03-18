-- ═══════════════════════════════════════════════════════════════
-- DAU'IA — Schéma de base de données MySQL
-- ═══════════════════════════════════════════════════════════════
-- 
-- Exécuter :
--   mysql -u root -p < schema.sql
--   (ou importer via phpMyAdmin)
--
-- RÔLES :
--   etudiant    → Suit les formations, progresse dans la timeline
--   enseignant  → Crée et gère SES propres formations
--   moderateur  → Crée des formations + gère TOUTES les formations
--
-- TABLES :
--   users            → Comptes (email @dauphine.psl.eu uniquement)
--   password_resets   → Tokens de réinitialisation mot de passe
--   courses          → Formations
--   course_tags      → Tags associés à une formation
--   course_steps     → Étapes de la timeline (vidéo / leçon / code)
--   enrollments      → Inscriptions étudiants
--   step_progress    → Progression par étape (étudiant)
--   user_sessions    → Sessions actives
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS dauia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dauia;


-- ─── USERS ───────────────────────────────────────────────────
-- email validé côté PHP : @dauphine.psl.eu, @dauphine.eu, @dauphine.psl.fr

CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('etudiant', 'enseignant', 'moderateur') 
                    NOT NULL DEFAULT 'etudiant',
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    verify_token    VARCHAR(64)     NULL,
    avatar_url      VARCHAR(500)    NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP       NULL,

    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;


-- ─── PASSWORD RESETS ─────────────────────────────────────────

CREATE TABLE password_resets (
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


-- ─── COURSES ─────────────────────────────────────────────────
-- created_by peut être un enseignant OU un modérateur

CREATE TABLE courses (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)    NOT NULL,
    subtitle    VARCHAR(300)    NULL,
    description TEXT            NULL,
    icon        VARCHAR(10)     NOT NULL DEFAULT '📘',
    level       ENUM('Débutant', 'Intermédiaire', 'Avancé', 
                     'Débutant → Intermédiaire', 'Intermédiaire → Avancé')
                NOT NULL DEFAULT 'Débutant',
    duration    VARCHAR(20)     NULL,
    is_published BOOLEAN        NOT NULL DEFAULT TRUE,
    created_by  INT UNSIGNED    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_published (is_published),
    INDEX idx_created_by (created_by),
    FULLTEXT idx_search (title, subtitle, description)
) ENGINE=InnoDB;


-- ─── COURSE TAGS ─────────────────────────────────────────────

CREATE TABLE course_tags (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   INT UNSIGNED    NOT NULL,
    tag         VARCHAR(50)     NOT NULL,

    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_course_tag (course_id, tag),
    INDEX idx_tag (tag)
) ENGINE=InnoDB;


-- ─── COURSE STEPS (TIMELINE) ────────────────────────────────
-- Chaque formation a une série d'étapes ordonnées.
-- 3 types : 'video', 'lesson', 'code'
--
-- video  → url YouTube dans le champ `url`
-- lesson → contenu texte dans `content`
-- code   → consigne dans `description`, code de départ dans `code`

CREATE TABLE course_steps (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   INT UNSIGNED    NOT NULL,
    sort_order  INT UNSIGNED    NOT NULL DEFAULT 0,
    step_type   ENUM('video', 'lesson', 'code') NOT NULL DEFAULT 'lesson',
    title       VARCHAR(200)    NOT NULL,
    url         VARCHAR(500)    NULL,
    content     TEXT            NULL,
    description TEXT            NULL,
    code        TEXT            NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_order (course_id, sort_order)
) ENGINE=InnoDB;


-- ─── ENROLLMENTS ─────────────────────────────────────────────

CREATE TABLE enrollments (
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


-- ─── STEP PROGRESS ──────────────────────────────────────────
-- Quand un étudiant marque une étape comme terminée

CREATE TABLE step_progress (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    step_id     INT UNSIGNED    NOT NULL,
    completed_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES course_steps(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_step (user_id, step_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;


-- ─── USER SESSIONS ───────────────────────────────────────────

CREATE TABLE user_sessions (
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


-- ═══════════════════════════════════════════════════════════════
-- COMPTES PAR DÉFAUT
-- ═══════════════════════════════════════════════════════════════
-- Mot de passe pour tous : "Dauphine2026!" (à changer en production)
-- Hash : password_hash("Dauphine2026!", PASSWORD_BCRYPT)

INSERT INTO users (name, email, password_hash, role, email_verified) VALUES
('Modérateur DAU''IA', 'admin@dauphine.psl.eu', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'moderateur', TRUE);

INSERT INTO users (name, email, password_hash, role, email_verified) VALUES
('Prof Test', 'prof.test@dauphine.psl.eu', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'enseignant', TRUE);

INSERT INTO users (name, email, password_hash, role, email_verified) VALUES
('Étudiant Test', 'etudiant.test@dauphine.psl.eu', 
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'etudiant', TRUE);


-- ═══════════════════════════════════════════════════════════════
-- FORMATION EXEMPLE
-- ═══════════════════════════════════════════════════════════════

INSERT INTO courses (title, subtitle, description, icon, level, duration, is_published, created_by) VALUES
('Python pour la Data Science', 
 'De zéro à Pandas', 
 'Apprenez Python et ses bibliothèques de data science. Manipulez, analysez et visualisez des données.',
 '🐍', 'Débutant', '12h', TRUE, 1);

INSERT INTO course_tags (course_id, tag) VALUES
(1, 'Python'), (1, 'Pandas'), (1, 'NumPy'), (1, 'Matplotlib');

-- Étape 1 : Vidéo
INSERT INTO course_steps (course_id, sort_order, step_type, title, url) VALUES
(1, 0, 'video', 'Introduction à Python', 'https://www.youtube.com/watch?v=kqtD5dpn9C8');

-- Étape 2 : Leçon texte
INSERT INTO course_steps (course_id, sort_order, step_type, title, content) VALUES
(1, 1, 'lesson', 'Variables et types de données', 
'En Python, une variable est un nom qui pointe vers une valeur en mémoire.\n\nLes types fondamentaux :\n- int : nombres entiers (42, -7)\n- float : nombres décimaux (3.14)\n- str : chaînes de caractères (\"Bonjour\")\n- bool : booléens (True, False)\n- list : listes [1, 2, 3]\n- dict : dictionnaires {\"clé\": \"valeur\"}\n\nPython est dynamiquement typé.');

-- Étape 3 : Exercice code
INSERT INTO course_steps (course_id, sort_order, step_type, title, description, code) VALUES
(1, 2, 'code', 'Premier script Python',
'Créez deux variables et affichez-les avec print().',
'# Créez vos variables ici\nnom = \"votre_nom\"\nage = 20\n\nprint(f\"Je m''appelle {nom} et j''ai {age} ans.\")');

-- Étape 4 : Leçon
INSERT INTO course_steps (course_id, sort_order, step_type, title, content) VALUES
(1, 3, 'lesson', 'Introduction à NumPy', 
'NumPy est LA bibliothèque de calcul numérique en Python.\n\nElle fournit :\n- ndarray : tableaux multidimensionnels rapides\n- Fonctions mathématiques vectorisées\n- Algèbre linéaire, statistiques\n\nImport : import numpy as np');

-- Étape 5 : Exercice code avancé
INSERT INTO course_steps (course_id, sort_order, step_type, title, description, code) VALUES
(1, 4, 'code', 'Régression linéaire avec SciPy',
'Reproduisez le graphique sélectivité vs niveau académique des prépas.',
'import matplotlib.pyplot as plt\nimport numpy as np\nfrom scipy import stats\n\nmoy_bac = np.array([17.75, 17.20, 17.80, 16.80, 16.50, 16.20])\ntaux = np.array([5, 6, 9, 12, 12, 20])\n\nslope, intercept, r, _, _ = stats.linregress(moy_bac, taux)\n\nplt.figure(figsize=(8, 5))\nplt.scatter(moy_bac, taux, c=\"#1a237e\", s=80, zorder=5)\nx_line = np.linspace(16, 18, 100)\nplt.plot(x_line, slope*x_line + intercept, \"r-\", lw=2)\nplt.xlabel(\"Moyenne Bac\")\nplt.ylabel(\"Taux accès (%)\")\nplt.title(f\"R² = {r**2:.3f}\")\nplt.grid(True, alpha=0.3)\nplt.tight_layout()\nplt.savefig(\"graphique.png\", dpi=150)\nprint(f\"R² = {r**2:.3f}\")\nplt.show()');


-- ═══════════════════════════════════════════════════════════════
-- VUES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_courses_overview AS
SELECT 
    c.*,
    u.name AS creator_name,
    u.role AS creator_role,
    COUNT(DISTINCT cs.id) AS step_count,
    COUNT(DISTINCT e.id) AS enrollment_count,
    GROUP_CONCAT(DISTINCT ct.tag ORDER BY ct.tag SEPARATOR ', ') AS tags_list
FROM courses c
LEFT JOIN users u ON c.created_by = u.id
LEFT JOIN course_steps cs ON cs.course_id = c.id
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
LEFT JOIN course_steps cs ON cs.course_id = c.id
LEFT JOIN step_progress sp ON sp.step_id = cs.id AND sp.user_id = e.user_id
GROUP BY e.user_id, e.course_id;


-- ═══════════════════════════════════════════════════════════════
-- PERMISSIONS (à implémenter côté PHP)
-- ═══════════════════════════════════════════════════════════════
--
--  ACTION                     | etudiant | enseignant | moderateur
-- ────────────────────────────|──────────|────────────|───────────
--  Voir les formations        |    ✓     |     ✓      |     ✓
--  S'inscrire / progresser    |    ✓     |     ✓      |     ✓
--  Accéder au Python Lab      |    ✓     |     ✓      |     ✓
--  Créer une formation        |    ✗     |     ✓      |     ✓
--  Modifier SES formations    |    ✗     |     ✓      |     ✓
--  Modifier TOUTES formations |    ✗     |     ✗      |     ✓
--  Supprimer TOUTES form.     |    ✗     |     ✗      |     ✓
--  Voir la colonne Auteur     |    ✗     |     ✗      |     ✓
-- ═══════════════════════════════════════════════════════════════
