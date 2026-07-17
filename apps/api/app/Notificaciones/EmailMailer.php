<?php

declare(strict_types=1);

namespace App\Notificaciones;

/** Implementación SMTP con el servicio Email de CI4. */
final class EmailMailer implements Mailer
{
    public function enviar(array $destinatarios, string $asunto, string $cuerpo): void
    {
        if ($destinatarios === []) {
            return;
        }

        $email = service('email');
        $email->setFrom((string) (env('SMTP_FROM') ?? 'noreply@planjuarez.org'), 'SiRe');
        $email->setTo($destinatarios);
        $email->setSubject($asunto);
        $email->setMessage($cuerpo);
        $email->send();
    }
}
