<?php

declare(strict_types=1);

namespace App\Commands;

use App\Services\Prestamos\AlertasPrestamosService;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * Cron diario (TZ America/Ciudad_Juarez): avisa préstamos por vencer y vencidos.
 * Idempotente: no reenvía avisos ya registrados.
 *
 *   php spark resguardos:alertas-prestamos
 */
class AlertasPrestamos extends BaseCommand
{
    protected $group       = 'SiRe';
    protected $name        = 'resguardos:alertas-prestamos';
    protected $description = 'Envía alertas de préstamos por vencer y vencidos (idempotente).';

    public function run(array $params): int
    {
        $enviados = (new AlertasPrestamosService(service('mailer')))->ejecutar();
        CLI::write("Avisos enviados: {$enviados}", 'green');

        return EXIT_SUCCESS;
    }
}
