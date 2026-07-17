<?php

declare(strict_types=1);

namespace App\Services\Dashboard;

/**
 * Resumen del dashboard con caché en Redis (TTL corto). Agrega totales por
 * estado, préstamos activos/vencidos, últimos movimientos y por organización.
 */
final class DashboardService
{
    private const CACHE_KEY = 'sire_dashboard_v1';
    private const TTL       = 30; // segundos

    private const ESTADOS = ['disponible', 'asignado', 'prestado', 'mantenimiento', 'baja'];

    /** Resumen completo (con caché). $completo=false devuelve una vista parcial. */
    public function resumen(bool $completo = true): array
    {
        $full = cache(self::CACHE_KEY);
        if (! is_array($full)) {
            $full = $this->calcular();
            cache()->save(self::CACHE_KEY, $full, self::TTL);
        }

        if ($completo) {
            return $full;
        }

        // Vista parcial (custodio): sin desglose por organización ni bitácora global.
        return array_merge($full, ['por_organizacion' => [], 'ultimos_movimientos' => []]);
    }

    /** Invalida la caché (llamar tras mutaciones relevantes). */
    public static function invalidarCache(): void
    {
        cache()->delete(self::CACHE_KEY);
    }

    private function calcular(): array
    {
        $db    = db_connect();
        $ahora = date('Y-m-d H:i:s');

        // Activos por estado (todos los estados presentes, con 0 por defecto).
        $porEstado = array_fill_keys(self::ESTADOS, 0);
        foreach ($db->table('activos')->select('estado, COUNT(*) AS n')->groupBy('estado')->get()->getResultArray() as $r) {
            $porEstado[$r['estado']] = (int) $r['n'];
        }

        $prestamosActivos = $db->table('prestamos p')->where('p.devuelto_en', null)
            ->where('p.devolucion_esperada >=', $ahora)->countAllResults();
        $prestamosVencidos = $db->table('prestamos p')->where('p.devuelto_en', null)
            ->where('p.devolucion_esperada <', $ahora)->countAllResults();

        $ultimos = $db->table('movimientos')->select('id, activo_id, tipo, realizado_por, notas, creado_en')
            ->orderBy('id', 'DESC')->limit(10)->get()->getResultArray();
        $ultimos = array_map(static fn ($m) => [
            'id' => (int) $m['id'], 'activo_id' => (int) $m['activo_id'], 'tipo' => $m['tipo'],
            'realizado_por' => (int) $m['realizado_por'], 'notas' => $m['notas'], 'creado_en' => $m['creado_en'],
        ], $ultimos);

        $porOrg = $db->table('organizaciones o')
            ->select('o.id AS organizacion_id, o.nombre, COUNT(a.id) AS total')
            ->join('activos a', 'a.organizacion_id = o.id', 'left')
            ->groupBy('o.id')->orderBy('o.nombre', 'ASC')->get()->getResultArray();
        $porOrg = array_map(static fn ($r) => [
            'organizacion_id' => (int) $r['organizacion_id'], 'nombre' => $r['nombre'], 'total' => (int) $r['total'],
        ], $porOrg);

        return [
            'activos_por_estado'  => $porEstado,
            'prestamos_activos'   => $prestamosActivos,
            'prestamos_vencidos'  => $prestamosVencidos,
            'ultimos_movimientos' => $ultimos,
            'por_organizacion'    => $porOrg,
        ];
    }
}
