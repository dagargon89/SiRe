<?php

declare(strict_types=1);

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;

/** Salud del API (público, sin auth). Verifica MySQL y Redis. */
class Health extends BaseController
{
    public function index(): ResponseInterface
    {
        $db = 'ok';
        try {
            \Config\Database::connect()->query('SELECT 1');
        } catch (\Throwable) {
            $db = 'error';
        }

        $redis = 'ok';
        try {
            cache()->save('sire_health', '1', 5);
            if (cache()->get('sire_health') !== '1') {
                $redis = 'error';
            }
        } catch (\Throwable) {
            $redis = 'error';
        }

        $ok = $db === 'ok' && $redis === 'ok';

        return $this->response
            ->setStatusCode($ok ? 200 : 503)
            ->setJSON(['status' => $ok ? 'ok' : 'degraded', 'db' => $db, 'redis' => $redis]);
    }
}
