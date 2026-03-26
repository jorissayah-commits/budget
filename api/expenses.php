<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $month = $_GET['month'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            http_response_code(400); echo json_encode(['error' => 'Format de mois invalide']); break;
        }
        $stmt = $pdo->prepare("
            SELECT e.*, b.name AS budget_name, b.type AS budget_type
            FROM expenses e
            LEFT JOIN budgets b ON e.budget_id = b.id
            WHERE strftime('%Y-%m', e.date) = ?
            ORDER BY e.date DESC, e.created_at DESC
        ");
        $stmt->execute([$month]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data      = json_decode(file_get_contents('php://input'), true);
        $name      = trim($data['name'] ?? '');
        $amount    = floatval($data['amount'] ?? 0);
        $paid_by   = trim($data['paid_by'] ?? 'Joris');
        $for_whom  = trim($data['for_whom'] ?? 'Joris,Sabrine');
        $budget_id = isset($data['budget_id']) && $data['budget_id'] !== '' ? intval($data['budget_id']) : null;
        $date      = $data['date'] ?? date('Y-m-d');

        if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Le nom est requis']); break; }
        if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400); echo json_encode(['error' => 'Format de date invalide']); break;
        }

        $stmt = $pdo->prepare("INSERT INTO expenses (name, amount, paid_by, for_whom, budget_id, date) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $amount, $paid_by, $for_whom, $budget_id, $date]);
        $id = $pdo->lastInsertId();

        $stmt = $pdo->prepare("
            SELECT e.*, b.name AS budget_name, b.type AS budget_type
            FROM expenses e LEFT JOIN budgets b ON e.budget_id = b.id
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id        = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }

        $data      = json_decode(file_get_contents('php://input'), true);
        $name      = trim($data['name'] ?? '');
        $amount    = floatval($data['amount'] ?? 0);
        $paid_by   = trim($data['paid_by'] ?? 'Joris');
        $for_whom  = trim($data['for_whom'] ?? 'Joris,Sabrine');
        $budget_id = isset($data['budget_id']) && $data['budget_id'] !== '' ? intval($data['budget_id']) : null;
        $date      = $data['date'] ?? date('Y-m-d');

        if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Le nom est requis']); break; }
        if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400); echo json_encode(['error' => 'Format de date invalide']); break;
        }

        $stmt = $pdo->prepare("UPDATE expenses SET name=?, amount=?, paid_by=?, for_whom=?, budget_id=?, date=? WHERE id=?");
        $stmt->execute([$name, $amount, $paid_by, $for_whom, $budget_id, $date, $id]);

        $stmt = $pdo->prepare("
            SELECT e.*, b.name AS budget_name, b.type AS budget_type
            FROM expenses e LEFT JOIN budgets b ON e.budget_id = b.id
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("DELETE FROM expenses WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
