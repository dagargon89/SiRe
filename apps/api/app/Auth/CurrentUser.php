<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Portador del usuario autenticado durante el request (singleton por request).
 * Lo llena `FirebaseAuthFilter`; lo consumen controllers, filtros y policies.
 * Guarda además los claims verificados del token (para auto-provisionar el
 * perfil pendiente en el primer acceso).
 */
final class CurrentUser
{
    private ?array $user = null;
    private ?VerifiedClaims $claims = null;

    public function set(array $user): void
    {
        $this->user = $user;
    }

    public function get(): ?array
    {
        return $this->user;
    }

    public function setClaims(VerifiedClaims $claims): void
    {
        $this->claims = $claims;
    }

    public function claims(): ?VerifiedClaims
    {
        return $this->claims;
    }

    public function id(): ?int
    {
        return isset($this->user['id']) ? (int) $this->user['id'] : null;
    }

    public function rol(): ?string
    {
        return $this->user['rol'] ?? null;
    }

    public function estado(): ?string
    {
        return $this->user['estado'] ?? null;
    }

    public function is(string $rol): bool
    {
        return $this->rol() === $rol;
    }
}
