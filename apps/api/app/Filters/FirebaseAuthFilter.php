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

        $usuario = (new UsuarioModel())->findActiveByFirebaseUid($claims->uid);
        if ($usuario === null) {
            return ApiError::make($response, 403, 'cuenta_inactiva', 'La cuenta no está activa o no existe.');
        }

        /** @var CurrentUser $current */
        $current = service('currentUser');
        $current->set($usuario);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // sin acción
    }
}
