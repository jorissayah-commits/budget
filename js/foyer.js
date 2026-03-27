'use strict';

// ─── Membres ─────────────────────────────────────────────────────
function renderFoyerMembers() {
    const container = document.getElementById('foyerMembers');

    if (MEMBERS.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:8px 0;">Aucun membre</p>';
        return;
    }

    container.innerHTML = MEMBERS.map((m, idx) => `
        <div class="foyer-member">
            <div class="foyer-member-avatar member-${idx}">${escapeHtml(m.name.charAt(0).toUpperCase())}</div>
            <div class="foyer-member-info">
                <div class="foyer-member-name">${escapeHtml(m.name)}</div>
                ${m.id === CURRENT_USER.id ? '<span class="foyer-member-you">Vous</span>' : ''}
            </div>
        </div>
    `).join('');

    // Masquer la section d'invitation si le foyer est déjà en mode couple
    if (IS_COUPLE_MODE) {
        const inviteSection = document.getElementById('inviteSection');
        if (inviteSection) inviteSection.style.display = 'none';
    }
}

// ─── Invitation ──────────────────────────────────────────────────
document.getElementById('generateInviteBtn').addEventListener('click', async () => {
    const btn = document.getElementById('generateInviteBtn');
    btn.disabled = true;
    btn.textContent = 'Génération…';

    try {
        const data = await apiSend('/api/invite.php', 'POST', {});
        document.getElementById('inviteLink').textContent = data.url;
        document.getElementById('inviteLinkContainer').style.display = 'block';
        btn.textContent = 'Nouveau lien';
    } catch (err) {
        alert('Erreur : ' + err.message);
        btn.textContent = 'Générer un lien d\'invitation';
    } finally {
        btn.disabled = false;
    }
});

document.getElementById('copyInviteBtn').addEventListener('click', () => {
    const link = document.getElementById('inviteLink').textContent;
    navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('copyInviteBtn');
        btn.textContent = 'Copié !';
        setTimeout(() => btn.textContent = 'Copier le lien', 2000);
    }).catch(() => {
        // Fallback si clipboard API indisponible
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    });
});

// ─── Init ─────────────────────────────────────────────────────────
renderFoyerMembers();
