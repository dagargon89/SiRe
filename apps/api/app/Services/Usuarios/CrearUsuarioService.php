<?php

declare(strict_types=1);

namespace App\Services\Usuarios;

use App\Auth\FirebaseAdmin;
use App\Models\UsuarioModel;
use App\Services\ServiceException;
use Throwable;

/**
 * Alta de usuario: crea la identidad en Firebase y el perfil local en MySQL,
 * de forma atómica con compensación (si falla MySQL, se elimina el usuario de
 * Firebase para no dejar huérfanos).
 */
final class CrearUsuarioService
{
    public function __construct(
        private readonly FirebaseAdmin $firebase,
        private readonly UsuarioModel $usuarios,
    ) {
    }

    /**
     * @param array{nombre:string,email:string,rol:string,organizacion_id:int} $data
     */
    public function execute(array $data, int $creadoPor): array
    {
        $rolesValidos = ['administrador', 'custodio', 'auditor'];
        if (! in_array($data['rol'] ?? '', $rolesValidos, true)) {
            throw new ServiceException('rol_invalido', 'Rol no válido.', 422);
        }

        $email = trim((string) ($data['email'] ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ServiceException('email_invalido', 'Correo no válido.', 422);
        }

        // Unicidad local antes de tocar Firebase.
        if ($this->usuarios->where('email', $email)->first() !== null) {
            throw new ServiceException('email_duplicado', 'Ya existe un usuario con ese correo.', 409);
        }

        $uid = $this->firebase->crearUsuario($email, (string) $data['nombre']);

        try {
            $id = $this->usuarios->insert([
                'firebase_uid'    => $uid,
                'organizacion_id' => (int) $data['organizacion_id'],
                'nombre'          => (string) $data['nombre'],
                'email'           => $email,
                'rol'             => $data['rol'],
                'is_active'       => 1,
                'creado_por'      => $creadoPor,
            ], true);
        } catch (Throwable $e) {
            // Compensación: revertir la creación en Firebase.
            $this->firebase->eliminarUsuario($uid);
            throw new ServiceException('alta_fallida', 'No se pudo crear el usuario.', 422);
        }

        if (! $id) {
            $this->firebase->eliminarUsuario($uid);
            $errores = $this->usuarios->errors();
            throw new ServiceException('validacion', 'Datos inválidos.', 422, ['campos' => array_values($errores)]);
        }

        return $this->usuarios->find($id);
    }
}
