<?php

declare(strict_types=1);

namespace App\Services\Evidencias;

use App\Services\ServiceException;
use GdImage;

/**
 * Normaliza una foto subida: valida que sea JPG/PNG/WebP real, corrige la
 * orientación EXIF, la reduce (lado mayor 1600 px) y la recodifica como JPEG.
 * Recodificar descarta todos los metadatos (GPS, modelo del teléfono, etc.).
 * También genera una miniatura de 400 px para la galería.
 */
final class ProcesadorImagen
{
    public const LADO_MAX       = 1600;
    public const LADO_MINIATURA = 400;
    private const MAX_PIXELES   = 50_000_000; // ~50 MP: acota la memoria al decodificar

    /** @return array{imagen: string, miniatura: string, ancho: int, alto: int} */
    public function procesar(string $ruta): array
    {
        $info = @getimagesize($ruta);
        if ($info === false || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            throw new ServiceException('tipo_no_permitido', 'Solo se admiten fotos JPG, PNG o WebP.', 422);
        }
        if ($info[0] * $info[1] > self::MAX_PIXELES) {
            throw new ServiceException('imagen_grande', 'La foto tiene demasiada resolución.', 422);
        }

        ini_set('memory_limit', '512M');

        $origen = match ($info[2]) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($ruta),
            IMAGETYPE_PNG  => @imagecreatefrompng($ruta),
            IMAGETYPE_WEBP => @imagecreatefromwebp($ruta),
        };
        if (! $origen instanceof GdImage) {
            throw new ServiceException('imagen_invalida', 'No se pudo leer la foto.', 422);
        }

        if ($info[2] === IMAGETYPE_JPEG) {
            $origen = $this->orientar($origen, $ruta);
        }

        $imagen    = $this->reducir($origen, self::LADO_MAX);
        $miniatura = $this->reducir($origen, self::LADO_MINIATURA);
        imagedestroy($origen);

        $resultado = [
            'imagen'    => $this->jpeg($imagen, 82),
            'miniatura' => $this->jpeg($miniatura, 75),
            'ancho'     => imagesx($imagen),
            'alto'      => imagesy($imagen),
        ];
        imagedestroy($imagen);
        imagedestroy($miniatura);

        return $resultado;
    }

    /** Aplica la orientación EXIF (las fotos de celular suelen venir giradas). */
    private function orientar(GdImage $img, string $ruta): GdImage
    {
        $exif = function_exists('exif_read_data') ? @exif_read_data($ruta) : false;
        $orientacion = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        $girada = match ($orientacion) {
            3, 4    => imagerotate($img, 180, 0),
            5, 6    => imagerotate($img, -90, 0),
            7, 8    => imagerotate($img, 90, 0),
            default => $img,
        };
        if (in_array($orientacion, [2, 4, 5, 7], true)) {
            imageflip($girada, IMG_FLIP_HORIZONTAL);
        }
        if ($girada !== $img) {
            imagedestroy($img);
        }

        return $girada;
    }

    /** Copia reducida (nunca amplía) sobre fondo blanco (PNG/WebP con transparencia). */
    private function reducir(GdImage $img, int $ladoMax): GdImage
    {
        $w      = imagesx($img);
        $h      = imagesy($img);
        $escala = min(1, $ladoMax / max($w, $h));
        $nw     = max(1, (int) round($w * $escala));
        $nh     = max(1, (int) round($h * $escala));

        $destino = imagecreatetruecolor($nw, $nh);
        imagefill($destino, 0, 0, imagecolorallocate($destino, 255, 255, 255));
        imagecopyresampled($destino, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);

        return $destino;
    }

    private function jpeg(GdImage $img, int $calidad): string
    {
        ob_start();
        imagejpeg($img, null, $calidad);

        return (string) ob_get_clean();
    }
}
