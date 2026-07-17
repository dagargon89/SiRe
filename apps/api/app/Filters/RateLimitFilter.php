<?php

declare(strict_types=1);

namespace App\Filters;

use App\Http\ApiError;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Rate limiting por IP/usuario usando el Throttler de CI4 (backend de caché = Redis).
 * Uso en rutas: 'throttle' (120/60s por defecto) o 'throttle:30,60' (30 req/60s,
 * p.ej. más estricto en auth). Responde 429 con Retry-After.
 */
class RateLimitFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $capacity = isset($arguments[0]) ? (int) $arguments[0] : 120;
        $seconds  = isset($arguments[1]) ? (int) $arguments[1] : 60;

        $current = service('currentUser');
        $actor   = $current->id() !== null ? 'u' . $current->id() : 'ip' . $request->getIPAddress();
        $bucket  = $arguments[2] ?? 'gen';
        // El Throttler prohíbe caracteres reservados ({}()/\@:), por eso no se usa ':'.
        $key     = "rl_{$bucket}_" . str_replace([':', '.'], '_', $actor);

        $throttler = Services::throttler();

        if ($throttler->check($key, $capacity, $seconds) === false) {
            $response = Services::response();
            $response->setHeader('Retry-After', (string) $throttler->getTokenTime());

            return ApiError::make($response, 429, 'rate_limit', 'Demasiadas solicitudes. Intenta más tarde.');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // sin acción
    }
}
