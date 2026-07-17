<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\CategoriaModel;
use CodeIgniter\HTTP\ResponseInterface;

class Categorias extends ApiController
{
    private function model(): CategoriaModel
    {
        return new CategoriaModel();
    }

    /** Proyecta al contrato (id:int, is_active:bool). */
    private function presentar(array $c): array
    {
        return [
            'id'        => (int) $c['id'],
            'nombre'    => $c['nombre'],
            'clave'     => $c['clave'],
            'is_active' => (bool) $c['is_active'],
        ];
    }

    /** GET /categorias?activa=1|0 — todos los roles. */
    public function index(): ResponseInterface
    {
        $model = $this->model();
        $activa = $this->request->getGet('activa');
        if ($activa !== null && $activa !== '') {
            $model->where('is_active', in_array($activa, ['1', 'true', 1, true], true) ? 1 : 0);
        }

        return $this->ok(array_map(fn ($c) => $this->presentar($c), $model->orderBy('nombre', 'ASC')->findAll()));
    }

    /** POST /categorias — administrador. */
    public function create(): ResponseInterface
    {
        $data  = $this->body();
        $model = $this->model();

        $payload = [
            'nombre'    => trim((string) ($data['nombre'] ?? '')),
            'clave'     => strtoupper(trim((string) ($data['clave'] ?? ''))),
            'is_active' => 1,
        ];

        $id = $model->insert($payload, true);
        if (! $id) {
            return $this->error(422, 'validacion', 'Datos inválidos.', ['campos' => array_values($model->errors())]);
        }

        return $this->ok($this->presentar($model->find($id)), 201);
    }

    /** PUT /categorias/{id} — administrador. */
    public function update(int $id): ResponseInterface
    {
        $model = $this->model();
        if ($model->find($id) === null) {
            return $this->error(404, 'no_existe', 'Categoría no encontrada.');
        }

        $data    = $this->body();
        $payload = [
            'nombre' => trim((string) ($data['nombre'] ?? '')),
            'clave'  => strtoupper(trim((string) ($data['clave'] ?? ''))),
        ];

        if (! $model->update($id, $payload)) {
            return $this->error(422, 'validacion', 'Datos inválidos.', ['campos' => array_values($model->errors())]);
        }

        return $this->ok($this->presentar($model->find($id)));
    }

    /** PATCH /categorias/{id}/estado — administrador. */
    public function estado(int $id): ResponseInterface
    {
        $model = $this->model();
        if ($model->find($id) === null) {
            return $this->error(404, 'no_existe', 'Categoría no encontrada.');
        }

        $activa = (bool) ($this->body()['activa'] ?? false);
        $model->update($id, ['is_active' => $activa ? 1 : 0]);

        return $this->ok($this->presentar($model->find($id)));
    }
}
