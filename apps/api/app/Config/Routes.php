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

    // Filtros reutilizables
    $auth  = ['filter' => ['auth', 'throttle']];
    $admin = ['filter' => ['auth', 'role:administrador', 'throttle']];

    // Sesión
    $routes->get('me', 'Me::index', $auth);

    // Organizaciones
    $routes->get('organizaciones', 'Organizaciones::index', $auth);
    $routes->post('organizaciones', 'Organizaciones::create', $admin);
    $routes->put('organizaciones/(:num)', 'Organizaciones::update/$1', $admin);
    $routes->patch('organizaciones/(:num)/estado', 'Organizaciones::estado/$1', $admin);

    // Categorías
    $routes->get('categorias', 'Categorias::index', $auth);
    $routes->post('categorias', 'Categorias::create', $admin);
    $routes->put('categorias/(:num)', 'Categorias::update/$1', $admin);
    $routes->patch('categorias/(:num)/estado', 'Categorias::estado/$1', $admin);

    // Activos
    $routes->get('activos', 'Activos::index', $auth);
    $routes->post('activos', 'Activos::create', $admin);
    $routes->get('activos/(:num)', 'Activos::show/$1', $auth);
    $routes->put('activos/(:num)', 'Activos::update/$1', $admin);
    $routes->patch('activos/(:num)/baja', 'Activos::baja/$1', $admin);
    $routes->patch('activos/(:num)/mantenimiento', 'Activos::mantenimiento/$1', $admin);
    $routes->get('activos/(:num)/etiqueta', 'Activos::etiqueta/$1', $admin);
    $routes->post('activos/(:num)/factura', 'Activos::subirFactura/$1', $admin);
    $routes->get('activos/(:num)/factura', 'Activos::urlFactura/$1', ['filter' => ['auth', 'role:administrador,auditor', 'throttle']]);

    // Usuarios
    $routes->get('usuarios', 'Usuarios::index', $admin);
    $routes->post('usuarios', 'Usuarios::create', $admin);
    $routes->get('usuarios/(:num)', 'Usuarios::show/$1', $auth);   // PII: admin o titular (dentro)
    $routes->get('usuarios/(:num)/carta', 'Usuarios::carta/$1', $auth); // PII: admin o titular (dentro)
    $routes->put('usuarios/(:num)', 'Usuarios::update/$1', $admin);
    $routes->patch('usuarios/(:num)/rol', 'Usuarios::rol/$1', $admin);
    $routes->patch('usuarios/(:num)/desactivar', 'Usuarios::desactivar/$1', $admin);

    // Asignaciones (resguardos)
    $routes->post('asignaciones', 'Asignaciones::create', $admin);
    $routes->post('asignaciones/transferir', 'Asignaciones::transferir', $admin);
    $routes->patch('asignaciones/(:num)/revocar', 'Asignaciones::revocar/$1', $admin);
});
