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

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            paid_by TEXT DEFAULT 'Joris',
            for_whom TEXT DEFAULT 'Joris,Sabrine',
            budget_id INTEGER,
            date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL
        )
    ");

    // Migrations pour tables existantes
    $migrations = [
        'paid_by TEXT DEFAULT \'Joris\'',
        'for_whom TEXT DEFAULT \'Joris,Sabrine\'',
        'budget_id INTEGER',
    ];
    foreach ($migrations as $col) {
        try { $pdo->exec("ALTER TABLE expenses ADD COLUMN $col"); } catch (PDOException $e) {}
    }

    // Seed des utilisateurs (INSERT OR IGNORE = exécuté une seule fois)
    require_once __DIR__ . '/../includes/config.php';
    $stmt = $pdo->prepare("INSERT OR IGNORE INTO users (id, name, password_hash) VALUES (?, ?, ?)");
    foreach (MEMBERS as $m) {
        $stmt->execute([$m['id'], $m['name'], password_hash('aaa', PASSWORD_DEFAULT)]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Erreur base de données : ' . $e->getMessage()]));
}
