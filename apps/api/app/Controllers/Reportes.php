<?php

declare(strict_types=1);

namespace App\Controllers;

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

    /**
     * GET /reportes/inventario — admin y auditor. Filtros como en el listado.
     * Incluye el custodio vigente (o el prestatario si está prestado) en la
     * misma consulta (sin N+1).
     */
    public function inventario(): ResponseInterface
    {
        $builder = db_connect()->table('activos a')
            ->select('a.codigo, a.nombre, a.estado, a.condicion, u.nombre AS custodio, pu.nombre AS prestatario')
            ->join('asignaciones s', 's.activo_id = a.id AND s.revocada_en IS NULL', 'left')
            ->join('usuarios u', 'u.id = s.usuario_id', 'left')
            ->join('prestamos p', 'p.activo_id = a.id AND p.devuelto_en IS NULL', 'left')
            ->join('usuarios pu', 'pu.id = p.prestatario_id', 'left');
        foreach (['categoria_id', 'organizacion_id', 'estado', 'condicion'] as $f) {
            $v = $this->request->getGet($f);
            if ($v !== null && $v !== '') {
                $builder->where('a.' . $f, $v);
            }
        }
        $activos = $builder->orderBy('a.codigo', 'ASC')->get()->getResultArray();
        $bytes   = (new ReportePdf())->inventario($activos);

        return $this->pdf($bytes, 'inventario.pdf');
    }

    /** GET /reportes/movimientos?desde=&hasta= — admin y auditor. */
    public function movimientos(): ResponseInterface
    {
        $desde = (string) ($this->request->getGet('desde') ?? date('Y-m-01'));
        $hasta = (string) ($this->request->getGet('hasta') ?? date('Y-m-d'));

        $filas = db_connect()->table('movimientos m')
            ->select('m.creado_en, m.tipo, m.notas, a.codigo, u.nombre AS realizado_por')
            ->join('activos a', 'a.id = m.activo_id')
            ->join('usuarios u', 'u.id = m.realizado_por', 'left')
            ->where('m.creado_en >=', $desde . ' 00:00:00')
            ->where('m.creado_en <=', $hasta . ' 23:59:59')
            ->orderBy('m.creado_en', 'ASC')->orderBy('m.id', 'ASC')
            ->get()->getResultArray();

        $bytes = (new ReportePdf())->movimientos($filas, $desde, $hasta);

        return $this->pdf($bytes, 'movimientos.pdf');
    }
}
