'use strict';

// ─── Constants ────────────────────────────────────────────────────
const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ─── State ────────────────────────────────────────────────────────
const now = new Date();
let currentYear  = now.getFullYear();
let currentMonth = now.getMonth();
let editingId    = null;
let allBudgets   = [];

// ─── Helpers ─────────────────────────────────────────────────────
function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function getMonthTitle() {
    return `${MONTHS_FR[currentMonth]} ${currentYear}`;
}

function formatDayLabel(dateStr) {
    const parts    = dateStr.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    const dayNum   = parseInt(parts[2], 10);
    return `${dayNum} ${MONTHS_FR[monthIdx].substring(0, 3).toUpperCase()}`;
}

function formatAmount(val) {
    return parseFloat(val).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── API ─────────────────────────────────────────────────────────
async function fetchExpenses(month) {
    const res = await fetch(`/api/expenses.php?month=${encodeURIComponent(month)}`);
    if (!res.ok) throw new Error('Erreur réseau');
    return res.json();
}

async function fetchBudgets() {
    const res = await fetch('/api/budgets.php');
    if (!res.ok) throw new Error('Erreur réseau');
    return res.json();
}

async function createExpense(data) {
    const res = await fetch('/api/expenses.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur serveur');
    return json;
}

async function updateExpense(id, data) {
    const res = await fetch(`/api/expenses.php?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur serveur');
    return json;
}

async function removeExpense(id) {
    const res = await fetch(`/api/expenses.php?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur suppression');
}

// ─── Balance ──────────────────────────────────────────────────────
function computeBalance(expenses) {
    let net = 0;
    expenses.forEach(exp => {
        const amount  = parseFloat(exp.amount);
        const paidBy  = exp.paid_by  || 'Joris';
        const forWhom = (exp.for_whom || 'Joris,Sabrine').split(',').map(s => s.trim());
        const share   = amount / forWhom.length;
        forWhom.forEach(person => {
            if (person !== paidBy) {
                if (paidBy === 'Joris')   net += share;
                if (paidBy === 'Sabrine') net -= share;
            }
        });
    });
    return net;
}

function renderBalance(expenses) {
    const net = computeBalance(expenses);
    const el  = document.getElementById('balanceInfo');
    if (Math.abs(net) < 0.01) {
        el.innerHTML = `<span class="balance-neutral">Équilibre ✓</span>`;
        return;
    }
    const debtor   = net > 0 ? 'Sabrine' : 'Joris';
    const creditor = net > 0 ? 'Joris'   : 'Sabrine';
    const cls      = net > 0 ? 'owes'    : 'owed';
    el.innerHTML = `
        <div class="balance-name">${debtor} doit à ${creditor}</div>
        <div class="balance-amount ${cls}">${formatAmount(Math.abs(net))} €</div>`;
}

// ─── Render expenses ─────────────────────────────────────────────
function renderExpenses(expenses) {
    const container = document.getElementById('expensesContainer');
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    document.getElementById('totalSpent').textContent = formatAmount(total);
    renderBalance(expenses);

    if (expenses.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>Aucune dépense ce mois</p></div>`;
        return;
    }

    const groups = {};
    expenses.forEach(exp => {
        if (!groups[exp.date]) groups[exp.date] = [];
        groups[exp.date].push(exp);
    });

    let html = '';
    Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(date => {
        html += `<div class="date-group"><div class="date-label">${formatDayLabel(date)}</div>`;
        groups[date].forEach(exp => {
            const paidBy     = exp.paid_by || 'Joris';
            const payerClass = paidBy.toLowerCase();
            const budgetName = exp.budget_name || '';
            const budgetType = exp.budget_type || '';
            const typeLabel  = budgetType === 'commun' ? 'Commun' : 'Personnel';
            const expData    = escapeHtml(JSON.stringify({
                id: exp.id, name: exp.name, amount: exp.amount,
                paid_by: paidBy, for_whom: exp.for_whom || 'Joris,Sabrine',
                budget_id: exp.budget_id || '', budget_type: budgetType, date: exp.date
            }));
            html += `
            <div class="expense-item" data-expense="${expData}">
                <div class="expense-icon">${budgetType === 'commun' ? '🏠' : '👤'}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(exp.name)}</div>
                    <span class="expense-badge">${budgetName || typeLabel}</span>
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
    container.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', () => {
            const exp = JSON.parse(item.dataset.expense.replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
            openEditModal(exp);
        });
    });
}

