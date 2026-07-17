<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth\CurrentUser;
use App\Models\UsuarioModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * GET /api/v1/me — perfil del usuario autenticado. Si el token es válido pero no
 * hay perfil local, se auto-provisiona uno en estado 'pendiente' (auto-registro
 * con aprobación). Devuelve el estado para que el frontend enrute (pendiente,
 * rechazado, aprobado).
 */
class Me extends BaseController
{
    public function index(): ResponseInterface
    {
        /** @var CurrentUser $current */
        $current = service('currentUser');
        $u       = $current->get();

        if ($u === null) {
            $claims = $current->claims();
            if ($claims === null) {
                return $this->response->setStatusCode(401)->setJSON(['error' => 'no_autenticado', 'mensaje' => 'No autenticado.']);
            }

            $model = new UsuarioModel();
            $email = $claims->email ?? ($claims->uid . '@sin-correo.local');
            $model->insert([
                'firebase_uid'    => $claims->uid,
                'organizacion_id' => null,
                'nombre'          => $claims->nombre ?? $email,
                'email'           => $email,
                'rol'             => 'custodio',
                'is_active'       => 1,
                'estado'          => 'pendiente',
            ]);
            $u = $model->findByFirebaseUid($claims->uid);
        }

        return $this->response->setJSON([
            'id'              => (int) $u['id'],
            'nombre'          => $u['nombre'],
            'email'           => $u['email'],
            'rol'             => $u['rol'],
            'organizacion_id' => $u['organizacion_id'] !== null ? (int) $u['organizacion_id'] : null,
            'is_active'       => (bool) $u['is_active'],
            'estado'          => $u['estado'],
        ]);
    }
}
