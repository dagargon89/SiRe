<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class AsignacionModel extends Model
{
    protected $table         = 'asignaciones';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'activo_id', 'usuario_id', 'organizacion_id', 'asignada_en', 'asignada_por',
        'revocada_en', 'revocada_por', 'revocacion_motivo', 'notas',
    ];

    /** Asignación vigente (no revocada) de un activo, o null. */
    public function vigenteDe(int $activoId): ?array
    {
        $row = $this->where('activo_id', $activoId)->where('revocada_en', null)->first();

        return $row ?: null;
    }
}
