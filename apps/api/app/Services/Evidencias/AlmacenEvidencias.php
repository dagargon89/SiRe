<?php

declare(strict_types=1);

namespace App\Services\Evidencias;

use RuntimeException;

/**
 * Archivos de evidencias en disco local, fuera del webroot. Cada evidencia son
 * dos archivos: `{nombre}.jpg` y su miniatura `{nombre}_t.jpg`. Solo se sirven
 * a través de la API (con sesión), nunca por URL directa.
 */
final class AlmacenEvidencias
{
    private readonly string $dir;

    public function __construct(string $dir)
    {
        $this->dir = rtrim($dir, '/') . '/';
    }

    /** Guarda imagen + miniatura y devuelve el nombre de archivo generado. */
    public function guardar(string $imagen, string $miniatura): string
    {
        if (! is_dir($this->dir) && ! mkdir($this->dir, 0750, true) && ! is_dir($this->dir)) {
            throw new RuntimeException('No se pudo crear el directorio de evidencias.');
        }

        $nombre = bin2hex(random_bytes(16)) . '.jpg';
        if (file_put_contents($this->dir . $nombre, $imagen) === false
            || file_put_contents($this->dir . $this->miniatura($nombre), $miniatura) === false) {
            $this->borrar($nombre);

            throw new RuntimeException('No se pudo guardar la evidencia.');
        }

        return $nombre;
    }

    /** Ruta absoluta del archivo (o su miniatura), o null si no existe. */
    public function ruta(string $nombre, bool $miniatura = false): ?string
    {
        if (preg_match('/^[a-f0-9]{32}\.jpg$/', $nombre) !== 1) {
            return null;
        }
        $ruta = $this->dir . ($miniatura ? $this->miniatura($nombre) : $nombre);

        return is_file($ruta) ? $ruta : null;
    }

    public function borrar(string $nombre): void
    {
        foreach ([false, true] as $mini) {
            $ruta = $this->ruta($nombre, $mini);
            if ($ruta !== null) {
                @unlink($ruta);
            }
        }
    }

    private function miniatura(string $nombre): string
    {
        return substr($nombre, 0, -4) . '_t.jpg';
    }
}
