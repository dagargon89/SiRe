<?php

declare(strict_types=1);

namespace App\Services\Resguardos;

use Mpdf\Mpdf;

/**
 * Carta responsiva (PDF base): formaliza la custodia de los activos vigentes de
 * un usuario. Cláusulas + tabla de bienes + líneas de firma (doc 09 / RF-24).
 */
final class CartaResponsiva
{
    /**
     * @param array               $usuario     perfil (nombre, email)
     * @param array<int,array>    $bienes      filas con 'codigo' y 'nombre'
     */
    public function generar(array $usuario, array $bienes, string $organizacion): string
    {
        $tempDir = WRITEPATH . 'mpdf';
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'Letter', 'tempDir' => $tempDir]);

        $nombre = htmlspecialchars($usuario['nombre'], ENT_QUOTES);
        $email  = htmlspecialchars($usuario['email'], ENT_QUOTES);
        $org    = htmlspecialchars($organizacion, ENT_QUOTES);
        $fecha  = date('d/m/Y');

        $filas = '';
        foreach ($bienes as $b) {
            $c = htmlspecialchars($b['codigo'], ENT_QUOTES);
            $n = htmlspecialchars($b['nombre'], ENT_QUOTES);
            $filas .= "<tr><td style='padding:4px;border:1px solid #999;font-family:monospace'>{$c}</td>"
                . "<td style='padding:4px;border:1px solid #999'>{$n}</td></tr>";
        }
        if ($filas === '') {
            $filas = "<tr><td colspan='2' style='padding:8px;text-align:center;color:#666'>Sin bienes vigentes</td></tr>";
        }

        $html = <<<HTML
        <div style="font-family:sans-serif; font-size:11pt; color:#14212e;">
            <h2 style="text-align:center; color:#16334f;">Carta Responsiva de Resguardo</h2>
            <p>En la ciudad, a {$fecha}, el/la C. <strong>{$nombre}</strong> ({$email}), adscrito(a) a
            <strong>{$org}</strong>, hace constar que recibe bajo su resguardo y responsabilidad los
            siguientes bienes propiedad del grupo:</p>

            <table style="width:100%; border-collapse:collapse; margin:12px 0;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:6px; border:1px solid #999; text-align:left;">Código</th>
                        <th style="padding:6px; border:1px solid #999; text-align:left;">Descripción</th>
                    </tr>
                </thead>
                <tbody>{$filas}</tbody>
            </table>

            <p style="font-size:10pt; color:#333;">El/la responsable se compromete a hacer buen uso de los
            bienes, resguardarlos con diligencia y devolverlos cuando le sean requeridos o al término de su
            adscripción. Cualquier daño, pérdida o extravío deberá ser reportado de inmediato.</p>

            <div style="margin-top:60px; text-align:center;">
                <span style="border-top:1px solid #333; padding:0 40px;">Firma del responsable</span>
            </div>
        </div>
        HTML;

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
