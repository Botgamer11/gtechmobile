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

try {
    $pdo = db();
    ensure_all_tables($pdo);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB_CONNECT_FAILED', 'message' => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';

    if ($action === 'leaderboard') {
        $limit = (int)($_GET['limit'] ?? 50);
        if ($limit <= 0 || $limit > 500) { $limit = 50; }
        $includeZero = isset($_GET['include_zero']) ? (bool)intval($_GET['include_zero']) : true;
        $excludeWeb = isset($_GET['exclude_web']) ? (bool)intval($_GET['exclude_web']) : true;

        $where = 'WHERE blocked = 0';
        if (!$includeZero) {
            $where .= ' AND balance > 0';
        }
        if ($excludeWeb) {
            $where .= " AND id NOT LIKE 'web\_%'";
        }

        $sql = "SELECT id, name, username, balance, tickets, last_active FROM users $where ORDER BY balance DESC, last_active DESC LIMIT :limit";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        echo json_encode(['ok' => true, 'data' => $rows]);
        exit;
    }

    if ($action === 'list') {
        $limit = (int)($_GET['limit'] ?? 1000);
        if ($limit <= 0 || $limit > 5000) { $limit = 1000; }
        $offset = (int)($_GET['offset'] ?? 0);
        $stmt = $pdo->prepare('SELECT id, name, username, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, blocked FROM users ORDER BY last_active DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        echo json_encode(['ok' => true, 'data' => $rows]);
        exit;
    }

    if ($action === 'get') {
        $id = trim((string)($_GET['id'] ?? ''));
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'MISSING_ID']);
            exit;
        }
        $stmt = $pdo->prepare('SELECT id, name, username, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, blocked FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'UNKNOWN_ACTION']);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'INVALID_JSON']);
        exit;
    }

    $action = (string)($json['action'] ?? '');

    if ($action === 'upsert') {
        $id = substr(trim((string)($json['id'] ?? '')), 0, 64);
        $name = substr(trim((string)($json['name'] ?? '')), 0, 255);
        $username = substr(trim((string)($json['username'] ?? '')), 0, 255);
        $source = ($json['source'] ?? 'web') === 'telegram' ? 'telegram' : 'web';
        if ($id === '' || $name === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'MISSING_FIELDS']);
            exit;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO users (id, name, username) VALUES (:id, :name, :username)
                ON DUPLICATE KEY UPDATE name = VALUES(name), username = VALUES(username), last_active = CURRENT_TIMESTAMP');
            $stmt->execute([
                ':id' => $id,
                ':name' => $name,
                ':username' => $username !== '' ? $username : null,
            ]);

            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
            $stmt = $pdo->prepare('INSERT INTO sessions (user_id, source, ip, user_agent) VALUES (?, ?, ?, ?)');
            $stmt->execute([$id, $source, $ip, $ua]);
            $pdo->commit();
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'UPSERT_FAILED', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'update') {
        $id = substr(trim((string)($json['id'] ?? '')), 0, 64);
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'MISSING_ID']);
            exit;
        }

        $balanceSet = isset($json['balance_set']) ? (int)$json['balance_set'] : null;
        $ticketsSet = isset($json['tickets_set']) ? (int)$json['tickets_set'] : null;
        $balanceDelta = isset($json['balance_delta']) ? (int)$json['balance_delta'] : 0;
        $ticketsDelta = isset($json['tickets_delta']) ? (int)$json['tickets_delta'] : 0;
        $blocked = isset($json['blocked']) ? (int)!!$json['blocked'] : null;
        $bonusDays = isset($json['bonus_days']) ? (int)$json['bonus_days'] : null;
        $lastBonusDate = $json['last_bonus_date'] ?? null;

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT balance, tickets FROM users WHERE id = ? FOR UPDATE');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                throw new RuntimeException('USER_NOT_FOUND');
            }

            $newBalance = $balanceSet !== null ? $balanceSet : ((int)$row['balance'] + $balanceDelta);
            $newTickets = $ticketsSet !== null ? $ticketsSet : ((int)$row['tickets'] + $ticketsDelta);
            if ($newBalance < 0) { $newBalance = 0; }
            if ($newTickets < 0) { $newTickets = 0; }

            $updates = ['balance = :balance', 'tickets = :tickets'];
            $params = [':balance' => $newBalance, ':tickets' => $newTickets, ':id' => $id];

            if ($blocked !== null) { $updates[] = 'blocked = :blocked'; $params[':blocked'] = $blocked; }
            if ($bonusDays !== null) { $updates[] = 'bonus_days = :bonus_days'; $params[':bonus_days'] = $bonusDays; }
            if ($lastBonusDate !== null) { $updates[] = 'last_bonus_date = :last_bonus_date'; $params[':last_bonus_date'] = $lastBonusDate ?: null; }

            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ', last_active = CURRENT_TIMESTAMP WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $pdo->commit();

            $stmt = $pdo->prepare('SELECT id, name, username, balance, tickets, bonus_days, last_bonus_date, join_date, last_active, blocked FROM users WHERE id = ?');
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            echo json_encode(['ok' => true, 'data' => $user]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'UPDATE_FAILED', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'activity') {
        $id = substr(trim((string)($json['id'] ?? '')), 0, 64);
        $activity = substr(trim((string)($json['activity'] ?? '')), 0, 64);
        if ($id === '' || $activity === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'MISSING_FIELDS']);
            exit;
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO user_activities (user_id, action) VALUES (?, ?)');
            $stmt->execute([$id, $activity]);
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'ACTIVITY_FAILED', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'reset') {
        // Danger: global reset to zero balances and tickets
        try {
            $pdo->exec('UPDATE users SET balance = 0, tickets = 0, bonus_days = 0, last_bonus_date = NULL');
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'RESET_FAILED', 'message' => $e->getMessage()]);
        }
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'UNKNOWN_ACTION']);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);

