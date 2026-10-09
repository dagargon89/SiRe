<?php

declare(strict_types=1);

namespace App\Services\Evidencias;

use App\Models\ActivoModel;
use App\Models\EvidenciaModel;
use App\Models\MovimientoModel;
use App\Services\ServiceException;
use Throwable;

/**
 * Alta y baja de evidencias fotográficas. Cada operación registra un
 * movimiento 'evidencia' en la bitácora dentro de la misma transacción.
 */
final class EvidenciasService
{
    public const MAX_POR_ACTIVO = 30;

    /** Valor guardado => etiqueta (para la bitácora). */
    public const TIPOS = ['equipo' => 'equipo', 'accesorio' => 'accesorio', 'dano' => 'daño'];

    public function __construct(
        private readonly EvidenciaModel $evidencias,
        private readonly ActivoModel $activos,
        private readonly MovimientoModel $movimientos,
        private readonly AlmacenEvidencias $almacen,
        private readonly ProcesadorImagen $procesador,
    ) {
    }

    public function subir(int $activoId, string $rutaTemporal, string $tipo, ?string $descripcion, int $actorId): array
    {
        if (! array_key_exists($tipo, self::TIPOS)) {
            throw new ServiceException('tipo_invalido', 'El tipo de foto debe ser equipo, accesorio o daño.', 422);
        }
        if ($this->activos->find($activoId) === null) {
            throw new ServiceException('no_existe', 'Activo no encontrado.', 404);
        }
        if ($this->evidencias->where('activo_id', $activoId)->countAllResults() >= self::MAX_POR_ACTIVO) {
            throw new ServiceException('limite_evidencias', 'El activo ya tiene el máximo de ' . self::MAX_POR_ACTIVO . ' fotos.', 422);
        }

        $descripcion = $this->normalizarDescripcion($descripcion);

        $foto    = $this->procesador->procesar($rutaTemporal);
        $archivo = $this->almacen->guardar($foto['imagen'], $foto['miniatura']);

        $db = $this->evidencias->db;
        $db->transBegin();
        try {
            $id = (int) $this->evidencias->insert([
                'activo_id'   => $activoId,
                'tipo'        => $tipo,
                'archivo'     => $archivo,
                'descripcion' => $descripcion,
                'ancho'       => $foto['ancho'],
                'alto'        => $foto['alto'],
                'bytes'       => strlen($foto['imagen']),
                'subido_por'  => $actorId,
            ], true);
            $this->movimientos->registrar([
                'activo_id'     => $activoId,
                'tipo'          => 'evidencia',
                'realizado_por' => $actorId,
                'notas'         => mb_substr('Foto agregada (' . self::TIPOS[$tipo] . ')' . ($descripcion !== null ? ': ' . $descripcion : ''), 0, 500),
            ]);
            if ($id === 0 || $db->transStatus() === false) {
                throw new ServiceException('evidencia_fallida', 'No se pudo guardar la foto.', 422);
            }
            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            $this->almacen->borrar($archivo);

            throw $e;
        }

        return $this->evidencias->find($id);
    }

    /**
     * Edita el tipo y/o la descripción de una foto. Solo se aplican las claves
     * presentes en $cambios; lo que realmente cambie queda en la bitácora en
     * un solo movimiento (sin cambios = no-op).
     */
    public function actualizar(int $evidenciaId, array $cambios, int $actorId): array
    {
        $evidencia = $this->evidencias->find($evidenciaId);
        if ($evidencia === null) {
            throw new ServiceException('no_existe', 'Foto no encontrada.', 404);
        }

        $datos = [];
        $notas = [];
        if (array_key_exists('tipo', $cambios)) {
            $tipo = (string) $cambios['tipo'];
            if (! array_key_exists($tipo, self::TIPOS)) {
                throw new ServiceException('tipo_invalido', 'El tipo de foto debe ser equipo, accesorio o daño.', 422);
            }
            if ($tipo !== $evidencia['tipo']) {
                $datos['tipo'] = $tipo;
                $notas[]       = 'tipo ' . (self::TIPOS[$evidencia['tipo']] ?? $evidencia['tipo']) . ' → ' . self::TIPOS[$tipo];
            }
        }
        if (array_key_exists('descripcion', $cambios)) {
            $descripcion = $this->normalizarDescripcion($cambios['descripcion']);
            if ($descripcion !== $evidencia['descripcion']) {
                $datos['descripcion'] = $descripcion;
                $notas[]              = 'descripción "' . ($evidencia['descripcion'] ?? '') . '" → "' . ($descripcion ?? '') . '"';
            }
        }
        if ($datos === []) {
            return $evidencia;
        }

        $db = $this->evidencias->db;
        $db->transBegin();
        try {
            $this->evidencias->update($evidenciaId, $datos);
            $this->movimientos->registrar([
                'activo_id'     => (int) $evidencia['activo_id'],
                'tipo'          => 'evidencia',
                'realizado_por' => $actorId,
                'notas'         => mb_substr('Foto editada: ' . implode('; ', $notas), 0, 500),
            ]);
            if ($db->transStatus() === false) {
                throw new ServiceException('evidencia_fallida', 'No se pudo editar la foto.', 422);
            }
            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();

            throw $e;
        }

        return $this->evidencias->find($evidenciaId);
    }

    private function normalizarDescripcion(mixed $valor): ?string
    {
        $descripcion = trim((string) ($valor ?? ''));

        return $descripcion === '' ? null : mb_substr($descripcion, 0, 255);
    }

    public function eliminar(int $evidenciaId, int $actorId): void
    {
        $evidencia = $this->evidencias->find($evidenciaId);
        if ($evidencia === null) {
            throw new ServiceException('no_existe', 'Foto no encontrada.', 404);
        }

        $db = $this->evidencias->db;
        $db->transBegin();
        try {
            $this->evidencias->delete($evidenciaId);
            $this->movimientos->registrar([
                'activo_id'     => (int) $evidencia['activo_id'],
                'tipo'          => 'evidencia',
                'realizado_por' => $actorId,
                'notas'         => mb_substr('Foto eliminada (' . (self::TIPOS[$evidencia['tipo']] ?? $evidencia['tipo']) . ')' . ($evidencia['descripcion'] !== null ? ': ' . $evidencia['descripcion'] : ''), 0, 500),
            ]);
            if ($db->transStatus() === false) {
                throw new ServiceException('evidencia_fallida', 'No se pudo eliminar la foto.', 422);
            }
            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();

            throw $e;
        }

        // Los archivos se borran solo después de confirmar la transacción.
        $this->almacen->borrar($evidencia['archivo']);
    }
}
