'use strict';

// ─── Membres du foyer ─────────────────────────────────────────────
function renderFoyerMembers() {
    const container = document.getElementById('foyerMembers');

    if (MEMBERS.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:8px 0;">Aucun membre</p>';
    } else {
        container.innerHTML = MEMBERS.map((m, idx) => `
            <div class="foyer-member">
                <div class="foyer-member-avatar member-${idx}">${escapeHtml(m.name.charAt(0).toUpperCase())}</div>
                <div class="foyer-member-info">
                    <div class="foyer-member-name">${escapeHtml(m.name)}</div>
                    ${m.id === CURRENT_USER.id ? '<span class="foyer-member-you">Vous</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    // Masquer l'invitation si le foyer est déjà en mode couple
    if (IS_COUPLE_MODE) {
        const section = document.getElementById('inviteSection');
        if (section) section.style.display = 'none';
    }
}

// ─── Modifier le prénom ───────────────────────────────────────────
function showMsg(id, text, isError = false) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className   = 'profile-msg ' + (isError ? 'error' : 'success');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

document.getElementById('nameForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    if (!name) return;

    const btn = document.getElementById('nameSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';

    try {
        const res = await apiSend('/api/profile.php?action=name', 'PUT', { name });
        showMsg('nameMsg', 'Prénom mis à jour !');
        // Mettre à jour l'affichage sans rechargement complet
        CURRENT_USER.name = res.name;
    } catch (err) {
        showMsg('nameMsg', err.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enregistrer le prénom';
    }
});

// ─── Modifier le mot de passe ─────────────────────────────────────
document.getElementById('passwordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const current_password = document.getElementById('currentPassword').value;
    const new_password     = document.getElementById('newPassword').value;
    if (!current_password || !new_password) return;

    const btn = document.getElementById('passwordSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Modification…';

    try {
        await apiSend('/api/profile.php?action=password', 'PUT', { current_password, new_password });
        showMsg('passwordMsg', 'Mot de passe modifié !');
        document.getElementById('passwordForm').reset();
    } catch (err) {
        showMsg('passwordMsg', err.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Changer le mot de passe';
    }
});

// ─── Invitation ───────────────────────────────────────────────────
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
