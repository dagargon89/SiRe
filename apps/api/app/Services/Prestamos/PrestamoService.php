<?php

declare(strict_types=1);

namespace App\Services\Prestamos;

use App\Models\ActivoModel;
use App\Models\MovimientoModel;
use App\Models\PrestamoModel;
use App\Models\UsuarioModel;
use App\Services\ServiceException;
use Throwable;

/**
 * Préstamos temporales: prestar y devolver. Atómico (regla 5) con relectura del
 * estado del activo bajo bloqueo (anti-TOCTOU, regla 7). Emite movimientos.
 */
final class PrestamoService
{
    private const CONDICIONES = ['excelente', 'bueno', 'regular', 'malo'];

    public function __construct(
        private readonly ActivoModel $activos,
        private readonly PrestamoModel $prestamos,
        private readonly MovimientoModel $movimientos,
        private readonly UsuarioModel $usuarios,
    ) {
    }

    public function prestar(array $data, int $actorId): array
    {
        $db          = $this->activos->db;
        $prestatario = $this->usuarios->find((int) ($data['prestatario_id'] ?? 0));
        if ($prestatario === null || (int) $prestatario['is_active'] === 0) {
            throw new ServiceException('usuario_invalido', 'Prestatario inexistente o inactivo.', 422);
        }
        $condicion = (string) ($data['condicion_prestamo'] ?? '');
        if (! in_array($condicion, self::CONDICIONES, true)) {
            throw new ServiceException('condicion_invalida', 'Condición de préstamo no válida.', 422);
        }
        $devolucion = trim((string) ($data['devolucion_esperada'] ?? ''));
        if ($devolucion === '') {
            throw new ServiceException('fecha_requerida', 'La fecha de devolución esperada es obligatoria.', 422);
        }

        $activoId = (int) ($data['activo_id'] ?? 0);
        $db->transBegin();
        try {
            $activo = $db->query('SELECT * FROM activos WHERE id = ? FOR UPDATE', [$activoId])->getRowArray();
            if ($activo === null) {
                throw new ServiceException('no_existe', 'Activo no encontrado.', 404);
            }
            if ($activo['estado'] !== 'disponible') {
                throw new ServiceException('activo_no_disponible', 'El activo no está disponible para préstamo.', 409);
            }

            $id = $this->prestamos->insert([
                'activo_id'           => $activoId,
                'prestatario_id'      => (int) $prestatario['id'],
                'prestamista_id'      => $actorId,
                'prestado_por'        => $actorId,
                'devolucion_esperada' => $devolucion,
                'condicion_prestamo'  => $condicion,
                'notas'               => $data['notas'] ?? null,
            ], true);

            $this->activos->update($activoId, ['estado' => 'prestado', 'actualizado_por' => $actorId]);
            $this->movimientos->registrar([
                'activo_id' => $activoId, 'tipo' => 'prestamo',
                'a_usuario_id' => (int) $prestatario['id'], 'realizado_por' => $actorId, 'notas' => $data['notas'] ?? null,
            ]);

            $this->commitOrFail($db);

            return $this->prestamos->find($id);
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('operacion_fallida', 'No se pudo prestar.', 422);
        }
    }

    public function devolver(int $prestamoId, array $data, int $actorId): array
    {
        $db        = $this->activos->db;
        $condicion = (string) ($data['condicion_devolucion'] ?? '');
        if (! in_array($condicion, self::CONDICIONES, true)) {
            throw new ServiceException('condicion_invalida', 'Condición de devolución no válida.', 422);
        }

        $db->transBegin();
        try {
            $prestamo = $db->query('SELECT * FROM prestamos WHERE id = ? FOR UPDATE', [$prestamoId])->getRowArray();
            if ($prestamo === null) {
                throw new ServiceException('no_existe', 'Préstamo no encontrado.', 404);
            }
            if ($prestamo['devuelto_en'] !== null) {
                throw new ServiceException('ya_devuelto', 'El préstamo ya fue devuelto.', 409);
            }

            $db->query('SELECT id FROM activos WHERE id = ? FOR UPDATE', [(int) $prestamo['activo_id']]);

            $this->prestamos->update($prestamoId, [
                'devuelto_en'          => date('Y-m-d H:i:s'),
                'devuelto_a'           => $actorId,
                'condicion_devolucion' => $condicion,
                'notas'                => $data['notas'] ?? $prestamo['notas'],
            ]);
            $this->activos->update((int) $prestamo['activo_id'], ['estado' => 'disponible', 'actualizado_por' => $actorId]);
            $this->movimientos->registrar([
                'activo_id' => (int) $prestamo['activo_id'], 'tipo' => 'devolucion',
                'de_usuario_id' => (int) $prestamo['prestatario_id'], 'realizado_por' => $actorId, 'notas' => $data['notas'] ?? null,
            ]);

            $this->commitOrFail($db);

            return $this->prestamos->find($prestamoId);
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('operacion_fallida', 'No se pudo registrar la devolución.', 422);
        }
    }

    private function commitOrFail($db): void
    {
        if ($db->transStatus() === false) {
            throw new ServiceException('operacion_fallida', 'No se pudo completar la operación.', 422);
        }
        $db->transCommit();
    }
}
