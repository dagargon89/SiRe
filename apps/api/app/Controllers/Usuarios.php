<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\UsuarioModel;
use App\Services\ServiceException;
use App\Services\Usuarios\CrearUsuarioService;
use App\Services\Usuarios\DesactivarUsuarioService;
use App\Services\Usuarios\PoliticaPii;
use CodeIgniter\HTTP\ResponseInterface;

class Usuarios extends ApiController
{
    private function model(): UsuarioModel
    {
        return new UsuarioModel();
    }

    /** Proyecta la fila al contrato Usuario (sin exponer firebase_uid/timestamps). */
    private function presentar(array $u): array
    {
        return [
            'id'              => (int) $u['id'],
            'nombre'          => $u['nombre'],
            'email'           => $u['email'],
            'rol'             => $u['rol'],
            'organizacion_id' => (int) $u['organizacion_id'],
            'is_active'       => (bool) $u['is_active'],
        ];
    }

    /** GET /usuarios?page= — administrador. */
    public function index(): ResponseInterface
    {
        $model   = $this->model();
        $perPage = 25;
        $page    = max(1, (int) ($this->request->getGet('page') ?? 1));

        $rows  = $model->orderBy('nombre', 'ASC')->paginate($perPage, 'default', $page);
        $total = $model->pager->getTotal('default');

        return $this->ok([
            'data' => array_map(fn ($r) => $this->presentar($r), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ]);
    }

    /** POST /usuarios — administrador. Crea en Firebase + perfil local. */
    public function create(): ResponseInterface
    {
        $data    = $this->body();
        $service = new CrearUsuarioService(service('firebaseAdmin'), $this->model());

        try {
            $usuario = $service->execute([
                'nombre'          => (string) ($data['nombre'] ?? ''),
                'email'           => (string) ($data['email'] ?? ''),
                'rol'             => (string) ($data['rol'] ?? ''),
                'organizacion_id' => (int) ($data['organizacion_id'] ?? 0),
            ], (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($usuario), 201);
    }

    /** GET /usuarios/{id} — administrador o el propio titular (PII). */
    public function show(int $id): ResponseInterface
    {
        if (! PoliticaPii::puedeVer($this->actor(), $id)) {
            return $this->error(403, 'sin_permiso_pii', 'No tienes permiso para ver esta ficha.');
        }

        $u = $this->model()->find($id);
        if ($u === null) {
            return $this->error(404, 'no_existe', 'Usuario no encontrado.');
        }

        return $this->ok($this->presentar($u));
    }

    /** PUT /usuarios/{id} — administrador. */
    public function update(int $id): ResponseInterface
    {
        $model = $this->model();
        if ($model->find($id) === null) {
            return $this->error(404, 'no_existe', 'Usuario no encontrado.');
        }

        $data    = $this->body();
        $payload = [];
        if (isset($data['nombre'])) {
            $payload['nombre'] = trim((string) $data['nombre']);
        }
        if (isset($data['organizacion_id'])) {
            $payload['organizacion_id'] = (int) $data['organizacion_id'];
        }

        if ($payload !== [] && ! $model->update($id, $payload)) {
            return $this->error(422, 'validacion', 'Datos inválidos.', ['campos' => array_values($model->errors())]);
        }

        return $this->ok($this->presentar($model->find($id)));
    }

    /** PATCH /usuarios/{id}/rol — administrador. No a sí mismo. */
    public function rol(int $id): ResponseInterface
    {
        if ($id === (int) $this->actor()['id']) {
            return $this->error(403, 'no_auto_rol', 'No puedes cambiar tu propio rol.');
        }

        $model = $this->model();
        if ($model->find($id) === null) {
            return $this->error(404, 'no_existe', 'Usuario no encontrado.');
        }

        $rol = (string) ($this->body()['rol'] ?? '');
        if (! in_array($rol, ['administrador', 'custodio', 'auditor'], true)) {
            return $this->error(422, 'rol_invalido', 'Rol no válido.');
        }

        $model->update($id, ['rol' => $rol]);

        return $this->ok($this->presentar($model->find($id)));
    }

    /** PATCH /usuarios/{id}/desactivar — administrador. No a sí mismo. */
    public function desactivar(int $id): ResponseInterface
    {
        $service = new DesactivarUsuarioService(service('firebaseAdmin'), $this->model());

        try {
            $service->execute($id, (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->noContent();
    }
}
