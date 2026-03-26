<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';
$currentUser = requireAuth(true);

$method = $_SERVER['REQUEST_METHOD'];
$userPersoType  = 'perso_' . $currentUser['id'];
$allowedTypes   = ['commun', $userPersoType]; // chaque user ne peut écrire que sur ses propres types

/**
 * Parse et valide les champs d'un budget depuis le body JSON.
 */
function parseBudgetInput(array $allowedTypes): ?array {
    $data   = json_decode(file_get_contents('php://input'), true);
    $name   = trim($data['name'] ?? '');
    $amount = floatval($data['amount'] ?? 0);
    $type   = trim($data['type'] ?? '');

    if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Nom requis']); return null; }
    if ($amount <= 0)   { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); return null; }
    if (!in_array($type, $allowedTypes)) {
        http_response_code(400); echo json_encode(['error' => 'Type invalide']); return null;
    }

    return compact('name', 'amount', 'type');
}

switch ($method) {
    case 'GET':
        // L'utilisateur voit : budgets communs + ses budgets perso
        $stmt = $pdo->prepare("
            SELECT * FROM budgets
            WHERE type = 'commun' OR type = ?
            ORDER BY type, name
        ");
        $stmt->execute([$userPersoType]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $input = parseBudgetInput($allowedTypes);
        if (!$input) break;

        $stmt = $pdo->prepare("INSERT INTO budgets (name, amount, type) VALUES (?, ?, ?)");
        $stmt->execute([$input['name'], $input['amount'], $input['type']]);
        $stmt = $pdo->prepare("SELECT * FROM budgets WHERE id = ?");
        $stmt->execute([$pdo->lastInsertId()]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }

        $input = parseBudgetInput($allowedTypes);
        if (!$input) break;

        $stmt = $pdo->prepare("UPDATE budgets SET name=?, amount=?, type=? WHERE id=?");
        $stmt->execute([$input['name'], $input['amount'], $input['type'], $id]);
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
