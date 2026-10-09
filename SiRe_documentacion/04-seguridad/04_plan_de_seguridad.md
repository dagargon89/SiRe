# 04 — Plan de Seguridad

| Campo | Valor |
|---|---|
| Documento | 04 — Plan de Seguridad (OWASP Top 10 + ASVS) |
| Proyecto | SiRe — Sistema de Resguardos OSC |
| Versión | 1.0 |
| Fecha | 2026-07-17 |
| Depende de | [02_arquitectura](../02-arquitectura/02_arquitectura_sistema.md), [03_modelo_de_datos](../03-datos/03_modelo_de_datos.md), [ADR-002](../02-arquitectura/ADR/ADR-002_firebase_auth_storage.md), [ADR-003](../02-arquitectura/ADR/ADR-003_modelo_acceso_roles.md) |

## 1. Activos a proteger y actores de amenaza

**Activos:** identidad y credenciales, datos personales (ficha, carta responsiva), integridad del inventario y de la bitácora, copias de factura, disponibilidad del servicio, la service account de Firebase Admin.

**Actores de amenaza:** usuario interno con exceso de curiosidad (acceso a PII ajena), cuenta desactivada que intenta seguir operando, atacante externo sin token, usuario legítimo que intenta escalar privilegios o alterar el historial, error de terceros (Firebase caído).

## 2. Riesgos OWASP Top 10 y controles

### A01 · Pérdida de control de acceso (Broken Access Control)

Riesgo central del modelo compartido (ADR-003): sin aislamiento por organización, la PII es la restricción crítica. Autorización en Policy, nunca en el cliente ni en query params.

```php
// app/Services/Usuarios/PoliticaPii.php
final class PoliticaPii
{
    /** Solo un Administrador o el propio titular acceden a la ficha/carta de una persona. */
    public static function puedeVer(object $actor, int $titularId): bool
    {
        return $actor->rol === 'administrador' || $actor->id === $titularId;
    }
}
// En el controller de ficha/carta:
if (! PoliticaPii::puedeVer($request->user, $usuarioId)) {
    return $this->failForbidden('sin_permiso_pii'); // 403
}
```

Mutaciones (crear/editar activo, asignar, revocar, transferir, prestar, dar de baja, gestionar catálogos/usuarios) reservadas a `administrador`; el Custodio solo devolución de lo suyo. Toda acción con prueba negativa 403 (doc 06).

### A02 · Fallos criptográficos

Contraseñas y su hashing los gestiona Firebase Auth (no se almacenan en MySQL). HTTPS forzado extremo a extremo. La service account del Admin SDK y las credenciales SMTP/DB viven en `.env` fuera de webroot. URLs de factura firmadas con expiración corta; nunca objetos públicos.

### A03 · Inyección

Acceso a datos exclusivamente por Query Builder/Models de CI4 con binding de parámetros; cero concatenación de variables en SQL.

```php
// ✅ binding
$this->db->table('activos')
    ->like('nombre', $q)              // escapado por el builder
    ->where('estado', $estado)
    ->orderBy('creado_en', 'DESC')
    ->get($limit, $offset);
// ❌ prohibido: ->query("... WHERE nombre LIKE '%$q%'")
```

Salida JSON escapada por defecto; en React se evita `dangerouslySetInnerHTML`.

### A04 · Diseño inseguro

Precondiciones de estado validadas **dentro** de la transacción releyendo con bloqueo (evita TOCTOU en asignar/prestar). Identificadores correlativos a prueba de concurrencia (`secuencias_codigo` con `FOR UPDATE`). Bitácora inmutable por diseño de esquema (sin columnas de mutación).

### A05 · Configuración de seguridad incorrecta

`CI_ENVIRONMENT=production` (sin trazas al cliente), CORS con orígenes explícitos, cabeceras de seguridad (HSTS, X-Content-Type-Options, Referrer-Policy), `display_errors=0`. Reglas de Firebase Storage: denegar por defecto.

```
# Firebase Storage rules (denegar todo acceso directo del cliente)
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} { allow read, write: if false; }
  }
}
# Los objetos se leen solo por URL firmada emitida por el backend tras validar permiso.
```

### A06 · Componentes vulnerables

Dependencias fijadas por versión; `composer audit` / `npm audit` en CI. Firebase Admin SDK y librerías PDF/QR actualizadas.

### A07 · Fallos de identificación y autenticación

Un único mecanismo: Firebase Auth + verificación del ID token en CI4 (regla 10). Se verifica firma, `aud`, `iss` y `exp` en cada request; nunca se confía en el payload sin verificar.

