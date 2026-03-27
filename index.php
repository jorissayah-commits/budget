<?php $currentPage = 'depenses'; include 'includes/head.php'; ?>

<div class="app">

    <!-- Navigation mois -->
    <header class="month-nav">
        <button class="nav-btn" id="prevMonth" aria-label="Mois précédent">&#8249;</button>
        <h1 class="month-title" id="monthTitle"></h1>
        <button class="nav-btn" id="nextMonth" aria-label="Mois suivant">&#8250;</button>
    </header>

    <!-- Liste des dépenses -->
    <div class="expenses-container" id="expensesContainer">
        <div class="empty-state">
            <div class="empty-icon">💸</div>
            <p>Aucune dépense ce mois</p>
        </div>
    </div>

</div>

<!-- Bouton ajouter -->
<div class="add-btn-wrapper">
    <button class="add-btn" id="addBtn">
        <span class="add-icon">+</span>
        Ajouter une dépense
    </button>
</div>

<?php include 'includes/nav.php'; ?>

<!-- Modal ajout/édition dépense -->
<div class="modal-overlay" id="modalOverlay" role="dialog" aria-modal="true">
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

            <?php if (count($foyerMembers) >= 2): ?>
            <div class="form-group">
                <label>Payé par</label>
                <div class="toggle-group" id="paidByGroup">
                    <?php foreach ($foyerMembers as $m): ?>
                        <button type="button" class="toggle-btn" data-value="<?= htmlspecialchars($m['name']) ?>"><?= htmlspecialchars($m['name']) ?></button>
                    <?php endforeach; ?>
                </div>
                <input type="hidden" id="expensePaidBy" value="<?= htmlspecialchars($currentUser['name']) ?>">
            </div>
            <?php else: ?>
                <input type="hidden" id="expensePaidBy" value="<?= htmlspecialchars($currentUser['name']) ?>">
            <?php endif; ?>

            <div class="form-group">
                <label>Pour</label>
                <div class="toggle-group" id="expenseTypeGroup">
                    <button type="button" class="toggle-btn active" data-value="foyer">Foyer</button>
                    <?php foreach ($foyerMembers as $m): ?>
                        <button type="button" class="toggle-btn" data-value="<?= htmlspecialchars($m['name']) ?>"><?= htmlspecialchars($m['name']) ?></button>
                    <?php endforeach; ?>
                </div>
                <input type="hidden" id="expenseType" value="foyer">
            </div>
            <div class="form-group" id="budgetPickerGroup">
                <label>Budget</label>
                <div class="budget-picker" id="budgetPicker">
                    <div class="budget-picker-empty">Aucun budget disponible —<br>créez-en un dans l'onglet Budget</div>
                </div>
                <input type="hidden" id="expenseBudgetId" value="">
            </div>
            <div class="form-group">
                <label for="expenseDate">Date</label>
                <input type="date" id="expenseDate" required>
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">Ajouter</button>
            <button type="button" class="delete-btn" id="deleteBtn">Supprimer la dépense</button>
        </form>
    </div>
</div>

<script src="js/shared.js"></script>
<script src="js/app.js"></script>
</body>
</html>
