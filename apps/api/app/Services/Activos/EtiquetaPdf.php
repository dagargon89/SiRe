<?php

declare(strict_types=1);

namespace App\Services\Activos;

use Mpdf\Mpdf;

/** Genera la etiqueta imprimible (PDF) con QR + código + nombre del activo. */
final class EtiquetaPdf
{
    public function generar(array $activo, string $qrPngBase64): string
    {
        $tempDir = WRITEPATH . 'mpdf';
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $mpdf = new Mpdf([
            'mode'    => 'utf-8',
            'format'  => [70, 45], // etiqueta 70x45 mm
            'margin_left' => 4, 'margin_right' => 4, 'margin_top' => 4, 'margin_bottom' => 4,
            'tempDir' => $tempDir,
        ]);

        $codigo = htmlspecialchars($activo['codigo'], ENT_QUOTES);
        $nombre = htmlspecialchars($activo['nombre'], ENT_QUOTES);

        $html = <<<HTML
        <div style="text-align:center; font-family:sans-serif;">
            <img src="data:image/png;base64,{$qrPngBase64}" style="width:90px; height:90px;"><br>
            <span style="font-family:monospace; font-size:11pt; font-weight:bold;">{$codigo}</span><br>
            <span style="font-size:7pt; color:#333;">{$nombre}</span>
        </div>
        HTML;

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S'); // devuelve el PDF como string
    }
}
