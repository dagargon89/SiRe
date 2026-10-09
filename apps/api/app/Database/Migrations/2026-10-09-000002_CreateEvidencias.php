<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Evidencias fotográficas del activo (equipo y accesorios). Los archivos viven
 * en el servidor, fuera del webroot (writable/evidencias/); aquí solo se guarda
 * el nombre del archivo. Se agrega el tipo de movimiento 'evidencia' para que
 * subir o eliminar una foto quede en la bitácora.
 */
class CreateEvidencias extends Migration
{
    public function up(): void
    {
        $charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

        $this->db->query("CREATE TABLE evidencias (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            activo_id   INT UNSIGNED NOT NULL,
            archivo     VARCHAR(100) NOT NULL,
            descripcion VARCHAR(255) NULL,
            ancho       SMALLINT UNSIGNED NOT NULL,
            alto        SMALLINT UNSIGNED NOT NULL,
            bytes       INT UNSIGNED NOT NULL,
            subido_por  INT UNSIGNED NOT NULL,
            creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_evidencia_archivo (archivo),
            INDEX idx_evidencia_activo (activo_id),
            CONSTRAINT fk_evidencia_activo FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE RESTRICT,
            CONSTRAINT fk_evidencia_usuario FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) {$charset}");

        $this->db->query("ALTER TABLE movimientos MODIFY tipo
            ENUM('alta','asignacion','revocacion','prestamo','devolucion','transferencia','mantenimiento','baja','evidencia') NOT NULL");
    }

    public function down(): void
    {
        $this->db->query("DELETE FROM movimientos WHERE tipo = 'evidencia'");
        $this->db->query("ALTER TABLE movimientos MODIFY tipo
            ENUM('alta','asignacion','revocacion','prestamo','devolucion','transferencia','mantenimiento','baja') NOT NULL");
        $this->db->query('DROP TABLE evidencias');
    }
}
