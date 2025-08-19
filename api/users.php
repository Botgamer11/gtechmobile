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
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 100;
    if ($id) {
        $stmt = $pdo->prepare('SELECT id, name, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, is_admin FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        respond(['ok' => true, 'data' => $row ?: null]);
    } else {
        $stmt = $pdo->prepare('SELECT id, name, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, is_admin FROM users ORDER BY (last_active IS NULL), last_active DESC, (join_date IS NULL), join_date DESC LIMIT ' . (int)$limit);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        respond(['ok' => true, 'data' => $rows]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        respond(['ok' => false, 'error' => 'INVALID_JSON'], 400);
    }
    $action = isset($json['action']) ? (string)$json['action'] : '';

    if ($action === 'delete') {
        $id = isset($json['id']) ? (int)$json['id'] : 0;
        if ($id <= 0) {
            respond(['ok' => false, 'error' => 'INVALID_ID'], 400);
        }
        try {
            $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$id]);
            // Also remove from leaderboard
            $stmt2 = $pdo->prepare('DELETE FROM leaderboard WHERE user_id = ?');
            $stmt2->execute([$id]);
            respond(['ok' => true]);
        } catch (Throwable $e) {
            respond(['ok' => false, 'error' => 'DELETE_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    $id = isset($json['id']) ? (int)$json['id'] : 0;
    if ($id <= 0) {
        respond(['ok' => false, 'error' => 'INVALID_ID'], 400);
    }

    $name = isset($json['name']) ? (string)$json['name'] : null;
    $balance = isset($json['balance']) ? (int)$json['balance'] : 0;
    $tickets = isset($json['tickets']) ? (int)$json['tickets'] : 0;
    $bonusDays = isset($json['bonus_days']) ? (int)$json['bonus_days'] : 0;
    $lastBonusDate = isset($json['last_bonus_date']) && $json['last_bonus_date'] !== '' ? (string)$json['last_bonus_date'] : null;
    $isAdmin = isset($json['is_admin']) ? (bool)$json['is_admin'] : false;

    try {
        $pdo->beginTransaction();
        // Insert or update user; join_date is only set on insert; last_active set to NOW() on every update
        $stmt = $pdo->prepare('INSERT INTO users (id, name, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, is_admin)
            VALUES (:id, :name, :balance, :tickets, :bonus_days, :last_bonus_date, NOW(), NOW(), :is_admin)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                balance = VALUES(balance),
                tickets = VALUES(tickets),
                bonus_days = VALUES(bonus_days),
                last_bonus_date = VALUES(last_bonus_date),
                last_active = NOW(),
                is_admin = VALUES(is_admin)');
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':balance' => $balance,
            ':tickets' => $tickets,
            ':bonus_days' => $bonusDays,
            ':last_bonus_date' => $lastBonusDate,
            ':is_admin' => $isAdmin ? 1 : 0,
        ]);

        // Sync leaderboard score to current balance
        upsert_leaderboard_score($pdo, $id, $balance);

        $pdo->commit();

        $select = $pdo->prepare('SELECT id, name, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, is_admin FROM users WHERE id = ?');
        $select->execute([$id]);
        $user = $select->fetch();
        respond(['ok' => true, 'data' => $user]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'error' => 'DB_WRITE_FAILED', 'message' => $e->getMessage()], 500);
    }
}

respond(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED'], 405);

