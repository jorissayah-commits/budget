<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../db/database.php';

$currentUser  = requireAuth();
$foyerCtx     = getFoyerContext($pdo, $currentUser['id']);
$foyerMembers = $foyerCtx['members'];
$foyerId      = $foyerCtx['foyer_id'];
$budgetTypes  = getAllowedBudgetTypes($foyerMembers);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0d0e14">
    <title><?= APP_NAME ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
<!-- Config JS injectée depuis PHP (source unique de vérité) -->
<script>
    window.APP_CONFIG = {
        members:      <?= json_encode($foyerMembers) ?>,
        budgetTypes:  <?= json_encode($budgetTypes) ?>,
        currentUser:  <?= json_encode($currentUser) ?>,
        foyerId:      <?= json_encode($foyerId) ?>,
        isCoupleMode: <?= json_encode(count($foyerMembers) >= 2) ?>
    };
</script>
