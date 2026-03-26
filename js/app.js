'use strict';

// ─── State ────────────────────────────────────────────────────────
const now = new Date();
let currentYear  = now.getFullYear();
let currentMonth = now.getMonth();
let editingId    = null;
let allBudgets   = [];
let expensesCache = []; // les dépenses du mois courant, pour lookup par ID

// ─── Month helpers ────────────────────────────────────────────────
function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function getMonthTitle() {
    return `${MONTHS_FR[currentMonth]} ${currentYear}`;
}

// ─── Balance ──────────────────────────────────────────────────────
function computeBalance(expenses) {
    // net > 0 : member[1] doit à member[0] / net < 0 : member[0] doit à member[1]
    const m0 = MEMBERS[0].name;
    const m1 = MEMBERS[1].name;
    let net = 0;

    expenses.forEach(exp => {
        const amount  = parseFloat(exp.amount);
        const paidBy  = exp.paid_by || m0;
        const forWhom = (exp.for_whom || `${m0},${m1}`).split(',').map(s => s.trim());
        const share   = amount / forWhom.length;

        forWhom.forEach(person => {
            if (person !== paidBy) {
                if (paidBy === m0) net += share;
                if (paidBy === m1) net -= share;
            }
        });
    });
    return net;
}

function renderBalance(expenses) {
    const m0  = MEMBERS[0].name;
    const m1  = MEMBERS[1].name;
    const net = computeBalance(expenses);
    const el  = document.getElementById('balanceInfo');

    if (Math.abs(net) < 0.01) {
        el.innerHTML = `<span class="balance-neutral">Équilibre ✓</span>`;
        return;
    }
    const debtor   = net > 0 ? m1 : m0;
    const creditor = net > 0 ? m0 : m1;
    const cls      = net > 0 ? 'owes' : 'owed';
    el.innerHTML = `
        <div class="balance-name">${debtor} doit à ${creditor}</div>
        <div class="balance-amount ${cls}">${formatAmount(Math.abs(net))} €</div>`;
}

// ─── Render expenses ──────────────────────────────────────────────
function renderExpenses(expenses) {
    expensesCache = expenses;
    const container = document.getElementById('expensesContainer');
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    document.getElementById('totalSpent').textContent = formatAmount(total);
    renderBalance(expenses);

    if (expenses.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>Aucune dépense ce mois</p></div>`;
        return;
    }

    // Group by date
    const groups = {};
    expenses.forEach(exp => {
        if (!groups[exp.date]) groups[exp.date] = [];
        groups[exp.date].push(exp);
    });

    let html = '';
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
        html += `<div class="date-group"><div class="date-label">${formatDayLabel(date)}</div>`;
        groups[date].forEach(exp => {
            const paidBy     = exp.paid_by || MEMBERS[0].name;
            const payerClass = paidBy.toLowerCase();
            const budgetName = exp.budget_name || '';
            const budgetType = exp.budget_type || '';
            const typeLabel  = budgetType === 'commun' ? 'Commun' : 'Personnel';

            html += `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-icon">${budgetType === 'commun' ? '🏠' : '👤'}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(exp.name)}</div>
                    <span class="expense-badge">${escapeHtml(budgetName || typeLabel)}</span>
                    <span class="expense-payer ${payerClass}">${escapeHtml(paidBy)}</span>
                </div>
                <div class="expense-right">
                    <span class="expense-amount">${formatAmount(exp.amount)}&nbsp;€</span>
                    <span class="expense-chevron">›</span>
                </div>
            </div>`;
        });
        html += `</div>`;
    });

    container.innerHTML = html;

    // Click → lookup from cache by ID (pas de JSON dans le DOM)
    container.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', () => {
            const id  = parseInt(item.dataset.id, 10);
            const exp = expensesCache.find(e => e.id === id);
            if (exp) openEditModal(exp);
        });
    });
}

async function loadExpenses() {
    const container = document.getElementById('expensesContainer');
    container.innerHTML = '<div class="loading">Chargement…</div>';
    try {
        const expenses = await apiFetch(`/api/expenses.php?month=${encodeURIComponent(getMonthKey())}`);
        renderExpenses(expenses);
    } catch {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Impossible de charger</p></div>`;
    }
}

// ─── Month nav ────────────────────────────────────────────────────
function updateMonthDisplay() {
    document.getElementById('monthTitle').textContent = getMonthTitle();
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateMonthDisplay(); loadExpenses();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateMonthDisplay(); loadExpenses();
});

