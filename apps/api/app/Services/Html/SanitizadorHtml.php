<?php

declare(strict_types=1);

namespace App\Services\Html;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Saneador de HTML enriquecido con lista blanca (sin dependencias). Se aplica
 * en el servidor ANTES de persistir cualquier campo WYSIWYG (regla de seguridad:
 * la defensa vive en el almacenamiento). Conserva un subconjunto seguro de
 * etiquetas de formato básico y elimina scripts, estilos, eventos y esquemas
 * de enlace peligrosos (p. ej. javascript:).
 */
final class SanitizadorHtml
{
    /** Etiquetas de formato permitidas. */
    private const PERMITIDAS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a'];

    /** Etiquetas eliminadas junto con TODO su contenido. */
    private const PELIGROSAS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta'];

    private const MAX = 20000;

    public static function limpiar(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }
        $html = trim($html);
        if ($html === '') {
            return null;
        }
        if (mb_strlen($html) > self::MAX) {
            $html = mb_substr($html, 0, self::MAX);
        }

        $doc = new DOMDocument();
        $previo = libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<?xml encoding="UTF-8"><div id="sire-raiz">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previo);

        $raiz = null;
        foreach ($doc->childNodes as $n) {
            if ($n instanceof DOMElement && strtolower($n->nodeName) === 'div') {
                $raiz = $n;
                break;
            }
        }
        if ($raiz === null) {
            return null;
        }

        self::limpiarNodo($raiz);

        $out = '';
        foreach (iterator_to_array($raiz->childNodes) as $hijo) {
            $out .= $doc->saveHTML($hijo);
        }
        $out = trim($out);

        // Contenido sin texto visible (p. ej. "<p></p>" o solo "<br>") = vacío.
        if ($out === '' || trim(strip_tags($out)) === '') {
            return null;
        }

        return $out;
    }

    private static function limpiarNodo(DOMNode $nodo): void
    {
        foreach (iterator_to_array($nodo->childNodes) as $hijo) {
            if (! $hijo instanceof DOMElement) {
                // Texto conservado; comentarios / PI eliminados.
                if ($hijo->nodeType !== XML_TEXT_NODE) {
                    $nodo->removeChild($hijo);
                }
                continue;
            }

            $tag = strtolower($hijo->tagName);

            if (in_array($tag, self::PELIGROSAS, true)) {
                $nodo->removeChild($hijo);
                continue;
            }

            self::limpiarNodo($hijo);

            if (! in_array($tag, self::PERMITIDAS, true)) {
                // Etiqueta no permitida: se "desenvuelve" conservando su contenido.
                while ($hijo->firstChild) {
                    $nodo->insertBefore($hijo->firstChild, $hijo);
                }
                $nodo->removeChild($hijo);
                continue;
            }

            self::limpiarAtributos($hijo, $tag);
        }
    }

    private static function limpiarAtributos(DOMElement $el, string $tag): void
    {
        $href = $tag === 'a' ? (string) $el->getAttribute('href') : '';

        foreach (iterator_to_array($el->attributes) as $attr) {
            $el->removeAttribute($attr->name);
        }

        if ($tag === 'a' && self::hrefSeguro($href)) {
            $el->setAttribute('href', $href);
            $el->setAttribute('target', '_blank');
            $el->setAttribute('rel', 'noopener noreferrer');
        }
    }

    /** Solo esquemas seguros por lista blanca: http(s), mailto, rutas relativas y anclas. */
    private static function hrefSeguro(string $href): bool
    {
        $href = trim($href);

        return $href !== '' && (bool) preg_match('#^(https?://|mailto:|/|\#)#i', $href);
    }
}
