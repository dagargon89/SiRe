<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Siembra inicial. Inserta el bloque JSON espejo del doc 09 §5 SIN transformación
 * (Gobernanza v3): `app/Database/Seeds/seed_data.json` es el mismo bloque validado
 * contra el DDL en el Sprint D.
 *
 * Nota: los `firebase_uid` del demo son placeholders. Cuando se conecten las
 * credenciales reales, el administrador inicial debe existir en Firebase con el
 * uid correspondiente (o ajustar el uid del registro id:1 al del proyecto real).
 */
class InitialSeeder extends Seeder
{
    /** Orden de inserción respetando dependencias de FK. */
    private const ORDEN = [
        'organizaciones', 'categorias', 'usuarios', 'secuencias_codigo',
        'activos', 'asignaciones', 'prestamos', 'movimientos', 'avisos_prestamo',
    ];

    private const BOOLEANOS = ['is_active'];

    public function run(): void
    {
        $json = file_get_contents(__DIR__ . '/seed_data.json');
        if ($json === false) {
            throw new \RuntimeException('No se pudo leer seed_data.json');
        }

        /** @var array<string, array<int, array<string, mixed>>> $data */
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        // Inserta con FK checks desactivados para permitir ids explícitos y
        // auto-referencias (usuarios.creado_por) en un solo lote ordenado.
        $this->db->query('SET FOREIGN_KEY_CHECKS = 0');

        try {
            foreach (self::ORDEN as $tabla) {
                $filas = $data[$tabla] ?? [];
                if ($filas === []) {
                    continue;
                }

                foreach ($filas as &$fila) {
                    foreach (self::BOOLEANOS as $col) {
                        if (array_key_exists($col, $fila)) {
                            $fila[$col] = $fila[$col] ? 1 : 0;
                        }
                    }
                }
                unset($fila);

                $this->db->table($tabla)->insertBatch($filas);
            }
        } finally {
            $this->db->query('SET FOREIGN_KEY_CHECKS = 1');
        }
    }
}
