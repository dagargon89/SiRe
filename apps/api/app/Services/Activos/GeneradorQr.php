<?php

declare(strict_types=1);

namespace App\Services\Activos;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

/** Genera el QR (PNG) a partir del deep-link a la ficha del activo. */
final class GeneradorQr
{
    public function png(string $data): string
    {
        return (new PngWriter())->write(new QrCode($data))->getString();
    }

    public function pngBase64(string $data): string
    {
        return base64_encode($this->png($data));
    }
}
