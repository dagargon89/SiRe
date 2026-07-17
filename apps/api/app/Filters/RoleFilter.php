<?php

declare(strict_types=1);

namespace App\Filters;

use App\Auth\CurrentUser;
use App\Http\ApiError;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Autorización por rol. Se aplica DESPUÉS de FirebaseAuthFilter.
 * Uso en rutas: ['filter' => 'role:administrador'] o 'role:administrador,auditor'.
 */
class RoleFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $response = Services::response();

        /** @var CurrentUser $current */
        $current = service('currentUser');
        $usuario = $current->get();

        if ($usuario === null) {
            // No debería ocurrir si FirebaseAuthFilter corrió antes.
            return ApiError::make($response, 401, 'no_autenticado', 'No autenticado.');
        }

        $permitidos = $arguments ?? [];
        if ($permitidos !== [] && ! in_array($current->rol(), $permitidos, true)) {
            return ApiError::make($response, 403, 'sin_permiso', 'No tienes permiso para esta acción.');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // sin acción
    }
}
