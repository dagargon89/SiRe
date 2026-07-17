<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class PrestamoModel extends Model
{
    protected $table         = 'prestamos';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'activo_id', 'prestatario_id', 'prestamista_id', 'prestado_por',
        'prestado_en', 'devolucion_esperada', 'devuelto_en', 'devuelto_a',
        'condicion_prestamo', 'condicion_devolucion', 'notas',
    ];

    /** Estado derivado de un préstamo (no se almacena). */
    public static function estadoDerivado(array $p, ?string $ahora = null): string
    {
        if ($p['devuelto_en'] !== null) {
            return 'devuelto';
        }
        $ahora = $ahora ?? date('Y-m-d H:i:s');

        return $p['devolucion_esperada'] < $ahora ? 'vencido' : 'activo';
    }
}
