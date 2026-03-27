<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';

$currentUser  = requireAuth(true);
$foyerCtx     = getFoyerContext($pdo, $currentUser['id']);
$foyerId      = $foyerCtx['foyer_id'];
$foyerMembers = $foyerCtx['members'];

if (!$foyerId) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun foyer configuré']);
    exit;
}

$method          = $_SERVER['REQUEST_METHOD'];
$userPersoType   = 'perso_' . $currentUser['id'];
$allowedTypes    = ['commun', $userPersoType]; // chaque user ne peut écrire que sur ses propres types

/**
 * Parse et valide les champs d'un budget depuis le body JSON.
 */
function parseBudgetInput(array $allowedTypes): ?array {
    $data   = json_decode(file_get_contents('php://input'), true);
    $name   = trim($data['name'] ?? '');
    $amount = floatval($data['amount'] ?? 0);
    $type   = trim($data['type'] ?? '');

    if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Nom requis']); return null; }
    if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); return null; }
    if (!in_array($type, $allowedTypes)) {
        http_response_code(400); echo json_encode(['error' => 'Type invalide']); return null;
    }

    return compact('name', 'amount', 'type');
}

// Tous les types de budget autorisés en lecture pour ce foyer
$allFoyerTypes = getAllowedBudgetTypes($foyerMembers);

switch ($method) {
    case 'GET':
        // L'utilisateur voit tous les budgets de son foyer
        $placeholders = implode(',', array_fill(0, count($allFoyerTypes), '?'));
        $stmt = $pdo->prepare("
            SELECT * FROM budgets
            WHERE foyer_id = ?
              AND type IN ($placeholders)
            ORDER BY type, name
        ");
        $stmt->execute(array_merge([$foyerId], $allFoyerTypes));
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $input = parseBudgetInput($allowedTypes);
        if (!$input) break;

        $stmt = $pdo->prepare("INSERT INTO budgets (foyer_id, name, amount, type) VALUES (?, ?, ?, ?)");
        $stmt->execute([$foyerId, $input['name'], $input['amount'], $input['type']]);
        $stmt = $pdo->prepare("SELECT * FROM budgets WHERE id = ?");
        $stmt->execute([$pdo->lastInsertId()]);
        echo json_encode($stmt->fetch());
        break;

    case 'PUT':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }

        $input = parseBudgetInput($allowedTypes);
        if (!$input) break;

        $stmt = $pdo->prepare("UPDATE budgets SET name=?, amount=?, type=? WHERE id=? AND foyer_id=?");
        $stmt->execute([$input['name'], $input['amount'], $input['type'], $id, $foyerId]);
        $stmt = $pdo->prepare("SELECT * FROM budgets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("UPDATE expenses SET budget_id = NULL WHERE budget_id = ? AND foyer_id = ?")->execute([$id, $foyerId]);
        $pdo->prepare("DELETE FROM budgets WHERE id = ? AND foyer_id = ?")->execute([$id, $foyerId]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
