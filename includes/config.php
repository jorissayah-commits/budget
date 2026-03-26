<?php
/**
 * Configuration globale de l'application.
 * Modifier ici pour changer les prénoms, ajouter des membres, etc.
 */

define('APP_NAME', 'Budget');

// Membres du foyer — source unique de vérité
// Pour ajouter une personne : ajouter une entrée ici + créer les budgets perso correspondants
define('MEMBERS', [
    ['id' => 'joris',   'name' => 'Joris'],
    ['id' => 'sabrine', 'name' => 'Sabrine'],
]);

// Types de budget autorisés (dérivés de MEMBERS)
function getAllowedBudgetTypes(): array {
    $types = ['commun'];
    foreach (MEMBERS as $m) {
        $types[] = 'perso_' . $m['id'];
    }
    return $types;
}
