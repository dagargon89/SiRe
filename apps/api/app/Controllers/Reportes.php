<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ActivoModel;
use App\Services\Reportes\ReportePdf;
use CodeIgniter\HTTP\ResponseInterface;

class Reportes extends ApiController
{
    private function pdf(string $bytes, string $nombre): ResponseInterface
    {
        return $this->response
            ->setContentType('application/pdf')
            ->setHeader('Content-Disposition', 'inline; filename="' . $nombre . '"')
            ->setBody($bytes);
    }

    /** GET /reportes/inventario — admin y auditor. Filtros como en el listado. */
    public function inventario(): ResponseInterface
    {
        $model = new ActivoModel();
        foreach (['categoria_id', 'organizacion_id', 'estado', 'condicion'] as $f) {
            $v = $this->request->getGet($f);
            if ($v !== null && $v !== '') {
                $model->where($f, $v);
            }
        }
        $activos = $model->orderBy('codigo', 'ASC')->findAll();
        $bytes   = (new ReportePdf())->inventario($activos);

        return $this->pdf($bytes, 'inventario.pdf');
    }

    /** GET /reportes/movimientos?desde=&hasta= — admin y auditor. */
    public function movimientos(): ResponseInterface
    {
        $desde = (string) ($this->request->getGet('desde') ?? date('Y-m-01'));
        $hasta = (string) ($this->request->getGet('hasta') ?? date('Y-m-d'));

        $filas = db_connect()->table('movimientos m')
            ->select('m.creado_en, m.tipo, m.notas, a.codigo')
            ->join('activos a', 'a.id = m.activo_id')
            ->where('m.creado_en >=', $desde . ' 00:00:00')
            ->where('m.creado_en <=', $hasta . ' 23:59:59')
            ->orderBy('m.creado_en', 'ASC')->orderBy('m.id', 'ASC')
            ->get()->getResultArray();

        $bytes = (new ReportePdf())->movimientos($filas, $desde, $hasta);

        return $this->pdf($bytes, 'movimientos.pdf');
    }
}
