<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class CategoriaModel extends Model
{
    protected $table         = 'categorias';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = ['nombre', 'clave', 'is_active'];

    protected $validationRules = [
        'nombre' => 'required|max_length[120]',
        'clave'  => 'required|exact_length[3]|alpha|is_unique[categorias.clave,id,{id}]',
    ];

    protected $validationMessages = [
        'clave' => [
            'exact_length' => 'La clave debe tener exactamente 3 letras.',
            'alpha'        => 'La clave solo admite letras.',
            'is_unique'    => 'Ya existe una categoría con esa clave.',
        ],
    ];
}
