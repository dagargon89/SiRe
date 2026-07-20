<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Observaciones del activo: texto enriquecido (WYSIWYG) opcional. Se guarda
 * como HTML ya saneado en el servidor (lista blanca de etiquetas); ver
 * App\Services\Html\SanitizadorHtml. TEXT NULL, tras `descripcion`.
 */
class AddObservacionesActivos extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE activos ADD COLUMN observaciones TEXT NULL AFTER descripcion');
    }

    public function down(): void
    {
        $this->db->query('ALTER TABLE activos DROP COLUMN observaciones');
    }
}
