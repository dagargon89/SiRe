<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ActivoModel;
use App\Models\MovimientoModel;
use App\Services\Activos\CrearActivoService;
use App\Services\Activos\EtiquetaPdf;
use App\Services\Activos\GeneradorCodigo;
use App\Services\Activos\GeneradorQr;
use App\Services\Activos\GuardarFacturaService;
use App\Services\ServiceException;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class Activos extends ApiController
{
    private function model(): ActivoModel
    {
        return new ActivoModel();
    }

    private function frontendUrl(): string
    {
        return rtrim((string) (env('app.frontendUrl') ?? 'http://localhost:5173'), '/');
    }

    /** Proyecta al contrato Activo (tipos + qr_url derivado del id). */
    private function presentar(array $a): array
    {
        return [
            'id'              => (int) $a['id'],
            'codigo'          => $a['codigo'],
            'nombre'          => $a['nombre'],
            'descripcion'     => $a['descripcion'],
            'categoria_id'    => (int) $a['categoria_id'],
            'organizacion_id' => (int) $a['organizacion_id'],
            'marca'           => $a['marca'],
            'modelo'          => $a['modelo'],
            'serie'           => $a['serie'],
            'fecha_compra'    => $a['fecha_compra'],
            'valor_compra'    => $a['valor_compra'] !== null ? (float) $a['valor_compra'] : null,
            'proveedor'       => $a['proveedor'],
            'factura_numero'  => $a['factura_numero'],
            'qr_url'          => $this->frontendUrl() . '/activos/' . (int) $a['id'],
            'condicion'       => $a['condicion'],
            'estado'          => $a['estado'],
            'creado_en'       => $a['creado_en'],
        ];
    }

    /** GET /activos — búsqueda (?q=) y filtros; paginado. Sin N+1 (una consulta). */
    public function index(): ResponseInterface
    {
        $model   = $this->model();
        $perPage = 25;
        $page    = max(1, (int) ($this->request->getGet('page') ?? 1));

        $q = trim((string) ($this->request->getGet('q') ?? ''));
        if ($q !== '') {
            $model->groupStart()
                ->like('codigo', $q)->orLike('nombre', $q)->orLike('serie', $q)
                ->groupEnd();
        }
        foreach (['categoria_id', 'organizacion_id', 'estado', 'condicion'] as $f) {
            $v = $this->request->getGet($f);
            if ($v !== null && $v !== '') {
                $model->where($f, $v);
            }
        }

        $rows  = $model->orderBy('id', 'DESC')->paginate($perPage, 'default', $page);
        $total = $model->pager->getTotal('default');

        return $this->ok([
            'data' => array_map(fn ($a) => $this->presentar($a), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ]);
    }

    /** POST /activos — administrador. Genera código + registra alta. */
    public function create(): ResponseInterface
    {
        $service = new CrearActivoService($this->model(), new MovimientoModel(), new GeneradorCodigo());

        try {
            $activo = $service->execute($this->body(), (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($activo), 201);
    }

    /** GET /activos/{id} — ficha + historial (una consulta por recurso). */
    public function show(int $id): ResponseInterface
    {
        $activo = $this->model()->find($id);
        if ($activo === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }

        $historial = (new MovimientoModel())
            ->where('activo_id', $id)->orderBy('creado_en', 'ASC')->orderBy('id', 'ASC')->findAll();

        $historial = array_map(static fn ($m) => [
            'id'            => (int) $m['id'],
            'activo_id'     => (int) $m['activo_id'],
            'tipo'          => $m['tipo'],
            'de_usuario_id' => $m['de_usuario_id'] !== null ? (int) $m['de_usuario_id'] : null,
            'a_usuario_id'  => $m['a_usuario_id'] !== null ? (int) $m['a_usuario_id'] : null,
            'realizado_por' => (int) $m['realizado_por'],
            'notas'         => $m['notas'],
            'creado_en'     => $m['creado_en'],
        ], $historial);

        $vigente = $this->model()->db->table('asignaciones a')
            ->select('a.id, a.activo_id, a.usuario_id, a.asignada_en, u.nombre AS usuario_nombre')
            ->join('usuarios u', 'u.id = a.usuario_id')
            ->where('a.activo_id', $id)->where('a.revocada_en', null)
            ->get()->getRowArray();
        $asignacionVigente = $vigente === null ? null : [
            'id'             => (int) $vigente['id'],
            'activo_id'      => (int) $vigente['activo_id'],
            'usuario_id'     => (int) $vigente['usuario_id'],
            'usuario_nombre' => $vigente['usuario_nombre'],
            'asignada_en'    => $vigente['asignada_en'],
            'revocada_en'    => null,
        ];

        return $this->ok([
            'activo'            => $this->presentar($activo),
            'historial'         => $historial,
            'asignacion_vigente' => $asignacionVigente,
        ]);
    }

    /** PUT /activos/{id} — administrador. No cambia código ni estado. */
    public function update(int $id): ResponseInterface
    {
        $model = $this->model();
        if ($model->find($id) === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }

        $data    = $this->body();
        $editable = ['nombre', 'descripcion', 'marca', 'modelo', 'serie', 'fecha_compra',
            'valor_compra', 'proveedor', 'factura_numero', 'condicion'];
        $payload = ['actualizado_por' => (int) $this->actor()['id']];
        foreach ($editable as $campo) {
            if (array_key_exists($campo, $data)) {
                $payload[$campo] = $data[$campo];
            }
        }

        if (! $model->update($id, $payload)) {
            return $this->error(422, 'validacion', 'Datos inválidos.', ['campos' => array_values($model->errors())]);
        }

        return $this->ok($this->presentar($model->find($id)));
    }

    /** PATCH /activos/{id}/baja — administrador. */
    public function baja(int $id): ResponseInterface
    {
        return $this->cambioEstado($id, function (array $activo, $db) {
            if (in_array($activo['estado'], ['asignado', 'prestado'], true)) {
                throw new ServiceException('estado_invalido', 'No se puede dar de baja un activo asignado o prestado.', 409);
            }
            if ($activo['estado'] === 'baja') {
                throw new ServiceException('estado_invalido', 'El activo ya está dado de baja.', 409);
            }
            $motivo = trim((string) ($this->body()['motivo'] ?? ''));
            $this->model()->update($activo['id'], ['estado' => 'baja', 'baja_motivo' => $motivo, 'actualizado_por' => (int) $this->actor()['id']]);

            return ['tipo' => 'baja', 'notas' => $motivo !== '' ? $motivo : null];
        });
    }

    /** PATCH /activos/{id}/mantenimiento — administrador. body: {en_mantenimiento:bool} */
    public function mantenimiento(int $id): ResponseInterface
    {
        $entrar = (bool) ($this->body()['en_mantenimiento'] ?? true);

        return $this->cambioEstado($id, function (array $activo) use ($entrar) {
            if ($entrar) {
                if ($activo['estado'] !== 'disponible') {
                    throw new ServiceException('estado_invalido', 'Solo un activo disponible entra a mantenimiento.', 409);
                }
                $nuevo = 'mantenimiento';
            } else {
                if ($activo['estado'] !== 'mantenimiento') {
                    throw new ServiceException('estado_invalido', 'El activo no está en mantenimiento.', 409);
                }
                $nuevo = 'disponible';
            }
            $this->model()->update($activo['id'], ['estado' => $nuevo, 'actualizado_por' => (int) $this->actor()['id']]);

            return ['tipo' => 'mantenimiento', 'notas' => null];
        });
    }

    /** GET /activos/{id}/etiqueta — administrador. PDF con QR + código. */
    public function etiqueta(int $id): ResponseInterface
    {
        $activo = $this->model()->find($id);
        if ($activo === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }

        $deepLink = $this->frontendUrl() . '/activos/' . $id;
        $qr       = (new GeneradorQr())->pngBase64($deepLink);
        $pdf      = (new EtiquetaPdf())->generar($activo, $qr);

        return $this->response
            ->setContentType('application/pdf')
            ->setHeader('Content-Disposition', 'inline; filename="etiqueta-' . $activo['codigo'] . '.pdf"')
            ->setBody($pdf);
    }

    /** POST /activos/{id}/factura — administrador. Sube copia y devuelve URL firmada. */
    public function subirFactura(int $id): ResponseInterface
    {
        $model  = $this->model();
        $activo = $model->find($id);
        if ($activo === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }

        $file = $this->request->getFile('archivo');
        if ($file === null || ! $file->isValid()) {
            return $this->error(422, 'archivo_invalido', 'Archivo no válido.');
        }

        $mime       = $file->getMimeType();
        $permitidos = ['application/pdf', 'image/jpeg', 'image/png'];
        if (! in_array($mime, $permitidos, true)) {
            return $this->error(422, 'tipo_no_permitido', 'Solo se admite PDF, JPG o PNG.');
        }
        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->error(422, 'archivo_grande', 'El archivo supera 10 MB.');
        }

        $ext     = $file->getExtension() ?: 'bin';
        $service = new GuardarFacturaService($model, service('archivoStorage'));

        try {
            $url = $service->execute(
                $id,
                (string) file_get_contents($file->getTempName()),
                $mime,
                $ext,
                (int) $this->actor()['id'],
            );
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok(['factura_url' => $url]);
    }

    /** GET /activos/{id}/factura — administrador o auditor. URL firmada. */
    public function urlFactura(int $id): ResponseInterface
    {
        $activo = $this->model()->find($id);
        if ($activo === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }
        if (empty($activo['factura_archivo_ref'])) {
            return $this->error(404, 'sin_factura', 'Este activo no tiene factura registrada.');
        }

        return $this->ok(['url' => service('archivoStorage')->urlFirmada($activo['factura_archivo_ref'])]);
    }

    /** Envuelve un cambio de estado atómico + movimiento. */
    private function cambioEstado(int $id, callable $accion): ResponseInterface
    {
        $model  = $this->model();
        $activo = $model->find($id);
        if ($activo === null) {
            return $this->error(404, 'no_existe', 'Activo no encontrado.');
        }

        $db = $model->db;
        $db->transBegin();
        try {
            $mov = $accion($activo, $db);
            (new MovimientoModel())->registrar([
                'activo_id'     => $id,
                'tipo'          => $mov['tipo'],
                'realizado_por' => (int) $this->actor()['id'],
                'notas'         => $mov['notas'] ?? null,
            ]);
            if ($db->transStatus() === false) {
                throw new ServiceException('operacion_fallida', 'No se pudo completar la operación.', 422);
            }
            $db->transCommit();
            \App\Services\Dashboard\DashboardService::invalidarCache();
        } catch (ServiceException $e) {
            $db->transRollback();
            return $this->fromException($e);
        } catch (Throwable $e) {
            $db->transRollback();
            return $this->error(422, 'operacion_fallida', 'No se pudo completar la operación.');
        }

        return $this->ok($this->presentar($model->find($id)));
    }
}
