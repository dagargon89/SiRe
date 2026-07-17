<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Verifica un ID token de Firebase. La implementación real (kreait) valida
 * firma contra JWKS de Google, `aud`, `iss` y `exp`. Se abstrae en interfaz
 * para poder inyectar un doble en pruebas (sin depender de Firebase).
 */
interface TokenVerifier
{
    /**
     * @throws TokenInvalidException si el token es inválido o expiró.
     */
    public function verify(string $idToken): VerifiedClaims;
}
