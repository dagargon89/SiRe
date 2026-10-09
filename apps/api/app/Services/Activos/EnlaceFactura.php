<?php

declare(strict_types=1);

namespace App\Services\Activos;

use App\Services\ServiceException;

/**
 * Valida el enlace de Google Drive donde vive la factura del activo. Solo se
 * aceptan URLs https de drive.google.com o docs.google.com; vacío = sin enlace.
 */
final class EnlaceFactura
{
    private const HOSTS = ['drive.google.com', 'docs.google.com'];

    public static function normalizar(mixed $valor): ?string
    {
        $enlace = trim((string) ($valor ?? ''));
        if ($enlace === '') {
            return null;
        }

        $partes = parse_url($enlace);
        $valido = strlen($enlace) <= 500
            && is_array($partes)
            && ($partes['scheme'] ?? '') === 'https'
            && in_array(strtolower($partes['host'] ?? ''), self::HOSTS, true)
            && ! isset($partes['user']);

        if (! $valido) {
            throw new ServiceException('enlace_invalido', 'El enlace de la factura debe ser de Google Drive (https://drive.google.com/…).', 422);
        }

        return $enlace;
    }
}
