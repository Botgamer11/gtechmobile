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
    ensure_app_state_table($pdo);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB_CONNECT_FAILED', 'message' => $e->getMessage()]);
    exit;
}

// We store a single global state by key 'global'.
$stateId = 'global';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT data, updated_at FROM app_state WHERE id = ?');
    $stmt->execute([$stateId]);
    $row = $stmt->fetch();
    if (!$row) {
        echo json_encode(['ok' => true, 'data' => null, 'updated_at' => null]);
        exit;
    }
    echo json_encode(['ok' => true, 'data' => json_decode($row['data'], true), 'updated_at' => $row['updated_at']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'INVALID_JSON']);
        exit;
    }

    // Minimal validation: we store whatever the client sends
    $data = json_encode($json, JSON_UNESCAPED_UNICODE);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO app_state (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
        $stmt->execute([$stateId, $data]);
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'DB_WRITE_FAILED', 'message' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);

