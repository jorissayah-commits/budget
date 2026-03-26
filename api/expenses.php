<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../db/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $month = $_GET['month'] ?? date('Y-m');
        // Validate format YYYY-MM
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            http_response_code(400);
            echo json_encode(['error' => 'Format de mois invalide']);
            break;
        }
        $stmt = $pdo->prepare("
            SELECT * FROM expenses
            WHERE strftime('%Y-%m', date) = ?
            ORDER BY date DESC, created_at DESC
        ");
        $stmt->execute([$month]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $name     = trim($data['name'] ?? '');
        $amount   = floatval($data['amount'] ?? 0);
        $category = trim($data['category'] ?? 'Perso');
        $paid_by  = trim($data['paid_by'] ?? 'Joris');
        $for_whom = trim($data['for_whom'] ?? 'Joris,Sabrine');
        $date     = $data['date'] ?? date('Y-m-d');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Le nom est requis']);
            break;
        }
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Le montant doit être supérieur à 0']);
            break;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['error' => 'Format de date invalide']);
            break;
        }

        $stmt = $pdo->prepare("INSERT INTO expenses (name, amount, category, paid_by, for_whom, date) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $amount, $category, $paid_by, $for_whom, $date]);

        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalide']);
            break;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $name     = trim($data['name'] ?? '');
        $amount   = floatval($data['amount'] ?? 0);
        $category = trim($data['category'] ?? 'Perso');
        $paid_by  = trim($data['paid_by'] ?? 'Joris');
        $for_whom = trim($data['for_whom'] ?? 'Joris,Sabrine');
        $date     = $data['date'] ?? date('Y-m-d');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Le nom est requis']);
            break;
        }
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Le montant doit être supérieur à 0']);
            break;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['error' => 'Format de date invalide']);
            break;
        }

        $stmt = $pdo->prepare("UPDATE expenses SET name=?, amount=?, category=?, paid_by=?, for_whom=?, date=? WHERE id=?");
        $stmt->execute([$name, $amount, $category, $paid_by, $for_whom, $date, $id]);

        $stmt = $pdo->prepare("SELECT * FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalide']);
            break;
        }
        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
