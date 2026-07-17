<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// API v1
$routes->group('api/v1', static function (RouteCollection $routes): void {
    // Preflight CORS: el CorsFilter (global) fija cabeceras y corta con 204.
    $routes->options('(:any)', static fn () => service('response')->setStatusCode(204));

    // Público
    $routes->get('health', 'Health::index');

    // Autenticado (Firebase ID token) + rate limit por usuario/IP
    $routes->get('me', 'Me::index', ['filter' => ['auth', 'throttle']]);
});
