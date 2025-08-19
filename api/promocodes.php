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
    ensure_promocodes_table($pdo);
    ensure_users_table($pdo);
    ensure_leaderboard_table($pdo);
} catch (Throwable $e) {
    respond(['ok' => false, 'error' => 'DB_CONNECT_FAILED', 'message' => $e->getMessage()], 500);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = isset($_GET['code']) ? (string)$_GET['code'] : null;
    if ($code) {
        $stmt = $pdo->prepare('SELECT code, reward, uses, max_uses, created, created_by FROM promocodes WHERE code = ?');
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        respond(['ok' => true, 'data' => $row ?: null]);
    } else {
        $stmt = $pdo->query('SELECT code, reward, uses, max_uses, created, created_by FROM promocodes ORDER BY created DESC');
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

    if ($action === 'create') {
        $code = strtoupper(trim((string)($json['code'] ?? '')));
        $reward = (int)($json['reward'] ?? 0);
        $maxUses = (int)($json['max_uses'] ?? 0);
        $createdBy = isset($json['created_by']) ? (int)$json['created_by'] : null;
        if ($code === '' || $reward <= 0 || $maxUses <= 0) {
            respond(['ok' => false, 'error' => 'INVALID_PARAMS'], 400);
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO promocodes (code, reward, uses, max_uses, created, created_by) VALUES (?, ?, 0, ?, NOW(), ?)');
            $stmt->execute([$code, $reward, $maxUses, $createdBy]);
            respond(['ok' => true, 'data' => ['code' => $code, 'reward' => $reward, 'max_uses' => $maxUses]]);
        } catch (Throwable $e) {
            respond(['ok' => false, 'error' => 'CREATE_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    if ($action === 'delete') {
        $code = strtoupper(trim((string)($json['code'] ?? '')));
        if ($code === '') {
            respond(['ok' => false, 'error' => 'INVALID_CODE'], 400);
        }
        $stmt = $pdo->prepare('DELETE FROM promocodes WHERE code = ?');
        $stmt->execute([$code]);
        respond(['ok' => true]);
    }

    if ($action === 'activate') {
        $code = strtoupper(trim((string)($json['code'] ?? '')));
        $userId = (int)($json['user_id'] ?? 0);
        if ($code === '' || $userId <= 0) {
            respond(['ok' => false, 'error' => 'INVALID_PARAMS'], 400);
        }
        try {
            $pdo->beginTransaction();
            // Lock the promo for update
            $stmt = $pdo->prepare('SELECT code, reward, uses, max_uses FROM promocodes WHERE code = ? FOR UPDATE');
            $stmt->execute([$code]);
            $promo = $stmt->fetch();
            if (!$promo) {
                $pdo->rollBack();
                respond(['ok' => false, 'error' => 'PROMO_NOT_FOUND'], 404);
            }
            if ((int)$promo['uses'] >= (int)$promo['max_uses']) {
                $pdo->rollBack();
                respond(['ok' => false, 'error' => 'PROMO_EXHAUSTED'], 400);
            }

            // Increment uses
            $updPromo = $pdo->prepare('UPDATE promocodes SET uses = uses + 1 WHERE code = ?');
            $updPromo->execute([$code]);

            // Ensure user exists; if not, create minimal user
            $selUser = $pdo->prepare('SELECT id, name, balance FROM users WHERE id = ?');
            $selUser->execute([$userId]);
            $user = $selUser->fetch();
            if (!$user) {
                $insUser = $pdo->prepare('INSERT INTO users (id, name, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, is_admin) VALUES (?, ?, 0, 0, 0, NULL, NOW(), NOW(), 0)');
                $insUser->execute([$userId, null]);
                $user = ['id' => $userId, 'name' => null, 'balance' => 0];
            }

            $newBalance = ((int)$user['balance']) + (int)$promo['reward'];
            $updUser = $pdo->prepare('UPDATE users SET balance = ?, last_active = NOW() WHERE id = ?');
            $updUser->execute([$newBalance, $userId]);

            // Sync leaderboard
            upsert_leaderboard_score($pdo, $userId, $newBalance);

            $pdo->commit();
            respond(['ok' => true, 'data' => ['code' => $code, 'reward' => (int)$promo['reward'], 'new_balance' => $newBalance]]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            respond(['ok' => false, 'error' => 'ACTIVATE_FAILED', 'message' => $e->getMessage()], 500);
        }
    }

    respond(['ok' => false, 'error' => 'UNKNOWN_ACTION'], 400);
}

respond(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED'], 405);

