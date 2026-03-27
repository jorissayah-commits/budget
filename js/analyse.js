'use strict';

// ─── State ────────────────────────────────────────────────────────
const now = new Date();
let currentYear  = now.getFullYear();
let currentMonth = now.getMonth();

function getMonthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

// ─── Render ───────────────────────────────────────────────────────
function renderAnalyse(data) {
    const container = document.getElementById('analyseContent');
    const { commun_total, members } = data;

    const currentMember = members.find(m => m.id === CURRENT_USER.id)
                       ?? members.find(m => m.name === CURRENT_USER.name);

    if (data.foyer_total === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <p>Aucune dépense ce mois</p>
            </div>`;
        return;
    }

    let html = '';

    // ══ BLOC FOYER ════════════════════════════════════════════════
    html += `<div class="analyse-bloc">
        <h2 class="analyse-bloc-title">Foyer</h2>`;

    // Total commun
    html += `
    <div class="analyse-card analyse-card--full">
        <span class="analyse-label">Dépenses communes</span>
        <div class="analyse-amount">
            <span class="analyse-value">${formatAmount(commun_total)}</span>
            <span class="analyse-currency">€</span>
        </div>
    </div>`;

    // Balance (couple uniquement)
    if (members.length >= 2) {
        const creditor = members.find(m => m.balance > 0.005);
        const debtor   = members.find(m => m.balance < -0.005);

        html += `<div class="analyse-card analyse-card--full analyse-balance-card">`;

        if (!creditor || !debtor || Math.abs(creditor.balance) < 0.01) {
            html += `
                <span class="analyse-label">Balance</span>
                <div class="balance-neutral" style="font-size:22px;font-weight:700;margin-top:8px;">Équilibre ✓</div>
                <p class="analyse-balance-desc">Chacun a payé sa part exacte.</p>`;
        } else {
            const amount   = formatAmount(Math.abs(creditor.balance));
            const credIdx  = members.indexOf(creditor);
            const debtIdx  = members.indexOf(debtor);
            html += `
                <span class="analyse-label">Balance</span>
                <div class="analyse-balance-summary">
                    <span class="analyse-balance-debtor member-text-${debtIdx}">${escapeHtml(debtor.name)}</span>
                    <span class="analyse-balance-arrow">doit à</span>
                    <span class="analyse-balance-creditor member-text-${credIdx}">${escapeHtml(creditor.name)}</span>
                </div>
                <div class="analyse-balance-amount member-text-${credIdx}">${amount} €</div>
                <p class="analyse-balance-desc">
                    ${escapeHtml(creditor.name)} a avancé ${formatAmount(creditor.paid)} € mais sa part réelle est ${formatAmount(creditor.share)} €.
                </p>`;
        }

        html += `</div>`;
    }

    html += `</div>`; // fin bloc foyer

    // ══ BLOC PERSONNEL ════════════════════════════════════════════
    if (currentMember) {
        html += `<div class="analyse-bloc">
            <h2 class="analyse-bloc-title">Personnel</h2>`;

        // share = ma part du foyer + mes dépenses perso (exclut ce que j'ai avancé pour l'autre)
        html += `
        <div class="analyse-card analyse-card--full">
            <span class="analyse-label">Mes dépenses réelles</span>
            <div class="analyse-amount">
                <span class="analyse-value">${formatAmount(currentMember.share)}</span>
                <span class="analyse-currency">€</span>
            </div>
            <p class="analyse-balance-desc">Ma part des dépenses communes + mes dépenses personnelles.<br>Les avances faites pour ${members.filter(m => m.id !== CURRENT_USER.id).map(m => escapeHtml(m.name)).join(' et ') || 'l\'autre'} ne sont pas comptées.</p>
        </div>`;

        html += `</div>`; // fin bloc personnel
    }

    container.innerHTML = html;
}

async function loadAnalyse() {
    const container = document.getElementById('analyseContent');
    container.innerHTML = '<div class="loading">Chargement…</div>';
    try {
        const data = await apiFetch(`/api/analyse.php?month=${encodeURIComponent(getMonthKey())}`);
        renderAnalyse(data);
    } catch {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Impossible de charger</p></div>`;
    }
}

// ─── Month nav ────────────────────────────────────────────────────
document.getElementById('monthTitle').textContent = `${MONTHS_FR[currentMonth]} ${currentYear}`;

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    document.getElementById('monthTitle').textContent = `${MONTHS_FR[currentMonth]} ${currentYear}`;
    loadAnalyse();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('monthTitle').textContent = `${MONTHS_FR[currentMonth]} ${currentYear}`;
    loadAnalyse();
});

// ─── Init ─────────────────────────────────────────────────────────
loadAnalyse();
