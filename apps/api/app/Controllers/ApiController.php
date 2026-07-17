<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\ApiError;
use App\Services\ServiceException;
use CodeIgniter\HTTP\ResponseInterface;

/** Base para controllers de API: helpers de actor, cuerpo, éxito y error. */
abstract class ApiController extends BaseController
{
    /** Usuario autenticado (lo puso FirebaseAuthFilter). */
    protected function actor(): array
    {
        return service('currentUser')->get() ?? [];
    }

    /** Cuerpo JSON como arreglo asociativo. */
    protected function body(): array
    {
        $data = $this->request->getJSON(true);

        return is_array($data) ? $data : [];
    }

    protected function ok(mixed $data, int $status = 200): ResponseInterface
    {
        return $this->response->setStatusCode($status)->setJSON($data);
    }

    protected function noContent(): ResponseInterface
    {
        return $this->response->setStatusCode(204);
    }

    /** @param array<string,string[]> $detalles */
    protected function error(int $status, string $codigo, string $mensaje, array $detalles = []): ResponseInterface
    {
        return ApiError::make($this->response, $status, $codigo, $mensaje, $detalles);
    }

    protected function fromException(ServiceException $e): ResponseInterface
    {
        return ApiError::make($this->response, $e->status, $e->codigo, $e->getMessage(), $e->detalles);
    }
}
