<?php
/**
 * models/Course.php — Modèle formations
 *
 * CRUD complet : création, lecture, mise à jour, suppression.
 * Gère les modules (chapitres), étapes (steps) et tags associés.
 *
 * SCHÉMA : courses (1) → (N) course_modules (1) → (N) course_steps
 *
 * PERMISSIONS :
 *   Lecture (formations publiées)  → Tout utilisateur vérifié
 *   Création / modification        → Modérateurs uniquement
 *   Suppression                    → Modérateurs uniquement
 */

require_once __DIR__ . '/../config/database.php';

class Course {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // ═══════════════════════════════════════════════════════════
    // LECTURE
    // ═══════════════════════════════════════════════════════════

    /**
     * Lister les formations
     *
     * @param bool        $publishedOnly  true pour le catalogue public
     * @param string|null $search         Recherche fulltext
     * @param string|null $level          Filtre par niveau
     * @param string|null $tag            Filtre par tag
     */
    public function list(
        bool $publishedOnly = true,
        ?string $search = null,
        ?string $level = null,
        ?string $tag = null
    ): array {
        $sql = "SELECT DISTINCT c.*, u.name AS creator_name,
                (SELECT COUNT(*) FROM course_steps cs
                 JOIN course_modules cm ON cs.module_id = cm.id
                 WHERE cm.course_id = c.id) AS step_count,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
                FROM courses c
                JOIN users u ON c.created_by = u.id";
        $params = [];
        $where = [];

        if ($tag) {
            $sql .= " JOIN course_tags ct ON ct.course_id = c.id";
            $where[] = "ct.tag = ?";
            $params[] = $tag;
        }

        if ($publishedOnly) {
            $where[] = "c.is_published = 1";
        }
        if ($search) {
            $where[] = "MATCH(c.title, c.subtitle, c.description) AGAINST(? IN NATURAL LANGUAGE MODE)";
            $params[] = $search;
        }
        if ($level) {
            $where[] = "c.level = ?";
            $params[] = $level;
        }

        if ($where) $sql .= " WHERE " . implode(" AND ", $where);
        $sql .= " ORDER BY c.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll();

        // Charger les tags pour chaque cours
        foreach ($courses as &$c) {
            $c['tags'] = $this->getTags((int)$c['id']);
        }
        return $courses;
    }

    /**
     * Récupérer une formation par ID (avec modules, étapes et tags)
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT c.*, u.name AS creator_name,
                    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
             FROM courses c
             JOIN users u ON c.created_by = u.id
             WHERE c.id = ?"
        );
        $stmt->execute([$id]);
        $course = $stmt->fetch();
        if (!$course) return null;

        $course['modules'] = $this->getModules($id);
        $course['tags']    = $this->getTags($id);
        return $course;
    }

    /**
     * Récupérer tous les tags existants (pour les filtres)
     */
    public function getAllTags(): array {
        $stmt = $this->db->query(
            "SELECT tag, COUNT(*) AS course_count
             FROM course_tags
             GROUP BY tag
             ORDER BY course_count DESC, tag ASC"
        );
        return $stmt->fetchAll();
    }

    // ═══════════════════════════════════════════════════════════
    // ÉCRITURE (modérateurs uniquement)
    // ═══════════════════════════════════════════════════════════

    /**
     * Créer une formation
     */
    public function create(array $data, int $moderatorId): array {
        $this->validate($data);

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO courses (title, subtitle, description, icon, level, duration, is_published, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $this->clean($data['title']),
                $this->clean($data['subtitle'] ?? null),
                $data['description'] ?? null,
                $data['icon'] ?? '📘',
                $data['level'] ?? 'Débutant',
                $data['duration'] ?? null,
                (bool)($data['is_published'] ?? false),
                $moderatorId,
            ]);
            $courseId = (int) $this->db->lastInsertId();

            // Sauvegarder les modules (ou les steps en mode rétrocompat)
            $this->saveModulesOrFlatSteps($courseId, $data);

            if (!empty($data['tags'])) {
                $this->saveTags($courseId, $data['tags']);
            }

