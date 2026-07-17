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

    /** Consulta base con activo + nombres (para evitar IDs sueltos en la UI). */
    private function builder()
    {
        return db_connect()->table('prestamos p')
            ->select('p.*, a.codigo AS activo_codigo, pt.nombre AS prestatario_nombre, pm.nombre AS prestamista_nombre')
            ->join('activos a', 'a.id = p.activo_id')
            ->join('usuarios pt', 'pt.id = p.prestatario_id')
            ->join('usuarios pm', 'pm.id = p.prestamista_id');
    }

    private function presentar(array $p, string $ahora): array
    {
        return [
            'id'                   => (int) $p['id'],
            'activo_id'            => (int) $p['activo_id'],
            'activo_codigo'        => $p['activo_codigo'] ?? null,
            'prestatario_id'       => (int) $p['prestatario_id'],
            'prestatario_nombre'   => $p['prestatario_nombre'] ?? null,
            'prestamista_id'       => (int) $p['prestamista_id'],
            'prestamista_nombre'   => $p['prestamista_nombre'] ?? null,
            'prestado_en'          => $p['prestado_en'],
            'devolucion_esperada'  => $p['devolucion_esperada'],
            'devuelto_en'          => $p['devuelto_en'],
            'condicion_prestamo'   => $p['condicion_prestamo'],
            'condicion_devolucion' => $p['condicion_devolucion'],
            'estado'               => PrestamoModel::estadoDerivado($p, $ahora),
        ];
    }

    private function porId(int $id, string $ahora): array
    {
        return $this->presentar($this->builder()->where('p.id', $id)->get()->getRowArray(), $ahora);
    }

    /** GET /prestamos?estado=activo|vencido|devuelto — todos los roles. */
    public function index(): ResponseInterface
    {
        $ahora   = date('Y-m-d H:i:s');
        $estado  = $this->request->getGet('estado');
        $builder = $this->builder();

        if ($estado === 'activo') {
            $builder->where('p.devuelto_en', null)->where('p.devolucion_esperada >=', $ahora);
        } elseif ($estado === 'vencido') {
            $builder->where('p.devuelto_en', null)->where('p.devolucion_esperada <', $ahora);
        } elseif ($estado === 'devuelto') {
            $builder->where('p.devuelto_en IS NOT NULL');
        }

        $perPage = 25;
        $page    = max(1, (int) ($this->request->getGet('page') ?? 1));
        $total   = $builder->countAllResults(false);
        $rows    = $builder->orderBy('p.id', 'DESC')->limit($perPage, ($page - 1) * $perPage)->get()->getResultArray();

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

        return $this->ok($this->porId((int) $p['id'], date('Y-m-d H:i:s')), 201);
    }

    /** PATCH /prestamos/{id}/devolver — administrador o custodio. */
    public function devolver(int $id): ResponseInterface
    {
        try {
            $this->service()->devolver($id, $this->body(), (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->porId($id, date('Y-m-d H:i:s')));
    }
}
