<?php

declare(strict_types=1);

namespace App\Http;

use CodeIgniter\HTTP\ResponseInterface;

/** Construye respuestas de error JSON con el formato del doc 05 §1. */
final class ApiError
{
    /**
     * @param array<string,string[]> $detalles
     */
    public static function make(
        ResponseInterface $response,
        int $status,
        string $codigo,
        string $mensaje,
        array $detalles = [],
    ): ResponseInterface {
        $body = ['error' => $codigo, 'mensaje' => $mensaje];
        if ($detalles !== []) {
            $body['detalles'] = $detalles;
        }

        return $response->setStatusCode($status)->setJSON($body);
    }
}
