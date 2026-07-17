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
 * Exige un perfil local APROBADO y activo (se aplica tras 'auth' en las rutas de
 * negocio). Los usuarios sin perfil, pendientes, rechazados o inactivos quedan
 * fuera, pero pueden seguir usando /me para conocer su estado.
 */
class AprobadoFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $response = Services::response();
        /** @var CurrentUser $current */
        $current = service('currentUser');
        $usuario = $current->get();

        if ($usuario === null) {
            return ApiError::make($response, 403, 'sin_perfil', 'Tu cuenta aún no tiene perfil. Espera aprobación.');
        }
        if (($usuario['estado'] ?? '') === 'pendiente') {
            return ApiError::make($response, 403, 'pendiente_aprobacion', 'Tu cuenta está pendiente de aprobación.');
        }
        if (($usuario['estado'] ?? '') === 'rechazado') {
            return ApiError::make($response, 403, 'cuenta_rechazada', 'Tu solicitud de acceso fue rechazada.');
        }
        if ((int) ($usuario['is_active'] ?? 0) === 0) {
            return ApiError::make($response, 403, 'cuenta_inactiva', 'La cuenta no está activa.');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // sin acción
    }
}
