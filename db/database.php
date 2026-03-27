<?php
$db_path = __DIR__ . '/../data/budget.db';

$dir = dirname($db_path);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');

    // Détection de l'ancien schéma (users.id était TEXT, pas de colonne email).
    // Si l'ancien schéma est détecté, on repart d'une ardoise vierge.
    $hasNewSchema = false;
    try {
        $cols = $pdo->query("PRAGMA table_info(users)")->fetchAll();
        foreach ($cols as $col) {
            if ($col['name'] === 'email') { $hasNewSchema = true; break; }
        }
    } catch (Exception $e) {}

    if (!$hasNewSchema) {
        $pdo->exec("DROP TABLE IF EXISTS expenses");
        $pdo->exec("DROP TABLE IF EXISTS budgets");
        $pdo->exec("DROP TABLE IF EXISTS users");
    }

    // ─── Tables ──────────────────────────────────────────────────────

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS foyers (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS foyer_members (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            foyer_id  INTEGER NOT NULL REFERENCES foyers(id)  ON DELETE CASCADE,
            user_id   INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
            role      TEXT    NOT NULL DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(foyer_id, user_id)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invitations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            foyer_id   INTEGER NOT NULL REFERENCES foyers(id) ON DELETE CASCADE,
            token      TEXT    UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            used_by    INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS budgets (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            foyer_id   INTEGER NOT NULL,
            name       TEXT    NOT NULL,
            amount     REAL    NOT NULL,
            type       TEXT    NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS expenses (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            foyer_id   INTEGER NOT NULL,
            name       TEXT    NOT NULL,
            amount     REAL    NOT NULL,
            paid_by    TEXT    NOT NULL,
            for_whom   TEXT    NOT NULL,
            budget_id  INTEGER,
            date       DATE    NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Erreur base de données : ' . $e->getMessage()]));
}
