<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth\CurrentUser;
use CodeIgniter\HTTP\ResponseInterface;

/** GET /api/v1/me — perfil y rol del usuario autenticado. */
class Me extends BaseController
{
    public function index(): ResponseInterface
    {
        /** @var CurrentUser $current */
        $current = service('currentUser');
        $u       = $current->get();

        return $this->response->setJSON([
            'id'              => (int) $u['id'],
            'nombre'          => $u['nombre'],
            'email'           => $u['email'],
            'rol'             => $u['rol'],
            'organizacion_id' => (int) $u['organizacion_id'],
            'is_active'       => (bool) $u['is_active'],
        ]);
    }
}
