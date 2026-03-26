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

    <!-- Navigation mois -->
    <header class="month-nav">
        <button class="nav-btn" id="prevMonth" aria-label="Mois précédent">&#8249;</button>
        <h1 class="month-title" id="monthTitle"></h1>
        <button class="nav-btn" id="nextMonth" aria-label="Mois suivant">&#8250;</button>
    </header>

    <!-- Cartes stats -->
    <div class="stats-grid stats-grid--single">
        <div class="stat-card">
            <span class="stat-label">Dépensé ce mois</span>
            <div class="stat-amount">
                <span class="stat-value" id="totalSpent">0</span>
                <span class="stat-currency">€</span>
            </div>
        </div>
    </div>

    <!-- Liste des dépenses -->
    <div class="expenses-container" id="expensesContainer">
        <div class="empty-state">
            <div class="empty-icon">💸</div>
            <p>Aucune dépense ce mois</p>
        </div>
    </div>

</div>

<!-- Bouton ajouter (fixe) -->
<div class="add-btn-wrapper">
    <button class="add-btn" id="addBtn">
        <span class="add-icon">+</span>
        Ajouter une dépense
    </button>
</div>

<!-- Modal ajout dépense -->
<div class="modal-overlay" id="modalOverlay" role="dialog" aria-modal="true" aria-label="Ajouter une dépense">
    <div class="modal" id="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
            <h2 id="modalTitle">Nouvelle dépense</h2>
            <button class="modal-close" id="modalClose" aria-label="Fermer">&times;</button>
        </div>
        <form id="expenseForm" novalidate>
            <div class="form-group">
                <label for="expenseName">Nom de la dépense</label>
                <input type="text" id="expenseName" placeholder="Ex : Courses, Loyer, Netflix…" autocomplete="off" required>
            </div>
            <div class="form-group">
                <label for="expenseAmount">Montant</label>
                <div class="input-with-suffix">
                    <input type="number" id="expenseAmount" placeholder="0,00" step="0.01" min="0.01" inputmode="decimal" required>
                    <span class="input-suffix">€</span>
                </div>
            </div>
            <div class="form-group">
                <label for="expenseCategory">Catégorie</label>
                <div class="select-wrapper">
                    <select id="expenseCategory">
                        <option value="Perso">📋 Perso</option>
                        <option value="Foyer">🏠 Foyer</option>
                        <option value="Alimentation">🛒 Alimentation</option>
                        <option value="Transport">🚗 Transport</option>
                        <option value="Loisirs">🎉 Loisirs</option>
                        <option value="Santé">💊 Santé</option>
                        <option value="Autre">📦 Autre</option>
                    </select>
                    <span class="select-arrow">›</span>
                </div>
            </div>
            <div class="form-group">
                <label for="expenseDate">Date</label>
                <input type="date" id="expenseDate" required>
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">
                Ajouter
            </button>
            <button type="button" class="delete-btn" id="deleteBtn">
                Supprimer la dépense
            </button>
        </form>
    </div>
</div>

<script src="js/app.js"></script>
</body>
</html>
