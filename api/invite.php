<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';

$currentUser = requireAuth(true);
$foyerCtx    = getFoyerContext($pdo, $currentUser['id']);

if (!$foyerCtx['foyer_id']) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun foyer trouvé']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// Générer un token unique
$token   = bin2hex(random_bytes(16));
$expires = date('Y-m-d H:i:s', strtotime('+7 days'));

$stmt = $pdo->prepare("INSERT INTO invitations (foyer_id, token, expires_at) VALUES (?, ?, ?)");
$stmt->execute([$foyerCtx['foyer_id'], $token, $expires]);

// Construire l'URL d'invitation
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host     = $_SERVER['HTTP_HOST'];
// /api/invite.php → remonte de 2 niveaux pour obtenir la racine
$root     = rtrim(dirname(dirname($_SERVER['PHP_SELF'])), '/');
$url      = $protocol . '://' . $host . $root . '/register.php?invite=' . $token;

echo json_encode(['url' => $url]);
