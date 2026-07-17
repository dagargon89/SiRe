<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

/**
 * Bitácora append-only (regla 4). No se exponen update/delete: la capa de datos
 * solo inserta. `creado_en` lo pone MySQL (DEFAULT CURRENT_TIMESTAMP).
 */
class MovimientoModel extends Model
{
    protected $table         = 'movimientos';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'activo_id', 'tipo', 'de_usuario_id', 'a_usuario_id',
        'de_org_id', 'a_org_id', 'realizado_por', 'notas',
    ];

    /** Registra un movimiento (única operación de escritura permitida). */
    public function registrar(array $mov): int
    {
        return (int) $this->insert($mov, true);
    }
}
