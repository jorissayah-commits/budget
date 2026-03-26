'use strict';

// ─── State ────────────────────────────────────────────────────────
let editingId = null;

const TYPE_LABELS = { commun: { label: 'Commun', icon: '🏠' } };
MEMBERS.forEach(m => {
    TYPE_LABELS['perso_' + m.id] = { label: 'Perso ' + m.name, icon: '👤' };
});

// ─── Render ───────────────────────────────────────────────────────
async function loadBudgets() {
    const container = document.getElementById('budgetSections');
    container.innerHTML = '<div class="loading">Chargement…</div>';

    let budgets;
    try {
        budgets = await apiFetch('/api/budgets.php');
    } catch {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Erreur de chargement</p></div>';
        return;
    }

    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Aucun budget créé</p>
                <p style="margin-top:8px;font-size:13px;">Appuyez sur "+ Nouveau budget" pour commencer</p>
            </div>`;
        return;
    }

    // Group by type (préserve l'ordre : commun, puis chaque perso)
    const groups = {};
    BUDGET_TYPES.forEach(t => groups[t] = []);
    budgets.forEach(b => { if (groups[b.type]) groups[b.type].push(b); });

    let html = '';
    for (const [type, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        const { label, icon } = TYPE_LABELS[type] || { label: type, icon: '📦' };
        const total = items.reduce((s, b) => s + parseFloat(b.amount), 0);

        html += `
        <div class="budget-section">
            <div class="budget-section-header">
                <span>${icon} ${label}</span>
                <span class="budget-section-total">${formatAmount(total)} € / mois</span>
            </div>`;

        items.forEach(b => {
            html += `
            <div class="expense-item" data-id="${b.id}">
                <div class="expense-icon">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(b.name)}</div>
                    <span class="expense-badge budget-type-badge budget-type-${b.type}">${escapeHtml(label)}</span>
                </div>
                <div class="expense-right">
                    <span class="expense-amount">${formatAmount(b.amount)}&nbsp;€</span>
                    <span class="expense-chevron">›</span>
                </div>
            </div>`;
        });

        html += `</div>`;
    }

    container.innerHTML = html;
    budgetsCache = budgets;

    container.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id, 10);
            const b  = budgetsCache.find(b => b.id === id);
            if (b) openEditModal(b);
        });
    });
}

let budgetsCache = [];

// ─── Modal ────────────────────────────────────────────────────────
const { modal, open: openOverlay, close: closeOverlay } = initModal('modalOverlay', 'modal', 'modalClose');
const typeToggle = initToggleGroup('budgetTypeGroup', 'budgetType');

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouveau budget';
    document.getElementById('submitBtn').textContent  = 'Créer';
    document.getElementById('budgetForm').reset();
    typeToggle.setValues('commun');
    openOverlay();
    setTimeout(() => document.getElementById('budgetName').focus(), 350);
}

function openEditModal(b) {
    editingId = b.id;
    modal.classList.add('edit-mode');
    document.getElementById('modalTitle').textContent = 'Modifier le budget';
    document.getElementById('submitBtn').textContent  = 'Enregistrer';
    document.getElementById('budgetName').value   = b.name;
    document.getElementById('budgetAmount').value = b.amount;
    typeToggle.setValues(b.type);
    openOverlay();
    setTimeout(() => document.getElementById('budgetName').focus(), 350);
}

function closeModal() {
    closeOverlay();
    document.getElementById('budgetForm').reset();
    document.getElementById('submitBtn').disabled = false;
    editingId = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('addBudgetBtn').addEventListener('click', openAddModal);

// ─── Delete ──────────────────────────────────────────────────────
document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer ce budget ? Les dépenses liées ne seront pas supprimées.')) return;
    try {
        await apiDelete(`/api/budgets.php?id=${editingId}`);
        closeModal(); loadBudgets();
    } catch { alert('Erreur lors de la suppression.'); }
});

// ─── Submit ──────────────────────────────────────────────────────
document.getElementById('budgetForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name   = document.getElementById('budgetName').value.trim();
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    const type   = typeToggle.getValue();

    if (!name || isNaN(amount) || amount <= 0) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;

    try {
        const url    = editingId ? `/api/budgets.php?id=${editingId}` : '/api/budgets.php';
        const method = editingId ? 'PUT' : 'POST';
        await apiSend(url, method, { name, amount, type });
        closeModal(); loadBudgets();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
    }
});

// ─── Init ─────────────────────────────────────────────────────────
loadBudgets();
