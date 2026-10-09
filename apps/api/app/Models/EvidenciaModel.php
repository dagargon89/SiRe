<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class EvidenciaModel extends Model
{
    protected $table         = 'evidencias';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'activo_id', 'archivo', 'descripcion', 'ancho', 'alto', 'bytes', 'subido_por',
    ];
}
