<?php

declare(strict_types=1);

namespace App\Storage;

/** Almacenamiento de archivos (Firebase Storage). Abstraído para pruebas. */
interface ArchivoStorage
{
    /** Sube el contenido a la ruta indicada y devuelve la referencia (path). */
    public function subir(string $ruta, string $contenido, string $mime): string;

    /** URL firmada de descarga con expiración. */
    public function urlFirmada(string $ref, int $minutos = 15): string;
}
