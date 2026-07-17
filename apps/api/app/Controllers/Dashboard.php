<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\Dashboard\DashboardService;
use CodeIgniter\HTTP\ResponseInterface;

class Dashboard extends ApiController
{
    /** GET /dashboard — admin y auditor (completo); custodio (parcial). */
    public function index(): ResponseInterface
    {
        $completo = in_array($this->actor()['rol'] ?? '', ['administrador', 'auditor'], true);

        return $this->ok((new DashboardService())->resumen($completo));
    }
}
