<?php

declare(strict_types=1);

namespace Tests\Database;

use App\Database\Seeds\InitialSeeder;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * Gate de Sprint 0 (DoD #3): el bloque JSON del doc 09 siembra la BD sin
 * transformación y con integridad referencial.
 *
 * @internal
 */
final class InitialSeederTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    public function testSiembraElBloqueJsonCompleto(): void
    {
        $this->seed(InitialSeeder::class);

        $this->assertSame(3, $this->db->table('organizaciones')->countAllResults());
        $this->assertSame(3, $this->db->table('categorias')->countAllResults());
        $this->assertSame(5, $this->db->table('usuarios')->countAllResults());
        $this->assertSame(5, $this->db->table('activos')->countAllResults());
        $this->assertSame(6, $this->db->table('movimientos')->countAllResults());

        // Escenarios de la máquina de estados representados.
        $this->seeInDatabase('activos', ['codigo' => 'CMP-AVZ-001', 'estado' => 'asignado']);
        $this->seeInDatabase('activos', ['codigo' => 'AUV-RCM-001', 'estado' => 'baja']);

        // Secuencia coherente con los códigos (CMP-AVZ tiene 2 activos).
        $this->seeInDatabase('secuencias_codigo', [
            'categoria_id' => 1, 'organizacion_id' => 1, 'ultimo' => 2,
        ]);

        // Préstamo vencido sin aviso "vencido" (idempotencia a ejercitar en Sprint 4).
        $this->seeInDatabase('avisos_prestamo', ['prestamo_id' => 1, 'tipo' => 'por_vencer']);
        $this->dontSeeInDatabase('avisos_prestamo', ['prestamo_id' => 1, 'tipo' => 'vencido']);
    }
}
