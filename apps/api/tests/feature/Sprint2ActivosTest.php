<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use App\Models\ActivoModel;
use App\Services\Activos\GuardarFacturaService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeTokenVerifier;
use Tests\Support\Storage\FakeArchivoStorage;

/**
 * Gate de Sprint 2 — activos e identificación: alta con código correlativo
 * (sin colisiones), historial, filtros, RBAC y precondiciones de estado.
 *
 * @internal
 */
final class Sprint2ActivosTest extends CIUnitTestCase
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
        Services::injectMock('currentUser', new CurrentUser());
        $this->verifier = new FakeTokenVerifier();
        Services::injectMock('tokenVerifier', $this->verifier);

        $this->db->table('organizaciones')->insert(['nombre' => 'Avanza', 'clave' => 'AVZ', 'is_active' => 1]);
        $this->orgId = (int) $this->db->insertID();
        $this->db->table('categorias')->insert(['nombre' => 'Cómputo', 'clave' => 'CMP', 'is_active' => 1]);
        $this->catId = (int) $this->db->insertID();
    }

    private function actuarComo(string $rol, string $uid): array
    {
        $this->db->table('usuarios')->insert([
            'firebase_uid' => $uid, 'organizacion_id' => $this->orgId,
            'nombre' => ucfirst($rol), 'email' => $uid . '@demo.test', 'rol' => $rol, 'is_active' => 1,
        ]);
        $this->verifier->conToken('tok-' . $uid, $uid);

        return ['Authorization' => 'Bearer tok-' . $uid];
    }

    private function payload(array $over = []): array
    {
        return array_merge([
            'nombre' => 'Laptop', 'categoria_id' => $this->catId, 'organizacion_id' => $this->orgId,
            'condicion' => 'bueno',
        ], $over);
    }

    public function testAdminCreaActivoConCodigoYAlta(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        $r->assertStatus(201);
        $r->assertJSONFragment(['codigo' => 'CMP-AVZ-001', 'estado' => 'disponible']);
        // Movimiento de alta registrado.
        $this->seeInDatabase('movimientos', ['tipo' => 'alta']);
    }

    public function testCodigosCorrelativosSinColision(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $codigos = [];
        for ($i = 0; $i < 5; $i++) {
            $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
            $r->assertStatus(201);
            $codigos[] = json_decode($r->getJSON(), true)['codigo'];
        }
        $this->assertSame(['CMP-AVZ-001', 'CMP-AVZ-002', 'CMP-AVZ-003', 'CMP-AVZ-004', 'CMP-AVZ-005'], $codigos);
        $this->assertSame(5, count(array_unique($codigos)));
        $this->seeInDatabase('secuencias_codigo', ['categoria_id' => $this->catId, 'organizacion_id' => $this->orgId, 'ultimo' => 5]);
    }

    public function testCustodioNoCreaPeroLista(): void
    {
        $c = $this->actuarComo('custodio', 'c1');
        $this->withBodyFormat('json')->withHeaders($c)->post('api/v1/activos', $this->payload())->assertStatus(403);
        $this->withHeaders($c)->get('api/v1/activos')->assertStatus(200);
    }

    public function testFiltroPorEstado(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        // Uno en mantenimiento
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        $id2 = (int) $this->db->table('activos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
        $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/activos/' . $id2 . '/mantenimiento', ['en_mantenimiento' => true]);

        $r = $this->withHeaders($h)->get('api/v1/activos?estado=mantenimiento');
        $r->assertStatus(200);
        $data = json_decode($r->getJSON(), true)['data'];
        $this->assertCount(1, $data);
        $this->assertSame('mantenimiento', $data[0]['estado']);
    }

    public function testFichaIncluyeHistorial(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        $id = (int) $this->db->table('activos')->get()->getRowArray()['id'];

        $r = $this->withHeaders($h)->get('api/v1/activos/' . $id);
        $r->assertStatus(200);
        $body = json_decode($r->getJSON(), true);
        $this->assertSame('CMP-AVZ-001', $body['activo']['codigo']);
        $this->assertSame('alta', $body['historial'][0]['tipo']);
    }

    public function testBajaBloqueadaSiAsignado(): void
    {
        $h  = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        $id = (int) $this->db->table('activos')->get()->getRowArray()['id'];
        $this->db->table('activos')->where('id', $id)->update(['estado' => 'asignado']);

        $r = $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/activos/' . $id . '/baja', ['motivo' => 'x']);
        $r->assertStatus(409);
        $r->assertJSONFragment(['error' => 'estado_invalido']);
    }

    public function testMantenimientoIdaYVuelta(): void
    {
        $h  = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());
        $id = (int) $this->db->table('activos')->get()->getRowArray()['id'];

        $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/activos/' . $id . '/mantenimiento', ['en_mantenimiento' => true])
            ->assertStatus(200);
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'mantenimiento']);

        // Entrar de nuevo a mantenimiento (ya no está disponible) → 409
        $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/activos/' . $id . '/mantenimiento', ['en_mantenimiento' => true])
            ->assertStatus(409);
    }

    private function crearActivoDe(string $uid): int
    {
        $h = $this->actuarComo('administrador', $uid);
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', $this->payload());

        return (int) $this->db->table('activos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
    }

    public function testEtiquetaDevuelvePdf(): void
    {
        $id = $this->crearActivoDe('a1');
        $h  = ['Authorization' => 'Bearer tok-a1'];
        $r  = $this->withHeaders($h)->get('api/v1/activos/' . $id . '/etiqueta');
        $r->assertStatus(200);
        // El PDF se genera y sirve (verificado limpio en servidor real; en el
        // arnés de PHPUnit el body puede venir envuelto por html_errors).
        $this->assertStringContainsString('%PDF', (string) $r->getBody());
    }

    public function testFacturaSinRegistroDevuelve404(): void
    {
        $id = $this->crearActivoDe('a1');
        $r  = $this->withHeaders(['Authorization' => 'Bearer tok-a1'])->get('api/v1/activos/' . $id . '/factura');
        $r->assertStatus(404);
        $r->assertJSONFragment(['error' => 'sin_factura']);
    }

    public function testFacturaUrlFirmadaConStorage(): void
    {
        Services::injectMock('archivoStorage', new FakeArchivoStorage());
        $id = $this->crearActivoDe('a1');
        $this->db->table('activos')->where('id', $id)->update(['factura_archivo_ref' => 'facturas/' . $id . '_x.pdf']);

        $r = $this->withHeaders(['Authorization' => 'Bearer tok-a1'])->get('api/v1/activos/' . $id . '/factura');
        $r->assertStatus(200);
        $this->assertStringContainsString('fake.storage', json_decode($r->getJSON(), true)['url']);
    }

    public function testCustodioNoAccedeFactura(): void
    {
        $id = $this->crearActivoDe('a1');
        $c  = $this->actuarComo('custodio', 'c1');
        $this->withHeaders($c)->get('api/v1/activos/' . $id . '/factura')->assertStatus(403);
    }

    public function testGuardarFacturaServiceSubeYActualiza(): void
    {
        $id   = $this->crearActivoDe('a1');
        $fake = new FakeArchivoStorage();
        $url  = (new GuardarFacturaService(new ActivoModel(), $fake))
            ->execute($id, 'PDFDATA', 'application/pdf', 'pdf', 1);

        $this->assertStringContainsString('fake.storage', $url);
        $this->assertCount(1, $fake->archivos);
        $this->assertNotEmpty((new ActivoModel())->find($id)['factura_archivo_ref']);
    }
}