async function loadExpenses() {
    const container = document.getElementById('expensesContainer');
    container.innerHTML = '<div class="loading">Chargement…</div>';
    try {
        const expenses = await fetchExpenses(getMonthKey());
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

    // Filter budgets : commun → type commun, personnel → perso_joris + perso_sabrine
    const filtered = allBudgets.filter(b =>
        selectedType === 'commun'
            ? b.type === 'commun'
            : b.type === 'perso_joris' || b.type === 'perso_sabrine'
    );

    if (filtered.length === 0) {
        picker.innerHTML = `<div class="budget-picker-empty">Aucun budget disponible —<br>créez-en un dans l'onglet Budget</div>`;
        document.getElementById('expenseBudgetId').value = '';
        return;
    }

    picker.innerHTML = filtered.map(b => {
        const active = String(b.id) === String(selectedId) ? 'active' : '';
        const sub    = b.type === 'perso_joris' ? 'Joris' : b.type === 'perso_sabrine' ? 'Sabrine' : '';
        return `<button type="button" class="budget-pick-btn ${active}" data-id="${b.id}">
            <span class="budget-pick-name">${escapeHtml(b.name)}</span>
            ${sub ? `<span class="budget-pick-sub">${sub}</span>` : ''}
        </button>`;
    }).join('');

    // Auto-select first if none selected
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
const overlay = document.getElementById('modalOverlay');
const modal   = document.getElementById('modal');

function setToggle(groupId, values, hiddenId) {
    const vals = Array.isArray(values) ? values : [values];
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(btn => {
        btn.classList.toggle('active', vals.includes(btn.dataset.value));
    });
    if (hiddenId) document.getElementById(hiddenId).value = vals[0];
}

function initToggleGroups() {
    // Payé par — single
    document.querySelectorAll('#paidByGroup .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setToggle('paidByGroup', [btn.dataset.value], 'expensePaidBy');
        });
    });

    // Type (commun/personnel) — single, met à jour le picker
    document.querySelectorAll('#expenseTypeGroup .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setToggle('expenseTypeGroup', [btn.dataset.value], 'expenseType');
            renderBudgetPicker(btn.dataset.value);
        });
    });
}

initToggleGroups();

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouvelle dépense';
    document.getElementById('submitBtn').textContent  = 'Ajouter';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = todayISO();
    setToggle('paidByGroup',    ['Joris'],   'expensePaidBy');
    setToggle('expenseTypeGroup',['commun'], 'expenseType');
    renderBudgetPicker('commun');
    overlay.classList.add('active');
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
    setToggle('paidByGroup',     [exp.paid_by || 'Joris'], 'expensePaidBy');
    setToggle('expenseTypeGroup',[type],                   'expenseType');
    renderBudgetPicker(type, exp.budget_id);
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('expenseName').focus(), 350);
}

function closeModal() {
    overlay.classList.remove('active');
    modal.classList.remove('edit-mode');
    document.getElementById('expenseForm').reset();
    document.getElementById('submitBtn').disabled = false;
    editingId = null;
}

document.getElementById('addBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer cette dépense ?')) return;
    try {
        await removeExpense(editingId);
        closeModal(); loadExpenses();
    } catch { alert('Impossible de supprimer.'); }
});

document.getElementById('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name      = document.getElementById('expenseName').value.trim();
    const amount    = parseFloat(document.getElementById('expenseAmount').value);
    const paid_by   = document.getElementById('expensePaidBy').value;
    const for_whom  = paid_by; // pour l'instant 1 personne, à affiner si besoin
    const budget_id = document.getElementById('expenseBudgetId').value;
    const date      = document.getElementById('expenseDate').value;

    if (!name || isNaN(amount) || amount <= 0) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = editingId ? 'Enregistrement…' : 'Ajout…';

    try {
        const data = { name, amount, paid_by, for_whom, budget_id, date };
        if (editingId) await updateExpense(editingId, data);
        else           await createExpense(data);
        closeModal(); loadExpenses();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
        btn.textContent = editingId ? 'Enregistrer' : 'Ajouter';
    }
});

// ─── Init ─────────────────────────────────────────────────────────
updateMonthDisplay();
fetchBudgets().then(b => { allBudgets = b; }).catch(() => {});
loadExpenses();
