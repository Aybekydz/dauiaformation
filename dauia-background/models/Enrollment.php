<?php
/**
 * models/Enrollment.php — Inscriptions et progression étudiants
 * 
 * Gère :
 *   - Inscription à une formation
 *   - Marquage d'étapes comme complétées
 *   - Calcul de la progression
 *   - Désinscription
 * 
 * PERMISSIONS :
 *   Tout utilisateur vérifié peut s'inscrire et progresser.
 *   Les modérateurs voient les stats de tous les étudiants.
 */

require_once __DIR__ . '/../config/database.php';

class Enrollment {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // ═══════════════════════════════════════════════════════════
    // INSCRIPTION
    // ═══════════════════════════════════════════════════════════

    /**
     * S'inscrire à une formation
     */
    public function enroll(int $userId, int $courseId): array {
        // Vérifier que la formation existe et est publiée
        $stmt = $this->db->prepare(
            "SELECT id, title FROM courses WHERE id = ? AND is_published = TRUE"
        );
        $stmt->execute([$courseId]);
        $course = $stmt->fetch();

        if (!$course) {
            throw new InvalidArgumentException("Formation introuvable ou non publiée.");
        }

        // Vérifier que l'étudiant n'est pas déjà inscrit
        $stmt = $this->db->prepare(
            "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
        );
        $stmt->execute([$userId, $courseId]);
        if ($stmt->fetch()) {
            throw new RuntimeException("Vous êtes déjà inscrit à cette formation.");
        }

        $stmt = $this->db->prepare(
            "INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'enrolled')"
        );
        $stmt->execute([$userId, $courseId]);

        return $this->getEnrollment($userId, $courseId);
    }

