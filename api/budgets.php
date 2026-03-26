<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM budgets ORDER BY type, name");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data   = json_decode(file_get_contents('php://input'), true);
        $name   = trim($data['name'] ?? '');
        $amount = floatval($data['amount'] ?? 0);
        $type   = trim($data['type'] ?? '');

        if (empty($name)) { http_response_code(400); echo json_encode(['error' => 'Nom requis']); break; }
        if ($amount <= 0) { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if (!in_array($type, ['commun', 'perso_joris', 'perso_sabrine'])) {
            http_response_code(400); echo json_encode(['error' => 'Type invalide']); break;
        }

        $stmt = $pdo->prepare("INSERT INTO budgets (name, amount, type) VALUES (?, ?, ?)");
        $stmt->execute([$name, $amount, $type]);
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM budgets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id     = intval($_GET['id'] ?? 0);
        $data   = json_decode(file_get_contents('php://input'), true);
        $name   = trim($data['name'] ?? '');
        $amount = floatval($data['amount'] ?? 0);
        $type   = trim($data['type'] ?? '');

        if ($id <= 0)      { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Nom requis']); break; }
        if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if (!in_array($type, ['commun', 'perso_joris', 'perso_sabrine'])) {
            http_response_code(400); echo json_encode(['error' => 'Type invalide']); break;
        }

        $stmt = $pdo->prepare("UPDATE budgets SET name=?, amount=?, type=? WHERE id=?");
        $stmt->execute([$name, $amount, $type, $id]);
        $stmt = $pdo->prepare("SELECT * FROM budgets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("UPDATE expenses SET budget_id = NULL WHERE budget_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM budgets WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
