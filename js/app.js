'use strict';

// ─── State ────────────────────────────────────────────────────────
const now = new Date();
let currentYear   = now.getFullYear();
let currentMonth  = now.getMonth();
let editingId     = null;
let allBudgets    = [];
let expensesCache = [];
let allIncomes    = [];
let transfersCache = [];

// ─── Month helpers ────────────────────────────────────────────────
function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function getMonthTitle() {
    return `${MONTHS_FR[currentMonth]} ${currentYear}`;
}

// ─── Render incomes ──────────────────────────────────────────────
function renderIncomes() {
    const container = document.getElementById('incomesContainer');
    if (allIncomes.length === 0) { container.innerHTML = ''; return; }

    const today = new Date();
    const viewingCurrentMonth = (currentYear === today.getFullYear() && currentMonth === today.getMonth());
    const viewingPast = (currentYear < today.getFullYear()) || (currentYear === today.getFullYear() && currentMonth < today.getMonth());
    const currentDay = today.getDate();

    // Compute days in the viewed month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let html = '<div class="suivi-section"><div class="suivi-section-title">💰 Revenus</div>';

    allIncomes.forEach(inc => {
        const day = Math.min(inc.day_of_month, daysInMonth);
        const isPast = viewingPast || (viewingCurrentMonth && currentDay >= day);
        const isFuture = !isPast;
        const dateStr = `${day} ${MONTHS_FR[currentMonth].substring(0, 3).toUpperCase()}`;

        html += `
        <div class="expense-item ${isFuture ? 'income-preview' : ''}">
            <div class="expense-icon">💰</div>
            <div class="expense-info">
                <div class="expense-name">${escapeHtml(inc.name)}</div>
                <div class="expense-meta">${escapeHtml(inc.user_name)} · ${dateStr}${isFuture ? ' · prévu' : ''}</div>
            </div>
            <div class="expense-right">
                <span class="expense-amount income-amount">+${formatAmount(inc.amount)}&nbsp;€</span>
            </div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ─── Render expenses ──────────────────────────────────────────────
function renderExpenses(expenses) {
    expensesCache = expenses;
    const container = document.getElementById('expensesContainer');

    if (expenses.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>Aucune dépense ce mois</p></div>`;
        return;
    }

    // Grouper par date
    const groups = {};
    expenses.forEach(exp => {
        if (!groups[exp.date]) groups[exp.date] = [];
        groups[exp.date].push(exp);
    });

    let html = '';
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
        html += `<div class="date-group"><div class="date-label">${formatDayLabel(date)}</div>`;
        groups[date].forEach(exp => {
            const paidBy    = exp.paid_by || MEMBERS[0].name;
            const forWhom   = exp.for_whom || '';
            const pourLabel = getPourLabel(forWhom);
            const icon      = pourLabel === 'Foyer' ? '🏠' : '👤';

            let metaHtml = '';
            if (IS_COUPLE_MODE) {
                metaHtml = `<div class="expense-meta">Payé par ${escapeHtml(paidBy)}, pour ${escapeHtml(pourLabel)}</div>`;
            }

            html += `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-icon">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(exp.name)}</div>
                    ${metaHtml}
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
            const id  = parseInt(item.dataset.id, 10);
            const exp = expensesCache.find(e => e.id === id);
            if (exp) openEditModal(exp);
        });
    });
}

// ─── Render transfers ────────────────────────────────────────────
function renderTransfers() {
    const container = document.getElementById('transfersContainer');
    if (!IS_COUPLE_MODE || transfersCache.length === 0) { container.innerHTML = ''; return; }

    let html = '<div class="suivi-section"><div class="suivi-section-title">↗ Virements</div>';

    transfersCache.forEach(t => {
        const dateStr = formatDayLabel(t.date);
        html += `
        <div class="expense-item transfer-item" data-transfer-id="${t.id}">
            <div class="expense-icon">↗</div>
            <div class="expense-info">
                <div class="expense-name">Virement à ${escapeHtml(t.to_user)}</div>
                <div class="expense-meta">${escapeHtml(t.from_user)} → ${escapeHtml(t.to_user)} · ${dateStr}</div>
            </div>
            <div class="expense-right">
                <span class="expense-amount transfer-amount">${formatAmount(t.amount)}&nbsp;€</span>
            </div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.transfer-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.transferId, 10);
            if (confirm('Supprimer ce virement ?')) {
                apiDelete(`/api/transfers.php?id=${id}`).then(() => loadAll()).catch(() => alert('Erreur'));
            }
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

async function loadTransfers() {
    if (!IS_COUPLE_MODE) return;
    try {
        transfersCache = await apiFetch(`/api/transfers.php?month=${encodeURIComponent(getMonthKey())}`);
        renderTransfers();
    } catch {
        transfersCache = [];
    }
}

async function loadAll() {
    renderIncomes();
    await Promise.all([loadExpenses(), loadTransfers()]);
}

// ─── Month nav ────────────────────────────────────────────────────
function updateMonthDisplay() {
    document.getElementById('monthTitle').textContent = getMonthTitle();
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateMonthDisplay(); loadAll();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateMonthDisplay(); loadAll();
});

// ─── Budget picker ────────────────────────────────────────────────
function renderBudgetPicker(pourValue, selectedId = null) {
    const picker   = document.getElementById('budgetPicker');
    const filtered = allBudgets.filter(b => {
        if (pourValue === 'foyer') return b.type === 'commun';
        const member = MEMBERS.find(m => m.name === pourValue);
        return member ? b.type === 'perso_' + member.id : false;
    });

    const noBudgetActive = !selectedId ? 'active' : '';
    let html = `<button type="button" class="budget-pick-btn ${noBudgetActive}" data-id="">
        <span class="budget-pick-name">Sans budget</span>
    </button>`;

    html += filtered.map(b => {
        const active   = String(b.id) === String(selectedId) ? 'active' : '';
        const memberId = getMemberIdFromBudgetType(b.type);
        const sub      = memberId ? getMemberName(memberId) : '';
        return `<button type="button" class="budget-pick-btn ${active}" data-id="${b.id}">
            <span class="budget-pick-name">${escapeHtml(b.name)}</span>
            ${sub ? `<span class="budget-pick-sub">${sub}</span>` : ''}
        </button>`;
    }).join('');

    picker.innerHTML = html;
    document.getElementById('expenseBudgetId').value = selectedId || '';

    picker.querySelectorAll('.budget-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            picker.querySelectorAll('.budget-pick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('expenseBudgetId').value = btn.dataset.id;
        });
    });
}

