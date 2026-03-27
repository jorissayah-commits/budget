<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/db/database.php';
session_start();

// Déjà connecté → rediriger
if (!empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// Vérification du token d'invitation (optionnel)
$inviteToken = trim($_GET['invite'] ?? '');
$invite      = null;

if ($inviteToken) {
    $stmt = $pdo->prepare("
        SELECT * FROM invitations
        WHERE token = ? AND used_by IS NULL AND expires_at > datetime('now')
    ");
    $stmt->execute([$inviteToken]);
    $invite = $stmt->fetch();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name        = trim($_POST['name'] ?? '');
    $email       = strtolower(trim($_POST['email'] ?? ''));
    $password    = $_POST['password'] ?? '';
    $tokenFromForm = trim($_POST['invite_token'] ?? '');

    if (empty($name) || empty($email) || empty($password)) {
        $error = 'Tous les champs sont requis';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Adresse email invalide';
    } elseif (strlen($password) < 6) {
        $error = 'Le mot de passe doit contenir au moins 6 caractères';
    } else {
        // Vérifier que l'email n'est pas déjà utilisé
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $error = 'Cette adresse email est déjà utilisée';
        } else {
            $pdo->beginTransaction();
            try {
                // Créer l'utilisateur
                $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
                $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
                $userId = (int)$pdo->lastInsertId();

                $joinedFoyer = false;

                // Rejoindre un foyer existant via invitation ?
                if ($tokenFromForm) {
                    $stmt = $pdo->prepare("
                        SELECT * FROM invitations
                        WHERE token = ? AND used_by IS NULL AND expires_at > datetime('now')
                    ");
                    $stmt->execute([$tokenFromForm]);
                    $inv = $stmt->fetch();

                    if ($inv) {
                        $stmt = $pdo->prepare("INSERT OR IGNORE INTO foyer_members (foyer_id, user_id, role) VALUES (?, ?, 'member')");
                        $stmt->execute([$inv['foyer_id'], $userId]);
                        $stmt = $pdo->prepare("UPDATE invitations SET used_by = ? WHERE id = ?");
                        $stmt->execute([$userId, $inv['id']]);
                        $joinedFoyer = true;
                    }
                }

                // Sinon, créer un foyer solo
                if (!$joinedFoyer) {
                    $stmt = $pdo->prepare("INSERT INTO foyers (name) VALUES (?)");
                    $stmt->execute([$name . "'s foyer"]);
                    $foyerId = (int)$pdo->lastInsertId();

                    $stmt = $pdo->prepare("INSERT INTO foyer_members (foyer_id, user_id, role) VALUES (?, ?, 'owner')");
                    $stmt->execute([$foyerId, $userId]);
                }

                $pdo->commit();

                // Connexion automatique
                $_SESSION['user_id']   = $userId;
                $_SESSION['user_name'] = $name;
                header('Location: index.php');
                exit;

            } catch (Exception $e) {
                $pdo->rollBack();
                $error = 'Erreur lors de la création du compte. Réessayez.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0d0e14">
    <title><?= APP_NAME ?> — Créer un compte</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<div class="login-page">
    <div class="login-card">
        <h1 class="login-title"><?= APP_NAME ?></h1>

        <?php if ($invite): ?>
            <p class="login-subtitle">Vous avez été invité(e) à rejoindre un foyer !</p>
        <?php else: ?>
            <p class="login-subtitle">Créez votre compte</p>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="login-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" novalidate>
            <?php if ($inviteToken): ?>
                <input type="hidden" name="invite_token" value="<?= htmlspecialchars($inviteToken) ?>">
            <?php endif; ?>

            <div class="form-group">
                <label for="name">Prénom</label>
                <input type="text" id="name" name="name"
                       placeholder="Votre prénom"
                       autocomplete="given-name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email"
                       placeholder="vous@exemple.com"
                       autocomplete="email" required>
            </div>
            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password"
                       placeholder="6 caractères minimum"
                       autocomplete="new-password" required>
            </div>
            <button type="submit" class="submit-btn">Créer mon compte</button>
        </form>

        <p class="login-link">Déjà un compte ? <a href="login.php">Se connecter</a></p>
    </div>
</div>

</body>
</html>
