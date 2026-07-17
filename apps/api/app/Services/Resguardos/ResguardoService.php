<?php

declare(strict_types=1);

namespace App\Services\Resguardos;

use App\Models\ActivoModel;
use App\Models\AsignacionModel;
use App\Models\MovimientoModel;
use App\Models\UsuarioModel;
use App\Services\ServiceException;
use Throwable;

/**
 * Resguardos de largo plazo: asignar, revocar y transferir. Toda operación es
 * atómica (regla 5) y relee el estado del activo con bloqueo de fila dentro de
 * la transacción (anti-TOCTOU, regla 7). Cada operación emite su movimiento.
 */
final class ResguardoService
{
    public function __construct(
        private readonly ActivoModel $activos,
        private readonly AsignacionModel $asignaciones,
        private readonly MovimientoModel $movimientos,
        private readonly UsuarioModel $usuarios,
    ) {
    }

    /** Bloquea y devuelve el estado del activo; 404 si no existe. */
    private function bloquearActivo($db, int $activoId): array
    {
        $row = $db->query('SELECT * FROM activos WHERE id = ? FOR UPDATE', [$activoId])->getRowArray();
        if ($row === null) {
            throw new ServiceException('no_existe', 'Activo no encontrado.', 404);
        }

        return $row;
    }

    public function asignar(int $activoId, int $usuarioId, ?string $notas, int $actorId): array
    {
        $db = $this->activos->db;

        $usuario = $this->usuarios->find($usuarioId);
        if ($usuario === null || (int) $usuario['is_active'] === 0) {
            throw new ServiceException('usuario_invalido', 'Custodio inexistente o inactivo.', 422);
        }

        $db->transBegin();
        try {
            $activo = $this->bloquearActivo($db, $activoId);
            if ($activo['estado'] !== 'disponible') {
                throw new ServiceException('activo_no_disponible', 'El activo no está disponible para asignar.', 409);
            }

            $id = $this->asignaciones->insert([
                'activo_id'       => $activoId,
                'usuario_id'      => $usuarioId,
                'organizacion_id' => (int) $usuario['organizacion_id'],
                'asignada_por'    => $actorId,
                'notas'           => $notas,
            ], true);

            $this->activos->update($activoId, ['estado' => 'asignado', 'actualizado_por' => $actorId]);
            $this->movimientos->registrar([
                'activo_id' => $activoId, 'tipo' => 'asignacion',
                'a_usuario_id' => $usuarioId, 'a_org_id' => (int) $usuario['organizacion_id'],
                'realizado_por' => $actorId, 'notas' => $notas,
            ]);

            $this->commitOrFail($db);

            return $this->asignaciones->find($id);
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('operacion_fallida', 'No se pudo asignar.', 422);
        }
    }

    public function revocar(int $asignacionId, string $motivo, int $actorId): array
    {
        $db = $this->activos->db;
        $db->transBegin();
        try {
            $asig = $db->query('SELECT * FROM asignaciones WHERE id = ? FOR UPDATE', [$asignacionId])->getRowArray();
            if ($asig === null) {
                throw new ServiceException('no_existe', 'Asignación no encontrada.', 404);
            }
            if ($asig['revocada_en'] !== null) {
                throw new ServiceException('ya_revocada', 'La asignación ya fue revocada.', 409);
            }

            $this->bloquearActivo($db, (int) $asig['activo_id']);

            $this->asignaciones->update($asignacionId, [
                'revocada_en'       => date('Y-m-d H:i:s'),
                'revocada_por'      => $actorId,
                'revocacion_motivo' => $motivo,
            ]);
            $this->activos->update((int) $asig['activo_id'], ['estado' => 'disponible', 'actualizado_por' => $actorId]);
            $this->movimientos->registrar([
                'activo_id' => (int) $asig['activo_id'], 'tipo' => 'revocacion',
                'de_usuario_id' => (int) $asig['usuario_id'], 'realizado_por' => $actorId, 'notas' => $motivo,
            ]);

            $this->commitOrFail($db);

            return $this->asignaciones->find($asignacionId);
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('operacion_fallida', 'No se pudo revocar.', 422);
        }
    }

    public function transferir(int $activoId, int $nuevoUsuarioId, ?string $notas, int $actorId): array
    {
        $db = $this->activos->db;

        $nuevo = $this->usuarios->find($nuevoUsuarioId);
        if ($nuevo === null || (int) $nuevo['is_active'] === 0) {
            throw new ServiceException('usuario_invalido', 'Custodio inexistente o inactivo.', 422);
        }

        $db->transBegin();
        try {
            $activo = $this->bloquearActivo($db, $activoId);
            if ($activo['estado'] !== 'asignado') {
                throw new ServiceException('activo_no_asignado', 'Solo se transfiere un activo asignado.', 409);
            }

            $vigente = $db->query(
                'SELECT * FROM asignaciones WHERE activo_id = ? AND revocada_en IS NULL FOR UPDATE',
                [$activoId],
            )->getRowArray();
            if ($vigente === null) {
                throw new ServiceException('sin_asignacion', 'No hay asignación vigente.', 409);
            }

            $this->asignaciones->update((int) $vigente['id'], [
                'revocada_en'       => date('Y-m-d H:i:s'),
                'revocada_por'      => $actorId,
                'revocacion_motivo' => 'Transferencia',
            ]);
            $id = $this->asignaciones->insert([
                'activo_id'       => $activoId,
                'usuario_id'      => $nuevoUsuarioId,
                'organizacion_id' => (int) $nuevo['organizacion_id'],
                'asignada_por'    => $actorId,
                'notas'           => $notas,
            ], true);
            // El activo permanece 'asignado'.
            $this->movimientos->registrar([
                'activo_id' => $activoId, 'tipo' => 'transferencia',
                'de_usuario_id' => (int) $vigente['usuario_id'], 'a_usuario_id' => $nuevoUsuarioId,
                'a_org_id' => (int) $nuevo['organizacion_id'], 'realizado_por' => $actorId, 'notas' => $notas,
            ]);

            $this->commitOrFail($db);

            return $this->asignaciones->find($id);
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('operacion_fallida', 'No se pudo transferir.', 422);
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
