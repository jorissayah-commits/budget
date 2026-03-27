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

$method         = $_SERVER['REQUEST_METHOD'];
$defaultPaidBy  = $currentUser['name'];
$defaultForWhom = implode(',', array_column($foyerMembers, 'name'));

/**
 * Parse et valide les champs d'une dépense depuis le body JSON.
 */
function parseExpenseInput(string $defaultPaidBy, string $defaultForWhom): ?array {
    $data      = json_decode(file_get_contents('php://input'), true);
    $name      = trim($data['name'] ?? '');
    $amount    = floatval($data['amount'] ?? 0);
    $paid_by   = trim($data['paid_by'] ?? $defaultPaidBy);
    $for_whom  = trim($data['for_whom'] ?? $defaultForWhom);
    $budget_id = isset($data['budget_id']) && $data['budget_id'] !== '' ? intval($data['budget_id']) : null;
    $date      = $data['date'] ?? date('Y-m-d');

    if (empty($name))  { http_response_code(400); echo json_encode(['error' => 'Le nom est requis']); return null; }
    if ($amount <= 0)  { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); return null; }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400); echo json_encode(['error' => 'Format de date invalide']); return null;
    }

    return compact('name', 'amount', 'paid_by', 'for_whom', 'budget_id', 'date');
}

/** Récupère une dépense avec les infos du budget joint. */
function fetchExpenseWithBudget(PDO $pdo, int $id): array|false {
    $stmt = $pdo->prepare("
        SELECT e.*, b.name AS budget_name, b.type AS budget_type
        FROM expenses e
        LEFT JOIN budgets b ON e.budget_id = b.id
        WHERE e.id = ?
    ");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

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
            WHERE e.foyer_id = ?
              AND strftime('%Y-%m', e.date) = ?
            ORDER BY e.date DESC, e.created_at DESC
        ");
        $stmt->execute([$foyerId, $month]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $input = parseExpenseInput($defaultPaidBy, $defaultForWhom);
        if (!$input) break;

        $stmt = $pdo->prepare("
            INSERT INTO expenses (foyer_id, name, amount, paid_by, for_whom, budget_id, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$foyerId, $input['name'], $input['amount'], $input['paid_by'], $input['for_whom'], $input['budget_id'], $input['date']]);
        echo json_encode(fetchExpenseWithBudget($pdo, (int)$pdo->lastInsertId()));
        break;

    case 'PUT':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }

        $input = parseExpenseInput($defaultPaidBy, $defaultForWhom);
        if (!$input) break;

        $stmt = $pdo->prepare("
            UPDATE expenses SET name=?, amount=?, paid_by=?, for_whom=?, budget_id=?, date=?
            WHERE id=? AND foyer_id=?
        ");
        $stmt->execute([$input['name'], $input['amount'], $input['paid_by'], $input['for_whom'], $input['budget_id'], $input['date'], $id, $foyerId]);
        echo json_encode(fetchExpenseWithBudget($pdo, $id));
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("DELETE FROM expenses WHERE id = ? AND foyer_id = ?")->execute([$id, $foyerId]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
