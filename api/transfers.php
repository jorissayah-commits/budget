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
        $month = $_GET['month'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            http_response_code(400); echo json_encode(['error' => 'Format de mois invalide']); break;
        }
        $stmt = $pdo->prepare("
            SELECT * FROM transfers
            WHERE foyer_id = ? AND strftime('%Y-%m', date) = ?
            ORDER BY date DESC, created_at DESC
        ");
        $stmt->execute([$foyerId, $month]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data    = json_decode(file_get_contents('php://input'), true);
        $toUser  = trim($data['to_user'] ?? '');
        $amount  = floatval($data['amount'] ?? 0);
        $date    = $data['date'] ?? date('Y-m-d');

        if (empty($toUser)) { http_response_code(400); echo json_encode(['error' => 'Destinataire requis']); break; }
        if ($amount <= 0)   { http_response_code(400); echo json_encode(['error' => 'Montant invalide']); break; }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400); echo json_encode(['error' => 'Format de date invalide']); break;
        }

        $stmt = $pdo->prepare("INSERT INTO transfers (foyer_id, from_user, to_user, amount, date) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$foyerId, $currentUser['name'], $toUser, $amount, $date]);

        $id = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM transfers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID invalide']); break; }
        $pdo->prepare("DELETE FROM transfers WHERE id = ? AND foyer_id = ?")->execute([$id, $foyerId]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
