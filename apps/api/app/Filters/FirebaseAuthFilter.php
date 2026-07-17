<?php

declare(strict_types=1);

namespace App\Filters;

use App\Auth\CurrentUser;
use App\Auth\TokenInvalidException;
use App\Auth\TokenVerifier;
use App\Http\ApiError;
use App\Models\UsuarioModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Verifica el Firebase ID token (Authorization: Bearer) y resuelve el usuario
 * local activo. Rechaza con:
 *  - 401 token_ausente     — falta el header o el prefijo Bearer
 *  - 401 token_invalido    — firma/aud/iss/exp inválidos
 *  - 403 cuenta_inactiva   — no existe perfil local activo para el uid
 */
class FirebaseAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $response = Services::response();
        $header   = (string) $request->getHeaderLine('Authorization');

        if (! str_starts_with($header, 'Bearer ')) {
            return ApiError::make($response, 401, 'token_ausente', 'Falta el token de autenticación.');
        }

        $idToken = trim(substr($header, 7));
        if ($idToken === '') {
            return ApiError::make($response, 401, 'token_ausente', 'Falta el token de autenticación.');
        }

        /** @var TokenVerifier $verifier */
        $verifier = service('tokenVerifier');

        try {
            $claims = $verifier->verify($idToken);
        } catch (TokenInvalidException) {
            return ApiError::make($response, 401, 'token_invalido', 'El token no es válido o expiró.');
        }

        // El token es válido: guardamos los claims y resolvemos el perfil local
        // (cualquier estado). NO se rechaza aquí a pendientes/sin-perfil: eso lo
        // hace el filtro 'aprobado' en las rutas protegidas. Las rutas de
        // onboarding (/me) solo usan 'auth' y permiten auto-provisionar.
        /** @var CurrentUser $current */
        $current = service('currentUser');
        $current->setClaims($claims);

        $usuario = (new UsuarioModel())->findByFirebaseUid($claims->uid);
        if ($usuario !== null) {
            $current->set($usuario);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // sin acción
    }
}
