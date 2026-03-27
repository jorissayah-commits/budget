<?php $currentPage = 'profil'; include 'includes/head.php'; ?>

<div class="app">
    <header class="page-header">
        <h1 class="page-title">Profil</h1>
    </header>

    <!-- ─── Mon compte ─────────────────────────────────────── -->
    <div class="foyer-section">
        <div class="foyer-section-header">Mon compte</div>

        <!-- Modifier le prénom -->
        <form id="nameForm" novalidate>
            <div class="form-group">
                <label for="profileName">Prénom</label>
                <input type="text" id="profileName"
                       value="<?= htmlspecialchars($currentUser['name']) ?>"
                       autocomplete="given-name" required>
            </div>
            <button type="submit" class="submit-btn" id="nameSubmitBtn">Enregistrer le prénom</button>
        </form>
        <div id="nameMsg"></div>

        <hr class="profile-divider">

        <!-- Modifier le mot de passe -->
        <form id="passwordForm" novalidate>
            <div class="form-group">
                <label for="currentPassword">Mot de passe actuel</label>
                <input type="password" id="currentPassword"
                       autocomplete="current-password" required>
            </div>
            <div class="form-group">
                <label for="newPassword">Nouveau mot de passe</label>
                <input type="password" id="newPassword"
                       placeholder="6 caractères minimum"
                       autocomplete="new-password" required>
            </div>
            <button type="submit" class="submit-btn" id="passwordSubmitBtn">Changer le mot de passe</button>
        </form>
        <div id="passwordMsg"></div>
    </div>

    <!-- ─── Mon Foyer ──────────────────────────────────────── -->
    <div class="foyer-section">
        <div class="foyer-section-header">Mon Foyer</div>
        <div id="foyerMembers"></div>

        <div id="inviteSection" style="margin-top:16px;">
            <p class="foyer-section-desc">
                Partagez ce lien pour inviter quelqu'un à rejoindre votre foyer.<br>
                Le lien est valable 7 jours.
            </p>
            <button class="submit-btn" id="generateInviteBtn">Générer un lien d'invitation</button>
            <div id="inviteLinkContainer" style="display:none; margin-top:14px;">
                <div class="invite-link-box" id="inviteLink"></div>
                <button class="copy-btn" id="copyInviteBtn">Copier le lien</button>
            </div>
        </div>
    </div>

    <!-- ─── Déconnexion ────────────────────────────────────── -->
    <div class="foyer-section">
        <a href="api/logout.php" class="logout-btn">Se déconnecter</a>
    </div>

</div>

<?php include 'includes/nav.php'; ?>

<script src="js/shared.js"></script>
<script src="js/profil.js"></script>
</body>
</html>
