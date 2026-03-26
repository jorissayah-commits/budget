'use strict';

// ─── Constants ────────────────────────────────────────────────────
const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const CATEGORY_ICONS = {
    'Perso':        '📋',
    'Foyer':        '🏠',
    'Alimentation': '🛒',
    'Transport':    '🚗',
    'Loisirs':      '🎉',
    'Santé':        '💊',
    'Autre':        '📦'
};

// ─── State ────────────────────────────────────────────────────────
const now = new Date();
let currentYear  = now.getFullYear();
let currentMonth = now.getMonth(); // 0-indexed
let editingId    = null; // null = création, number = édition

const PEOPLE = ['Joris', 'Sabrine'];

// ─── Helpers ─────────────────────────────────────────────────────
function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function getMonthTitle() {
    return `${MONTHS_FR[currentMonth]} ${currentYear}`;
}

function formatDayLabel(dateStr) {
    const [, , dd] = dateStr.split('-');
    const monthIdx = parseInt(dateStr.split('-')[1], 10) - 1;
    const dayNum   = parseInt(dd, 10);
    const monthAbbr = MONTHS_FR[monthIdx].substring(0, 3).toUpperCase();
    return `${dayNum} ${monthAbbr}`;
}

function formatAmount(val) {
    return parseFloat(val).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── API calls ───────────────────────────────────────────────────
async function fetchExpenses(month) {
    const res = await fetch(`/api/expenses.php?month=${encodeURIComponent(month)}`);
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
    const res = await fetch(`/api/expenses.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur serveur');
    return json;
}

async function removeExpense(id) {
    const res = await fetch(`/api/expenses.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Erreur suppression');
}

// ─── Balance calculation ─────────────────────────────────────────
function computeBalance(expenses) {
    // net > 0 : Sabrine doit à Joris / net < 0 : Joris doit à Sabrine
    let net = 0;
    expenses.forEach(exp => {
        const amount   = parseFloat(exp.amount);
        const paidBy   = exp.paid_by   || 'Joris';
        const forWhom  = (exp.for_whom || 'Joris,Sabrine').split(',').map(s => s.trim());
        const share    = amount / forWhom.length;

        forWhom.forEach(person => {
            if (person !== paidBy) {
                // "person" doit "share" à "paidBy"
                if (paidBy === 'Joris')   net += share; // Sabrine doit à Joris
                if (paidBy === 'Sabrine') net -= share; // Joris doit à Sabrine
            }
        });
    });
    return net;
}

function renderBalance(expenses) {
    const net  = computeBalance(expenses);
    const el   = document.getElementById('balanceInfo');
    if (Math.abs(net) < 0.01) {
        el.innerHTML = `<span class="balance-neutral">Équilibre ✓</span>`;
        return;
    }
    const debtor  = net > 0 ? 'Sabrine' : 'Joris';
    const creditor = net > 0 ? 'Joris'  : 'Sabrine';
    const cssClass = net > 0 ? 'owes'   : 'owed';
    el.innerHTML = `
        <div class="balance-name">${debtor} doit à ${creditor}</div>
        <div class="balance-amount ${cssClass}">${formatAmount(Math.abs(net))} €</div>`;
}

// ─── Render ──────────────────────────────────────────────────────
function renderExpenses(expenses) {
    const container = document.getElementById('expensesContainer');

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    document.getElementById('totalSpent').textContent = formatAmount(total);
    renderBalance(expenses);

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <p>Aucune dépense ce mois</p>
            </div>`;
        return;
    }

    // Group by date
    const groups = {};
    expenses.forEach(exp => {
        if (!groups[exp.date]) groups[exp.date] = [];
        groups[exp.date].push(exp);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    let html = '';
    sortedDates.forEach(date => {
        html += `<div class="date-group">`;
        html += `<div class="date-label">${formatDayLabel(date)}</div>`;

        groups[date].forEach(exp => {
            const icon      = CATEGORY_ICONS[exp.category] || '📦';
            const amount    = formatAmount(exp.amount);
            const paidBy    = exp.paid_by || 'Joris';
            const payerClass = paidBy.toLowerCase();
            const expData   = escapeHtml(JSON.stringify({
                id: exp.id, name: exp.name, amount: exp.amount,
                category: exp.category, paid_by: paidBy,
                for_whom: exp.for_whom || 'Joris,Sabrine', date: exp.date
            }));
            html += `
            <div class="expense-item" data-id="${exp.id}" data-expense="${expData}">
                <div class="expense-icon">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(exp.name)}</div>
                    <span class="expense-badge">${escapeHtml(exp.category)}</span>
                    <span class="expense-payer ${payerClass}">${escapeHtml(paidBy)}</span>
                </div>
                <div class="expense-right">
                    <span class="expense-amount">${amount}&nbsp;€</span>
                    <span class="expense-chevron">›</span>
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
    attachExpenseListeners();
}

function attachExpenseListeners() {
    document.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', () => {
            const exp = JSON.parse(item.dataset.expense.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
            openEditModal(exp);
        });
    });
}

