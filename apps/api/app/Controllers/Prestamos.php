<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ActivoModel;
use App\Models\MovimientoModel;
use App\Models\PrestamoModel;
use App\Models\UsuarioModel;
use App\Services\Prestamos\PrestamoService;
use App\Services\ServiceException;
use CodeIgniter\HTTP\ResponseInterface;

class Prestamos extends ApiController
{
    private function model(): PrestamoModel
    {
        return new PrestamoModel();
    }

    private function service(): PrestamoService
    {
        return new PrestamoService(new ActivoModel(), $this->model(), new MovimientoModel(), new UsuarioModel());
    }

    private function presentar(array $p, string $ahora): array
    {
        return [
            'id'                   => (int) $p['id'],
            'activo_id'            => (int) $p['activo_id'],
            'prestatario_id'       => (int) $p['prestatario_id'],
            'prestamista_id'       => (int) $p['prestamista_id'],
            'prestado_en'          => $p['prestado_en'],
            'devolucion_esperada'  => $p['devolucion_esperada'],
            'devuelto_en'          => $p['devuelto_en'],
            'condicion_prestamo'   => $p['condicion_prestamo'],
            'condicion_devolucion' => $p['condicion_devolucion'],
            'estado'               => PrestamoModel::estadoDerivado($p, $ahora),
        ];
    }

    /** GET /prestamos?estado=activo|vencido|devuelto — todos los roles. */
    public function index(): ResponseInterface
    {
        $ahora  = date('Y-m-d H:i:s');
        $model  = $this->model();
        $estado = $this->request->getGet('estado');

        if ($estado === 'activo') {
            $model->where('devuelto_en', null)->where('devolucion_esperada >=', $ahora);
        } elseif ($estado === 'vencido') {
            $model->where('devuelto_en', null)->where('devolucion_esperada <', $ahora);
        } elseif ($estado === 'devuelto') {
            $model->where('devuelto_en IS NOT NULL');
        }

        $perPage = 25;
        $page    = max(1, (int) ($this->request->getGet('page') ?? 1));
        $rows    = $model->orderBy('id', 'DESC')->paginate($perPage, 'default', $page);
        $total   = $model->pager->getTotal('default');

        return $this->ok([
            'data' => array_map(fn ($p) => $this->presentar($p, $ahora), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ]);
    }

    /** POST /prestamos — administrador. */
    public function create(): ResponseInterface
    {
        try {
            $p = $this->service()->prestar($this->body(), (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($p, date('Y-m-d H:i:s')), 201);
    }

    /** PATCH /prestamos/{id}/devolver — administrador o custodio. */
    public function devolver(int $id): ResponseInterface
    {
        try {
            $p = $this->service()->devolver($id, $this->body(), (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($p, date('Y-m-d H:i:s')));
    }
}
