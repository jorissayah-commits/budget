<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../config/bridge.php';

$currentUser = requireAuth();
$userId      = $currentUser['id'];

header('Content-Type: application/json');

// ─── Helper HTTP vers Bridge ──────────────────────────────────────
function bridgeRequest(string $method, string $path, array $data = [], ?string $userToken = null): array {
    $url = BRIDGE_API_BASE . $path;
    $headers = [
        'Bridge-Version: ' . BRIDGE_VERSION,
        'Client-Id: '      . BRIDGE_CLIENT_ID,
        'Client-Secret: '  . BRIDGE_CLIENT_SECRET,
        'accept: application/json',
        'content-type: application/json',
    ];
    if ($userToken) {
        $headers[] = 'Authorization: Bearer ' . $userToken;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 15,
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    } elseif ($method === 'GET' && !empty($data)) {
        // $data ignoré pour GET, utiliser query string dans $path
    }

    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['ok' => false, 'code' => 0, 'body' => ['message' => $err]];
    }

    return ['ok' => $code >= 200 && $code < 300, 'code' => $code, 'body' => json_decode($raw, true) ?? []];
}

// ─── Crée ou récupère le Bridge user ─────────────────────────────
// V3 : pas d'email/password — juste un external_user_id
function getOrCreateBridgeUser(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $bu = $stmt->fetch();
    if ($bu) return $bu;

    $externalId = 'budget_user_' . $userId;

    $res = bridgeRequest('POST', '/aggregation/users', ['external_user_id' => $externalId]);

    if (!$res['ok']) {
        throw new RuntimeException('Impossible de créer le compte Bridge : ' . ($res['body']['message'] ?? json_encode($res['body'])));
    }

    $bridgeUuid = $res['body']['uuid'] ?? '';

    $pdo->prepare("INSERT INTO bridge_users (user_id, bridge_uuid, external_user_id) VALUES (?,?,?)")
        ->execute([$userId, $bridgeUuid, $externalId]);

    $stmt->execute([$userId]);
    return $stmt->fetch();
}

// ─── Authentifie le Bridge user → access_token ───────────────────
function authenticateBridgeUser(array $bu): string {
    $res = bridgeRequest('POST', '/aggregation/authorization/token', [
        'external_user_id' => $bu['external_user_id'],
    ]);

    if (!$res['ok'] || empty($res['body']['access_token'])) {
        throw new RuntimeException('Auth Bridge échouée : ' . ($res['body']['message'] ?? json_encode($res['body'])));
    }

    return $res['body']['access_token'];
}

// ════════════════════════════════════════════════════════════════════
$action = $_GET['action'] ?? '';

try {

    // ── GET status ─────────────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'status') {
        $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $bu = $stmt->fetch();

        if (!$bu) {
            echo json_encode(['connected' => false]);
            exit;
        }

        $token = authenticateBridgeUser($bu);
        $res   = bridgeRequest('GET', '/aggregation/accounts', [], $token);

        echo json_encode([
            'connected' => true,
            'accounts'  => $res['body']['resources'] ?? [],
        ]);
        exit;
    }

    // ── POST connect : génère l'URL de connexion Bridge ────────────
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'connect') {
        $bu    = getOrCreateBridgeUser($pdo, $userId);
        $token = authenticateBridgeUser($bu);

        $res = bridgeRequest('POST', '/aggregation/connect-sessions', [], $token);

        if (!$res['ok']) {
            http_response_code(502);
            echo json_encode(['error' => $res['body']['message'] ?? json_encode($res['body'])]);
            exit;
        }

        echo json_encode(['url' => $res['body']['url'] ?? '']);
        exit;
    }

    // ── GET transactions ───────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'transactions') {
        $month     = $_GET['month'] ?? date('Y-m');
        $accountId = $_GET['account_id'] ?? null;

        [$year, $mon] = explode('-', $month);
        $since   = "{$year}-{$mon}-01";
        $lastDay = date('t', mktime(0, 0, 0, (int)$mon, 1, (int)$year));
        $until   = "{$year}-{$mon}-{$lastDay}";

        $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $bu = $stmt->fetch();

        if (!$bu) { echo json_encode(['transactions' => []]); exit; }

        $token  = authenticateBridgeUser($bu);
        $params = http_build_query(array_filter([
            'since'      => $since,
            'until'      => $until,
            'account_id' => $accountId,
            'limit'      => 200,
        ]));

        $res = bridgeRequest('GET', '/aggregation/transactions?' . $params, [], $token);
        echo json_encode(['transactions' => $res['body']['resources'] ?? []]);
        exit;
    }

    // ── POST import ────────────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'import') {
        $body     = json_decode(file_get_contents('php://input'), true) ?? [];
        $foyerCtx = getFoyerContext($pdo, $userId);
        $foyerId  = $foyerCtx['foyer_id'];

        if (!$foyerId) { http_response_code(400); echo json_encode(['error' => 'Pas de foyer']); exit; }

        $txs      = $body['transactions'] ?? [];
        $imported = 0;
        $stmt     = $pdo->prepare("INSERT INTO expenses (foyer_id, name, amount, paid_by, for_whom, budget_id, date) VALUES (?,?,?,?,?,?,?)");

        foreach ($txs as $tx) {
            $amount = abs((float)($tx['amount'] ?? 0));
            if ($amount <= 0) continue;
            $stmt->execute([
                $foyerId,
                $tx['label']    ?? 'Transaction',
                $amount,
                $currentUser['name'],
                $tx['for_whom'] ?? $currentUser['name'],
                $tx['budget_id'] ?? null,
                substr($tx['date'] ?? date('Y-m-d'), 0, 10),
            ]);
            $imported++;
        }

        echo json_encode(['imported' => $imported]);
        exit;
    }

    // ── DELETE disconnect ──────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'disconnect') {
        $pdo->prepare("DELETE FROM bridge_users WHERE user_id = ?")->execute([$userId]);
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Action inconnue']);

} catch (RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
