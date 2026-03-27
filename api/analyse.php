<?php
/**
 * API Analyse — calcul rigoureux côté serveur.
 *
 * Logique :
 *   - paid[M]  = ce que M a sorti de sa poche (paid_by = M)
 *   - share[M] = ce qui a réellement été dépensé POUR M
 *                (amount / nb_bénéficiaires, pour chaque dépense où M est dans for_whom)
 *   - balance[M] = paid[M] - share[M]
 *                  > 0 → les autres lui doivent
 *                  < 0 → il/elle doit aux autres
 *
 * En foyer à 2, balance[0] + balance[1] = 0 toujours.
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';

$currentUser = requireAuth(true);
$foyerCtx    = getFoyerContext($pdo, $currentUser['id']);
$foyerId     = $foyerCtx['foyer_id'];
$members     = $foyerCtx['members'];

if (!$foyerId) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun foyer configuré']);
    exit;
}

$month = $_GET['month'] ?? date('Y-m');
if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    http_response_code(400);
    echo json_encode(['error' => 'Format de mois invalide']);
    exit;
}

// Toutes les dépenses du foyer pour ce mois
$stmt = $pdo->prepare("
    SELECT amount, paid_by, for_whom
    FROM expenses
    WHERE foyer_id = ? AND strftime('%Y-%m', date) = ?
");
$stmt->execute([$foyerId, $month]);
$expenses = $stmt->fetchAll();

// Initialiser les accumulateurs par nom de membre
$paid  = [];
$share = [];
foreach ($members as $m) {
    $paid[$m['name']]  = 0.0;
    $share[$m['name']] = 0.0;
}

$foyerTotal = 0.0;

foreach ($expenses as $exp) {
    $amount      = (float)$exp['amount'];
    $paidBy      = trim($exp['paid_by']);
    $beneficiaries = array_filter(
        array_map('trim', explode(',', $exp['for_whom'])),
        fn($s) => $s !== ''
    );
    $n = count($beneficiaries);
    if ($n === 0) continue;

    $foyerTotal += $amount;

    // Qui a payé
    if (array_key_exists($paidBy, $paid)) {
        $paid[$paidBy] += $amount;
    }

    // Part pour chaque bénéficiaire
    $perPerson = $amount / $n;
    foreach ($beneficiaries as $name) {
        if (array_key_exists($name, $share)) {
            $share[$name] += $perPerson;
        }
    }
}

// Construire la réponse
$membersResult = [];
foreach ($members as $m) {
    $name    = $m['name'];
    $balance = ($paid[$name] ?? 0.0) - ($share[$name] ?? 0.0);
    $membersResult[] = [
        'id'      => $m['id'],
        'name'    => $name,
        'paid'    => round($paid[$name]  ?? 0.0, 2),
        'share'   => round($share[$name] ?? 0.0, 2),
        'balance' => round($balance, 2),
    ];
}

echo json_encode([
    'month'       => $month,
    'foyer_total' => round($foyerTotal, 2),
    'members'     => $membersResult,
]);
