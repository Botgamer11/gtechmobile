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

?>
