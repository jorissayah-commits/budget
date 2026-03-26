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

// ─── Helpers ─────────────────────────────────────────────────────
function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function getMonthTitle() {
    return `${MONTHS_FR[currentMonth]} ${currentYear}`;
}

function formatDayLabel(dateStr) {
    // dateStr = "YYYY-MM-DD"
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

async function removeExpense(id) {
    const res = await fetch(`/api/expenses.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Erreur suppression');
}

// ─── Render ──────────────────────────────────────────────────────
function renderExpenses(expenses) {
    const container = document.getElementById('expensesContainer');

    // Update totals
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    document.getElementById('totalSpent').textContent = formatAmount(total);
    document.getElementById('balance').textContent    = formatAmount(total);

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
            const icon   = CATEGORY_ICONS[exp.category] || '📦';
            const amount = formatAmount(exp.amount);
            html += `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-icon">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(exp.name)}</div>
                    <span class="expense-badge">${escapeHtml(exp.category)}</span>
                </div>
                <div class="expense-right">
                    <span class="expense-amount">${amount}&nbsp;€</span>
                    <button class="expense-delete" data-id="${exp.id}" aria-label="Supprimer">×</button>
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
    attachExpenseListeners();
}

function attachExpenseListeners() {
    const container = document.getElementById('expensesContainer');

    // Delete buttons
    container.querySelectorAll('.expense-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            if (!confirm('Supprimer cette dépense ?')) return;
            try {
                await removeExpense(id);
                await loadExpenses();
            } catch {
                alert('Impossible de supprimer la dépense.');
            }
        });
    });

    // Tap item to reveal delete button (mobile UX)
    container.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('expense-delete')) return;
            // Toggle on this item, hide on others
            const isOpen = item.classList.contains('show-actions');
            container.querySelectorAll('.expense-item.show-actions')
                .forEach(i => i.classList.remove('show-actions'));
            if (!isOpen) item.classList.add('show-actions');
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

function openModal() {
    document.getElementById('expenseDate').value = todayISO();
    overlay.classList.add('active');
    // Small delay to let animation start before focusing
    setTimeout(() => document.getElementById('expenseName').focus(), 350);
}

function closeModal() {
    overlay.classList.remove('active');
    document.getElementById('expenseForm').reset();
    document.getElementById('submitBtn').disabled = false;
}

document.getElementById('addBtn').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
});

// ─── Form submit ─────────────────────────────────────────────────
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('expenseName').value.trim();
    const amount   = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date     = document.getElementById('expenseDate').value;

    if (!name) {
        document.getElementById('expenseName').focus();
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        document.getElementById('expenseAmount').focus();
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Ajout…';

    try {
        await createExpense({ name, amount, category, date });
        closeModal();
        await loadExpenses();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Ajouter';
    }
});

// ─── Init ────────────────────────────────────────────────────────
updateMonthDisplay();
loadExpenses();
