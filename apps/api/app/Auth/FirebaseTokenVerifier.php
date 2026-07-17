<?php

declare(strict_types=1);

namespace App\Auth;

use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Throwable;

/**
 * Verificador real basado en kreait/firebase-php.
 * Valida firma (JWKS de Google, cacheado en Redis vía el verifier cache),
 * `aud` (= projectId), `iss` y `exp`. Nunca confía en el payload sin verificar.
 */
final class FirebaseTokenVerifier implements TokenVerifier
{
    public function __construct(private readonly FirebaseAuth $auth)
    {
    }

    public function verify(string $idToken): VerifiedClaims
    {
        try {
            // checkIfRevoked=true rechaza tokens de sesiones revocadas (desactivación real).
            $token = $this->auth->verifyIdToken($idToken, true);
        } catch (Throwable $e) {
            throw new TokenInvalidException($e->getMessage(), 0, $e);
        }

        $claims   = $token->claims();
        $uid      = (string) $claims->get('sub');
        $email    = $claims->get('email');
        $nombre   = $claims->get('name');
        $authTime = $claims->get('auth_time');

        if ($authTime instanceof \DateTimeInterface) {
            $authTime = $authTime->getTimestamp();
        }

        return new VerifiedClaims(
            $uid,
            $email !== null ? (string) $email : null,
            $authTime !== null ? (int) $authTime : null,
            $nombre !== null ? (string) $nombre : null,
        );
    }
}
