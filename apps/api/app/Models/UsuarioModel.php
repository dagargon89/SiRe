<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class UsuarioModel extends Model
{
    protected $table            = 'usuarios';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $useTimestamps    = false; // los timestamps los maneja MySQL (DEFAULT/ON UPDATE)

    protected $allowedFields = [
        'firebase_uid', 'organizacion_id', 'nombre', 'email', 'rol', 'is_active', 'creado_por',
    ];

    protected $validationRules = [
        'firebase_uid'    => 'required|max_length[128]',
        'organizacion_id' => 'required|is_natural_no_zero',
        'nombre'          => 'required|max_length[150]',
        'email'           => 'required|valid_email|max_length[180]',
        'rol'             => 'required|in_list[administrador,custodio,auditor]',
    ];

    /** Devuelve el usuario ACTIVO ligado a un firebase_uid, o null. */
    public function findActiveByFirebaseUid(string $uid): ?array
    {
        $row = $this->where('firebase_uid', $uid)
            ->where('is_active', 1)
            ->first();

        return $row ?: null;
    }
}
