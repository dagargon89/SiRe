<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use App\Services\Prestamos\AlertasPrestamosService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeTokenVerifier;
use Tests\Support\Notificaciones\FakeMailer;

/**
 * Gate de Sprint 4 — préstamos y alertas: prestar/devolver, estados derivados,
 * RBAC e idempotencia del job de alertas.
 *
 * @internal
 */
final class Sprint4PrestamosTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    private FakeTokenVerifier $verifier;
    private int $orgId;
    private int $catId;
    private int $custodioId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resetServices();
        cache()->clean(); // evita acumulación del throttler entre tests
        Services::injectMock('currentUser', new CurrentUser());
        $this->verifier = new FakeTokenVerifier();
        Services::injectMock('tokenVerifier', $this->verifier);

        $this->db->table('organizaciones')->insert(['nombre' => 'Avanza', 'clave' => 'AVZ', 'is_active' => 1]);
        $this->orgId = (int) $this->db->insertID();
        $this->db->table('categorias')->insert(['nombre' => 'Cómputo', 'clave' => 'CMP', 'is_active' => 1]);
        $this->catId = (int) $this->db->insertID();

        $this->crearUsuario('administrador', 'a1');
        $this->custodioId = $this->crearUsuario('custodio', 'c1');
        $this->verifier->conToken('tok-a1', 'a1')->conToken('tok-c1', 'c1');
    }

    private function crearUsuario(string $rol, string $uid): int
    {
        $this->db->table('usuarios')->insert([
            'firebase_uid' => $uid, 'organizacion_id' => $this->orgId,
            'nombre' => ucfirst($rol), 'email' => $uid . '@demo.test', 'rol' => $rol, 'is_active' => 1,
        ]);

        return (int) $this->db->insertID();
    }

    private function admin(): array
    {
        return ['Authorization' => 'Bearer tok-a1'];
    }

    private function crearActivo(): int
    {
        $this->withBodyFormat('json')->withHeaders($this->admin())->post('api/v1/activos', [
            'nombre' => 'Laptop', 'categoria_id' => $this->catId, 'organizacion_id' => $this->orgId, 'condicion' => 'bueno',
        ]);

        return (int) $this->db->table('activos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
    }

    private function prestar(int $activoId, string $devolucion = '2027-01-01 12:00:00')
    {
        return $this->withBodyFormat('json')->withHeaders($this->admin())->post('api/v1/prestamos', [
            'activo_id' => $activoId, 'prestatario_id' => $this->custodioId,
            'devolucion_esperada' => $devolucion, 'condicion_prestamo' => 'bueno',
        ])
        ;
    }

    public function testPrestarDisponible(): void
    {
        $id = $this->crearActivo();
        $r  = $this->prestar($id);
        $r->assertStatus(201);
        $r->assertJSONFragment(['estado' => 'activo']);
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'prestado']);
        $this->seeInDatabase('movimientos', ['activo_id' => $id, 'tipo' => 'prestamo']);
    }

    public function testPrestarNoDisponibleDevuelve409(): void
    {
        $id = $this->crearActivo();
        $this->prestar($id);
        $this->prestar($id)->assertStatus(409);
    }

    public function testDevolverVuelveDisponible(): void
    {
        $id = $this->crearActivo();
        $this->prestar($id);
        $pid = (int) $this->db->table('prestamos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];

        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/prestamos/' . $pid . '/devolver', ['condicion_devolucion' => 'bueno']);
        $r->assertStatus(200);
        $r->assertJSONFragment(['estado' => 'devuelto']);
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'disponible']);
        $this->seeInDatabase('movimientos', ['activo_id' => $id, 'tipo' => 'devolucion']);
    }

    public function testDevolverYaDevueltoDevuelve409(): void
    {
        $id = $this->crearActivo();
        $this->prestar($id);
        $pid = (int) $this->db->table('prestamos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/prestamos/' . $pid . '/devolver', ['condicion_devolucion' => 'bueno']);

        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/prestamos/' . $pid . '/devolver', ['condicion_devolucion' => 'bueno'])
            ->assertStatus(409);
    }

    public function testEstadoDerivadoVencidoEnListado(): void
    {
        $id = $this->crearActivo();
        $this->prestar($id, '2020-01-01 12:00:00'); // fecha pasada → vencido

        $r = $this->withHeaders($this->admin())->get('api/v1/prestamos?estado=vencido');
        $r->assertStatus(200);
        $data = json_decode($r->getJSON(), true)['data'];
        $this->assertCount(1, $data);
        $this->assertSame('vencido', $data[0]['estado']);
    }

    public function testCustodioNoPrestaPeroDevuelve(): void
    {
        $id = $this->crearActivo();
        // Custodio no puede prestar
        $this->withBodyFormat('json')->withHeaders(['Authorization' => 'Bearer tok-c1'])->post('api/v1/prestamos', [
            'activo_id' => $id, 'prestatario_id' => $this->custodioId,
            'devolucion_esperada' => '2027-01-01 12:00:00', 'condicion_prestamo' => 'bueno',
        ])->assertStatus(403);

        // Admin presta; custodio devuelve
        $this->prestar($id);
        $pid = (int) $this->db->table('prestamos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
        $this->withBodyFormat('json')->withHeaders(['Authorization' => 'Bearer tok-c1'])
            ->patch('api/v1/prestamos/' . $pid . '/devolver', ['condicion_devolucion' => 'bueno'])
            ->assertStatus(200);
    }

    public function testAlertasSonIdempotentes(): void
    {
        $id = $this->crearActivo();
        // Préstamo vencido directo en BD.
        $this->db->table('prestamos')->insert([
            'activo_id' => $id, 'prestatario_id' => $this->custodioId, 'prestamista_id' => 1, 'prestado_por' => 1,
            'prestado_en' => '2026-07-01 10:00:00', 'devolucion_esperada' => '2026-07-10 10:00:00',
            'condicion_prestamo' => 'bueno',
        ]);

        $mailer = new FakeMailer();
        $svc    = new AlertasPrestamosService($mailer);

        $primera = $svc->ejecutar('2026-07-17 08:00:00');
        $segunda = $svc->ejecutar('2026-07-17 08:00:00');

        $this->assertSame(1, $primera, 'La primera corrida envía un aviso');
        $this->assertSame(0, $segunda, 'La segunda no reenvía (idempotente)');
        $this->assertCount(1, $mailer->enviados);
        // Se notifica a prestatario y prestamista.
        $this->assertContains('c1@demo.test', $mailer->enviados[0]['destinatarios']);
        $this->assertContains('a1@demo.test', $mailer->enviados[0]['destinatarios']);
        $this->seeInDatabase('avisos_prestamo', ['tipo' => 'vencido']);
    }
}