// ─── Budget picker ────────────────────────────────────────────────
function renderBudgetPicker(selectedType, selectedId = null) {
    const picker = document.getElementById('budgetPicker');
    const filtered = allBudgets.filter(b =>
        selectedType === 'commun' ? b.type === 'commun' : b.type.startsWith('perso_')
    );

    if (filtered.length === 0) {
        picker.innerHTML = `<div class="budget-picker-empty">Aucun budget disponible —<br>créez-en un dans l'onglet Budget</div>`;
        document.getElementById('expenseBudgetId').value = '';
        return;
    }

    picker.innerHTML = filtered.map(b => {
        const active = String(b.id) === String(selectedId) ? 'active' : '';
        const memberId = getMemberIdFromBudgetType(b.type);
        const sub = memberId ? getMemberName(memberId) : '';
        return `<button type="button" class="budget-pick-btn ${active}" data-id="${b.id}">
            <span class="budget-pick-name">${escapeHtml(b.name)}</span>
            ${sub ? `<span class="budget-pick-sub">${sub}</span>` : ''}
        </button>`;
    }).join('');

    // Auto-select first if none matched
    if (!selectedId || !filtered.find(b => String(b.id) === String(selectedId))) {
        const first = picker.querySelector('.budget-pick-btn');
        if (first) { first.classList.add('active'); document.getElementById('expenseBudgetId').value = first.dataset.id; }
    }

    picker.querySelectorAll('.budget-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            picker.querySelectorAll('.budget-pick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('expenseBudgetId').value = btn.dataset.id;
        });
    });
}

// ─── Modal ────────────────────────────────────────────────────────
const { modal, open: openOverlay, close: closeOverlay } = initModal('modalOverlay', 'modal', 'modalClose');

const paidByToggle  = initToggleGroup('paidByGroup',     'expensePaidBy');
const typeToggle    = initToggleGroup('expenseTypeGroup', 'expenseType', {
    onChange: val => renderBudgetPicker(val)
});

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouvelle dépense';
    document.getElementById('submitBtn').textContent  = 'Ajouter';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = todayISO();
    paidByToggle.setValues([MEMBERS[0].name]);
    typeToggle.setValues(['commun']);
    renderBudgetPicker('commun');
    openOverlay();
    setTimeout(() => document.getElementById('expenseName').focus(), 350);
}

function openEditModal(exp) {
    editingId = exp.id;
    modal.classList.add('edit-mode');
    document.getElementById('modalTitle').textContent = 'Modifier la dépense';
    document.getElementById('submitBtn').textContent  = 'Enregistrer';
    document.getElementById('expenseName').value      = exp.name;
    document.getElementById('expenseAmount').value    = exp.amount;
    document.getElementById('expenseDate').value      = exp.date;

    const type = exp.budget_type === 'commun' ? 'commun' : (exp.budget_id ? 'personnel' : 'commun');
    paidByToggle.setValues([exp.paid_by || MEMBERS[0].name]);
    typeToggle.setValues([type]);
    renderBudgetPicker(type, exp.budget_id);
    openOverlay();
    setTimeout(() => document.getElementById('expenseName').focus(), 350);
}

function closeModal() {
    closeOverlay();
    document.getElementById('expenseForm').reset();
    document.getElementById('submitBtn').disabled = false;
    editingId = null;
}

// Re-bind close to our extended version
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('addBtn').addEventListener('click', openAddModal);

// ─── Delete ──────────────────────────────────────────────────────
document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer cette dépense ?')) return;
    try {
        await apiDelete(`/api/expenses.php?id=${editingId}`);
        closeModal(); loadExpenses();
    } catch { alert('Impossible de supprimer.'); }
});

// ─── Submit ──────────────────────────────────────────────────────
document.getElementById('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name      = document.getElementById('expenseName').value.trim();
    const amount    = parseFloat(document.getElementById('expenseAmount').value);
    const paid_by   = paidByToggle.getValue();
    const expType   = typeToggle.getValue();
    const budget_id = document.getElementById('expenseBudgetId').value;
    const date      = document.getElementById('expenseDate').value;

    if (!name || isNaN(amount) || amount <= 0) return;

    // Dérivation automatique de for_whom
    let for_whom;
    if (expType === 'commun') {
        for_whom = MEMBERS.map(m => m.name).join(',');
    } else {
        const budget = allBudgets.find(b => String(b.id) === String(budget_id));
        if (budget) {
            const memberId = getMemberIdFromBudgetType(budget.type);
            for_whom = memberId ? getMemberName(memberId) : paid_by;
        } else {
            for_whom = paid_by;
        }
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = editingId ? 'Enregistrement…' : 'Ajout…';

    try {
        const data = { name, amount, paid_by, for_whom, budget_id, date };
        const url  = editingId ? `/api/expenses.php?id=${editingId}` : '/api/expenses.php';
        await apiSend(url, editingId ? 'PUT' : 'POST', data);
        closeModal(); loadExpenses();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
        btn.textContent = editingId ? 'Enregistrer' : 'Ajouter';
    }
});

// ─── Init ─────────────────────────────────────────────────────────
updateMonthDisplay();
apiFetch('/api/budgets.php').then(b => { allBudgets = b; }).catch(() => {});
loadExpenses();
