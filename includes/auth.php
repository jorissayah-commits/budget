<?php
/**
 * Gestion de l'authentification par session.
 * Inclure ce fichier dans les pages et API protégées.
 */
session_start();

require_once __DIR__ . '/config.php';

/**
 * Vérifie que l'utilisateur est connecté.
 * - Pages : redirige vers login.php si non connecté.
 * - API   : retourne une erreur 401 JSON.
 * Retourne ['id' => int, 'name' => string].
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
    return [
        'id'   => (int)$_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
    ];
}

/**
 * Retourne le contexte foyer de l'utilisateur connecté :
 * ['foyer_id' => int|null, 'members' => [['id' => int, 'name' => string], ...]]
 *
 * Si l'utilisateur n'est dans aucun foyer, members sera vide.
 */
function getFoyerContext(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare("
        SELECT fm.foyer_id, u.id AS user_id, u.name AS user_name
        FROM foyer_members fm
        JOIN users u ON u.id = fm.user_id
        WHERE fm.foyer_id = (
            SELECT foyer_id FROM foyer_members WHERE user_id = ? LIMIT 1
        )
        ORDER BY fm.joined_at
    ");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    if (empty($rows)) {
        return ['foyer_id' => null, 'members' => []];
    }

    return [
        'foyer_id' => (int)$rows[0]['foyer_id'],
        'members'  => array_map(fn($r) => [
            'id'   => (int)$r['user_id'],
            'name' => $r['user_name'],
        ], $rows),
    ];
}

/**
 * Types de budget autorisés pour un foyer donné (dérivés des membres).
 */
function getAllowedBudgetTypes(array $members): array {
    $types = ['commun'];
    foreach ($members as $m) {
        $types[] = 'perso_' . $m['id'];
    }
    return $types;
}
