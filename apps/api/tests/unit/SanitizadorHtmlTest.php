<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Html\SanitizadorHtml;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Saneador de HTML enriquecido: conserva formato básico, elimina scripts,
 * atributos de evento y esquemas de enlace peligrosos.
 *
 * @internal
 */
final class SanitizadorHtmlTest extends CIUnitTestCase
{
    public function testConservaFormatoBasico(): void
    {
        $r = SanitizadorHtml::limpiar('<p>Hola <b>mundo</b> y <em>algo</em></p><ul><li>uno</li></ul>');
        $this->assertStringContainsString('<b>mundo</b>', $r);
        $this->assertStringContainsString('<em>algo</em>', $r);
        $this->assertStringContainsString('<li>uno</li>', $r);
    }

    public function testEliminaScriptYSuContenido(): void
    {
        $r = SanitizadorHtml::limpiar('Hola<script>alert(1)</script> mundo');
        $this->assertStringNotContainsString('<script', (string) $r);
        $this->assertStringNotContainsString('alert(1)', (string) $r);
        $this->assertStringContainsString('Hola', (string) $r);
        $this->assertStringContainsString('mundo', (string) $r);
    }

    public function testEliminaAtributosDeEvento(): void
    {
        $r = SanitizadorHtml::limpiar('<b onclick="robar()">x</b>');
        $this->assertStringNotContainsString('onclick', (string) $r);
        $this->assertStringContainsString('<b>x</b>', (string) $r);
    }

    public function testBloqueaEnlaceJavascript(): void
    {
        $r = SanitizadorHtml::limpiar('<a href="javascript:alert(1)">clic</a>');
        $this->assertStringNotContainsString('javascript', (string) $r);
        $this->assertStringContainsString('clic', (string) $r);
    }

    public function testConservaEnlaceSeguroConRel(): void
    {
        $r = SanitizadorHtml::limpiar('<a href="https://ejemplo.org">sitio</a>');
        $this->assertStringContainsString('href="https://ejemplo.org"', (string) $r);
        $this->assertStringContainsString('rel="noopener noreferrer"', (string) $r);
    }

    public function testDesenvuelveEtiquetasNoPermitidas(): void
    {
        $r = SanitizadorHtml::limpiar('<div class="x"><span>texto</span></div>');
        $this->assertStringContainsString('texto', (string) $r);
        $this->assertStringNotContainsString('<div', (string) $r);
        $this->assertStringNotContainsString('<span', (string) $r);
    }

    public function testVacioONuloDevuelveNull(): void
    {
        $this->assertNull(SanitizadorHtml::limpiar(null));
        $this->assertNull(SanitizadorHtml::limpiar('   '));
        $this->assertNull(SanitizadorHtml::limpiar('<p></p>'));
    }
}
