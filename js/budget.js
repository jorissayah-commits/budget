'use strict';

// ─── State ────────────────────────────────────────────────────────
let editingId    = null;
let budgetsCache = [];

let editingIncomeId = null;
let incomesCache    = [];

// Labels dynamiques basés sur les membres du foyer
const TYPE_LABELS = { commun: { label: 'Commun', icon: '🏠' } };
MEMBERS.forEach((m, idx) => {
    TYPE_LABELS['perso_' + m.id] = {
        label: 'Perso ' + m.name,
        icon:  '👤',
        memberIdx: idx,
    };
});

// ═══════════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════════

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

    // Grouper par type (commun d'abord, puis perso de chaque membre)
    const groups = {};
    BUDGET_TYPES.forEach(t => groups[t] = []);
    budgets.forEach(b => { if (groups[b.type]) groups[b.type].push(b); });

    let html = '';
    for (const [type, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        const info        = TYPE_LABELS[type] || { label: type, icon: '📦', memberIdx: -1 };
        const { label, icon, memberIdx } = info;
        const badgeClass  = type === 'commun'
            ? 'budget-type-commun'
            : `budget-type-perso member-${memberIdx ?? 0}`;
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
                <div class="expense-icon expense-icon--budget">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(b.name)}</div>
                    <span class="expense-badge budget-type-badge ${badgeClass}">${escapeHtml(label)}</span>
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

// ─── Budget Modal ────────────────────────────────────────────────
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

document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer ce budget ? Les dépenses liées ne seront pas supprimées.')) return;
    try {
        await apiDelete(`/api/budgets.php?id=${editingId}`);
        closeModal(); loadBudgets();
    } catch { alert('Erreur lors de la suppression.'); }
});

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

// ═══════════════════════════════════════════════════════════════════
// REVENUS
// ═══════════════════════════════════════════════════════════════════

async function loadIncomes() {
    const container = document.getElementById('incomeSections');
    container.innerHTML = '<div class="loading">Chargement…</div>';

    let incomes;
    try {
        incomes = await apiFetch('/api/incomes.php');
    } catch {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Erreur de chargement</p></div>';
        return;
    }

    if (incomes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <p>Aucun revenu configuré</p>
                <p style="margin-top:8px;font-size:13px;">Appuyez sur "+ Nouveau revenu" pour commencer</p>
            </div>`;
        return;
    }

    incomesCache = incomes;

    // Group by user
    const byUser = {};
    incomes.forEach(inc => {
        if (!byUser[inc.user_name]) byUser[inc.user_name] = [];
        byUser[inc.user_name].push(inc);
    });

    let html = '';
    for (const [userName, items] of Object.entries(byUser)) {
        const total = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const memberIdx = getMemberIndex(userName);

        html += `
        <div class="budget-section">
            <div class="budget-section-header">
                <span>💰 ${escapeHtml(userName)}</span>
                <span class="budget-section-total">${formatAmount(total)} € / mois</span>
            </div>`;

        items.forEach(inc => {
            const isOwn = inc.user_id === CURRENT_USER.id;
            html += `
            <div class="expense-item ${isOwn ? 'income-editable' : ''}" data-income-id="${inc.id}">
                <div class="expense-icon expense-icon--income">💰</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(inc.name)}</div>
                    <div class="expense-meta">Le ${inc.day_of_month} de chaque mois</div>
                </div>
                <div class="expense-right">
                    <span class="expense-amount income-amount">+${formatAmount(inc.amount)}&nbsp;€</span>
                    ${isOwn ? '<span class="expense-chevron">›</span>' : ''}
                </div>
            </div>`;
        });

        html += `</div>`;
    }

    container.innerHTML = html;

    // Only own incomes are clickable
    container.querySelectorAll('.income-editable').forEach(item => {
        item.addEventListener('click', () => {
            const id  = parseInt(item.dataset.incomeId, 10);
            const inc = incomesCache.find(i => i.id === id);
            if (inc) openEditIncomeModal(inc);
        });
    });
}

// ─── Income Modal ────────────────────────────────────────────────
const { modal: incomeModal, open: openIncomeOverlay, close: closeIncomeOverlay } = initModal('incomeModalOverlay', 'incomeModal', 'incomeModalClose');

function openAddIncomeModal() {
    editingIncomeId = null;
    incomeModal.classList.remove('edit-mode');
    document.getElementById('incomeModalTitle').textContent = 'Nouveau revenu';
    document.getElementById('incomeSubmitBtn').textContent  = 'Créer';
    document.getElementById('incomeForm').reset();
    openIncomeOverlay();
    setTimeout(() => document.getElementById('incomeName').focus(), 350);
}

function openEditIncomeModal(inc) {
    editingIncomeId = inc.id;
    incomeModal.classList.add('edit-mode');
    document.getElementById('incomeModalTitle').textContent = 'Modifier le revenu';
    document.getElementById('incomeSubmitBtn').textContent  = 'Enregistrer';
    document.getElementById('incomeName').value   = inc.name;
    document.getElementById('incomeAmount').value = inc.amount;
    document.getElementById('incomeDay').value    = inc.day_of_month;
    openIncomeOverlay();
    setTimeout(() => document.getElementById('incomeName').focus(), 350);
}

function closeIncomeModal() {
    closeIncomeOverlay();
    document.getElementById('incomeForm').reset();
    document.getElementById('incomeSubmitBtn').disabled = false;
    editingIncomeId = null;
}

document.getElementById('incomeModalClose').addEventListener('click', closeIncomeModal);
document.getElementById('addIncomeBtn').addEventListener('click', openAddIncomeModal);

document.getElementById('incomeDeleteBtn').addEventListener('click', async () => {
    if (!editingIncomeId || !confirm('Supprimer ce revenu ?')) return;
    try {
        await apiDelete(`/api/incomes.php?id=${editingIncomeId}`);
        closeIncomeModal(); loadIncomes();
    } catch { alert('Erreur lors de la suppression.'); }
});

document.getElementById('incomeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name         = document.getElementById('incomeName').value.trim();
    const amount       = parseFloat(document.getElementById('incomeAmount').value);
    const day_of_month = parseInt(document.getElementById('incomeDay').value, 10);

    if (!name || isNaN(amount) || amount <= 0 || isNaN(day_of_month)) return;

    const btn = document.getElementById('incomeSubmitBtn');
    btn.disabled = true;

    try {
        const url    = editingIncomeId ? `/api/incomes.php?id=${editingIncomeId}` : '/api/incomes.php';
        const method = editingIncomeId ? 'PUT' : 'POST';
        await apiSend(url, method, { name, amount, day_of_month });
        closeIncomeModal(); loadIncomes();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
    }
});

// ─── Init ─────────────────────────────────────────────────────────
loadBudgets();
loadIncomes();