// ─── Load ────────────────────────────────────────────────────────
async function loadExpenses() {
    const container = document.getElementById('expensesContainer');
    container.innerHTML = '<div class="loading">Chargement…</div>';

    try {
        const expenses = await fetchExpenses(getMonthKey());
        renderExpenses(expenses);
    } catch {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>Impossible de charger les dépenses</p>
            </div>`;
    }
}

// ─── Month navigation ─────────────────────────────────────────────
function updateMonthDisplay() {
    document.getElementById('monthTitle').textContent = getMonthTitle();
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateMonthDisplay();
    loadExpenses();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateMonthDisplay();
    loadExpenses();
});

// ─── Modal ───────────────────────────────────────────────────────
const overlay = document.getElementById('modalOverlay');
const modal   = document.getElementById('modal');

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouvelle dépense';
    document.getElementById('submitBtn').textContent  = 'Ajouter';
    document.getElementById('expenseDate').value = todayISO();
    setToggle('paidByGroup',  ['Joris'],            false);
    setToggle('forWhomGroup', ['Joris', 'Sabrine'], true);
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
    document.getElementById('expenseCategory').value  = exp.category;
    document.getElementById('expenseDate').value      = exp.date;
    setToggle('paidByGroup',  [exp.paid_by || 'Joris'], false);
    setToggle('forWhomGroup', (exp.for_whom || 'Joris,Sabrine').split(',').map(s => s.trim()), true);
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

// ─── Toggle buttons ───────────────────────────────────────────────
function initToggleGroups() {
    // Payé par — single select
    document.querySelectorAll('#paidByGroup .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#paidByGroup .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('expensePaidBy').value = btn.dataset.value;
        });
    });

    // Pour — multi select (au moins 1 requis)
    document.querySelectorAll('#forWhomGroup .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const active = document.querySelectorAll('#forWhomGroup .toggle-btn.active');
            // Empêche de tout décocher
            if (btn.classList.contains('active') && active.length === 1) return;
            btn.classList.toggle('active');
            const selected = [...document.querySelectorAll('#forWhomGroup .toggle-btn.active')]
                .map(b => b.dataset.value).join(',');
            document.getElementById('expenseForWhom').value = selected;
        });
    });
}

function setToggle(groupId, values, multi = false) {
    const vals = Array.isArray(values) ? values : [values];
    document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(btn => {
        btn.classList.toggle('active', vals.includes(btn.dataset.value));
    });
    if (multi) {
        document.getElementById('expenseForWhom').value = vals.join(',');
    } else {
        document.getElementById('expensePaidBy').value = vals[0];
    }
}

initToggleGroups();

document.getElementById('addBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
});

// ─── Delete button (inside edit modal) ───────────────────────────
document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId) return;
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
        await removeExpense(editingId);
        closeModal();
        await loadExpenses();
    } catch {
        alert('Impossible de supprimer la dépense.');
    }
});

// ─── Form submit ─────────────────────────────────────────────────
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('expenseName').value.trim();
    const amount   = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date     = document.getElementById('expenseDate').value;

    if (!name) { document.getElementById('expenseName').focus(); return; }
    if (isNaN(amount) || amount <= 0) { document.getElementById('expenseAmount').focus(); return; }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = editingId ? 'Enregistrement…' : 'Ajout…';

    const paid_by  = document.getElementById('expensePaidBy').value;
    const for_whom = document.getElementById('expenseForWhom').value;

    try {
        if (editingId) {
            await updateExpense(editingId, { name, amount, category, paid_by, for_whom, date });
        } else {
            await createExpense({ name, amount, category, paid_by, for_whom, date });
        }
        closeModal();
        await loadExpenses();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
        btn.textContent = editingId ? 'Enregistrer' : 'Ajouter';
    }
});

// ─── Init ────────────────────────────────────────────────────────
updateMonthDisplay();
loadExpenses();
