<?php

declare(strict_types=1);

namespace App\Services\Reportes;

use Mpdf\Mpdf;

/** Genera reportes PDF (inventario y movimientos) con mPDF. */
final class ReportePdf
{
    private function mpdf(string $formato = 'Letter'): Mpdf
    {
        $tempDir = WRITEPATH . 'mpdf';
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        return new Mpdf(['mode' => 'utf-8', 'format' => $formato, 'tempDir' => $tempDir]);
    }

    /**
     * Hoja horizontal (carta).
     *
     * @param array<int,array> $activos filas con codigo, nombre, estado, condicion, custodio?, prestatario?
     */
    public function inventario(array $activos): string
    {
        $filas = '';
        foreach ($activos as $a) {
            $custodio = ($a['custodio'] ?? null)
                ?? (($a['prestatario'] ?? null) !== null ? $a['prestatario'] . ' (préstamo)' : '—');
            $filas .= '<tr>'
                . '<td style="border:1px solid #999;padding:4px;font-family:monospace">' . esc($a['codigo']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($a['nombre']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($a['estado']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($a['condicion']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($custodio) . '</td>'
                . '</tr>';
        }
        $fecha = date('d/m/Y H:i');
        $html  = "<h2 style='color:#16334f'>Reporte de inventario</h2><p style='font-size:9pt'>Generado {$fecha} · "
            . count($activos) . " activos</p>"
            . "<table style='width:100%;border-collapse:collapse;font-size:9pt'>"
            . "<thead><tr style='background:#f1f5f9'>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Código</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Nombre</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Estado</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Condición</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Custodio</th>"
            . "</tr></thead><tbody>{$filas}</tbody></table>";

        $mpdf = $this->mpdf('Letter-L');
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }

    /**
     * Hoja horizontal (carta).
     *
     * @param array<int,array> $movimientos filas con creado_en, tipo, codigo, notas, realizado_por
     */
    public function movimientos(array $movimientos, string $desde, string $hasta): string
    {
        $filas = '';
        foreach ($movimientos as $m) {
            $filas .= '<tr>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($m['creado_en']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px;font-family:monospace">' . esc($m['codigo'] ?? '') . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($m['tipo']) . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($m['realizado_por'] ?? '—') . '</td>'
                . '<td style="border:1px solid #999;padding:4px">' . esc($m['notas'] ?? '') . '</td>'
                . '</tr>';
        }
        $html = "<h2 style='color:#16334f'>Reporte de movimientos</h2>"
            . "<p style='font-size:9pt'>Del " . esc($desde) . ' al ' . esc($hasta) . ' · ' . count($movimientos) . " registros</p>"
            . "<table style='width:100%;border-collapse:collapse;font-size:9pt'>"
            . "<thead><tr style='background:#f1f5f9'>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Fecha</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Activo</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Tipo</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Realizado por</th>"
            . "<th style='border:1px solid #999;padding:4px;text-align:left'>Notas</th>"
            . "</tr></thead><tbody>{$filas}</tbody></table>";

        $mpdf = $this->mpdf('Letter-L');
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
