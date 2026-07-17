<?php

declare(strict_types=1);

namespace App\Services\Activos;

use CodeIgniter\Database\BaseConnection;

/**
 * Genera el código físico correlativo `CLAVE_CAT-CLAVE_ORG-###` a prueba de
 * concurrencia. DEBE llamarse dentro de una transacción del llamador: bloquea
 * la fila de `secuencias_codigo` con SELECT ... FOR UPDATE, de modo que dos
 * altas simultáneas nunca obtienen el mismo consecutivo (regla 6).
 */
final class GeneradorCodigo
{
    public function siguiente(BaseConnection $db, int $categoriaId, int $organizacionId): string
    {
        // Asegura que exista la fila del par (idempotente ante concurrencia).
        $db->query(
            'INSERT IGNORE INTO secuencias_codigo (categoria_id, organizacion_id, ultimo) VALUES (?, ?, 0)',
            [$categoriaId, $organizacionId],
        );

        // Bloqueo de fila: serializa a los concurrentes sobre este par.
        $row = $db->query(
            'SELECT ultimo FROM secuencias_codigo WHERE categoria_id = ? AND organizacion_id = ? FOR UPDATE',
            [$categoriaId, $organizacionId],
        )->getRowArray();

        $siguiente = (int) $row['ultimo'] + 1;

        $db->query(
            'UPDATE secuencias_codigo SET ultimo = ? WHERE categoria_id = ? AND organizacion_id = ?',
            [$siguiente, $categoriaId, $organizacionId],
        );

        $claveCat = $db->query('SELECT clave FROM categorias WHERE id = ?', [$categoriaId])->getRowArray()['clave'];
        $claveOrg = $db->query('SELECT clave FROM organizaciones WHERE id = ?', [$organizacionId])->getRowArray()['clave'];

        return sprintf('%s-%s-%03d', $claveCat, $claveOrg, $siguiente);
    }
}
