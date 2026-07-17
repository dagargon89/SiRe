<?php

declare(strict_types=1);

namespace App\Services\Prestamos;

use App\Models\AvisoPrestamoModel;
use App\Notificaciones\Mailer;

/**
 * Detecta préstamos por vencer (≤ mañana) y vencidos, y envía un correo a
 * prestatario y prestamista. Idempotente: `avisos_prestamo` (UNIQUE
 * prestamo_id+tipo) evita reenvíos. Un préstamo puede recibir 'por_vencer' y
 * luego 'vencido' (tipos distintos).
 */
final class AlertasPrestamosService
{
    public function __construct(private readonly Mailer $mailer)
    {
    }

    /** @return int número de avisos enviados */
    public function ejecutar(?string $ahora = null): int
    {
        $ahora   = $ahora ?? date('Y-m-d H:i:s');
        $limite  = date('Y-m-d H:i:s', strtotime($ahora . ' +1 day'));
        $db      = db_connect();
        $avisos  = new AvisoPrestamoModel();

        $filas = $db->table('prestamos p')
            ->select('p.id, p.devolucion_esperada, ac.codigo, pt.email AS email_prestatario, pm.email AS email_prestamista')
            ->join('activos ac', 'ac.id = p.activo_id')
            ->join('usuarios pt', 'pt.id = p.prestatario_id')
            ->join('usuarios pm', 'pm.id = p.prestamista_id')
            ->where('p.devuelto_en', null)
            ->where('p.devolucion_esperada <=', $limite)
            ->get()->getResultArray();

        $enviados = 0;
        foreach ($filas as $p) {
            $tipo = $p['devolucion_esperada'] < $ahora ? 'vencido' : 'por_vencer';
            if ($avisos->yaEnviado((int) $p['id'], $tipo)) {
                continue;
            }

            $destinatarios = array_values(array_unique(array_filter([
                $p['email_prestatario'], $p['email_prestamista'],
            ])));

            $asunto = $tipo === 'vencido'
                ? "Préstamo VENCIDO: {$p['codigo']}"
                : "Préstamo por vencer: {$p['codigo']}";
            $cuerpo = "El préstamo del activo {$p['codigo']} tiene fecha de devolución "
                . "{$p['devolucion_esperada']} ({$tipo}). Por favor, gestiona su devolución.";

            $this->mailer->enviar($destinatarios, $asunto, $cuerpo);
            $avisos->insert(['prestamo_id' => (int) $p['id'], 'tipo' => $tipo]);
            $enviados++;
        }

        return $enviados;
    }
}
