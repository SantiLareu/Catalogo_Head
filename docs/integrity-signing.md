# Firma e integridad de publicaciones

## Alcance

La firma Ed25519 aporta evidencia verificable de que una publicación fue
emitida con la clave privada bajo custodia de Santiago Lareu y que sus archivos
protegidos no cambiaron después de firmarse. El manifiesto relaciona la
publicación con:

- el motor `santiago-lareu-catalog-engine`;
- el proyecto `realstep-head-catalog`;
- la licencia permanente `SLCE-LIC-2026-0001`;
- Santiago Lareu como titular y desarrollador;
- RealStep como licenciatario de esta instalación;
- la versión, fecha UTC y commit cuando está disponible.

La firma no impide copiar o eliminar código frontend. Tampoco implementa DRM,
bloqueo por dominio, validación remota, telemetría ni desactivación.

La autenticidad requiere conocer el fingerprint legítimo por un canal
independiente de la propia publicación. Antes de producción debe decidirse
dónde publicar ese ancla de confianza (por ejemplo, documentación contractual
o un registro controlado por el titular). Una copia que reemplace código,
manifiesto, firma y clave pública puede simular su propia identidad, pero no
puede reproducir el fingerprint legítimo sin la clave privada original.

## Custodia de la clave privada

La clave privada nunca debe entrar en `src`, `public`, `dist`, Git, variables
`VITE_*`, gestores de frontend ni archivos JSON públicos. El valor por defecto
es `.signing/ed25519-private.pem`, ruta ignorada por Git. Para producción es
preferible conservarla fuera del repositorio, con backup cifrado y acceso
restringido.

Los scripts aceptan:

- `SIGNING_PRIVATE_KEY_PATH`: ruta a una clave privada PKCS#8;
- `SIGNING_PRIVATE_KEY_PEM`: contenido PEM entregado por un entorno seguro;
- `SIGNING_PUBLIC_KEY_PATH`: ruta alternativa para importar o exportar la
  clave pública;
- `BUILD_COMMIT`: identificador opcional cuando Git no está disponible.

No guardar `SIGNING_PRIVATE_KEY_PEM` en archivos versionados ni imprimir su
contenido.

## Generación inicial

La generación nunca ocurre durante un build común y requiere confirmación:

```powershell
npm run generate-signing-keys -- --confirm
```

Esto guarda la privada en `.signing/` y exporta únicamente la pública a
`public/signing-public-key.pem`. Si ya existe cualquiera de las
claves, el comando se detiene.

Para rotar deliberadamente:

```powershell
npm run generate-signing-keys -- --confirm --force
```

Antes de rotar, archivar de forma segura la clave pública anterior y registrar
qué publicaciones fueron emitidas con ella.

## Build firmado

Con la ruta por defecto:

```powershell
npm run react:build:signed
```

Con una clave privada externa:

```powershell
$env:SIGNING_PRIVATE_KEY_PATH='D:\seguro\realstep-signing-private.pem'
npm run react:build:signed
Remove-Item Env:SIGNING_PRIVATE_KEY_PATH
```

El comando valida e importa primero la clave privada Ed25519. Si la clave falta
o es inválida, el build ni siquiera comienza. Luego genera el build en un
directorio temporal del mismo filesystem, prepara allí la publicación, deriva
y escribe la clave pública, genera el manifiesto, firma su representación
canónica y verifica íntegramente la copia. Solo después de esa verificación
reemplaza `dist`; si cualquier etapa falla, elimina el staging y conserva el
`dist` anterior sin artefactos parciales. Nunca genera claves.
Puede ejecutarse tanto mediante `npm run react:build:signed` como invocando
`node scripts/build-signed.mjs`; en Windows, esta segunda forma resuelve
explícitamente el shim `npm.cmd`.

El reemplazo intenta primero renombrar directorios dentro del mismo filesystem.
En Windows con carpetas sincronizadas que bloquean temporalmente esos renames,
usa una copia de reemplazo con backup y restauración ante error. Esa ruta es
recuperable, pero no ofrece la misma atomicidad estricta de un rename exitoso.
El mensaje final informa `Publicación: atomic-rename` cuando el staging se
promovió mediante rename, o `Publicación: copy-fallback` si fue necesario
activar la compatibilidad por copia. En un filesystem local sin bloqueos, el
resultado esperado y principal es `atomic-rename`; el fallback se conserva
únicamente para entornos Windows que rechacen la promoción con `EPERM`,
`EBUSY` o `EACCES`.

