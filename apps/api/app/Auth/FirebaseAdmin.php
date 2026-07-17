<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Operaciones privilegiadas contra Firebase Auth. Se abstrae en interfaz para
 * inyectar un doble en pruebas (sin tocar Firebase real).
 */
interface FirebaseAdmin
{
    /** Crea un usuario en Firebase y devuelve su uid. */
    public function crearUsuario(string $email, string $nombre): string;

    /** Revoca los refresh tokens del usuario (corta sesiones activas). */
    public function revocarTokens(string $uid): void;

    /** Elimina un usuario de Firebase (usado como compensación). */
    public function eliminarUsuario(string $uid): void;
}
