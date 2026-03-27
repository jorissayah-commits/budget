<?php $currentPage = 'analyse'; include 'includes/head.php'; ?>

<div class="app">
    <header class="month-nav">
        <button class="nav-btn" id="prevMonth" aria-label="Mois précédent">&#8249;</button>
        <h1 class="month-title" id="monthTitle"></h1>
        <button class="nav-btn" id="nextMonth" aria-label="Mois suivant">&#8250;</button>
    </header>

    <div id="analyseContent">
        <div class="loading">Chargement…</div>
    </div>
</div>

<?php include 'includes/nav.php'; ?>

<script src="js/shared.js"></script>
<script src="js/analyse.js"></script>
</body>
</html>
