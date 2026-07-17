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
        'firebase_uid', 'organizacion_id', 'nombre', 'email', 'rol', 'is_active', 'estado', 'creado_por',
    ];

    protected $validationRules = [
        'firebase_uid'    => 'required|max_length[128]',
        'organizacion_id' => 'permit_empty|is_natural_no_zero', // null en auto-registro hasta aprobar
        'nombre'          => 'required|max_length[150]',
        'email'           => 'required|valid_email|max_length[180]',
        'rol'             => 'required|in_list[administrador,custodio,auditor]',
    ];

    /** Devuelve el usuario ligado a un firebase_uid (cualquier estado), o null. */
    public function findByFirebaseUid(string $uid): ?array
    {
        return $this->where('firebase_uid', $uid)->first() ?: null;
    }
}