También pueden ejecutarse las etapas por separado:

```powershell
npm run react:build
npm run integrity:manifest
npm run integrity:sign
npm run integrity:verify
```

## Verificación

```powershell
npm run integrity:verify
```

Un resultado inválido termina con código distinto de cero y distingue:

- manifiesto inválido;
- firma inválida;
- clave pública inválida;
- archivo inexistente;
- hash incorrecto.

La firma pública usa Base64 estándar como codificación de transporte. El
verificador exige sintaxis y padding canónicos, prohíbe espacios internos y
confirma que el resultado tenga exactamente 64 bytes, longitud de una firma
Ed25519.

El navegador realiza la misma comprobación de manera silenciosa y no
bloqueante. Expone uno de estos estados en `data-integrity-status` del nodo
raíz: `verified`, `invalid`, `unavailable` o `error`. Nunca bloquea el catálogo.

## Archivos protegidos

El build firmado recorre recursivamente `publicationRoot` y protege todos los
archivos regulares: HTML, JavaScript, CSS, JSON, imágenes, fuentes, `_headers`,
`NOTICE`, catálogo, ownership, chunks presentes y cualquier asset futuro. No
depende del contenido de `index.html` ni de nombres propios de Vite.

Se excluyen únicamente `integrity-manifest.json` e
`integrity-manifest.sig`, porque incluirlos produciría una dependencia
circular. `signing-public-key.pem` sí forma parte de los archivos protegidos,
además de estar relacionada con el fingerprint firmado.

## Contrato de canonicalización v1

`formatVersion: 1` firma una canonicalización interna y determinista del
manifiesto:

- las claves de objetos se ordenan lexicográficamente;
- los arrays conservan su orden;
- no se agregan espacios;
- los bytes firmados usan UTF-8;
- solo se admiten valores JSON válidos, números finitos, arrays completos y
  objetos planos.

Esta canonicalización forma parte del contrato del formato v1. Cualquier
cambio futuro requiere una nueva versión del formato o compatibilidad
explícita con publicaciones anteriores.

La canonicalización del formato v1 es una convención interna del proyecto y no
debe presentarse como una implementación de RFC 8785/JCS. No se implementa
formalmente el estándar JSON Canonicalization Scheme.

El campo `commit` debe ser `null` o un identificador de entre 7 y 128
caracteres compuesto únicamente por letras ASCII, números, punto, guion y
guion bajo. No se restringe a SHA-1. `BUILD_COMMIT` tiene prioridad; en su
ausencia se intenta obtener el commit desde la raíz Git real y la falta de Git
no impide firmar.

`publicKeyFingerprint` usa exactamente `SHA256:<Base64URL sin padding>` y debe
representar los 32 bytes de un SHA-256.

## Seguridad de rutas

Cada ruta protegida se valida en formato relativo con separadores `/`, se
resuelve contra `publicationRoot` y se comprueba mediante `path.relative` que
permanezca dentro de esa raíz. También se comparan las rutas obtenidas mediante
`realpath`, por lo que un enlace simbólico o junction existente que apunte
fuera de la publicación es rechazado. Esta comprobación ocurre tanto al
calcular hashes como al verificarlos.

## Pérdida o compromiso

Si la clave privada se pierde, no puede recuperarse: conservar las
publicaciones existentes y su clave pública como evidencia histórica, generar
una identidad nueva y documentar formalmente la rotación.

Si la clave se compromete, dejar de firmar inmediatamente, retirar su acceso,
registrar el incidente, generar un nuevo par en un entorno seguro, volver a
emitir las publicaciones válidas y comunicar qué fingerprint queda revocado.
Sin un servicio remoto, la revocación no puede aplicarse automáticamente a
copias ya distribuidas.

## Nuevos licenciatarios

El motor criptográfico no contiene reglas específicas de RealStep.
`companyConfig.license` es la fuente única de verdad para el identificador
permanente y el licenciatario. `scripts/integrity/publicationConfig.mjs`
consume esos valores. `companyConfig.software` es la fuente única de verdad
para `softwareId`, separado de ownership y licencia. Para otra
instalación deben definirse una licencia nueva, su licenciatario, branding y
firma correspondiente, manteniendo el mismo `softwareId` y motor. El
identificador `SLCE-LIC-2026-0001` nunca debe reutilizarse ni cambiarse para
esta licencia.
