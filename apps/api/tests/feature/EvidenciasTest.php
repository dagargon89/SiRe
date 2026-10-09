<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Auth\CurrentUser;
use App\Models\ActivoModel;
use App\Models\EvidenciaModel;
use App\Models\MovimientoModel;
use App\Services\Evidencias\AlmacenEvidencias;
use App\Services\Evidencias\EvidenciasService;
use App\Services\Evidencias\ProcesadorImagen;
use App\Services\ServiceException;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;
use Tests\Support\Auth\FakeTokenVerifier;

/**
 * Evidencias fotográficas: procesamiento de la imagen (reducción, sin
 * metadatos), bitácora, RBAC (solo admin sube/borra; todos ven) y que no se
 * exponen en la ficha pública del QR.
 *
 * @internal
 */
final class EvidenciasTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = 'App';
    protected $refresh   = true;

    private FakeTokenVerifier $verifier;
    private AlmacenEvidencias $almacen;
    private string $dir;
    private int $orgId;
    private int $activoId;
    private int $adminId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resetServices();
        cache()->clean();
        Services::injectMock('currentUser', new CurrentUser());
        $this->verifier = new FakeTokenVerifier();
        Services::injectMock('tokenVerifier', $this->verifier);

        $this->dir     = sys_get_temp_dir() . '/sire-evid-' . bin2hex(random_bytes(4));
        $this->almacen = new AlmacenEvidencias($this->dir);
        Services::injectMock('almacenEvidencias', $this->almacen);

        $this->db->table('organizaciones')->insert(['nombre' => 'Avanza', 'clave' => 'AVZ', 'is_active' => 1]);
        $this->orgId = (int) $this->db->insertID();
        $this->db->table('categorias')->insert(['nombre' => 'Cómputo', 'clave' => 'CMP', 'is_active' => 1]);
        $catId = (int) $this->db->insertID();

        $this->actuarComo('administrador', 'a1');
        $this->adminId = (int) $this->db->table('usuarios')->where('firebase_uid', 'a1')->get()->getRowArray()['id'];
        $this->db->table('activos')->insert([
            'codigo' => 'CMP-AVZ-001', 'categoria_id' => $catId, 'organizacion_id' => $this->orgId,
            'nombre' => 'Laptop', 'condicion' => 'bueno', 'estado' => 'disponible', 'creado_por' => $this->adminId,
        ]);
        $this->activoId = (int) $this->db->insertID();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $f) {
            unlink($f);
        }
        @rmdir($this->dir);
        parent::tearDown();
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

    /** Crea un JPEG de prueba de $w x $h en un archivo temporal. */
    private function jpegTemporal(int $w, int $h): string
    {
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 30, 120, 200));
        $ruta = tempnam(sys_get_temp_dir(), 'evid');
        imagejpeg($img, $ruta, 90);
        imagedestroy($img);

        return $ruta;
    }

    private function service(): EvidenciasService
    {
        return new EvidenciasService(new EvidenciaModel(), new ActivoModel(), new MovimientoModel(), $this->almacen, new ProcesadorImagen());
    }

    private function subir(?string $descripcion = 'Cargador', string $tipo = 'accesorio'): array
    {
        $ruta = $this->jpegTemporal(3000, 2000);
        try {
            return $this->service()->subir($this->activoId, $ruta, $tipo, $descripcion, $this->adminId);
        } finally {
            unlink($ruta);
        }
    }

    public function testSubirReduceGuardaYRegistraMovimiento(): void
    {
        $e = $this->subir();

        $this->assertSame(1600, (int) $e['ancho']);
        $this->assertSame(1067, (int) $e['alto']);
        $this->assertNotNull($this->almacen->ruta($e['archivo']));
        $mini = getimagesize((string) $this->almacen->ruta($e['archivo'], true));
        $this->assertSame(400, $mini[0]);
        $this->seeInDatabase('movimientos', ['activo_id' => $this->activoId, 'tipo' => 'evidencia', 'notas' => 'Foto agregada (accesorio): Cargador']);
    }

    public function testRechazaArchivoQueNoEsImagen(): void
    {
        $ruta = tempnam(sys_get_temp_dir(), 'evid');
        file_put_contents($ruta, '%PDF-1.4 no soy una foto');
        try {
            $this->service()->subir($this->activoId, $ruta, 'equipo', null, $this->adminId);
            $this->fail('Debió rechazar el archivo');
        } catch (ServiceException $e) {
            $this->assertSame('tipo_no_permitido', $e->codigo);
        } finally {
            unlink($ruta);
        }
        $this->dontSeeInDatabase('evidencias', ['activo_id' => $this->activoId]);
    }

    public function testRechazaTipoInvalido(): void
    {
        try {
            $this->subir('Pantalla', 'otro');
            $this->fail('Debió rechazar el tipo');
        } catch (ServiceException $e) {
            $this->assertSame('tipo_invalido', $e->codigo);
        }
        $this->dontSeeInDatabase('evidencias', ['activo_id' => $this->activoId]);
        $this->assertSame([], glob($this->dir . '/*') ?: []);
    }

    public function testTipoDanoQuedaEnLaBitacora(): void
    {
        $this->subir('Pantalla estrellada', 'dano');
        $this->seeInDatabase('evidencias', ['activo_id' => $this->activoId, 'tipo' => 'dano']);
        $this->seeInDatabase('movimientos', ['tipo' => 'evidencia', 'notas' => 'Foto agregada (daño): Pantalla estrellada']);
    }

    public function testTodosVenLaListaYLaImagen(): void
    {
        $e = $this->subir();
        $c = $this->actuarComo('custodio', 'c1');

        $r = $this->withHeaders($c)->get('api/v1/activos/' . $this->activoId . '/evidencias');
        $r->assertStatus(200);
        $lista = json_decode($r->getJSON(), true);
        $this->assertCount(1, $lista);
        $this->assertSame('Cargador', $lista[0]['descripcion']);
        $this->assertSame('accesorio', $lista[0]['tipo']);
        $this->assertArrayNotHasKey('archivo', $lista[0]);

        $img = $this->withHeaders($c)->get('api/v1/evidencias/' . $e['id'] . '/archivo?miniatura=1');
        $img->assertStatus(200);
        $this->assertStringStartsWith('image/jpeg', $img->response()->getHeaderLine('Content-Type'));
        // En el arnés de PHPUnit el body binario puede venir envuelto por html_errors
        // (igual que la etiqueta PDF); basta con verificar que es el JPEG generado.
        $this->assertStringContainsString('JFIF', (string) $img->getBody());
    }

    public function testSinSesionNoSeVeLaImagen(): void
    {
        $e = $this->subir();
        $this->get('api/v1/evidencias/' . $e['id'] . '/archivo')->assertStatus(401);
    }

    public function testSoloAdminSubeYElimina(): void
    {
        $e = $this->subir();
        $c = $this->actuarComo('custodio', 'c1');
        $this->withHeaders($c)->post('api/v1/activos/' . $this->activoId . '/evidencias')->assertStatus(403);
        $this->withHeaders($c)->delete('api/v1/evidencias/' . $e['id'])->assertStatus(403);

        $aud = $this->actuarComo('auditor', 'au1');
        $this->withHeaders($aud)->delete('api/v1/evidencias/' . $e['id'])->assertStatus(403);
    }

    public function testAdminSinArchivoRecibe422(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer tok-a1'])
            ->post('api/v1/activos/' . $this->activoId . '/evidencias')
            ->assertStatus(422);
    }

    public function testEliminarBorraArchivosYRegistraMovimiento(): void
    {
        $e    = $this->subir();
        $ruta = (string) $this->almacen->ruta($e['archivo']);

        $this->withHeaders(['Authorization' => 'Bearer tok-a1'])->delete('api/v1/evidencias/' . $e['id'])->assertStatus(204);

        $this->dontSeeInDatabase('evidencias', ['id' => $e['id']]);
        $this->assertFileDoesNotExist($ruta);
        $this->seeInDatabase('movimientos', ['activo_id' => $this->activoId, 'tipo' => 'evidencia', 'notas' => 'Foto eliminada (accesorio): Cargador']);
    }

    public function testFichaPublicaNoIncluyeEvidencias(): void
    {
        $this->subir();
        $pub = json_decode($this->get('api/v1/activos/' . $this->activoId . '/publico')->getJSON(), true);
        $this->assertArrayNotHasKey('evidencias', $pub);
    }
}
