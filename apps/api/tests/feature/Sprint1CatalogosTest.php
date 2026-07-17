<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeFirebaseAdmin;
use Tests\Support\Auth\FakeTokenVerifier;

/**
 * Gate de Sprint 1 — catálogos: CRUD, RBAC, PII, no auto-perjuicio, unicidad,
 * alta/baja de usuarios con Firebase (doble).
 *
 * @internal
 */
final class Sprint1CatalogosTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    private FakeTokenVerifier $verifier;
    private FakeFirebaseAdmin $firebase;
    private int $orgId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resetServices();
        cache()->clean(); // evita acumulación del throttler entre tests
        Services::injectMock('currentUser', new CurrentUser());

        $this->verifier = new FakeTokenVerifier();
        $this->firebase = new FakeFirebaseAdmin();
        Services::injectMock('tokenVerifier', $this->verifier);
        Services::injectMock('firebaseAdmin', $this->firebase);

        $this->db->table('organizaciones')->insert([
            'nombre' => 'Avanza', 'clave' => 'AVZ', 'is_active' => 1,
        ]);
        $this->orgId = (int) $this->db->insertID();
    }

    /** Crea un usuario local con rol y devuelve headers de auth para actuar como él. */
    private function actuarComo(string $rol, string $uid): array
    {
        $this->db->table('usuarios')->insert([
            'firebase_uid'    => $uid,
            'organizacion_id' => $this->orgId,
            'nombre'          => ucfirst($rol),
            'email'           => $uid . '@demo.test',
            'rol'             => $rol,
            'is_active'       => 1,
        ]);
        $this->verifier->conToken('tok-' . $uid, $uid);

        return ['Authorization' => 'Bearer tok-' . $uid];
    }

    private function idDe(string $uid): int
    {
        return (int) $this->db->table('usuarios')->where('firebase_uid', $uid)->get()->getRowArray()['id'];
    }

    // ─── Organizaciones ───────────────────────────────────────────────

    public function testAdminCreaOrganizacion(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/organizaciones', ['nombre' => 'Red', 'clave' => 'rcm']);
        $r->assertStatus(201);
        // Tipos correctos en la salida: clave normalizada e is_active booleano.
        $r->assertJSONFragment(['clave' => 'RCM', 'is_active' => true]);
        $this->seeInDatabase('organizaciones', ['clave' => 'RCM']);
    }

    public function testClaveDuplicadaDevuelve422(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/organizaciones', ['nombre' => 'Otra', 'clave' => 'AVZ']);
        $r->assertStatus(422);
        $r->assertJSONFragment(['error' => 'validacion']);
    }

    public function testClaveInvalidaDevuelve422(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/organizaciones', ['nombre' => 'X', 'clave' => 'ABCD']);
        $r->assertStatus(422);
    }

    public function testCustodioNoPuedeCrearOrganizacion(): void
    {
        $h = $this->actuarComo('custodio', 'c1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/organizaciones', ['nombre' => 'Red', 'clave' => 'RCM']);
        $r->assertStatus(403);
        $r->assertJSONFragment(['error' => 'sin_permiso']);
    }

    public function testCualquierRolListaOrganizaciones(): void
    {
        $h = $this->actuarComo('auditor', 'au1');
        $this->withBodyFormat('json')->withHeaders($h)->get('api/v1/organizaciones')->assertStatus(200);
    }

    // ─── Categorías ───────────────────────────────────────────────────

    public function testAdminCreaCategoriaYAuditorNo(): void
    {
        $admin = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($admin)->post('api/v1/categorias', ['nombre' => 'Cómputo', 'clave' => 'CMP'])
            ->assertStatus(201);

        $aud = $this->actuarComo('auditor', 'au1');
        $this->withBodyFormat('json')->withHeaders($aud)->post('api/v1/categorias', ['nombre' => 'Mobiliario', 'clave' => 'MOB'])
            ->assertStatus(403);
    }

    // ─── Usuarios ─────────────────────────────────────────────────────

    public function testAdminCreaUsuarioEnFirebaseYMysql(): void
    {
        $h = $this->actuarComo('administrador', 'a1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->post('api/v1/usuarios', [
            'nombre' => 'Nuevo Custodio', 'email' => 'nuevo@demo.test',
            'rol' => 'custodio', 'organizacion_id' => $this->orgId,
        ]);
        $r->assertStatus(201);
        $r->assertJSONFragment(['email' => 'nuevo@demo.test', 'rol' => 'custodio']);
        $this->seeInDatabase('usuarios', ['email' => 'nuevo@demo.test', 'is_active' => 1]);
        $this->assertCount(1, $this->firebase->creados);
    }

    public function testCustodioNoVePiiAjena(): void
    {
        $this->actuarComo('administrador', 'a1');      // id 1
        $otroId = $this->idDe('a1');
        $h = $this->actuarComo('custodio', 'c1');
        $r = $this->withBodyFormat('json')->withHeaders($h)->get('api/v1/usuarios/' . $otroId);
        $r->assertStatus(403);
        $r->assertJSONFragment(['error' => 'sin_permiso_pii']);
    }

    public function testTitularVeSuPropiaPii(): void
    {
        $h  = $this->actuarComo('custodio', 'c1');
        $id = $this->idDe('c1');
        $this->withBodyFormat('json')->withHeaders($h)->get('api/v1/usuarios/' . $id)->assertStatus(200);
    }

    public function testAdminVePiiDeCualquiera(): void
    {
        $this->actuarComo('custodio', 'c1');
        $custId = $this->idDe('c1');
        $h = $this->actuarComo('administrador', 'a1');
        $this->withBodyFormat('json')->withHeaders($h)->get('api/v1/usuarios/' . $custId)->assertStatus(200);
    }

    public function testNadieCambiaSuPropioRol(): void
    {
        $h  = $this->actuarComo('administrador', 'a1');
        $id = $this->idDe('a1');
        $r  = $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/usuarios/' . $id . '/rol', ['rol' => 'custodio']);
        $r->assertStatus(403);
        $r->assertJSONFragment(['error' => 'no_auto_rol']);
    }

    public function testNadieSeAutodesactiva(): void
    {
        $h  = $this->actuarComo('administrador', 'a1');
        $id = $this->idDe('a1');
        $r  = $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/usuarios/' . $id . '/desactivar');
        $r->assertStatus(403);
        $r->assertJSONFragment(['error' => 'no_auto_desactivar']);
    }

    public function testAdminDesactivaOtroYRevocaTokens(): void
    {
        $this->actuarComo('custodio', 'c1');
        $custId  = $this->idDe('c1');
        $h       = $this->actuarComo('administrador', 'a1');
        $r       = $this->withBodyFormat('json')->withHeaders($h)->patch('api/v1/usuarios/' . $custId . '/desactivar');
        $r->assertStatus(204);
        $this->seeInDatabase('usuarios', ['id' => $custId, 'is_active' => 0]);
        $this->assertContains('c1', $this->firebase->revocados);
    }
}
