<?php

declare(strict_types=1);

namespace Tests\Support\Notificaciones;

use App\Notificaciones\Mailer;

/** Doble de prueba: registra los correos en memoria. */
final class FakeMailer implements Mailer
{
    /** @var list<array{destinatarios:list<string>,asunto:string,cuerpo:string}> */
    public array $enviados = [];

    public function enviar(array $destinatarios, string $asunto, string $cuerpo): void
    {
        $this->enviados[] = compact('destinatarios', 'asunto', 'cuerpo');
    }
}
