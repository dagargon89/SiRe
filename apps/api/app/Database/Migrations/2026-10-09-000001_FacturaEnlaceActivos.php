<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * La factura del activo deja de subirse a Firebase Storage: se captura el
 * enlace de Google Drive donde vive el archivo (`factura_enlace`, tras
 * `factura_numero`). Se elimina `factura_archivo_ref`, que nunca se usó desde
 * la interfaz.
 */
class FacturaEnlaceActivos extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE activos ADD COLUMN factura_enlace VARCHAR(500) NULL AFTER factura_numero');
        $this->db->query('ALTER TABLE activos DROP COLUMN factura_archivo_ref');
    }

    public function down(): void
    {
        $this->db->query('ALTER TABLE activos ADD COLUMN factura_archivo_ref VARCHAR(500) NULL AFTER factura_numero');
        $this->db->query('ALTER TABLE activos DROP COLUMN factura_enlace');
    }
}
