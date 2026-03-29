'use strict';

// ─── État local ───────────────────────────────────────────────────
let bridgeAccounts = [];

// ─── Init ─────────────────────────────────────────────────────────
(async function initBridge() {
    try {
        const data = await apiGet('/api/bridge.php?action=status');
        if (data.connected) {
            bridgeAccounts = data.accounts || [];
            renderBridgeConnected(bridgeAccounts);
        } else {
            renderBridgeDisconnected();
        }
    } catch (e) {
        renderBridgeDisconnected();
    }
})();

// ─── Affichage connecté ───────────────────────────────────────────
function renderBridgeConnected(accounts) {
    document.getElementById('bridgeStatus').innerHTML =
        '<p class="foyer-section-desc" style="color:var(--success);">✓ Banque(s) connectée(s)</p>';

    const container = document.getElementById('bridgeAccounts');
    if (accounts.length === 0) {
        container.innerHTML = '<p class="foyer-section-desc">Aucun compte trouvé.</p>';
    } else {
        container.innerHTML = accounts.map(a => `
            <div class="foyer-member">
                <div class="foyer-member-avatar member-0" style="font-size:13px;">🏦</div>
                <div class="foyer-member-info" style="flex-direction:column;align-items:flex-start;gap:2px;">
                    <div class="foyer-member-name">${escapeHtml(a.name || 'Compte')}</div>
                    <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(a.bank_name || '')} · ${formatAmount(a.balance || 0)} €</div>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('bridgeConnectBtn').style.display = 'block';
    document.getElementById('bridgeConnectBtn').textContent   = '+ Ajouter une banque';
    document.getElementById('bridgeDisconnectBtn').style.display = 'block';
}

// ─── Affichage non connecté ───────────────────────────────────────
function renderBridgeDisconnected() {
    document.getElementById('bridgeStatus').innerHTML =
        '<p class="foyer-section-desc">Connectez votre banque pour importer vos transactions automatiquement.</p>';
    document.getElementById('bridgeAccounts').innerHTML = '';
    document.getElementById('bridgeConnectBtn').style.display = 'block';
    document.getElementById('bridgeConnectBtn').textContent   = '+ Connecter une banque';
    document.getElementById('bridgeDisconnectBtn').style.display = 'none';
}

// ─── Connexion banque ─────────────────────────────────────────────
document.getElementById('bridgeConnectBtn').addEventListener('click', async () => {
    const btn = document.getElementById('bridgeConnectBtn');
    btn.disabled = true;
    btn.textContent = 'Connexion…';

    try {
        const redirectUrl = window.location.origin + window.location.pathname;
        const data = await apiSend('/api/bridge.php?action=connect', 'POST', { redirect_url: redirectUrl });

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Impossible d\'obtenir l\'URL de connexion.');
        }
    } catch (e) {
        alert('Erreur : ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '+ Connecter une banque';
    }
});

// ─── Déconnexion ──────────────────────────────────────────────────
document.getElementById('bridgeDisconnectBtn').addEventListener('click', async () => {
    if (!confirm('Déconnecter votre banque ? Vos transactions importées seront conservées.')) return;
    try {
        await apiFetch('/api/bridge.php?action=disconnect', { method: 'DELETE' });
        renderBridgeDisconnected();
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
});

// ─── Modal import ─────────────────────────────────────────────────
const importOverlay = document.getElementById('bridgeImportOverlay');
const importModal   = document.getElementById('bridgeImportModal');

function openImportModal() {
    // Remplir le select des comptes
    const sel = document.getElementById('bridgeAccountSel');
    sel.innerHTML = '<option value="">Tous les comptes</option>' +
        bridgeAccounts.map(a => `<option value="${a.id}">${escapeHtml(a.name || 'Compte')} — ${escapeHtml(a.bank_name || '')}</option>`).join('');

    // Remplir le select des 6 derniers mois
    const msel = document.getElementById('bridgeMonthSel');
    const now  = new Date();
    msel.innerHTML = Array.from({length: 6}, (_, i) => {
        const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const lbl  = d.toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
        return `<option value="${val}">${lbl}</option>`;
    }).join('');

    document.getElementById('bridgeTxList').innerHTML = '';
    document.getElementById('bridgeImportConfirm').style.display = 'none';
    importOverlay.classList.add('active');
}

document.getElementById('bridgeImportClose').addEventListener('click', () => {
    importOverlay.classList.remove('active');
});

importOverlay.addEventListener('click', e => {
    if (e.target === importOverlay) importOverlay.classList.remove('active');
});

// Bouton "Importer" dans la section banque (on l'ajoute dynamiquement)
// On réutilise le bouton "Ajouter une banque" pour lancer l'import si déjà connecté
// → on ajoute un bouton séparé dans renderBridgeConnected
function renderBridgeConnected(accounts) {
    document.getElementById('bridgeStatus').innerHTML =
        '<p class="foyer-section-desc" style="color:var(--success);">✓ Banque(s) connectée(s)</p>';

    const container = document.getElementById('bridgeAccounts');
    if (accounts.length === 0) {
        container.innerHTML = '<p class="foyer-section-desc">Aucun compte trouvé.</p>';
    } else {
        container.innerHTML = accounts.map(a => `
            <div class="foyer-member">
                <div class="foyer-member-avatar member-0" style="font-size:18px;">🏦</div>
                <div style="flex:1;">
                    <div class="foyer-member-name">${escapeHtml(a.name || 'Compte')}</div>
                    <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(a.bank_name || '')} · <strong style="color:var(--text);">${formatAmount(a.balance || 0)} €</strong></div>
                </div>
            </div>
        `).join('');
    }

    const connectBtn = document.getElementById('bridgeConnectBtn');
    connectBtn.style.display = 'block';
    connectBtn.textContent   = '+ Ajouter une banque';

    // Bouton importer
    let importBtn = document.getElementById('bridgeImportTrigger');
    if (!importBtn) {
        importBtn = document.createElement('button');
        importBtn.id        = 'bridgeImportTrigger';
        importBtn.className = 'submit-btn';
        importBtn.style.marginTop = '10px';
        importBtn.textContent = '↓ Importer des transactions';
        connectBtn.parentNode.insertBefore(importBtn, connectBtn.nextSibling);
        importBtn.addEventListener('click', openImportModal);
    }
    importBtn.style.display = 'block';

    document.getElementById('bridgeDisconnectBtn').style.display = 'block';
}

// ─── Charger les transactions ─────────────────────────────────────
document.getElementById('bridgeFetchBtn').addEventListener('click', async () => {
    const btn       = document.getElementById('bridgeFetchBtn');
    const month     = document.getElementById('bridgeMonthSel').value;
    const accountId = document.getElementById('bridgeAccountSel').value;
    const listEl    = document.getElementById('bridgeTxList');

    btn.disabled    = true;
    btn.textContent = 'Chargement…';
    listEl.innerHTML = '<div class="loading">Récupération…</div>';

    try {
        const params = new URLSearchParams({ action: 'transactions', month });
        if (accountId) params.set('account_id', accountId);

        const data = await apiGet('/api/bridge.php?' + params.toString());
        const txs  = data.transactions || [];

        if (txs.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:16px 0;">Aucune transaction pour ce mois.</p>';
            document.getElementById('bridgeImportConfirm').style.display = 'none';
            return;
        }

        // Seulement les débits (amount < 0 dans Bridge)
        const debits = txs.filter(tx => (tx.amount ?? 0) < 0);

        listEl.innerHTML = `
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${debits.length} dépenses trouvées — cochez celles à importer :</p>
            ${debits.map((tx, i) => `
                <div class="foyer-member" style="padding:10px 0;">
                    <input type="checkbox" id="tx_${i}" data-idx="${i}" checked style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0;">
                    <label for="tx_${i}" style="flex:1;cursor:pointer;">
                        <div style="font-size:15px;font-weight:500;">${escapeHtml(tx.clean_description || tx.label || 'Transaction')}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${tx.date || ''}</div>
                    </label>
                    <span style="font-size:15px;font-weight:600;color:var(--danger);">${formatAmount(Math.abs(tx.amount))} €</span>
                </div>
            `).join('')}
        `;

        // Stocke les txs pour l'import
        listEl._txData = debits;
        document.getElementById('bridgeImportConfirm').style.display = 'block';

    } catch (e) {
        listEl.innerHTML = `<p style="color:var(--danger);font-size:14px;">${escapeHtml(e.message)}</p>`;
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Charger les transactions';
    }
});

// ─── Confirmer l'import ───────────────────────────────────────────
document.getElementById('bridgeImportConfirm').addEventListener('click', async () => {
    const listEl   = document.getElementById('bridgeTxList');
    const allTxs   = listEl._txData || [];
    const checked  = [...listEl.querySelectorAll('input[type=checkbox]:checked')];
    const toImport = checked.map(cb => allTxs[parseInt(cb.dataset.idx)]);

    if (toImport.length === 0) {
        alert('Aucune transaction sélectionnée.');
        return;
    }

    const btn = document.getElementById('bridgeImportConfirm');
    btn.disabled    = true;
    btn.textContent = 'Import en cours…';

    try {
        const data = await apiSend('/api/bridge.php?action=import', 'POST', {
            transactions: toImport.map(tx => ({
                label:    tx.clean_description || tx.label || 'Transaction',
                amount:   Math.abs(tx.amount),
                date:     tx.date,
                for_whom: CURRENT_USER.name,
            }))
        });

        importOverlay.classList.remove('active');
        alert(`✓ ${data.imported} transaction(s) importée(s) avec succès !`);
    } catch (e) {
        alert('Erreur import : ' + e.message);
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Importer la sélection';
    }
});

// ─── Helper GET ───────────────────────────────────────────────────
async function apiGet(url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur réseau');
    return json;
}

async function apiFetch(url, opts) {
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur réseau');
    return json;
}

function formatAmount(n) {
    return Number(n).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