// ─── Helpers ──────────────────────────────────────────────────────
function getPourValue(exp) {
    if (!exp.for_whom) return 'foyer';
    const names = exp.for_whom.split(',').map(s => s.trim()).filter(Boolean);
    if (names.length >= MEMBERS.length) return 'foyer';
    if (names.length === 1 && MEMBERS.find(m => m.name === names[0])) return names[0];
    return 'foyer';
}

function getPourLabel(forWhom) {
    if (!forWhom) return 'Foyer';
    const names = forWhom.split(',').map(s => s.trim()).filter(Boolean);
    if (names.length >= MEMBERS.length) return 'Foyer';
    if (names.length === 1) return names[0];
    return 'Foyer';
}

// ─── Expense Modal ───────────────────────────────────────────────
const { modal, open: openOverlay, close: closeOverlay } = initModal('modalOverlay', 'modal', 'modalClose');

const paidByToggle = IS_COUPLE_MODE
    ? initToggleGroup('paidByGroup', 'expensePaidBy')
    : null;

const typeToggle = initToggleGroup('expenseTypeGroup', 'expenseType', {
    onChange: val => renderBudgetPicker(val)
});

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouvelle dépense';
    document.getElementById('submitBtn').textContent  = 'Ajouter';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = todayISO();
    if (paidByToggle) paidByToggle.setValues([CURRENT_USER.name]);
    typeToggle.setValues(['foyer']);
    renderBudgetPicker('foyer');
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

    const pourValue = getPourValue(exp);
    if (paidByToggle) paidByToggle.setValues([exp.paid_by || MEMBERS[0].name]);
    typeToggle.setValues([pourValue]);
    renderBudgetPicker(pourValue, exp.budget_id);
    openOverlay();
    setTimeout(() => document.getElementById('expenseName').focus(), 350);
}

