<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Tipo de la foto de evidencia: equipo, accesorio o daño. Las fotos ya
 * existentes quedan como 'equipo'.
 */
class AddTipoEvidencias extends Migration
{
    public function up(): void
    {
        $this->db->query("ALTER TABLE evidencias ADD COLUMN tipo ENUM('equipo','accesorio','dano') NOT NULL DEFAULT 'equipo' AFTER activo_id");
    }

    public function down(): void
    {
        $this->db->query('ALTER TABLE evidencias DROP COLUMN tipo');
    }
}
