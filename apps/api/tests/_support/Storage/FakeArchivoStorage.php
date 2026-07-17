<?php

declare(strict_types=1);

namespace Tests\Support\Storage;

use App\Storage\ArchivoStorage;

/** Doble de prueba: guarda en memoria, sin red. */
final class FakeArchivoStorage implements ArchivoStorage
{
    /** @var array<string,string> */
    public array $archivos = [];

    public function subir(string $ruta, string $contenido, string $mime): string
    {
        $this->archivos[$ruta] = $contenido;

        return $ruta;
    }

    public function urlFirmada(string $ref, int $minutos = 15): string
    {
        return 'https://fake.storage/' . $ref . '?sig=demo';
    }
}
