<?php

declare(strict_types=1);

namespace App\Auth;

/** Claims verificados de un ID token de Firebase (solo lo que el sistema usa). */
final class VerifiedClaims
{
    public function __construct(
        public readonly string $uid,        // sub / firebase uid
        public readonly ?string $email,
        public readonly ?int $authTime,     // epoch; para comparar con tokensValidAfterTime
    ) {
    }
}
