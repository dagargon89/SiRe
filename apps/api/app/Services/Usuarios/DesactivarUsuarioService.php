<?php

declare(strict_types=1);

namespace App\Services\Usuarios;

use App\Auth\FirebaseAdmin;
use App\Models\UsuarioModel;
use App\Services\ServiceException;
use Throwable;

/**
 * Desactivación real (regla 8 / ADR-002): marca el perfil inactivo en MySQL y
 * revoca los refresh tokens en Firebase, de forma atómica. Si la revocación
 * falla, se revierte el cambio en MySQL (compensación por transacción).
 */
final class DesactivarUsuarioService
{
    public function __construct(
        private readonly FirebaseAdmin $firebase,
        private readonly UsuarioModel $usuarios,
    ) {
    }

    public function execute(int $targetId, int $actorId): void
    {
        if ($targetId === $actorId) {
            throw new ServiceException('no_auto_desactivar', 'No puedes desactivar tu propia cuenta.', 403);
        }

        $target = $this->usuarios->find($targetId);
        if ($target === null) {
            throw new ServiceException('no_existe', 'Usuario no encontrado.', 404);
        }

        $db = $this->usuarios->db;
        $db->transBegin();

        try {
            $this->usuarios->update($targetId, ['is_active' => 0]);
            $this->firebase->revocarTokens($target['firebase_uid']);
            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('desactivacion_fallida', 'No se pudo desactivar el usuario.', 422);
        }
    }
}
