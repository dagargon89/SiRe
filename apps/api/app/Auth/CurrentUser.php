<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Portador del usuario autenticado durante el request (singleton por request).
 * Lo llena `FirebaseAuthFilter`; lo consumen controllers, RoleFilter y policies.
 */
final class CurrentUser
{
    private ?array $user = null;

    public function set(array $user): void
    {
        $this->user = $user;
    }

    public function get(): ?array
    {
        return $this->user;
    }

    public function id(): ?int
    {
        return isset($this->user['id']) ? (int) $this->user['id'] : null;
    }

    public function rol(): ?string
    {
        return $this->user['rol'] ?? null;
    }

    public function is(string $rol): bool
    {
        return $this->rol() === $rol;
    }
}