            $this->db->commit();
            return $this->getById($courseId);
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Mettre à jour une formation
     */
    public function update(int $id, array $data): array {
        $this->validate($data);

        // Vérifier que la formation existe
        $existing = $this->getById($id);
        if (!$existing) {
            throw new InvalidArgumentException("Formation introuvable.");
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "UPDATE courses
                 SET title=?, subtitle=?, description=?, icon=?, level=?, duration=?, is_published=?, updated_at=NOW()
                 WHERE id=?"
            );
            $stmt->execute([
                $this->clean($data['title']),
                $this->clean($data['subtitle'] ?? null),
                $data['description'] ?? null,
                $data['icon'] ?? '📘',
                $data['level'] ?? 'Débutant',
                $data['duration'] ?? null,
                (bool)($data['is_published'] ?? false),
                $id,
            ]);

            // Remplacer les modules/étapes si fournis
            if (isset($data['modules']) || isset($data['steps'])) {
                // Supprimer la progression liée aux étapes de ce cours
                // (jointure via course_modules puisque course_steps n'a plus de course_id)
                $this->db->prepare(
                    "DELETE sp FROM step_progress sp
                     JOIN course_steps cs ON sp.step_id = cs.id
                     JOIN course_modules cm ON cs.module_id = cm.id
                     WHERE cm.course_id = ?"
                )->execute([$id]);

                // ON DELETE CASCADE sur course_modules supprimera les course_steps associées
                $this->db->prepare("DELETE FROM course_modules WHERE course_id = ?")->execute([$id]);

                $this->saveModulesOrFlatSteps($id, $data);
            }

            // Remplacer les tags si fournis
            if (isset($data['tags'])) {
                $this->db->prepare("DELETE FROM course_tags WHERE course_id = ?")->execute([$id]);
                if (!empty($data['tags'])) {
                    $this->saveTags($id, $data['tags']);
                }
            }

            $this->db->commit();
            return $this->getById($id);
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Supprimer une formation (cascade sur modules, steps, tags, enrollments, progress)
     */
    public function delete(int $id): void {
        $stmt = $this->db->prepare("SELECT id FROM courses WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            throw new InvalidArgumentException("Formation introuvable.");
        }
        $this->db->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
    }

    // ═══════════════════════════════════════════════════════════
    // MODULES & ÉTAPES
    // ═══════════════════════════════════════════════════════════

    /**
     * Récupérer les modules d'un cours avec leurs étapes imbriquées
     */
    private function getModules(int $courseId): array {
        $stmtMod = $this->db->prepare(
            "SELECT id, sort_order, title, created_at
             FROM course_modules
             WHERE course_id = ?
             ORDER BY sort_order ASC"
        );
        $stmtMod->execute([$courseId]);
        $modules = $stmtMod->fetchAll();

        $stmtStep = $this->db->prepare(
            "SELECT id, sort_order, step_type, title, url, transcription, resources,
                    content, description, code, solution_code
             FROM course_steps
             WHERE module_id = ?
             ORDER BY sort_order ASC"
        );

        foreach ($modules as &$mod) {
            $stmtStep->execute([$mod['id']]);
            $mod['steps'] = $stmtStep->fetchAll();
        }

        return $modules;
    }

    /**
     * Sauvegarde les modules et étapes.
     *
     * RÉTROCOMPATIBILITÉ FRONT-END :
     * Le front-end actuel envoie un tableau plat "steps" sans "modules".
     * Si le JSON contient "steps" mais pas "modules", on crée automatiquement
     * un module par défaut ("Module 1", sort_order: 0) et on y rattache
     * toutes les steps reçues.
     * → À supprimer quand le front-end enverra directement des modules.
     */
    private function saveModulesOrFlatSteps(int $courseId, array $data): void {
        if (!empty($data['modules'])) {
            // ── Format natif : modules avec steps imbriquées ──
            foreach ($data['modules'] as $mi => $mod) {
                $moduleId = $this->insertModule($courseId, $mod, $mi);
                if (!empty($mod['steps'])) {
                    $this->saveSteps($moduleId, $mod['steps']);
                }
            }
        } elseif (!empty($data['steps'])) {
            // ── RÉTROCOMPAT : tableau plat "steps" sans "modules" ──
            // Crée un module par défaut pour y rattacher les étapes.
            // TODO: Supprimer ce bloc quand le front-end enverra des modules.
            $moduleId = $this->insertModule($courseId, ['title' => 'Module 1'], 0);
            $this->saveSteps($moduleId, $data['steps']);
        }
    }

    /**
     * Insérer un module et retourner son ID
     */
    private function insertModule(int $courseId, array $mod, int $defaultOrder): int {
        $stmt = $this->db->prepare(
            "INSERT INTO course_modules (course_id, sort_order, title) VALUES (?, ?, ?)"
        );
        $stmt->execute([
            $courseId,
            $mod['sort_order'] ?? $defaultOrder,
            $this->clean($mod['title'] ?? 'Module ' . ($defaultOrder + 1)),
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Insérer les étapes liées à un module
     */
    private function saveSteps(int $moduleId, array $steps): void {
        $stmt = $this->db->prepare(
            "INSERT INTO course_steps
                (module_id, sort_order, step_type, title, url, transcription, resources, content, description, code, solution_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($steps as $i => $step) {
            $type = $step['step_type'] ?? $step['type'] ?? 'lesson';
            if (!in_array($type, ['video', 'lesson', 'code'])) $type = 'lesson';

            $stmt->execute([
                $moduleId,
                $step['sort_order'] ?? $i,
                $type,
                $this->clean($step['title'] ?? "Étape " . ($i + 1)),
                $step['url'] ?? null,
                $step['transcription'] ?? null,
                $step['resources'] ?? null,
                $step['content'] ?? null,
                $step['description'] ?? null,
                $step['code'] ?? null,
                $step['solution_code'] ?? null,
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TAGS
    // ═══════════════════════════════════════════════════════════

    private function getTags(int $courseId): array {
        $stmt = $this->db->prepare("SELECT tag FROM course_tags WHERE course_id = ?");
        $stmt->execute([$courseId]);
        return array_column($stmt->fetchAll(), 'tag');
    }

    private function saveTags(int $courseId, array $tags): void {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO course_tags (course_id, tag) VALUES (?, ?)"
        );
        foreach ($tags as $tag) {
            $tag = trim($tag);
            if (!empty($tag) && mb_strlen($tag) <= 50) {
                $stmt->execute([$courseId, $this->clean($tag)]);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITAIRES
    // ═══════════════════════════════════════════════════════════

    private function validate(array $data): void {
        if (empty($data['title']) || mb_strlen(trim($data['title'])) < 2) {
            throw new InvalidArgumentException("Le titre est requis (minimum 2 caractères).");
        }
        if (mb_strlen($data['title']) > 200) {
            throw new InvalidArgumentException("Le titre ne peut pas dépasser 200 caractères.");
        }
    }

    private function clean(?string $value): ?string {
        if ($value === null) return null;
        return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
    }
}
