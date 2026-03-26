'use strict';

const TYPE_LABELS = {
    commun:        { label: 'Commun',        icon: '🏠' },
    perso_joris:   { label: 'Perso Joris',   icon: '👤' },
    perso_sabrine: { label: 'Perso Sabrine', icon: '👤' },
};

let editingId = null;

// ─── API ─────────────────────────────────────────────────────────
async function fetchBudgets() {
    const res = await fetch('/api/budgets.php');
    if (!res.ok) throw new Error('Erreur réseau');
    return res.json();
}

async function saveBudget(data, id = null) {
    const url    = id ? `/api/budgets.php?id=${id}` : '/api/budgets.php';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur serveur');
    return json;
}

async function deleteBudget(id) {
    const res = await fetch(`/api/budgets.php?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur suppression');
}

// ─── Render ───────────────────────────────────────────────────────
async function loadBudgets() {
    const container = document.getElementById('budgetSections');
    container.innerHTML = '<div class="loading">Chargement…</div>';

    let budgets;
    try {
        budgets = await fetchBudgets();
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

    // Group by type
    const groups = { commun: [], perso_joris: [], perso_sabrine: [] };
    budgets.forEach(b => { if (groups[b.type]) groups[b.type].push(b); });

    let html = '';
    for (const [type, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        const { label, icon } = TYPE_LABELS[type];
        const total = items.reduce((s, b) => s + parseFloat(b.amount), 0);

        html += `
        <div class="budget-section">
            <div class="budget-section-header">
                <span>${icon} ${label}</span>
                <span class="budget-section-total">${formatAmount(total)} € / mois</span>
            </div>`;

        items.forEach(b => {
            html += `
            <div class="expense-item" data-budget='${escapeAttr(JSON.stringify(b))}'>
                <div class="expense-icon">${icon}</div>
                <div class="expense-info">
                    <div class="expense-name">${escapeHtml(b.name)}</div>
                    <span class="expense-badge budget-type-badge budget-type-${b.type}">${label}</span>
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

    container.querySelectorAll('.expense-item').forEach(item => {
        item.addEventListener('click', () => {
            const b = JSON.parse(item.dataset.budget);
            openEditModal(b);
        });
    });
}

function formatAmount(val) {
    return parseFloat(val).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
    return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ─── Modal ────────────────────────────────────────────────────────
const overlay = document.getElementById('modalOverlay');
const modal   = document.getElementById('modal');

function openAddModal() {
    editingId = null;
    modal.classList.remove('edit-mode');
    document.getElementById('modalTitle').textContent = 'Nouveau budget';
    document.getElementById('submitBtn').textContent  = 'Créer';
    document.getElementById('budgetForm').reset();
    setTypeToggle('commun');
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('budgetName').focus(), 350);
}

function openEditModal(b) {
    editingId = b.id;
    modal.classList.add('edit-mode');
    document.getElementById('modalTitle').textContent = 'Modifier le budget';
    document.getElementById('submitBtn').textContent  = 'Enregistrer';
    document.getElementById('budgetName').value   = b.name;
    document.getElementById('budgetAmount').value = b.amount;
    setTypeToggle(b.type);
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('budgetName').focus(), 350);
}

function closeModal() {
    overlay.classList.remove('active');
    modal.classList.remove('edit-mode');
    document.getElementById('budgetForm').reset();
    document.getElementById('submitBtn').disabled = false;
    editingId = null;
}

function setTypeToggle(value) {
    document.querySelectorAll('#budgetTypeGroup .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === value);
    });
    document.getElementById('budgetType').value = value;
}

// Toggle type (single select, 3 options)
document.querySelectorAll('#budgetTypeGroup .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setTypeToggle(btn.dataset.value));
});

document.getElementById('addBudgetBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!editingId || !confirm('Supprimer ce budget ? Les dépenses liées ne seront pas supprimées.')) return;
    try {
        await deleteBudget(editingId);
        closeModal();
        loadBudgets();
    } catch { alert('Erreur lors de la suppression.'); }
});

document.getElementById('budgetForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name   = document.getElementById('budgetName').value.trim();
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    const type   = document.getElementById('budgetType').value;

    if (!name || isNaN(amount) || amount <= 0) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;

    try {
        await saveBudget({ name, amount, type }, editingId);
        closeModal();
        loadBudgets();
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.disabled = false;
    }
});

loadBudgets();
