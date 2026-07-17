<?php

declare(strict_types=1);

namespace App\Notificaciones;

/** Envío de correo. Abstraído para pruebas (sin SMTP real). */
interface Mailer
{
    /** @param list<string> $destinatarios */
    public function enviar(array $destinatarios, string $asunto, string $cuerpo): void;
}
