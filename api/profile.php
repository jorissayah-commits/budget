<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405); echo json_encode(['error' => 'Méthode non autorisée']); exit;
}

require_once __DIR__ . '/../db/database.php';
require_once __DIR__ . '/../includes/auth.php';

$currentUser = requireAuth(true);
$action      = $_GET['action'] ?? '';
$data        = json_decode(file_get_contents('php://input'), true);

switch ($action) {

    case 'name':
        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            http_response_code(400); echo json_encode(['error' => 'Le prénom est requis']); exit;
        }
        $pdo->prepare("UPDATE users SET name = ? WHERE id = ?")->execute([$name, $currentUser['id']]);
        // Mettre à jour la session
        session_start();
        $_SESSION['user_name'] = $name;
        echo json_encode(['success' => true, 'name' => $name]);
        break;

    case 'password':
        $currentPw = $data['current_password'] ?? '';
        $newPw     = $data['new_password'] ?? '';

        if (empty($currentPw) || empty($newPw)) {
            http_response_code(400); echo json_encode(['error' => 'Les deux champs sont requis']); exit;
        }
        if (strlen($newPw) < 6) {
            http_response_code(400); echo json_encode(['error' => 'Le nouveau mot de passe doit contenir au moins 6 caractères']); exit;
        }

        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$currentUser['id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($currentPw, $user['password_hash'])) {
            http_response_code(400); echo json_encode(['error' => 'Mot de passe actuel incorrect']); exit;
        }

        $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([
            password_hash($newPw, PASSWORD_DEFAULT),
            $currentUser['id'],
        ]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Action invalide']);
}
