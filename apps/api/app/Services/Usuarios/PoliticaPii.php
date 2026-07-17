<?php

declare(strict_types=1);

namespace App\Services\Usuarios;

/**
 * PII restringida (ADR-003 / regla 1): la ficha o carta de una persona solo la
 * ve el propio titular o un Administrador. La organización NO restringe acceso.
 */
final class PoliticaPii
{
    /**
     * @param array $actor   usuario autenticado (con 'id' y 'rol')
     * @param int   $titular id del usuario cuya PII se quiere ver
     */
    public static function puedeVer(array $actor, int $titular): bool
    {
        return ($actor['rol'] ?? null) === 'administrador'
            || (int) ($actor['id'] ?? 0) === $titular;
    }
}
