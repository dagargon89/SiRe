<?php

declare(strict_types=1);

namespace App\Commands;

use App\Models\UsuarioModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Kreait\Firebase\Exception\Auth\UserNotFound;
use Throwable;

/**
 * Provisiona un administrador: crea (o reutiliza) el usuario en Firebase Auth
 * y vincula su UID real a un perfil local con rol administrador y activo.
 *
 * Uso:
 *   php spark sire:crear-admin --email a@b.com --password Secreto123 --nombre "Admin" --org AVZ
 * (los que falten se preguntan de forma interactiva).
 */
class CrearAdmin extends BaseCommand
{
    protected $group       = 'SiRe';
    protected $name        = 'sire:crear-admin';
    protected $description = 'Crea/vincula un administrador en Firebase + perfil local.';
    protected $usage       = 'sire:crear-admin [--email] [--password] [--nombre] [--org clave|id]';
    protected $options     = [
        '--email'    => 'Correo del administrador',
        '--password' => 'Contraseña (solo si el usuario no existe en Firebase)',
        '--nombre'   => 'Nombre para mostrar',
        '--org'      => 'Organización de origen (clave de 3 letras o id)',
    ];

    public function run(array $params): int
    {
        $email  = $params['email']  ?? CLI::prompt('Correo del administrador');
        $nombre = $params['nombre'] ?? CLI::prompt('Nombre', 'Administrador');
        $org    = $params['org']    ?? CLI::prompt('Organización (clave de 3 letras o id)');

        $orgId = $this->resolverOrganizacion((string) $org);
        if ($orgId === null) {
            CLI::error("No existe la organización '{$org}'. Crea primero las organizaciones (seeder) o usa una clave/id válidos.");

            return EXIT_ERROR;
        }

        try {
            $auth = service('firebaseAuth');
        } catch (Throwable $e) {
            CLI::error($e->getMessage());

            return EXIT_ERROR;
        }

        // Buscar o crear el usuario en Firebase.
        try {
            $userRecord = $auth->getUserByEmail($email);
            CLI::write("Usuario Firebase existente: {$userRecord->uid}", 'yellow');
        } catch (UserNotFound) {
            $password = $params['password'] ?? CLI::prompt('Contraseña (nuevo usuario)', null, 'required');
            $userRecord = $auth->createUser([
                'email'         => $email,
                'emailVerified' => true,
                'password'      => $password,
                'displayName'   => $nombre,
            ]);
            CLI::write("Usuario Firebase creado: {$userRecord->uid}", 'green');
        } catch (Throwable $e) {
            CLI::error('Error con Firebase: ' . $e->getMessage());

            return EXIT_ERROR;
        }

        $uid   = $userRecord->uid;
        $model = new UsuarioModel();

        // Upsert del perfil local por uid o por email.
        $existente = $model->where('firebase_uid', $uid)->orWhere('email', $email)->first();

        $datos = [
            'firebase_uid'    => $uid,
            'organizacion_id' => $orgId,
            'nombre'          => $nombre,
            'email'           => $email,
            'rol'             => 'administrador',
            'is_active'       => 1,
        ];

        if ($existente !== null) {
            $model->update($existente['id'], $datos);
            CLI::write("Perfil local actualizado (id {$existente['id']}) como administrador activo.", 'green');
        } else {
            $model->insert($datos);
            CLI::write('Perfil local creado como administrador activo.', 'green');
        }

        CLI::write('Listo. Ya puedes iniciar sesión con ese correo.', 'green');

        return EXIT_SUCCESS;
    }

    private function resolverOrganizacion(string $org): ?int
    {
        $db = db_connect();

        if (ctype_digit($org)) {
            $row = $db->table('organizaciones')->where('id', (int) $org)->get()->getRowArray();
        } else {
            $row = $db->table('organizaciones')->where('clave', strtoupper($org))->get()->getRowArray();
        }

        return $row !== null ? (int) $row['id'] : null;
    }
}
