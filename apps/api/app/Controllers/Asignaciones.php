<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ActivoModel;
use App\Models\AsignacionModel;
use App\Models\MovimientoModel;
use App\Models\UsuarioModel;
use App\Services\Resguardos\ResguardoService;
use App\Services\ServiceException;
use CodeIgniter\HTTP\ResponseInterface;

class Asignaciones extends ApiController
{
    private function service(): ResguardoService
    {
        return new ResguardoService(new ActivoModel(), new AsignacionModel(), new MovimientoModel(), new UsuarioModel());
    }

    private function presentar(array $a): array
    {
        return [
            'id'                => (int) $a['id'],
            'activo_id'         => (int) $a['activo_id'],
            'usuario_id'        => (int) $a['usuario_id'],
            'asignada_en'       => $a['asignada_en'],
            'revocada_en'       => $a['revocada_en'],
            'revocacion_motivo' => $a['revocacion_motivo'],
        ];
    }

    /** POST /asignaciones — administrador. */
    public function create(): ResponseInterface
    {
        $d = $this->body();
        try {
            $a = $this->service()->asignar(
                (int) ($d['activo_id'] ?? 0),
                (int) ($d['usuario_id'] ?? 0),
                $d['notas'] ?? null,
                (int) $this->actor()['id'],
            );
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($a), 201);
    }

    /** PATCH /asignaciones/{id}/revocar — administrador. */
    public function revocar(int $id): ResponseInterface
    {
        $motivo = trim((string) ($this->body()['motivo'] ?? ''));
        if ($motivo === '') {
            return $this->error(422, 'motivo_requerido', 'El motivo de revocación es obligatorio.');
        }
        try {
            $a = $this->service()->revocar($id, $motivo, (int) $this->actor()['id']);
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($a));
    }

    /** POST /asignaciones/transferir — administrador. */
    public function transferir(): ResponseInterface
    {
        $d = $this->body();
        try {
            $a = $this->service()->transferir(
                (int) ($d['activo_id'] ?? 0),
                (int) ($d['nuevo_usuario_id'] ?? 0),
                $d['notas'] ?? null,
                (int) $this->actor()['id'],
            );
        } catch (ServiceException $e) {
            return $this->fromException($e);
        }

        return $this->ok($this->presentar($a), 201);
    }
}
