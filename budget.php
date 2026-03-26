<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0d0e14">
    <title>Budget</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<div class="app">
    <header class="page-header">
        <h1 class="page-title">Budget</h1>
    </header>

    <div id="budgetSections"></div>
</div>

<!-- Bouton ajouter -->
<div class="add-btn-wrapper">
    <button class="add-btn" id="addBudgetBtn">
        <span class="add-icon">+</span>
        Nouveau budget
    </button>
</div>

<!-- Barre de navigation -->
<nav class="bottom-nav">
    <a href="index.php" class="bottom-nav-item">
        <span class="bottom-nav-icon">💸</span>
        <span>Dépenses</span>
    </a>
    <a href="budget.php" class="bottom-nav-item active">
        <span class="bottom-nav-icon">📊</span>
        <span>Budget</span>
    </a>
</nav>

<!-- Modal budget -->
<div class="modal-overlay" id="modalOverlay" role="dialog" aria-modal="true">
    <div class="modal" id="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
            <h2 id="modalTitle">Nouveau budget</h2>
            <button class="modal-close" id="modalClose" aria-label="Fermer">&times;</button>
        </div>
        <form id="budgetForm" novalidate>
            <div class="form-group">
                <label for="budgetName">Nom du budget</label>
                <input type="text" id="budgetName" placeholder="Ex : Loyer, Courses, Coiffeur…" autocomplete="off" required>
            </div>
            <div class="form-group">
                <label for="budgetAmount">Montant mensuel</label>
                <div class="input-with-suffix">
                    <input type="number" id="budgetAmount" placeholder="0,00" step="0.01" min="0.01" inputmode="decimal" required>
                    <span class="input-suffix">€</span>
                </div>
            </div>
            <div class="form-group">
                <label>Type</label>
                <div class="toggle-group" id="budgetTypeGroup">
                    <button type="button" class="toggle-btn active" data-value="commun">Commun</button>
                    <button type="button" class="toggle-btn" data-value="perso_joris">Perso Joris</button>
                    <button type="button" class="toggle-btn" data-value="perso_sabrine">Perso Sabrine</button>
                </div>
                <input type="hidden" id="budgetType" value="commun">
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">Créer</button>
            <button type="button" class="delete-btn" id="deleteBtn">Supprimer ce budget</button>
        </form>
    </div>
</div>

<script src="js/budget.js"></script>
</body>
</html>
