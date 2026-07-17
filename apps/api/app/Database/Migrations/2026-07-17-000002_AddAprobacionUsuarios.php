<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Auto-registro con aprobación (revierte RF-04, decisión de producto 2026-07-17):
 * - `estado` del usuario: pendiente | aprobado | rechazado. DEFAULT 'aprobado'
 *   para que altas por admin/seeder queden aprobadas; el auto-registro fija
 *   'pendiente' explícitamente.
 * - `organizacion_id` pasa a NULL: los auto-registrados no tienen organización
 *   hasta que un administrador la asigna al aprobar.
 */
class AddAprobacionUsuarios extends Migration
{
    public function up(): void
    {
        $this->db->query(
            "ALTER TABLE usuarios
             ADD COLUMN estado ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'aprobado' AFTER is_active"
        );
        $this->db->query('ALTER TABLE usuarios MODIFY organizacion_id INT UNSIGNED NULL');
        $this->db->query('ALTER TABLE usuarios ADD INDEX idx_usuarios_estado (estado)');
    }

    public function down(): void
    {
        // DROP COLUMN elimina también su índice. No se revierte la nulabilidad de
        // organizacion_id (podría haber filas con NULL de auto-registros).
        $this->db->query('ALTER TABLE usuarios DROP COLUMN estado');
    }
}
