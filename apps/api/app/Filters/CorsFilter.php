<?php

declare(strict_types=1);

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * CORS con lista blanca explícita (env `cors.allowedOrigins`, coma-separada).
 * No usa comodín `*`. Responde el preflight OPTIONS con 204.
 */
class CorsFilter implements FilterInterface
{
    private const METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    private const HEADERS = 'Authorization, Content-Type, X-Requested-With';

    /** @return list<string> */
    private function allowedOrigins(): array
    {
        $raw = (string) (env('cors.allowedOrigins') ?? '');

        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    public function before(RequestInterface $request, $arguments = null)
    {
        $response = Services::response();
        $origin   = (string) $request->getHeaderLine('Origin');
        $allowed  = $this->allowedOrigins();

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
            $response->setHeader('Vary', 'Origin');
            $response->setHeader('Access-Control-Allow-Methods', self::METHODS);
            $response->setHeader('Access-Control-Allow-Headers', self::HEADERS);
            $response->setHeader('Access-Control-Max-Age', '86400');
        }

        // Preflight: cortar aquí.
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return $response->setStatusCode(204);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Cabeceras ya fijadas en before(); nada que hacer.
    }
}
