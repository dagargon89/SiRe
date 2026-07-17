<?php

declare(strict_types=1);

namespace App\Auth;

use Kreait\Firebase\Contract\Auth as FirebaseAuth;

final class KreaitFirebaseAdmin implements FirebaseAdmin
{
    public function __construct(private readonly FirebaseAuth $auth)
    {
    }

    public function crearUsuario(string $email, string $nombre): string
    {
        // Contraseña temporal aleatoria: el usuario la define vía "restablecer
        // contraseña" (no se comparte). El alta la realiza siempre un Administrador.
        $tempPassword = bin2hex(random_bytes(16));

        $user = $this->auth->createUser([
            'email'         => $email,
            'emailVerified' => false,
            'password'      => $tempPassword,
            'displayName'   => $nombre,
        ]);

        return $user->uid;
    }

    public function revocarTokens(string $uid): void
    {
        $this->auth->revokeRefreshTokens($uid);
    }

    public function eliminarUsuario(string $uid): void
    {
        $this->auth->deleteUser($uid);
    }
}
