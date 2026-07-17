<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class AvisoPrestamoModel extends Model
{
    protected $table         = 'avisos_prestamo';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = ['prestamo_id', 'tipo', 'enviado_en'];

    /** ¿Ya se envió un aviso de este tipo para el préstamo? (idempotencia) */
    public function yaEnviado(int $prestamoId, string $tipo): bool
    {
        return $this->where('prestamo_id', $prestamoId)->where('tipo', $tipo)->countAllResults() > 0;
    }
}
