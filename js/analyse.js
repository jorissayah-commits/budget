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
    const { foyer_total, members } = data;

    if (foyer_total === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <p>Aucune dépense ce mois</p>
            </div>`;
        return;
    }

    let html = '';

    // ── Total foyer (pleine largeur) ──────────────────────────────
    html += `
    <div class="analyse-card analyse-card--full">
        <span class="analyse-label">Total du foyer</span>
        <div class="analyse-amount">
            <span class="analyse-value">${formatAmount(foyer_total)}</span>
            <span class="analyse-currency">€</span>
        </div>
    </div>`;

    // ── Payé par chaque membre ────────────────────────────────────
    if (members.length >= 2) {
        html += `<div class="analyse-row">`;
        members.forEach((m, idx) => {
            html += `
            <div class="analyse-card member-card-${idx}">
                <span class="analyse-label">Payé par ${escapeHtml(m.name)}</span>
                <div class="analyse-amount">
                    <span class="analyse-value">${formatAmount(m.paid)}</span>
                    <span class="analyse-currency">€</span>
                </div>
                <span class="analyse-sub">Part réelle : ${formatAmount(m.share)} €</span>
            </div>`;
        });
        html += `</div>`;

        // ── Balance ───────────────────────────────────────────────
        // Trouver qui doit à qui
        // balance > 0 → ce membre est créditeur (les autres lui doivent)
        const creditor = members.find(m => m.balance > 0.005);
        const debtor   = members.find(m => m.balance < -0.005);

        html += `<div class="analyse-card analyse-card--full analyse-balance-card">`;

        if (!creditor || !debtor || Math.abs(creditor.balance) < 0.01) {
            html += `
                <span class="analyse-label">Balance</span>
                <div class="balance-neutral" style="font-size:22px;font-weight:700;margin-top:8px;">Équilibre ✓</div>
                <p class="analyse-balance-desc">Chacun a payé sa part exacte.</p>`;
        } else {
            const amount = formatAmount(Math.abs(creditor.balance));
            const credIdx = members.indexOf(creditor);
            html += `
                <span class="analyse-label">Balance</span>
                <div class="analyse-balance-summary">
                    <span class="analyse-balance-debtor member-text-${members.indexOf(debtor)}">${escapeHtml(debtor.name)}</span>
                    <span class="analyse-balance-arrow">doit à</span>
                    <span class="analyse-balance-creditor member-text-${credIdx}">${escapeHtml(creditor.name)}</span>
                </div>
                <div class="analyse-balance-amount member-text-${credIdx}">${amount} €</div>
                <p class="analyse-balance-desc">
                    ${escapeHtml(creditor.name)} a avancé ${formatAmount(creditor.paid)} € mais sa part réelle est ${formatAmount(creditor.share)} €.
                </p>`;
        }

        html += `</div>`;

    } else {
        // Mode solo — juste le total
        html += `
        <div class="analyse-card analyse-card--full">
            <span class="analyse-label">Payé par ${escapeHtml(members[0]?.name ?? 'vous')}</span>
            <div class="analyse-amount">
                <span class="analyse-value">${formatAmount(members[0]?.paid ?? 0)}</span>
                <span class="analyse-currency">€</span>
            </div>
        </div>`;
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
