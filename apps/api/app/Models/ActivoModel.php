<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class ActivoModel extends Model
{
    protected $table         = 'activos';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'codigo', 'categoria_id', 'organizacion_id', 'nombre', 'descripcion', 'observaciones',
        'marca', 'modelo', 'serie', 'fecha_compra', 'valor_compra', 'proveedor',
        'factura_numero', 'factura_archivo_ref', 'qr_archivo_ref',
        'condicion', 'estado', 'baja_motivo', 'creado_por', 'actualizado_por',
    ];

    protected $validationRules = [
        'nombre'          => 'required|max_length[200]',
        'categoria_id'    => 'required|is_natural_no_zero',
        'organizacion_id' => 'required|is_natural_no_zero',
        'condicion'       => 'permit_empty|in_list[excelente,bueno,regular,malo,baja]',
    ];
}
