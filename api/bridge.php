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
        'Client-Id: '      . BRIDGE_CLIENT_ID,
        'Client-Secret: '  . BRIDGE_CLIENT_SECRET,
        'Bankin-Version: ' . BRIDGE_VERSION,
        'Content-Type: application/json',
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

// ─── Récupère / crée le Bridge user local ────────────────────────
function getBridgeUser(PDO $pdo, int $userId): ?array {
    return $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?")
               ->execute([$userId]) ? $pdo->query("SELECT * FROM bridge_users WHERE user_id = $userId")->fetch() : null;
}

function getOrCreateBridgeUser(PDO $pdo, int $userId, string $appEmail): array {
    $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $bu = $stmt->fetch();

    if ($bu) return $bu;

    // Créer un Bridge user avec un email/password dérivé
    $bridgeEmail    = 'bridge_' . $userId . '_' . md5($appEmail) . '@budget.local';
    $bridgePassword = bin2hex(random_bytes(16));

    $res = bridgeRequest('POST', '/v2/users', [
        'email'    => $bridgeEmail,
        'password' => $bridgePassword,
    ]);

    if (!$res['ok']) {
        throw new RuntimeException('Impossible de créer le compte Bridge : ' . ($res['body']['message'] ?? 'erreur inconnue'));
    }

    $pdo->prepare("INSERT INTO bridge_users (user_id, bridge_email, bridge_password) VALUES (?,?,?)")
        ->execute([$userId, $bridgeEmail, $bridgePassword]);

    $stmt->execute([$userId]);
    return $stmt->fetch();
}

// ─── Authentifie le Bridge user → retourne access_token ──────────
function authenticateBridgeUser(array $bu): string {
    $res = bridgeRequest('POST', '/v2/authenticate', [
        'email'    => $bu['bridge_email'],
        'password' => $bu['bridge_password'],
    ]);

    if (!$res['ok'] || empty($res['body']['access_token'])) {
        throw new RuntimeException('Authentification Bridge échouée : ' . ($res['body']['message'] ?? 'erreur inconnue'));
    }

    return $res['body']['access_token'];
}

// ════════════════════════════════════════════════════════════════════
$action = $_GET['action'] ?? '';

try {
    // ── GET status : Bridge user connecté ? quels comptes ? ────────
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'status') {
        $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $bu = $stmt->fetch();

        if (!$bu) {
            echo json_encode(['connected' => false]);
            exit;
        }

        $token = authenticateBridgeUser($bu);
        $res   = bridgeRequest('GET', '/v2/accounts', [], $token);

        echo json_encode([
            'connected' => true,
            'accounts'  => $res['body']['resources'] ?? [],
        ]);
        exit;
    }

    // ── POST connect : génère l'URL de connexion bancaire ──────────
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'connect') {
        $body        = json_decode(file_get_contents('php://input'), true) ?? [];
        $redirectUrl = $body['redirect_url'] ?? '';

        if (!$redirectUrl) {
            http_response_code(400);
            echo json_encode(['error' => 'redirect_url requis']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $appEmail = $stmt->fetchColumn();

        $bu    = getOrCreateBridgeUser($pdo, $userId, $appEmail);
        $token = authenticateBridgeUser($bu);

        $res = bridgeRequest('POST', '/v2/connect/items/add/url', [
            'redirect_url' => $redirectUrl,
            'country'      => 'fr',
        ], $token);

        if (!$res['ok']) {
            http_response_code(502);
            echo json_encode(['error' => $res['body']['message'] ?? 'Erreur Bridge']);
            exit;
        }

        echo json_encode(['url' => $res['body']['redirect_url'] ?? $res['body']['url'] ?? '']);
        exit;
    }

    // ── GET transactions : récupère les transactions d'un mois ─────
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'transactions') {
        $month     = $_GET['month'] ?? date('Y-m');          // format YYYY-MM
        $accountId = $_GET['account_id'] ?? null;

        [$year, $mon] = explode('-', $month);
        $since  = "{$year}-{$mon}-01";
        $lastDay = date('t', mktime(0, 0, 0, (int)$mon, 1, (int)$year));
        $until  = "{$year}-{$mon}-{$lastDay}";

        $stmt = $pdo->prepare("SELECT * FROM bridge_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $bu = $stmt->fetch();

        if (!$bu) {
            echo json_encode(['transactions' => []]);
            exit;
        }

        $token  = authenticateBridgeUser($bu);
        $params = http_build_query(array_filter([
            'since'      => $since,
            'until'      => $until,
            'account_id' => $accountId,
            'limit'      => 200,
        ]));

        $res = bridgeRequest('GET', '/v2/transactions?' . $params, [], $token);

        echo json_encode(['transactions' => $res['body']['resources'] ?? []]);
        exit;
    }

    // ── POST import : importe des transactions sélectionnées ───────
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'import') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $foyerCtx = getFoyerContext($pdo, $userId);
        $foyerId  = $foyerCtx['foyer_id'];

        if (!$foyerId) {
            http_response_code(400);
            echo json_encode(['error' => 'Pas de foyer']);
            exit;
        }

        $transactions = $body['transactions'] ?? [];
        $imported = 0;

        $stmt = $pdo->prepare("
            INSERT INTO expenses (foyer_id, name, amount, paid_by, for_whom, budget_id, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($transactions as $tx) {
            $name     = $tx['label'] ?? $tx['clean_description'] ?? 'Transaction';
            $amount   = abs((float)($tx['amount'] ?? 0));
            $date     = substr($tx['date'] ?? date('Y-m-d'), 0, 10);
            $paidBy   = $currentUser['name'];
            $forWhom  = $tx['for_whom'] ?? $currentUser['name'];
            $budgetId = $tx['budget_id'] ?? null;

            if ($amount <= 0) continue;

            $stmt->execute([$foyerId, $name, $amount, $paidBy, $forWhom, $budgetId, $date]);
            $imported++;
        }

        echo json_encode(['imported' => $imported]);
        exit;
    }

    // ── DELETE disconnect : supprime la connexion Bridge ───────────
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
