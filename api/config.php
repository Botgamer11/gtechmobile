<?php
// Simple PDO connection helper for MySQL
// Adjust DB_HOST if your hosting requires a different host than localhost

declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_NAME = 'u3229359_Bob';
const DB_USER = 'u3229359_Bob';
const DB_PASS = 'Dinasaeva33A';

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}

function ensure_app_state_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_state (
            id VARCHAR(64) PRIMARY KEY,
            data MEDIUMTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function ensure_users_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY,
            name VARCHAR(255),
            balance INT DEFAULT 0,
            tickets INT DEFAULT 0,
            bonus_days INT DEFAULT 0,
            last_bonus_date DATETIME NULL,
            join_date DATETIME NULL,
            last_active DATETIME NULL,
            is_admin BOOLEAN DEFAULT FALSE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function ensure_promocodes_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS promocodes (
            code VARCHAR(50) PRIMARY KEY,
            reward INT,
            uses INT DEFAULT 0,
            max_uses INT,
            created DATETIME,
            created_by BIGINT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function ensure_leaderboard_table(PDO $pdo): void {
    // Ensure users table exists first for FK
    ensure_users_table($pdo);
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS leaderboard (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT,
            score INT,
            CONSTRAINT fk_leaderboard_user FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function upsert_leaderboard_score(PDO $pdo, int $userId, int $score): void {
    // Try update existing entry
    $stmt = $pdo->prepare('SELECT id FROM leaderboard WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if ($row && isset($row['id'])) {
        $upd = $pdo->prepare('UPDATE leaderboard SET score = ? WHERE id = ?');
        $upd->execute([$score, (int)$row['id']]);
        return;
    }
    $ins = $pdo->prepare('INSERT INTO leaderboard (user_id, score) VALUES (?, ?)');
    $ins->execute([$userId, $score]);
}

?>
