<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class OrganizacionModel extends Model
{
    protected $table         = 'organizaciones';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false; // MySQL maneja creado_en/actualizado_en

    protected $allowedFields = ['nombre', 'clave', 'is_active'];

    protected $validationRules = [
        'nombre' => 'required|max_length[150]',
        'clave'  => 'required|exact_length[3]|alpha|is_unique[organizaciones.clave,id,{id}]',
    ];

    protected $validationMessages = [
        'clave' => [
            'exact_length' => 'La clave debe tener exactamente 3 letras.',
            'alpha'        => 'La clave solo admite letras.',
            'is_unique'    => 'Ya existe una organización con esa clave.',
        ],
    ];
}
