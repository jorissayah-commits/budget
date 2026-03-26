'use strict';

/**
 * Fonctions partagées entre toutes les pages.
 * Les constantes de config viennent de window.APP_CONFIG (injecté par PHP).
 */

// ─── Config ──────────────────────────────────────────────────────
const MEMBERS      = window.APP_CONFIG.members;       // [{id, name}, ...]
const BUDGET_TYPES = window.APP_CONFIG.budgetTypes;   // ['commun', 'perso_joris', ...]

const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ─── Formatting ──────────────────────────────────────────────────
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
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
}

function formatDayLabel(dateStr) {
    const parts    = dateStr.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    const dayNum   = parseInt(parts[2], 10);
    return `${dayNum} ${MONTHS_FR[monthIdx].substring(0, 3).toUpperCase()}`;
}

// ─── Member helpers ──────────────────────────────────────────────
function getMemberName(id) {
    const m = MEMBERS.find(m => m.id === id);
    return m ? m.name : id;
}

function getMemberIdFromBudgetType(budgetType) {
    // 'perso_joris' → 'joris', 'perso_sabrine' → 'sabrine'
    if (budgetType && budgetType.startsWith('perso_')) {
        return budgetType.replace('perso_', '');
    }
    return null;
}

// ─── Current user shortcut ───────────────────────────────────────
const CURRENT_USER = window.APP_CONFIG.currentUser; // {id, name}

// ─── API helpers ─────────────────────────────────────────────────
function checkAuth(res) {
    if (res.status === 401) { window.location.href = '/login.php'; throw new Error('Non authentifié'); }
}

async function apiFetch(url) {
    const res = await fetch(url);
    checkAuth(res);
    if (!res.ok) throw new Error('Erreur réseau');
    return res.json();
}

async function apiSend(url, method, data) {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    checkAuth(res);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur serveur');
    return json;
}

async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    checkAuth(res);
    if (!res.ok) throw new Error('Erreur suppression');
}

// ─── Modal helpers ───────────────────────────────────────────────
function initModal(overlayId, modalId, closeId) {
    const overlay = document.getElementById(overlayId);
    const modal   = document.getElementById(modalId);

    function open() { overlay.classList.add('active'); }

    function close() {
        overlay.classList.remove('active');
        modal.classList.remove('edit-mode');
    }

    document.getElementById(closeId).addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });

    return { overlay, modal, open, close };
}

// ─── Toggle group helper ─────────────────────────────────────────
function initToggleGroup(groupId, hiddenId, { multi = false, onChange = null } = {}) {
    const group  = document.getElementById(groupId);
    const hidden = document.getElementById(hiddenId);
    const btns   = group.querySelectorAll('.toggle-btn');

    function setValues(values) {
        const vals = Array.isArray(values) ? values : [values];
        btns.forEach(btn => btn.classList.toggle('active', vals.includes(btn.dataset.value)));
        hidden.value = multi
            ? [...group.querySelectorAll('.toggle-btn.active')].map(b => b.dataset.value).join(',')
            : vals[0];
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (multi) {
                const activeCount = group.querySelectorAll('.toggle-btn.active').length;
                if (btn.classList.contains('active') && activeCount <= 1) return;
                btn.classList.toggle('active');
                hidden.value = [...group.querySelectorAll('.toggle-btn.active')]
                    .map(b => b.dataset.value).join(',');
            } else {
                setValues([btn.dataset.value]);
            }
            if (onChange) onChange(hidden.value);
        });
    });

    return { setValues, getValue: () => hidden.value };
}
