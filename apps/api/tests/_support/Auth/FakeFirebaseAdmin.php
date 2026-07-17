<?php

declare(strict_types=1);

namespace Tests\Support\Auth;

use App\Auth\FirebaseAdmin;
use RuntimeException;

/** Doble de prueba de FirebaseAdmin: sin red, registra llamadas. */
final class FakeFirebaseAdmin implements FirebaseAdmin
{
    /** @var list<string> */
    public array $creados = [];
    /** @var list<string> */
    public array $revocados = [];
    /** @var list<string> */
    public array $eliminados = [];

    public bool $fallarRevocar = false;

    public function crearUsuario(string $email, string $nombre): string
    {
        $uid = 'uid-' . substr(md5($email), 0, 12);
        $this->creados[] = $uid;

        return $uid;
    }

    public function revocarTokens(string $uid): void
    {
        if ($this->fallarRevocar) {
            throw new RuntimeException('fallo simulado al revocar');
        }
        $this->revocados[] = $uid;
    }

    public function eliminarUsuario(string $uid): void
    {
        $this->eliminados[] = $uid;
    }
}
