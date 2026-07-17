<?php

declare(strict_types=1);

namespace Tests\Support\Auth;

use App\Auth\TokenInvalidException;
use App\Auth\TokenVerifier;
use App\Auth\VerifiedClaims;

/**
 * Doble de prueba: mapea idToken → claims sin depender de Firebase.
 * Un token "invalido" (o desconocido) lanza TokenInvalidException.
 */
final class FakeTokenVerifier implements TokenVerifier
{
    /** @var array<string, VerifiedClaims> */
    private array $valid = [];

    public function conToken(string $idToken, string $uid, ?string $email = null, ?int $authTime = null, ?string $nombre = null): self
    {
        $this->valid[$idToken] = new VerifiedClaims($uid, $email, $authTime, $nombre);

        return $this;
    }

    public function verify(string $idToken): VerifiedClaims
    {
        if (! isset($this->valid[$idToken])) {
            throw new TokenInvalidException('token de prueba inválido');
        }

        return $this->valid[$idToken];
    }
}