```php
// Verificación (resumen) — App\Libraries\FirebaseTokenVerifier::verify()
$claims = JWT::decode($idToken, $jwks);          // firma contra JWKS (cache Redis)
if ($claims->aud !== $projectId)  throw new AuthException('aud');
if ($claims->iss !== "https://securetoken.google.com/{$projectId}") throw new AuthException('iss');
if ($claims->exp < time() - $skew) throw new AuthException('exp');
return ['sub' => $claims->sub, 'email' => $claims->email, 'auth_time' => $claims->auth_time];
```

**Desactivación real (regla 8):**

```php
// app/Services/Usuarios/DesactivarUsuarioService.php
public function execute(int $usuarioId, object $actor): void
{
    if ($usuarioId === $actor->id) throw new \DomainException('no_auto_desactivar', 403); // regla 6
    $db = db_connect(); $db->transException(true)->transStart();
    $this->usuarios->update($usuarioId, ['is_active' => 0]);          // MySQL
    $this->firebaseAdmin->revokeRefreshTokens($this->uidDe($usuarioId)); // Firebase
    $db->transComplete(); // si falla, rollback de MySQL; se re-lanza para reintento/compensación
}
```

El Filter rechaza cualquier token cuyo perfil esté inactivo, aunque el ID token siga vigente. Rate limiting (Redis) en endpoints de auth.

### A08 · Fallos de integridad de software y datos

Operaciones multi-tabla atómicas (`transStart/transComplete`, `transException(true)`). Bitácora append-only. Sin deserialización de datos no confiables.

### A09 · Fallos de registro y monitoreo

Log de eventos de seguridad (login fallido, 401/403, desactivaciones, cambios de rol, emisión de URLs firmadas) **sin PII ni tokens**. La bitácora `movimientos` provee el rastro de negocio. Alertas ante picos de 401/403.

### A10 · SSRF

El backend solo contacta endpoints conocidos (Google JWKS, Firebase, SMTP). Sin fetch de URLs provistas por el usuario. Egress restringido a dominios necesarios.

## 3. Seguridad por capa

| Capa | Controles |
|---|---|
| Cliente (React) | Sin secretos server-side; token en memoria; sin PII en `localStorage`; escape por defecto |
| Borde API (Filters) | CORS estricto, verificación de token, resolución de rol, rate limiting |
| Servicios | Autorización por Policy, precondiciones en transacción, validación de entrada |
| Datos | Binding de parámetros, `RESTRICT` en FKs, `DECIMAL` monetario, bitácora inmutable |
| Firebase | Reglas de Storage deny-by-default, URLs firmadas, service account protegida |
| Infra | HTTPS forzado, `.env` fuera de webroot, TZ fija, backups cifrados |

## 4. Procedimientos operativos

- **Secretos.** Service account de Firebase, SMTP y DB solo en `.env`/secret store; rotación documentada; nunca en repo, logs ni frontend.
- **Hardening.** `CI_ENVIRONMENT=production`, cabeceras de seguridad, deshabilitar directory listing, PHP-FPM con usuario sin privilegios, MySQL con usuario de mínimo privilegio para la app.
- **Gestión de incidentes.** Ante compromiso de cuenta: desactivar (revoca tokens + inactiva perfil), revisar bitácora del periodo, rotar credenciales afectadas.
- **Privacidad (LFPDPPP).** Minimización: solo nombre, correo y organización de las personas. Acceso a PII por titular o Administrador. Sin PII en logs. Aviso de privacidad a cargo del cliente (SOW §10).
- **Respaldo.** Backups periódicos cifrados de MySQL; los archivos de Storage con la política de retención de Firebase.

## 5. Checklist de verificación de seguridad (release)

- [ ] Verificación de `aud`/`iss`/`exp`/firma en cada request (test).
- [ ] Desactivar revoca tokens y bloquea de inmediato (test).
- [ ] 403 en PII ajena para Custodio/Auditor (test).
- [ ] 403 en auto-desactivación y auto-cambio de rol (test).
- [ ] Solo Administrador crea Administradores (test).
- [ ] Sin endpoint de edición/borrado de `movimientos`.
- [ ] Precondiciones de estado en transacción (asignar/prestar) (test de concurrencia).
- [ ] Enlace de factura (Google Drive) validado (https, drive/docs.google.com) y expuesto solo a administrador y auditor; el acceso al archivo lo controla el permiso de compartir en Drive.
- [ ] CORS con orígenes explícitos; HTTPS forzado.
- [ ] Sin secretos en repo (`composer audit`, escaneo de secretos).

---

*Plan de Seguridad · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
