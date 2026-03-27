<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';

$currentUser  = requireAuth(true);
$foyerCtx     = getFoyerContext($pdo, $currentUser['id']);
$foyerId      = $foyerCtx['foyer_id'];

if (!$foyerId) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun foyer configuré']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("
            SELECT i.*, u.name AS user_name
            FROM incomes i
            JOIN users u ON i.user_id = u.id
            WHERE i.foyer_id = ?
            ORDER BY i.day_of_month ASC
        ");
        $stmt->execute([$foyerId]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data         = json_decode(file_get_contents('php://input'), true);
        $name         = trim($data['name'] ?? '');
        $amount       = floatval($data['amount'] ?? 0);
        $dayOfMonth   = intval($data['day_of_month'] ?? 1);

        if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Le nom est requis']); break; }
        if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if ($dayOfMonth < 1 || $dayOfMonth > 31) { http_response_code(400); echo json_encode(['error' => 'Jour invalide (1-31)']); break; }

        $stmt = $pdo->prepare("INSERT INTO incomes (foyer_id, user_id, name, amount, day_of_month) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$foyerId, $currentUser['id'], $name, $amount, $dayOfMonth]);

        $id = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT i.*, u.name AS user_name FROM incomes i JOIN users u ON i.user_id = u.id WHERE i.id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }

        $data       = json_decode(file_get_contents('php://input'), true);
        $name       = trim($data['name'] ?? '');
        $amount     = floatval($data['amount'] ?? 0);
        $dayOfMonth = intval($data['day_of_month'] ?? 1);

        if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Le nom est requis']); break; }
        if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if ($dayOfMonth < 1 || $dayOfMonth > 31) { http_response_code(400); echo json_encode(['error' => 'Jour invalide (1-31)']); break; }

        // Only owner can edit their own incomes
        $stmt = $pdo->prepare("UPDATE incomes SET name=?, amount=?, day_of_month=? WHERE id=? AND foyer_id=? AND user_id=?");
        $stmt->execute([$name, $amount, $dayOfMonth, $id, $foyerId, $currentUser['id']]);

        $stmt = $pdo->prepare("SELECT i.*, u.name AS user_name FROM incomes i JOIN users u ON i.user_id = u.id WHERE i.id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("DELETE FROM incomes WHERE id = ? AND foyer_id = ? AND user_id = ?")->execute([$id, $foyerId, $currentUser['id']]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
