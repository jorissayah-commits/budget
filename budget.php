<?php $currentPage = 'budget'; include 'includes/head.php'; ?>

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

<?php include 'includes/nav.php'; ?>

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
                    <?php foreach (MEMBERS as $m): ?>
                        <button type="button" class="toggle-btn" data-value="perso_<?= $m['id'] ?>">Perso <?= $m['name'] ?></button>
                    <?php endforeach; ?>
                </div>
                <input type="hidden" id="budgetType" value="commun">
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">Créer</button>
            <button type="button" class="delete-btn" id="deleteBtn">Supprimer ce budget</button>
        </form>
    </div>
</div>

<script src="js/shared.js"></script>
<script src="js/budget.js"></script>
</body>
</html>
