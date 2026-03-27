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
    const partner = members.find(m => m.id !== CURRENT_USER.id);

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
    const perPerson = members.length > 0 ? commun_total / members.length : commun_total;
    const partnerName = partner ? escapeHtml(partner.name) : '';

    // Phrase d'intro
    const intro = partner
        ? `Ce mois-ci, avec ${partnerName} vous avez dépensé`
        : `Ce mois-ci vous avez dépensé`;

    // Phrase de partage
    const partageHtml = commun_total > 0 && members.length >= 2
        ? `<p class="foyer-card-sub">Soit <strong>${formatAmount(perPerson)} €</strong> chacun</p>`
        : '';

    // Phrase de balance
    let balanceHtml = '';
    if (members.length >= 2) {
        const creditor = members.find(m => m.balance > 0.005);
        const debtor   = members.find(m => m.balance < -0.005);

        if (!creditor || !debtor || Math.abs(creditor.balance) < 0.01) {
            balanceHtml = `
            <div class="foyer-balance foyer-balance--ok">
                <span class="foyer-balance-icon">✓</span>
                <span>Les comptes sont bons, personne n'a de dette</span>
            </div>`;
        } else {
            const amount = formatAmount(Math.abs(creditor.balance));
            let sentence;
            if (currentMember && creditor.id === currentMember.id) {
                // Le partenaire me doit
                sentence = `${partnerName} te doit <strong>${amount} €</strong>`;
            } else if (currentMember && debtor.id === currentMember.id) {
                // Je dois au partenaire
                sentence = `Tu dois <strong>${amount} €</strong> à ${escapeHtml(creditor.name)}`;
            } else {
                // Vue neutre (ne devrait pas arriver)
                sentence = `${escapeHtml(debtor.name)} doit <strong>${amount} €</strong> à ${escapeHtml(creditor.name)}`;
            }
            balanceHtml = `
            <div class="foyer-balance foyer-balance--debt">
                <span class="foyer-balance-icon">💸</span>
                <span>${sentence}</span>
            </div>`;
        }
    }

    html += `
    <div class="foyer-card">
        <div class="foyer-card-header">
            <span class="foyer-card-tag">🏠 Foyer</span>
        </div>
        <p class="foyer-card-intro">${intro}</p>
        <div class="foyer-card-amount">
            <span class="foyer-card-value">${formatAmount(commun_total)}</span>
            <span class="foyer-card-currency">€</span>
        </div>
        ${partageHtml}
        ${balanceHtml}
    </div>`;

    // ══ BLOC PERSONNEL ════════════════════════════════════════════
    if (currentMember) {
        const partnerNames = members
            .filter(m => m.id !== CURRENT_USER.id)
            .map(m => escapeHtml(m.name))
            .join(' et ');

        const advanceNote = partner
            ? `Les avances faites pour ${partnerNames} ne sont pas comptées.`
            : '';

        html += `
    <div class="perso-card">
        <div class="perso-card-header">
            <span class="perso-card-tag">👤 Personnel</span>
        </div>
        <p class="perso-card-intro">Tu as réellement dépensé pour toi</p>
        <div class="perso-card-amount">
            <span class="perso-card-value">${formatAmount(currentMember.share)}</span>
            <span class="perso-card-currency">€</span>
        </div>
        ${advanceNote ? `<p class="perso-card-sub">${advanceNote}</p>` : ''}
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
