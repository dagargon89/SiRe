<?php

declare(strict_types=1);

namespace App\Storage;

use DateTimeImmutable;
use Google\Cloud\Storage\Bucket;

final class FirebaseStorage implements ArchivoStorage
{
    public function __construct(private readonly Bucket $bucket)
    {
    }

    public function subir(string $ruta, string $contenido, string $mime): string
    {
        $this->bucket->upload($contenido, [
            'name'     => $ruta,
            'metadata' => ['contentType' => $mime],
        ]);

        return $ruta;
    }

    public function urlFirmada(string $ref, int $minutos = 15): string
    {
        return $this->bucket->object($ref)->signedUrl(new DateTimeImmutable("+{$minutos} minutes"));
    }
}
