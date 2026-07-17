<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use App\Services\Dashboard\DashboardService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeTokenVerifier;

/**
 * Gate de Sprint 5 — dashboard (agregados, caché, RBAC) y reportes PDF.
 *
 * @internal
 */
final class Sprint5DashboardTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    private FakeTokenVerifier $verifier;
    private int $orgId;
    private int $catId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resetServices();
        cache()->clean(); // evita acumulación del throttler entre tests
        DashboardService::invalidarCache(); // la caché (MockCache) persiste entre tests
        Services::injectMock('currentUser', new CurrentUser());
        $this->verifier = new FakeTokenVerifier();
        Services::injectMock('tokenVerifier', $this->verifier);

        $this->db->table('organizaciones')->insert(['nombre' => 'Avanza', 'clave' => 'AVZ', 'is_active' => 1]);
        $this->orgId = (int) $this->db->insertID();
        $this->db->table('categorias')->insert(['nombre' => 'Cómputo', 'clave' => 'CMP', 'is_active' => 1]);
        $this->catId = (int) $this->db->insertID();

        foreach (['administrador' => 'a1', 'custodio' => 'c1', 'auditor' => 'au1'] as $rol => $uid) {
            $this->db->table('usuarios')->insert([
                'firebase_uid' => $uid, 'organizacion_id' => $this->orgId,
                'nombre' => ucfirst($rol), 'email' => $uid . '@demo.test', 'rol' => $rol, 'is_active' => 1,
            ]);
            $this->verifier->conToken('tok-' . $uid, $uid);
        }
    }

    private function h(string $uid): array
    {
        return ['Authorization' => 'Bearer tok-' . $uid];
    }

    private function crearActivo(string $estado = 'disponible'): int
    {
        $this->db->table('activos')->insert([
            'codigo' => 'CMP-AVZ-' . str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT) . random_int(1000, 9999),
            'categoria_id' => $this->catId, 'organizacion_id' => $this->orgId, 'nombre' => 'X',
            'estado' => $estado, 'condicion' => 'bueno', 'creado_por' => 1,
        ]);

        return (int) $this->db->insertID();
    }

    public function testDashboardAgregados(): void
    {
        $this->crearActivo('disponible');
        $this->crearActivo('disponible');
        $this->crearActivo('asignado');
        // Préstamo activo y vencido
        $act = $this->crearActivo('prestado');
        $this->db->table('prestamos')->insert(['activo_id' => $act, 'prestatario_id' => 1, 'prestamista_id' => 1, 'prestado_por' => 1, 'prestado_en' => '2026-07-01 10:00:00', 'devolucion_esperada' => '2999-01-01 10:00:00', 'condicion_prestamo' => 'bueno']);
        $this->db->table('prestamos')->insert(['activo_id' => $act, 'prestatario_id' => 1, 'prestamista_id' => 1, 'prestado_por' => 1, 'prestado_en' => '2026-07-01 10:00:00', 'devolucion_esperada' => '2000-01-01 10:00:00', 'condicion_prestamo' => 'bueno']);

        $r = $this->withHeaders($this->h('a1'))->get('api/v1/dashboard');
        $r->assertStatus(200);
        $d = json_decode($r->getJSON(), true);
        $this->assertSame(2, $d['activos_por_estado']['disponible']);
        $this->assertSame(1, $d['activos_por_estado']['asignado']);
        $this->assertSame(1, $d['prestamos_activos']);
        $this->assertSame(1, $d['prestamos_vencidos']);
        $this->assertSame(4, $d['por_organizacion'][0]['total']);
    }

    public function testDashboardCustodioEsParcial(): void
    {
        $this->crearActivo('disponible');
        $r = $this->withHeaders($this->h('c1'))->get('api/v1/dashboard');
        $r->assertStatus(200);
        $d = json_decode($r->getJSON(), true);
        $this->assertArrayHasKey('activos_por_estado', $d);
        $this->assertSame([], $d['por_organizacion']);        // parcial
        $this->assertSame([], $d['ultimos_movimientos']);     // parcial
    }

    public function testDashboardResumenEInvalidacion(): void
    {
        // Nota: en pruebas la caché es MockCache (no persiste); Redis provee el
        // cacheo real en producción. Aquí se verifica correctez + invalidación.
        $this->crearActivo('disponible');
        $svc = new DashboardService();
        $this->assertSame(1, $svc->resumen()['activos_por_estado']['disponible']);

        DashboardService::invalidarCache(); // no lanza y limpia la clave
        $this->crearActivo('disponible');
        DashboardService::invalidarCache();
        $this->assertSame(2, $svc->resumen()['activos_por_estado']['disponible']);
    }

    public function testReporteInventarioPdfYRbac(): void
    {
        $this->crearActivo('disponible');
        $r = $this->withHeaders($this->h('a1'))->get('api/v1/reportes/inventario');
        $r->assertStatus(200);
        $this->assertStringContainsString('%PDF', (string) $r->getBody());

        // Auditor sí; custodio no.
        $this->withHeaders($this->h('au1'))->get('api/v1/reportes/inventario')->assertStatus(200);
        $this->withHeaders($this->h('c1'))->get('api/v1/reportes/inventario')->assertStatus(403);
    }

    public function testReporteMovimientosPdf(): void
    {
        $act = $this->crearActivo('disponible');
        $this->db->table('movimientos')->insert(['activo_id' => $act, 'tipo' => 'alta', 'realizado_por' => 1]);
        $r = $this->withHeaders($this->h('au1'))->get('api/v1/reportes/movimientos?desde=2026-01-01&hasta=2027-01-01');
        $r->assertStatus(200);
        $this->assertStringContainsString('%PDF', (string) $r->getBody());
    }
}
