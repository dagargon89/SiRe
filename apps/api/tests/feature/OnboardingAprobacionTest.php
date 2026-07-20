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
 * Auto-registro con aprobación: un usuario nuevo se auto-provisiona 'pendiente',
 * queda bloqueado hasta que un administrador lo aprueba (rol + organización) o
 * lo rechaza.
 *
 * @internal
 */
final class OnboardingAprobacionTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    private FakeTokenVerifier $verifier;
    private int $orgId;

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

        // Admin aprobado.
        $this->db->table('usuarios')->insert([
            'firebase_uid' => 'admin', 'organizacion_id' => $this->orgId, 'nombre' => 'Admin',
            'email' => 'admin@demo.test', 'rol' => 'administrador', 'is_active' => 1, 'estado' => 'aprobado',
        ]);
        $this->verifier->conToken('tok-admin', 'admin');
    }

    private function admin(): array
    {
        return ['Authorization' => 'Bearer tok-admin'];
    }

    /** Provisiona un solicitante pendiente vía /me y devuelve su id. */
    private function solicitar(string $uid, string $email, string $nombre): int
    {
        $this->verifier->conToken('tok-' . $uid, $uid, $email, null, $nombre);
        $this->withHeaders(['Authorization' => 'Bearer tok-' . $uid])->get('api/v1/me')->assertStatus(200);

        return (int) $this->db->table('usuarios')->where('firebase_uid', $uid)->get()->getRowArray()['id'];
    }

    public function testListarPendientes(): void
    {
        $this->solicitar('u1', 'u1@x.test', 'Uno');
        $r = $this->withHeaders($this->admin())->get('api/v1/usuarios?estado=pendiente');
        $r->assertStatus(200);
        $data = json_decode($r->getJSON(), true)['data'];
        $emails = array_column($data, 'email');
        $this->assertContains('u1@x.test', $emails);
        foreach ($data as $u) {
            $this->assertSame('pendiente', $u['estado']);
        }
    }

    public function testDesactivadosSeOcultanDelDefaultYTienenSuFiltro(): void
    {
        $this->db->table('usuarios')->insertBatch([
            ['firebase_uid' => 'act', 'organizacion_id' => $this->orgId, 'nombre' => 'Activo',
                'email' => 'act@x.test', 'rol' => 'custodio', 'is_active' => 1, 'estado' => 'aprobado'],
            ['firebase_uid' => 'des', 'organizacion_id' => $this->orgId, 'nombre' => 'Desactivado',
                'email' => 'des@x.test', 'rol' => 'custodio', 'is_active' => 0, 'estado' => 'aprobado'],
            ['firebase_uid' => 'rec', 'organizacion_id' => $this->orgId, 'nombre' => 'Rechazado',
                'email' => 'rec@x.test', 'rol' => 'custodio', 'is_active' => 0, 'estado' => 'rechazado'],
        ]);

        // Vista principal (sin filtro): oculta al desactivado; conserva activo y rechazado.
        $r      = $this->withHeaders($this->admin())->get('api/v1/usuarios');
        $emails = array_column(json_decode($r->getJSON(), true)['data'], 'email');
        $this->assertContains('act@x.test', $emails);
        $this->assertContains('rec@x.test', $emails);
        $this->assertNotContains('des@x.test', $emails);

        // Filtro 'desactivado': solo aprobados con is_active=0.
        $r2      = $this->withHeaders($this->admin())->get('api/v1/usuarios?estado=desactivado');
        $emails2 = array_column(json_decode($r2->getJSON(), true)['data'], 'email');
        $this->assertSame(['des@x.test'], $emails2);
    }

    public function testAdminApruebaYDaAcceso(): void
    {
        $id = $this->solicitar('u1', 'u1@x.test', 'Uno');

        // Antes de aprobar, el solicitante no accede a negocio.
        $this->withHeaders(['Authorization' => 'Bearer tok-u1'])->get('api/v1/activos')->assertStatus(403);

        // Admin aprueba con rol + organización.
        $r = $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/usuarios/' . $id . '/aprobar', ['rol' => 'custodio', 'organizacion_id' => $this->orgId]);
        $r->assertStatus(200);
        $r->assertJSONFragment(['estado' => 'aprobado', 'rol' => 'custodio']);
        $this->seeInDatabase('usuarios', ['id' => $id, 'estado' => 'aprobado', 'is_active' => 1]);

        // Ahora sí accede.
        $this->withHeaders(['Authorization' => 'Bearer tok-u1'])->get('api/v1/activos')->assertStatus(200);
    }

    public function testAdminRechaza(): void
    {
        $id = $this->solicitar('u2', 'u2@x.test', 'Dos');
        $r  = $this->withBodyFormat('json')->withHeaders($this->admin())->patch('api/v1/usuarios/' . $id . '/rechazar');
        $r->assertStatus(200);
        $r->assertJSONFragment(['estado' => 'rechazado']);

        $bloqueo = $this->withHeaders(['Authorization' => 'Bearer tok-u2'])->get('api/v1/activos');
        $bloqueo->assertStatus(403);
        $bloqueo->assertJSONFragment(['error' => 'cuenta_rechazada']);
    }

    public function testAprobarConRolInvalidoDevuelve422(): void
    {
        $id = $this->solicitar('u3', 'u3@x.test', 'Tres');
        $this->withBodyFormat('json')->withHeaders($this->admin())
            ->patch('api/v1/usuarios/' . $id . '/aprobar', ['rol' => 'jefe', 'organizacion_id' => $this->orgId])
            ->assertStatus(422);
    }
}
