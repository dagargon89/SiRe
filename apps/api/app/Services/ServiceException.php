<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

/**
 * Error de negocio con código máquina y estado HTTP sugerido, que los
 * controllers mapean a la respuesta de error del doc 05 §1.
 */
class ServiceException extends RuntimeException
{
    /** @param array<string,string[]> $detalles */
    public function __construct(
        public readonly string $codigo,
        string $mensaje,
        public readonly int $status = 422,
        public readonly array $detalles = [],
    ) {
        parent::__construct($mensaje);
    }
}
