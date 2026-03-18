<?php
/**
 * models/Course.php — Modèle formations
 * 
 * CRUD complet : création, lecture, mise à jour, suppression.
 * Gère les modules et tags associés.
 */

require_once __DIR__ . '/../config/database.php';

class Course {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Créer une formation (admin uniquement)
     */
    public function create(array $data, int $adminId): array {
        $this->validate($data);

        $this->db->beginTransaction();
        try {
            // ── Insérer la formation ──
            $stmt = $this->db->prepare(
                "INSERT INTO courses (title, subtitle, description, icon, level, duration, is_published, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $data['title'],
                $data['subtitle'] ?? null,
                $data['description'] ?? null,
                $data['icon'] ?? '📘',
                $data['level'] ?? 'Débutant',
                $data['duration'] ?? null,
                $data['is_published'] ?? false,
                $adminId,
            ]);
            $courseId = (int) $this->db->lastInsertId();

            // ── Insérer les modules ──
            if (!empty($data['modules'])) {
                $this->saveModules($courseId, $data['modules']);
            }

            // ── Insérer les tags ──
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

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "UPDATE courses SET title=?, subtitle=?, description=?, icon=?, level=?, duration=?, is_published=?, updated_at=NOW()
                 WHERE id=?"
            );
            $stmt->execute([
                $data['title'],
                $data['subtitle'] ?? null,
                $data['description'] ?? null,
                $data['icon'] ?? '📘',
                $data['level'] ?? 'Débutant',
                $data['duration'] ?? null,
                $data['is_published'] ?? false,
                $id,
            ]);

            // ── Remplacer les modules ──
            $this->db->prepare("DELETE FROM course_modules WHERE course_id = ?")->execute([$id]);
            if (!empty($data['modules'])) {
                $this->saveModules($id, $data['modules']);
            }

            // ── Remplacer les tags ──
            $this->db->prepare("DELETE FROM course_tags WHERE course_id = ?")->execute([$id]);
            if (!empty($data['tags'])) {
                $this->saveTags($id, $data['tags']);
            }

            $this->db->commit();
            return $this->getById($id);
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Supprimer une formation
     */
    public function delete(int $id): void {
        // Les CASCADE dans le schéma SQL suppriment automatiquement
        // les modules, tags et inscriptions associés
        $this->db->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
    }

    /**
     * Récupérer une formation par ID avec modules et tags
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT c.*, u.name AS creator_name 
             FROM courses c 
             JOIN users u ON c.created_by = u.id 
             WHERE c.id = ?"
        );
        $stmt->execute([$id]);
        $course = $stmt->fetch();
        if (!$course) return null;

        $course['modules'] = $this->getModules($id);
        $course['tags'] = $this->getTags($id);
        return $course;
    }

    /**
     * Lister toutes les formations (avec filtres optionnels)
     * 
     * @param bool $publishedOnly - true pour le catalogue public
     */
    public function list(bool $publishedOnly = false, ?string $search = null): array {
        $sql = "SELECT c.*, u.name AS creator_name FROM courses c JOIN users u ON c.created_by = u.id";
        $params = [];
        $where = [];

        if ($publishedOnly) {
            $where[] = "c.is_published = 1";
        }
        if ($search) {
            $where[] = "MATCH(c.title, c.subtitle, c.description) AGAINST(? IN NATURAL LANGUAGE MODE)";
            $params[] = $search;
        }

        if ($where) $sql .= " WHERE " . implode(" AND ", $where);
        $sql .= " ORDER BY c.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll();

        // Charger modules et tags pour chaque cours
        foreach ($courses as &$c) {
            $c['modules'] = $this->getModules($c['id']);
            $c['tags'] = $this->getTags($c['id']);
        }
        return $courses;
    }

    // ── Méthodes privées ──────────────────────────────────────

    private function validate(array $data): void {
        if (empty($data['title']) || strlen(trim($data['title'])) < 2) {
            throw new InvalidArgumentException("Le titre est requis (minimum 2 caractères).");
        }
    }

    private function saveModules(int $courseId, array $modules): void {
        $stmt = $this->db->prepare(
            "INSERT INTO course_modules (course_id, title, lesson_count, sort_order) VALUES (?, ?, ?, ?)"
        );
        foreach ($modules as $i => $m) {
            if (!empty($m['title'])) {
                $stmt->execute([
                    $courseId,
                    $m['title'],
                    (int) ($m['lessons'] ?? $m['lesson_count'] ?? 0),
                    $i,
                ]);
            }
        }
    }

    private function saveTags(int $courseId, array $tags): void {
        $stmt = $this->db->prepare("INSERT INTO course_tags (course_id, tag) VALUES (?, ?)");
        foreach ($tags as $tag) {
            $tag = trim($tag);
            if (!empty($tag)) {
                $stmt->execute([$courseId, $tag]);
            }
        }
    }

    private function getModules(int $courseId): array {
        $stmt = $this->db->prepare(
            "SELECT id, title, lesson_count, duration, sort_order 
             FROM course_modules WHERE course_id = ? ORDER BY sort_order"
        );
        $stmt->execute([$courseId]);
        return $stmt->fetchAll();
    }

    private function getTags(int $courseId): array {
        $stmt = $this->db->prepare("SELECT tag FROM course_tags WHERE course_id = ?");
        $stmt->execute([$courseId]);
        return array_column($stmt->fetchAll(), 'tag');
    }
}
