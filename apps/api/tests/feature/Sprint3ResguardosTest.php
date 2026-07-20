<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeTokenVerifier;

/**
 * Gate de Sprint 3 — resguardos y bitácora: asignar/revocar/transferir atómicos,
 * matriz de estados (409), inmutabilidad de la bitácora, carta responsiva.
 *
 * @internal
 */
final class Sprint3ResguardosTest extends CIUnitTestCase
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

        $this->actuarComo('administrador', 'a1');
        $this->custodioId = $this->crearUsuario('custodio', 'c1');
    }

    private function actuarComo(string $rol, string $uid): array
    {
        if ($this->db->table('usuarios')->where('firebase_uid', $uid)->countAllResults() === 0) {
            $this->crearUsuario($rol, $uid);
        }
        $this->verifier->conToken('tok-' . $uid, $uid);

        return ['Authorization' => 'Bearer tok-' . $uid];
    }

    private function crearUsuario(string $rol, string $uid): int
    {
        $this->db->table('usuarios')->insert([
            'firebase_uid' => $uid, 'organizacion_id' => $this->orgId,
            'nombre' => ucfirst($rol), 'email' => $uid . '@demo.test', 'rol' => $rol, 'is_active' => 1,
        ]);

        return (int) $this->db->insertID();
    }

    private function crearActivo(): int
    {
        $h = ['Authorization' => 'Bearer tok-a1'];
        $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/activos', [
            'nombre' => 'Laptop', 'categoria_id' => $this->catId, 'organizacion_id' => $this->orgId, 'condicion' => 'bueno',
        ]);

        return (int) $this->db->table('activos')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
    }

    private function admin(): array
    {
        return ['Authorization' => 'Bearer tok-a1'];
    }

    public function testAsignarDisponible(): void
    {
        $id = $this->crearActivo();
        $r  = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId, 'notas' => 'oficina']);
        $r->assertStatus(201);
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'asignado']);
        $this->seeInDatabase('movimientos', ['activo_id' => $id, 'tipo' => 'asignacion']);
    }

    public function testAsignarNoDisponibleDevuelve409(): void
    {
        $id = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId]);
        // Segundo intento: ya asignado
        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId]);
        $r->assertStatus(409);
        $r->assertJSONFragment(['error' => 'activo_no_disponible']);
    }

    public function testRevocarVuelveDisponible(): void
    {
        $id  = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId]);
        $asigId = (int) $this->db->table('asignaciones')->orderBy('id', 'DESC')->get()->getRowArray()['id'];

        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/asignaciones/' . $asigId . '/revocar', ['motivo' => 'fin de uso']);
        $r->assertStatus(200);
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'disponible']);
        $this->seeInDatabase('movimientos', ['activo_id' => $id, 'tipo' => 'revocacion']);
    }

    public function testRevocarYaRevocadaDevuelve409(): void
    {
        $id = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId]);
        $asigId = (int) $this->db->table('asignaciones')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/asignaciones/' . $asigId . '/revocar', ['motivo' => 'x']);

        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/asignaciones/' . $asigId . '/revocar', ['motivo' => 'otra vez']);
        $r->assertStatus(409);
        $r->assertJSONFragment(['error' => 'ya_revocada']);
    }

    public function testTransferirAsignado(): void
    {
        $otro = $this->crearUsuario('custodio', 'c2');
        $id   = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId]);

        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones/transferir', ['activo_id' => $id, 'nuevo_usuario_id' => $otro]);
        $r->assertStatus(201);
        // El activo sigue asignado; hay dos asignaciones (una revocada) y un movimiento de transferencia.
        $this->seeInDatabase('activos', ['id' => $id, 'estado' => 'asignado']);
        $this->seeInDatabase('movimientos', ['activo_id' => $id, 'tipo' => 'transferencia']);
        $this->assertSame(1, $this->db->table('asignaciones')->where('activo_id', $id)->where('revocada_en IS NOT NULL')->countAllResults());
        $this->assertSame(1, $this->db->table('asignaciones')->where('activo_id', $id)->where('usuario_id', $otro)->where('revocada_en', null)->countAllResults());
    }

    public function testTransferirNoAsignadoDevuelve409(): void
    {
        $id = $this->crearActivo(); // disponible
        $r  = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones/transferir', ['activo_id' => $id, 'nuevo_usuario_id' => $this->custodioId]);
        $r->assertStatus(409);
        $r->assertJSONFragment(['error' => 'activo_no_asignado']);
    }

    public function testCustodioNoAsigna(): void
    {
        $id = $this->crearActivo();
        $h  = $this->actuarComo('custodio', 'c1');
        $this->withBodyFormat('json')->withHeaders($h)
            ->post('api/v1/asignaciones', ['activo_id' => $id, 'usuario_id' => $this->custodioId])
            ->assertStatus(403);
    }

    public function testCartaAdminDevuelvePdfYCustodioAjenoNo(): void
    {
        // Admin puede ver la carta de un custodio.
        $r = $this->withHeaders($this->admin())->get('api/v1/usuarios/' . $this->custodioId . '/carta');
        $r->assertStatus(200);
        $this->assertStringContainsString('%PDF', (string) $r->getBody());

        // Un custodio no puede ver la carta de otro (PII).
        $otro = $this->crearUsuario('custodio', 'c9');
        $h    = $this->actuarComo('custodio', 'c9');
        $this->withHeaders($h)->get('api/v1/usuarios/' . $this->custodioId . '/carta')->assertStatus(403);
        // pero sí la propia
        $this->withHeaders($h)->get('api/v1/usuarios/' . $otro . '/carta')->assertStatus(200);
    }

    public function testActivosACargoListaSoloVigentes(): void
    {
        // Un activo asignado y otro asignado-luego-revocado; solo el vigente aparece.
        $vigente = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $vigente, 'usuario_id' => $this->custodioId]);

        $revocado = $this->crearActivo();
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->post('api/v1/asignaciones', ['activo_id' => $revocado, 'usuario_id' => $this->custodioId]);
        $asigId = (int) $this->db->table('asignaciones')->orderBy('id', 'DESC')->get()->getRowArray()['id'];
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/asignaciones/' . $asigId . '/revocar', ['motivo' => 'fin']);

        $r = $this->withHeaders($this->admin())->get('api/v1/usuarios/' . $this->custodioId . '/activos');
        $r->assertStatus(200);
        $cuerpo = json_decode($r->getJSON(), true);
        $this->assertCount(1, $cuerpo);
        $this->assertSame($vigente, $cuerpo[0]['id']);
        $this->assertArrayHasKey('codigo', $cuerpo[0]);
        $this->assertArrayHasKey('condicion', $cuerpo[0]);
        $this->assertArrayHasKey('estado', $cuerpo[0]);
    }

    public function testActivosACargoRespetaPii(): void
    {
        $otro = $this->crearUsuario('custodio', 'c9');
        $h    = $this->actuarComo('custodio', 'c9');
        // No puede ver los equipos de otro custodio…
        $this->withHeaders($h)->get('api/v1/usuarios/' . $this->custodioId . '/activos')->assertStatus(403);
        // …pero sí los propios.
        $this->withHeaders($h)->get('api/v1/usuarios/' . $otro . '/activos')->assertStatus(200);
    }
}
