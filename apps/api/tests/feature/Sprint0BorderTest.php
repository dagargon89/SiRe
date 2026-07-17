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
 * Gate de Sprint 0 — borde de seguridad: verificación de token, RBAC de acceso,
 * CORS con lista blanca, rate limiting y salud.
 *
 * @internal
 */
final class Sprint0BorderTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';   // migra solo el esquema de la app
    protected $refresh   = true;    // BD limpia por test

    protected function setUp(): void
    {
        parent::setUp();
        // Servicios frescos por test: el `response` es compartido y arrastraría
        // cabeceras (p.ej. ACAO) de un caso a otro.
        $this->resetServices();
        Services::injectMock('currentUser', new CurrentUser());
    }

    private function crearUsuarioActivo(string $uid, string $rol = 'administrador'): int
    {
        $this->db->table('organizaciones')->insert([
            'nombre' => 'Org Test', 'clave' => 'TST', 'is_active' => 1,
        ]);
        $orgId = (int) $this->db->insertID();

        $this->db->table('usuarios')->insert([
            'firebase_uid'    => $uid,
            'organizacion_id' => $orgId,
            'nombre'          => 'Usuario Test',
            'email'           => $uid . '@demo.test',
            'rol'             => $rol,
            'is_active'       => 1,
        ]);

        return (int) $this->db->insertID();
    }

    public function testHealthResponde200(): void
    {
        $result = $this->get('api/v1/health');
        $result->assertStatus(200);
        $result->assertJSONFragment(['status' => 'ok', 'db' => 'ok', 'redis' => 'ok']);
    }

    public function testMeSinTokenDevuelve401(): void
    {
        $result = $this->get('api/v1/me');
        $result->assertStatus(401);
        $result->assertJSONFragment(['error' => 'token_ausente']);
    }

    public function testMeConTokenInvalidoDevuelve401(): void
    {
        Services::injectMock('tokenVerifier', new FakeTokenVerifier()); // no conoce ningún token
        $result = $this->withHeaders(['Authorization' => 'Bearer basura'])->get('api/v1/me');
        $result->assertStatus(401);
        $result->assertJSONFragment(['error' => 'token_invalido']);
    }

    public function testMeConUsuarioInexistenteOInactivoDevuelve403(): void
    {
        $fake = (new FakeTokenVerifier())->conToken('tok-fantasma', 'uid-sin-perfil');
        Services::injectMock('tokenVerifier', $fake);

        $result = $this->withHeaders(['Authorization' => 'Bearer tok-fantasma'])->get('api/v1/me');
        $result->assertStatus(403);
        $result->assertJSONFragment(['error' => 'cuenta_inactiva']);
    }

    public function testMeConUsuarioActivoDevuelve200(): void
    {
        $this->crearUsuarioActivo('uid-admin', 'administrador');
        $fake = (new FakeTokenVerifier())->conToken('tok-ok', 'uid-admin', 'uid-admin@demo.test');
        Services::injectMock('tokenVerifier', $fake);

        $result = $this->withHeaders(['Authorization' => 'Bearer tok-ok'])->get('api/v1/me');
        $result->assertStatus(200);
        $result->assertJSONFragment(['rol' => 'administrador', 'email' => 'uid-admin@demo.test']);
    }

    public function testCorsPreflightOrigenPermitidoDevuelve204(): void
    {
        $result = $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->options('api/v1/health');
        $result->assertStatus(204);
        $result->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function testCorsOrigenNoPermitidoSinCabecera(): void
    {
        $result = $this->withHeaders(['Origin' => 'http://evil.test'])->get('api/v1/health');
        $result->assertStatus(200);
        $this->assertFalse(
            $result->response()->hasHeader('Access-Control-Allow-Origin'),
            'No debe reflejar un origen fuera de la lista blanca',
        );
    }

    public function testRateLimitDevuelve429AlExcederElLimite(): void
    {
        // Ruta temporal con límite bajo y bucket único (aísla entre corridas).
        $bucket = 'test' . bin2hex(random_bytes(4));
        $routes = Services::routes();
        $routes->get('api/v1/rl-test', 'Health::index', ['filter' => "throttle:2,60,{$bucket}"]);

        $this->get('api/v1/rl-test')->assertStatus(200);
        $this->get('api/v1/rl-test')->assertStatus(200);
        $tercero = $this->get('api/v1/rl-test');
        $tercero->assertStatus(429);
        $tercero->assertJSONFragment(['error' => 'rate_limit']);
    }
}
