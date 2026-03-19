<?php
/**
 * models/Course.php — Modèle formations
 * 
 * CRUD complet : création, lecture, mise à jour, suppression.
 * Gère les étapes (steps) et tags associés.
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
                (SELECT COUNT(*) FROM course_steps cs WHERE cs.course_id = c.id) AS step_count,
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
     * Récupérer une formation par ID (avec étapes et tags)
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

        $course['steps'] = $this->getSteps($id);
        $course['tags']  = $this->getTags($id);
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

            if (!empty($data['steps'])) {
                $this->saveSteps($courseId, $data['steps']);
            }
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

            // Remplacer les étapes si fournies
            if (isset($data['steps'])) {
                // Supprimer d'abord les progressions liées aux étapes
                $this->db->prepare(
                    "DELETE sp FROM step_progress sp 
                     JOIN course_steps cs ON sp.step_id = cs.id 
                     WHERE cs.course_id = ?"
                )->execute([$id]);
                $this->db->prepare("DELETE FROM course_steps WHERE course_id = ?")->execute([$id]);
                if (!empty($data['steps'])) {
                    $this->saveSteps($id, $data['steps']);
                }
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
     * Supprimer une formation (cascade sur steps, tags, enrollments, progress)
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
    // ÉTAPES (STEPS)
    // ═══════════════════════════════════════════════════════════

    private function getSteps(int $courseId): array {
        $stmt = $this->db->prepare(
            "SELECT id, sort_order, step_type, title, url, content, description, code
             FROM course_steps 
             WHERE course_id = ? 
             ORDER BY sort_order ASC"
        );
        $stmt->execute([$courseId]);
        return $stmt->fetchAll();
    }

    private function saveSteps(int $courseId, array $steps): void {
        $stmt = $this->db->prepare(
            "INSERT INTO course_steps (course_id, sort_order, step_type, title, url, content, description, code) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($steps as $i => $step) {
            $type = $step['step_type'] ?? $step['type'] ?? 'lesson';
            if (!in_array($type, ['video', 'lesson', 'code'])) $type = 'lesson';
            
            $stmt->execute([
                $courseId,
                $step['sort_order'] ?? $i,
                $type,
                $this->clean($step['title'] ?? "Étape " . ($i + 1)),
                $step['url'] ?? null,
                $step['content'] ?? null,
                $step['description'] ?? null,
                $step['code'] ?? null,
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
