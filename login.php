<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/db/database.php';
session_start();

// Déjà connecté → rediriger
if (!empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        header('Location: index.php');
        exit;
    }

    $error = 'Email ou mot de passe incorrect';
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0d0e14">
    <title><?= APP_NAME ?> — Connexion</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<div class="login-page">
    <div class="login-card">
        <h1 class="login-title"><?= APP_NAME ?></h1>
        <p class="login-subtitle">Connectez-vous pour continuer</p>

        <?php if ($error): ?>
            <div class="login-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" novalidate>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email"
                       placeholder="vous@exemple.com"
                       autocomplete="email" required>
            </div>
            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password"
                       autocomplete="current-password" required>
            </div>
            <button type="submit" class="submit-btn">Se connecter</button>
        </form>

        <p class="login-link">Pas encore de compte ? <a href="register.php">Créer un compte</a></p>
    </div>
</div>

</body>
</html>
