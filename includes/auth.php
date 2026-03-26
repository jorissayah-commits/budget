<?php
/**
 * Gestion de l'authentification par session.
 * Inclure ce fichier en premier dans les pages et API protégées.
 */
session_start();

require_once __DIR__ . '/config.php';

/**
 * Vérifie que l'utilisateur est connecté.
 * - Pages : redirige vers login.php si non connecté.
 * - API   : retourne une erreur 401 JSON.
 * Retourne le tableau du membre connecté ['id' => ..., 'name' => ...].
 */
function requireAuth(bool $isApi = false): array {
    if (empty($_SESSION['user_id'])) {
        if ($isApi) {
            http_response_code(401);
            echo json_encode(['error' => 'Non authentifié']);
            exit;
        }
        header('Location: login.php');
        exit;
    }

    foreach (MEMBERS as $m) {
        if ($m['id'] === $_SESSION['user_id']) return $m;
    }

    // Membre supprimé de la config → déconnexion
    session_destroy();
    header('Location: login.php');
    exit;
}
