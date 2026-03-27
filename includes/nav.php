<?php
/**
 * Barre de navigation.
 * $currentPage doit être défini avant l'inclusion (ex: $currentPage = 'depenses')
 *
 * Pour ajouter un onglet : ajouter une entrée dans $navItems.
 */
$navItems = [
    ['id' => 'depenses',    'href' => 'index.php',      'icon' => '💸', 'label' => 'Dépenses'],
    ['id' => 'budget',      'href' => 'budget.php',     'icon' => '📊', 'label' => 'Budget'],
    ['id' => 'foyer',       'href' => 'foyer.php',      'icon' => '🏠', 'label' => 'Foyer'],
    ['id' => 'deconnexion', 'href' => 'api/logout.php', 'icon' => '🚪', 'label' => 'Quitter'],
];
?>
<nav class="bottom-nav">
    <?php foreach ($navItems as $item): ?>
        <a href="<?= $item['href'] ?>"
           class="bottom-nav-item <?= ($currentPage ?? '') === $item['id'] ? 'active' : '' ?>">
            <span class="bottom-nav-icon"><?= $item['icon'] ?></span>
            <span><?= $item['label'] ?></span>
        </a>
    <?php endforeach; ?>
</nav>
