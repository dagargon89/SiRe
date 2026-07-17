<?php

declare(strict_types=1);

namespace App\Services\Activos;

use App\Models\ActivoModel;
use App\Services\ServiceException;
use App\Storage\ArchivoStorage;

/**
 * Guarda la copia de factura de un activo en el almacenamiento y actualiza la
 * referencia. Separado del controller para poder probar la lógica de storage
 * sin depender de la subida multipart.
 */
final class GuardarFacturaService
{
    public function __construct(
        private readonly ActivoModel $activos,
        private readonly ArchivoStorage $storage,
    ) {
    }

    /** @return string URL firmada de descarga */
    public function execute(int $activoId, string $contenido, string $mime, string $ext, int $actorId): string
    {
        $activo = $this->activos->find($activoId);
        if ($activo === null) {
            throw new ServiceException('no_existe', 'Activo no encontrado.', 404);
        }

        $ruta = 'facturas/' . $activoId . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $ref  = $this->storage->subir($ruta, $contenido, $mime);

        $this->activos->update($activoId, [
            'factura_archivo_ref' => $ref,
            'actualizado_por'     => $actorId,
        ]);

        return $this->storage->urlFirmada($ref);
    }
}