    /**
     * Se désinscrire d'une formation (supprime aussi la progression)
     */
    public function unenroll(int $userId, int $courseId): void {
        $this->db->beginTransaction();
        try {
            // Supprimer la progression des étapes
            $this->db->prepare(
                "DELETE sp FROM step_progress sp
                 JOIN course_steps cs ON sp.step_id = cs.id
                 WHERE sp.user_id = ? AND cs.course_id = ?"
            )->execute([$userId, $courseId]);

            // Supprimer l'inscription
            $stmt = $this->db->prepare(
                "DELETE FROM enrollments WHERE user_id = ? AND course_id = ?"
            );
            $stmt->execute([$userId, $courseId]);

            if ($stmt->rowCount() === 0) {
                throw new InvalidArgumentException("Inscription introuvable.");
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PROGRESSION
    // ═══════════════════════════════════════════════════════════

    /**
     * Marquer une étape comme complétée
     */
    public function completeStep(int $userId, int $stepId): array {
        // Vérifier que l'étape existe et récupérer le course_id
        $stmt = $this->db->prepare(
            "SELECT cs.id, cs.course_id 
             FROM course_steps cs
             JOIN courses c ON cs.course_id = c.id
             WHERE cs.id = ? AND c.is_published = TRUE"
        );
        $stmt->execute([$stepId]);
        $step = $stmt->fetch();

        if (!$step) {
            throw new InvalidArgumentException("Étape introuvable.");
        }

        // Vérifier que l'utilisateur est inscrit
        $stmt = $this->db->prepare(
            "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?"
        );
        $stmt->execute([$userId, $step['course_id']]);
        if (!$stmt->fetch()) {
            throw new InvalidArgumentException("Vous n'êtes pas inscrit à cette formation.");
        }

        // Marquer l'étape (IGNORE si déjà complétée)
        $this->db->prepare(
            "INSERT IGNORE INTO step_progress (user_id, step_id) VALUES (?, ?)"
        )->execute([$userId, $stepId]);

        // Mettre à jour le statut de l'inscription
        $this->updateEnrollmentStatus($userId, (int)$step['course_id']);

        return $this->getEnrollment($userId, (int)$step['course_id']);
    }

    /**
     * Démarquer une étape (annuler la complétion)
     */
    public function uncompleteStep(int $userId, int $stepId): array {
        $stmt = $this->db->prepare("SELECT course_id FROM course_steps WHERE id = ?");
        $stmt->execute([$stepId]);
        $step = $stmt->fetch();

        if (!$step) {
            throw new InvalidArgumentException("Étape introuvable.");
        }

        $this->db->prepare(
            "DELETE FROM step_progress WHERE user_id = ? AND step_id = ?"
        )->execute([$userId, $stepId]);

        $this->updateEnrollmentStatus($userId, (int)$step['course_id']);

        return $this->getEnrollment($userId, (int)$step['course_id']);
    }

    /**
     * Mettre à jour automatiquement le statut d'inscription
     */
    private function updateEnrollmentStatus(int $userId, int $courseId): void {
        // Compter les étapes totales et complétées
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(DISTINCT cs.id) AS total,
                COUNT(DISTINCT sp.id) AS completed
             FROM course_steps cs
             LEFT JOIN step_progress sp ON sp.step_id = cs.id AND sp.user_id = ?
             WHERE cs.course_id = ?"
        );
        $stmt->execute([$userId, $courseId]);
        $counts = $stmt->fetch();

        $total = (int)$counts['total'];
        $completed = (int)$counts['completed'];

        if ($total === 0) {
            $status = 'enrolled';
        } elseif ($completed >= $total) {
            $status = 'completed';
        } elseif ($completed > 0) {
            $status = 'in_progress';
        } else {
            $status = 'enrolled';
        }

        $completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;

        $this->db->prepare(
            "UPDATE enrollments SET status = ?, completed_at = ? WHERE user_id = ? AND course_id = ?"
        )->execute([$status, $completedAt, $userId, $courseId]);
    }

    // ═══════════════════════════════════════════════════════════
    // LECTURE
    // ═══════════════════════════════════════════════════════════

    /**
     * Récupérer l'inscription d'un utilisateur à un cours (avec progression)
     */
    public function getEnrollment(int $userId, int $courseId): ?array {
        $stmt = $this->db->prepare(
            "SELECT e.*, c.title AS course_title, c.icon AS course_icon
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.user_id = ? AND e.course_id = ?"
        );
        $stmt->execute([$userId, $courseId]);
        $enrollment = $stmt->fetch();

        if (!$enrollment) return null;

        // Calculer la progression détaillée
        $enrollment['progress'] = $this->getProgress($userId, $courseId);

        return $enrollment;
    }

    /**
     * Lister toutes les inscriptions d'un utilisateur
     */
    public function getUserEnrollments(int $userId): array {
        $stmt = $this->db->prepare(
            "SELECT e.*, c.title AS course_title, c.icon AS course_icon, 
                    c.level, c.subtitle
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.user_id = ?
             ORDER BY e.enrolled_at DESC"
        );
        $stmt->execute([$userId]);
        $enrollments = $stmt->fetchAll();

        foreach ($enrollments as &$e) {
            $e['progress'] = $this->getProgress($userId, (int)$e['course_id']);
        }

        return $enrollments;
    }

    /**
     * Calculer la progression d'un utilisateur sur un cours
     */
    public function getProgress(int $userId, int $courseId): array {
        $stmt = $this->db->prepare(
            "SELECT 
                cs.id AS step_id,
                cs.title AS step_title,
                cs.step_type,
                cs.sort_order,
                CASE WHEN sp.id IS NOT NULL THEN TRUE ELSE FALSE END AS completed,
                sp.completed_at
             FROM course_steps cs
             LEFT JOIN step_progress sp ON sp.step_id = cs.id AND sp.user_id = ?
             WHERE cs.course_id = ?
             ORDER BY cs.sort_order ASC"
        );
        $stmt->execute([$userId, $courseId]);
        $steps = $stmt->fetchAll();

        $total = count($steps);
        $completed = count(array_filter($steps, fn($s) => $s['completed']));

        return [
            'total_steps'     => $total,
            'completed_steps' => $completed,
            'percentage'      => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
            'steps'           => $steps,
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN / STATS (modérateurs)
    // ═══════════════════════════════════════════════════════════

    /**
     * Statistiques globales d'un cours
     */
    public function getCourseStats(int $courseId): array {
        // Inscriptions par statut
        $stmt = $this->db->prepare(
            "SELECT status, COUNT(*) AS count 
             FROM enrollments 
             WHERE course_id = ? 
             GROUP BY status"
        );
        $stmt->execute([$courseId]);
        $statusCounts = [];
        foreach ($stmt->fetchAll() as $row) {
            $statusCounts[$row['status']] = (int)$row['count'];
        }

        // Progression moyenne
        $stmt = $this->db->prepare(
            "SELECT AVG(sub.pct) AS avg_progress FROM (
                SELECT 
                    e.user_id,
                    CASE WHEN COUNT(DISTINCT cs.id) = 0 THEN 0
                         ELSE COUNT(DISTINCT sp.id) / COUNT(DISTINCT cs.id) * 100
                    END AS pct
                FROM enrollments e
                LEFT JOIN course_steps cs ON cs.course_id = e.course_id
                LEFT JOIN step_progress sp ON sp.step_id = cs.id AND sp.user_id = e.user_id
                WHERE e.course_id = ?
                GROUP BY e.user_id
            ) sub"
        );
        $stmt->execute([$courseId]);
        $avgProgress = $stmt->fetch();

        return [
            'course_id'       => $courseId,
            'total_enrolled'  => array_sum($statusCounts),
            'by_status'       => $statusCounts,
            'avg_progress'    => round((float)($avgProgress['avg_progress'] ?? 0), 1),
        ];
    }

    /**
     * Statistiques globales de la plateforme
     */
    public function getPlatformStats(): array {
        $db = $this->db;

        $totalUsers = (int) $db->query(
            "SELECT COUNT(*) FROM users WHERE email_verified = TRUE"
        )->fetchColumn();

        $totalStudents = (int) $db->query(
            "SELECT COUNT(*) FROM users WHERE email_verified = TRUE AND role = 'etudiant'"
        )->fetchColumn();

        $totalCourses = (int) $db->query(
            "SELECT COUNT(*) FROM courses WHERE is_published = TRUE"
        )->fetchColumn();

        $totalEnrollments = (int) $db->query(
            "SELECT COUNT(*) FROM enrollments"
        )->fetchColumn();

        $completionRate = $db->query(
            "SELECT ROUND(
                CASE WHEN COUNT(*) = 0 THEN 0
                ELSE SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*) * 100
                END, 1
            ) AS rate FROM enrollments"
        )->fetchColumn();

        // Top formations par inscriptions
        $topCourses = $db->query(
            "SELECT c.id, c.title, c.icon, COUNT(e.id) AS enrollments
             FROM courses c
             LEFT JOIN enrollments e ON e.course_id = c.id
             WHERE c.is_published = TRUE
             GROUP BY c.id
             ORDER BY enrollments DESC
             LIMIT 5"
        )->fetchAll();

        // Inscriptions par jour (30 derniers jours)
        $dailyEnrollments = $db->query(
            "SELECT DATE(enrolled_at) AS day, COUNT(*) AS count
             FROM enrollments
             WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(enrolled_at)
             ORDER BY day ASC"
        )->fetchAll();

        return [
            'total_users'        => $totalUsers,
            'total_students'     => $totalStudents,
            'total_courses'      => $totalCourses,
            'total_enrollments'  => $totalEnrollments,
            'completion_rate'    => (float)$completionRate,
            'top_courses'        => $topCourses,
            'daily_enrollments'  => $dailyEnrollments,
        ];
    }
}
