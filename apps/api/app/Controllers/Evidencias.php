<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ActivoModel;
use App\Models\EvidenciaModel;
use App\Models\MovimientoModel;
use App\Services\Evidencias\EvidenciasService;
use App\Services\Evidencias\ProcesadorImagen;
use App\Services\ServiceException;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Evidencias fotográficas de un activo. Ver: cualquier usuario aprobado.
 * Subir/eliminar: administrador. No se exponen en la ficha pública del QR.
 */
class Evidencias extends ApiController
{
    private const MAX_BYTES = 10 * 1024 * 1024;

    private function presentar(array $e): array
    {
        return [
            'id'          => (int) $e['id'],
            'activo_id'   => (int) $e['activo_id'],
            'tipo'        => $e['tipo'],
            'descripcion' => $e['descripcion'],
            'ancho'       => (int) $e['ancho'],
            'alto'        => (int) $e['alto'],
            'subido_por'  => (int) $e['subido_por'],
            'creado_en'   => $e['creado_en'],
        ];
    }

    private function service(): EvidenciasService
    {
        return new EvidenciasService(
            new EvidenciaModel(), new ActivoModel(), new MovimientoModel(),
            service('almacenEvidencias'), new ProcesadorImagen(),
        );
    }

    /** GET /activos/{id}/evidencias */
    public function index(int $activoId): ResponseInterface
    {
        if ((new ActivoModel())->find($activoId) === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }
        $rows = (new EvidenciaModel())->where('activo_id', $activoId)->orderBy('id', 'ASC')->findAll();

        return $this->ok(array_map(fn ($e) => $this->presentar($e), $rows));
    }

    /** POST /activos/{id}/evidencias — administrador. multipart: foto, tipo, descripcion? */
    public function create(int $activoId): ResponseInterface
    {
        $file = $this->request->getFile('foto');
        if ($file === null || ! $file->isValid()) {
            return $this->error(422, 'archivo_invalido', 'Selecciona una foto válida.');
        }
        if ($file->getSize() > self::MAX_BYTES) {
            return $this->error(422, 'archivo_grande', 'La foto supera 10 MB.');
        }

        try {
            $evidencia = $this->service()->subir(
                $activoId,
                $file->getTempName(),
                (string) ($this->request->getPost('tipo') ?? ''),
                $this->request->getPost('descripcion'),
                (int) $this->actor()['id'],
            );
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($evidencia), 201);
    }

    /** GET /evidencias/{id}/archivo[?miniatura=1] — la imagen (JPEG). */
    public function archivo(int $id): ResponseInterface
    {
        $evidencia = (new EvidenciaModel())->find($id);
        $ruta      = $evidencia === null ? null
            : service('almacenEvidencias')->ruta($evidencia['archivo'], $this->request->getGet('miniatura') === '1');
        if ($ruta === null) {
            return $this->error(404, 'no_existe', 'Foto no encontrada.');
        }

        // El nombre del archivo es único e inmutable: el navegador puede cachearla.
        return $this->response
            ->setContentType('image/jpeg')
            ->setHeader('Cache-Control', 'private, max-age=86400, immutable')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setBody((string) file_get_contents($ruta));
    }

    /** PATCH /evidencias/{id} — administrador. body: {tipo?, descripcion?} */
    public function update(int $id): ResponseInterface
    {
        $cambios = array_intersect_key($this->body(), array_flip(['tipo', 'descripcion']));

        try {
            $evidencia = $this->service()->actualizar($id, $cambios, (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($evidencia));
    }

    /** DELETE /evidencias/{id} — administrador. */
    public function delete(int $id): ResponseInterface
    {
        try {
            $this->service()->eliminar($id, (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->noContent();
    }
}
