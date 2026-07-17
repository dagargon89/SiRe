<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Esquema inicial de SiRe — réplica 1:1 del DDL del doc 03 (MySQL 8.4).
 * Se usa SQL crudo para preservar exactamente enums, defaults con
 * ON UPDATE CURRENT_TIMESTAMP, acciones de FK (RESTRICT/CASCADE/SET NULL)
 * e índices tal como están documentados.
 */
class CreateInitialSchema extends Migration
{
    public function up(): void
    {
        $charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

        // 1) ORGANIZACIONES
        $this->db->query("CREATE TABLE organizaciones (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            nombre      VARCHAR(150) NOT NULL,
            clave       CHAR(3) NOT NULL,
            is_active   TINYINT(1) NOT NULL DEFAULT 1,
            creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_org_clave (clave),
            INDEX idx_org_activa (is_active)
        ) {$charset}");

        // 2) CATEGORIAS
        $this->db->query("CREATE TABLE categorias (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            nombre      VARCHAR(120) NOT NULL,
            clave       CHAR(3) NOT NULL,
            is_active   TINYINT(1) NOT NULL DEFAULT 1,
            creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_cat_clave (clave),
            INDEX idx_cat_activa (is_active)
        ) {$charset}");

        // 3) USUARIOS
        $this->db->query("CREATE TABLE usuarios (
            id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            firebase_uid    VARCHAR(128) NOT NULL,
            organizacion_id INT UNSIGNED NOT NULL,
            nombre          VARCHAR(150) NOT NULL,
            email           VARCHAR(180) NOT NULL,
            rol             ENUM('administrador','custodio','auditor') NOT NULL DEFAULT 'custodio',
            is_active       TINYINT(1) NOT NULL DEFAULT 1,
            creado_por      INT UNSIGNED NULL,
            creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_usuarios_firebase (firebase_uid),
            UNIQUE KEY uq_usuarios_email (email),
            INDEX idx_usuarios_org (organizacion_id),
            INDEX idx_usuarios_rol (rol),
            INDEX idx_usuarios_activo (is_active),
            CONSTRAINT fk_usuarios_org FOREIGN KEY (organizacion_id)
                REFERENCES organizaciones(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_usuarios_creador FOREIGN KEY (creado_por)
                REFERENCES usuarios(id) ON DELETE SET NULL
        ) {$charset}");

        // 4) SECUENCIAS_CODIGO
        $this->db->query("CREATE TABLE secuencias_codigo (
            categoria_id    INT UNSIGNED NOT NULL,
            organizacion_id INT UNSIGNED NOT NULL,
            ultimo          INT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (categoria_id, organizacion_id),
            CONSTRAINT fk_seq_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
            CONSTRAINT fk_seq_org FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE RESTRICT
        ) {$charset}");

        // 5) ACTIVOS
        $this->db->query("CREATE TABLE activos (
            id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            codigo          VARCHAR(40) NOT NULL,
            categoria_id    INT UNSIGNED NOT NULL,
            organizacion_id INT UNSIGNED NOT NULL,
            nombre          VARCHAR(200) NOT NULL,
            descripcion     TEXT NULL,
            marca           VARCHAR(100) NULL,
            modelo          VARCHAR(100) NULL,
            serie           VARCHAR(150) NULL,
            fecha_compra        DATE NULL,
            valor_compra        DECIMAL(12,2) NULL,
            proveedor           VARCHAR(200) NULL,
            factura_numero      VARCHAR(80) NULL,
            factura_archivo_ref VARCHAR(500) NULL,
            qr_archivo_ref  VARCHAR(500) NULL,
            condicion       ENUM('excelente','bueno','regular','malo','baja') NOT NULL DEFAULT 'bueno',
            estado          ENUM('disponible','asignado','prestado','mantenimiento','baja') NOT NULL DEFAULT 'disponible',
            baja_motivo     VARCHAR(500) NULL,
            creado_por      INT UNSIGNED NOT NULL,
            actualizado_por INT UNSIGNED NULL,
            creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_activos_codigo (codigo),
            INDEX idx_activos_categoria (categoria_id),
            INDEX idx_activos_org (organizacion_id),
            INDEX idx_activos_estado (estado),
            INDEX idx_activos_condicion (condicion),
            INDEX idx_activos_serie (serie),
            CONSTRAINT fk_activos_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
            CONSTRAINT fk_activos_org FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE RESTRICT,
            CONSTRAINT fk_activos_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
            CONSTRAINT fk_activos_editor FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) {$charset}");

        // 6) ASIGNACIONES
        $this->db->query("CREATE TABLE asignaciones (
            id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            activo_id       INT UNSIGNED NOT NULL,
            usuario_id      INT UNSIGNED NOT NULL,
            organizacion_id INT UNSIGNED NOT NULL,
            asignada_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            asignada_por    INT UNSIGNED NOT NULL,
            revocada_en     DATETIME NULL,
            revocada_por    INT UNSIGNED NULL,
            revocacion_motivo VARCHAR(500) NULL,
            notas           VARCHAR(500) NULL,
            creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_asig_activo (activo_id),
            INDEX idx_asig_usuario (usuario_id),
            INDEX idx_asig_vigente (activo_id, revocada_en),
            CONSTRAINT fk_asig_activo FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE RESTRICT,
            CONSTRAINT fk_asig_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
            CONSTRAINT fk_asig_org FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE RESTRICT,
            CONSTRAINT fk_asig_asignador FOREIGN KEY (asignada_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) {$charset}");

        // 7) PRESTAMOS
        $this->db->query("CREATE TABLE prestamos (
            id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            activo_id           INT UNSIGNED NOT NULL,
            prestatario_id      INT UNSIGNED NOT NULL,
            prestamista_id      INT UNSIGNED NOT NULL,
            prestado_por        INT UNSIGNED NOT NULL,
            prestado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            devolucion_esperada DATETIME NOT NULL,
            devuelto_en         DATETIME NULL,
            devuelto_a          INT UNSIGNED NULL,
            condicion_prestamo  ENUM('excelente','bueno','regular','malo') NOT NULL,
            condicion_devolucion ENUM('excelente','bueno','regular','malo') NULL,
            notas               VARCHAR(500) NULL,
            creado_en           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_prest_activo (activo_id),
            INDEX idx_prest_prestatario (prestatario_id),
            INDEX idx_prest_activo_estado (activo_id, devuelto_en),
            INDEX idx_prest_venc (devolucion_esperada),
            CONSTRAINT fk_prest_activo FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE RESTRICT,
            CONSTRAINT fk_prest_prestatario FOREIGN KEY (prestatario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
            CONSTRAINT fk_prest_prestamista FOREIGN KEY (prestamista_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
            CONSTRAINT fk_prest_autoriza FOREIGN KEY (prestado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) {$charset}");

        // 8) MOVIMIENTOS (append-only, sin updated/deleted)
        $this->db->query("CREATE TABLE movimientos (
            id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            activo_id       INT UNSIGNED NOT NULL,
            tipo            ENUM('alta','asignacion','revocacion','prestamo','devolucion','transferencia','mantenimiento','baja') NOT NULL,
            de_usuario_id   INT UNSIGNED NULL,
            a_usuario_id    INT UNSIGNED NULL,
            de_org_id       INT UNSIGNED NULL,
            a_org_id        INT UNSIGNED NULL,
            realizado_por   INT UNSIGNED NOT NULL,
            notas           VARCHAR(500) NULL,
            creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_mov_activo (activo_id),
            INDEX idx_mov_tipo (tipo),
            INDEX idx_mov_creado (creado_en),
            CONSTRAINT fk_mov_activo FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE RESTRICT,
            CONSTRAINT fk_mov_actor FOREIGN KEY (realizado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) {$charset}");

        // 9) AVISOS_PRESTAMO (idempotencia de notificaciones)
        $this->db->query("CREATE TABLE avisos_prestamo (
            id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            prestamo_id INT UNSIGNED NOT NULL,
            tipo        ENUM('por_vencer','vencido') NOT NULL,
            enviado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_aviso (prestamo_id, tipo),
            CONSTRAINT fk_aviso_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
        ) {$charset}");
    }

    public function down(): void
    {
        // Orden inverso por dependencias de FK.
        foreach ([
            'avisos_prestamo', 'movimientos', 'prestamos', 'asignaciones',
            'activos', 'secuencias_codigo', 'usuarios', 'categorias', 'organizaciones',
        ] as $table) {
            $this->db->query("DROP TABLE IF EXISTS {$table}");
        }
    }
}
