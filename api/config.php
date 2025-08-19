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

/**
 * Ensure normalized tables exist for users, sessions and activities
 */
function ensure_users_table(PDO $pdo): void {
	$pdo->exec(
		'CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(64) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			username VARCHAR(255) NULL,
			balance INT NOT NULL DEFAULT 0,
			tickets INT NOT NULL DEFAULT 0,
			bonus_days INT NOT NULL DEFAULT 0,
			last_bonus_date DATETIME NULL,
			join_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_active TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			blocked TINYINT(1) NOT NULL DEFAULT 0,
			INDEX idx_last_active (last_active),
			INDEX idx_balance (balance)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
	);
}

function ensure_sessions_table(PDO $pdo): void {
	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS sessions (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id VARCHAR(64) NOT NULL,
			source ENUM('telegram','web') NOT NULL,
			ip VARCHAR(45) NULL,
			user_agent VARCHAR(255) NULL,
			started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			INDEX idx_user_id (user_id),
			CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
	);
}

function ensure_user_activities_table(PDO $pdo): void {
	$pdo->exec(
		'CREATE TABLE IF NOT EXISTS user_activities (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id VARCHAR(64) NOT NULL,
			action VARCHAR(64) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			INDEX idx_user_id (user_id),
			CONSTRAINT fk_user_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
	);
}

function ensure_all_tables(PDO $pdo): void {
	ensure_app_state_table($pdo);
	ensure_users_table($pdo);
	ensure_sessions_table($pdo);
	ensure_user_activities_table($pdo);
}

?>
