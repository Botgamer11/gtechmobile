<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/config.php';

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = db();
    ensure_users_table($pdo);
    ensure_leaderboard_table($pdo);
} catch (Throwable $e) {
    respond(['ok' => false, 'error' => 'DB_CONNECT_FAILED', 'message' => $e->getMessage()], 500);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;
    $stmt = $pdo->prepare('SELECT l.user_id, l.score, u.name, u.last_active FROM leaderboard l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.score DESC LIMIT ' . (int)$limit);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    respond(['ok' => true, 'data' => $rows]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        respond(['ok' => false, 'error' => 'INVALID_JSON'], 400);
    }
    $action = (string)($json['action'] ?? '');

    if ($action === 'recalculate') {
        try {
            $pdo->beginTransaction();
            $pdo->exec('DELETE FROM leaderboard');
            $pdo->exec('INSERT INTO leaderboard (user_id, score) SELECT id, balance FROM users WHERE balance > 0');
            $pdo->commit();
            respond(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            respond(['ok' => false, 'error' => 'RECALC_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    if ($action === 'reset') {
        try {
            $pdo->beginTransaction();
            // Reset users stats
            $pdo->exec('UPDATE users SET balance = 0, tickets = 0, bonus_days = 0, last_bonus_date = NULL');
            // Clear leaderboard
            $pdo->exec('DELETE FROM leaderboard');
            $pdo->commit();
            respond(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            respond(['ok' => false, 'error' => 'RESET_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    if ($action === 'update_user_score') {
        $userId = (int)($json['user_id'] ?? 0);
        $score = (int)($json['score'] ?? 0);
        if ($userId <= 0 || $score < 0) {
            respond(['ok' => false, 'error' => 'INVALID_PARAMS'], 400);
        }
        try {
            $pdo->beginTransaction();
            $upd = $pdo->prepare('UPDATE users SET balance = ?, last_active = NOW() WHERE id = ?');
            $upd->execute([$score, $userId]);
            upsert_leaderboard_score($pdo, $userId, $score);
            $pdo->commit();
            respond(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            respond(['ok' => false, 'error' => 'UPDATE_SCORE_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    respond(['ok' => false, 'error' => 'UNKNOWN_ACTION'], 400);
}

respond(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED'], 405);

