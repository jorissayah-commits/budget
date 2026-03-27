<?php $currentPage = 'foyer'; include 'includes/head.php'; ?>

<div class="app">
    <header class="page-header">
        <h1 class="page-title">Mon Foyer</h1>
    </header>

    <!-- Membres du foyer -->
    <div class="foyer-section">
        <div class="foyer-section-header">Membres</div>
        <div id="foyerMembers"></div>
    </div>

    <!-- Inviter quelqu'un -->
    <div class="foyer-section" id="inviteSection">
        <div class="foyer-section-header">Inviter quelqu'un</div>
        <p class="foyer-section-desc">
            Partagez ce lien pour inviter quelqu'un à rejoindre votre foyer.<br>
            Le lien est valable 7 jours.
        </p>
        <button class="submit-btn" id="generateInviteBtn">Générer un lien d'invitation</button>
        <div id="inviteLinkContainer" style="display:none; margin-top:16px;">
            <div class="invite-link-box" id="inviteLink"></div>
            <button class="copy-btn" id="copyInviteBtn">Copier le lien</button>
        </div>
    </div>
</div>

<?php include 'includes/nav.php'; ?>

<script src="js/shared.js"></script>
<script src="js/foyer.js"></script>
</body>
</html>
