<?php

declare(strict_types=1);

namespace App\Services\Activos;

use App\Models\ActivoModel;
use App\Models\MovimientoModel;
use App\Services\Html\SanitizadorHtml;
use App\Services\ServiceException;
use Throwable;

/**
 * Alta de activo (atómica, regla 5): dentro de una transacción genera el código
 * correlativo (con bloqueo), inserta el activo y registra el movimiento 'alta'.
 * El QR se deriva del id del activo (se genera bajo demanda en la etiqueta).
 */
final class CrearActivoService
{
    public function __construct(
        private readonly ActivoModel $activos,
        private readonly MovimientoModel $movimientos,
        private readonly GeneradorCodigo $generador,
    ) {
    }

    public function execute(array $data, int $creadoPor): array
    {
        $db = $this->activos->db;

        $categoriaId    = (int) ($data['categoria_id'] ?? 0);
        $organizacionId = (int) ($data['organizacion_id'] ?? 0);

        $cat = $db->table('categorias')->where('id', $categoriaId)->get()->getRowArray();
        if ($cat === null || (int) $cat['is_active'] === 0) {
            throw new ServiceException('categoria_invalida', 'Categoría inexistente o inactiva.', 422);
        }
        $org = $db->table('organizaciones')->where('id', $organizacionId)->get()->getRowArray();
        if ($org === null || (int) $org['is_active'] === 0) {
            throw new ServiceException('organizacion_invalida', 'Organización inexistente o inactiva.', 422);
        }

        $db->transBegin();
        try {
            $codigo = $this->generador->siguiente($db, $categoriaId, $organizacionId);

            $id = $this->activos->insert([
                'codigo'          => $codigo,
                'categoria_id'    => $categoriaId,
                'organizacion_id' => $organizacionId,
                'nombre'          => (string) $data['nombre'],
                'descripcion'     => $data['descripcion'] ?? null,
                'observaciones'   => SanitizadorHtml::limpiar($data['observaciones'] ?? null),
                'marca'           => $data['marca'] ?? null,
                'modelo'          => $data['modelo'] ?? null,
                'serie'           => $data['serie'] ?? null,
                'fecha_compra'    => $data['fecha_compra'] ?? null,
                'valor_compra'    => $data['valor_compra'] ?? null,
                'proveedor'       => $data['proveedor'] ?? null,
                'factura_numero'  => $data['factura_numero'] ?? null,
                'condicion'       => $data['condicion'] ?? 'bueno',
                'estado'          => 'disponible',
                'creado_por'      => $creadoPor,
            ], true);

            if (! $id) {
                throw new ServiceException('validacion', 'Datos inválidos.', 422, ['campos' => array_values($this->activos->errors())]);
            }

            $this->movimientos->registrar([
                'activo_id'     => $id,
                'tipo'          => 'alta',
                'a_org_id'      => $organizacionId,
                'realizado_por' => $creadoPor,
            ]);

            if ($db->transStatus() === false) {
                throw new ServiceException('alta_fallida', 'No se pudo crear el activo.', 422);
            }
            $db->transCommit();
            \App\Services\Dashboard\DashboardService::invalidarCache();
        } catch (ServiceException $e) {
            $db->transRollback();
            throw $e;
        } catch (Throwable $e) {
            $db->transRollback();
            throw new ServiceException('alta_fallida', 'No se pudo crear el activo.', 422);
        }

        return $this->activos->find($id);
    }
}