function closeModal() {
    closeOverlay();
    document.getElementById('expenseForm').reset();
    document.getElementById('submitBtn').disabled = false;
    editingId = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('addBtn').addEventListener('click', openAddModal);

document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer cette dépense ?')) return;
    try {
        await apiDelete(`/api/expenses.php?id=${editingId}`);
        closeModal(); loadAll();
    } catch { alert('Impossible de supprimer.'); }
});

document.getElementById('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name      = document.getElementById('expenseName').value.trim();
    const amount    = parseFloat(document.getElementById('expenseAmount').value);
    const paid_by   = paidByToggle ? paidByToggle.getValue() : CURRENT_USER.name;
    const expType   = typeToggle.getValue();
    const budget_id = document.getElementById('expenseBudgetId').value;
    const date      = document.getElementById('expenseDate').value;

    if (!name || isNaN(amount) || amount <= 0) return;

    const for_whom = expType === 'foyer'
        ? MEMBERS.map(m => m.name).join(',')
        : expType;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = editingId ? 'Enregistrement…' : 'Ajout…';

    try {
        const data = { name, amount, paid_by, for_whom, budget_id, date };
        const url  = editingId ? `/api/expenses.php?id=${editingId}` : '/api/expenses.php';
        await apiSend(url, editingId ? 'PUT' : 'POST', data);
        closeModal(); loadAll();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
        btn.textContent = editingId ? 'Enregistrer' : 'Ajouter';
    }
});

// ─── Transfer Modal ──────────────────────────────────────────────
if (IS_COUPLE_MODE) {
    const { modal: transferModal, open: openTransferOverlay, close: closeTransferOverlay } = initModal('transferModalOverlay', 'transferModal', 'transferModalClose');

    const partner = MEMBERS.find(m => m.id !== CURRENT_USER.id);

    document.getElementById('addTransferBtn').addEventListener('click', () => {
        transferModal.classList.remove('edit-mode');
        document.getElementById('transferForm').reset();
        document.getElementById('transferDate').value = todayISO();
        document.getElementById('transferModalTitle').textContent = `Virement à ${partner ? partner.name : 'partenaire'}`;
        openTransferOverlay();
        setTimeout(() => document.getElementById('transferAmount').focus(), 350);
    });

    document.getElementById('transferForm').addEventListener('submit', async e => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const date   = document.getElementById('transferDate').value;

        if (isNaN(amount) || amount <= 0) return;

        const btn = document.getElementById('transferSubmitBtn');
        btn.disabled = true;

        try {
            await apiSend('/api/transfers.php', 'POST', {
                to_user: partner.name,
                amount,
                date
            });
            closeTransferOverlay();
            document.getElementById('transferForm').reset();
            btn.disabled = false;
            loadAll();
        } catch (err) {
            alert('Erreur : ' + err.message);
            btn.disabled = false;
        }
    });
}

// ─── Init ─────────────────────────────────────────────────────────
updateMonthDisplay();

Promise.all([
    apiFetch('/api/budgets.php').then(b => { allBudgets = b; }).catch(() => {}),
    apiFetch('/api/incomes.php').then(i => { allIncomes = i; }).catch(() => {}),
]).then(() => loadAll());
