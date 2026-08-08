---
name: validate-release
description: Validar una entrega o release del catálogo RealStep. Usar al revisar cambios antes de publicar, preparar un build, comprobar integridad, detectar archivos inesperados, ejecutar pruebas pertinentes, evaluar riesgos o redactar el resumen final de una entrega. No autoriza commit, push, deploy ni firma.
---

# Validar una entrega

## Límites

- Validar no significa publicar.
- No hacer commit, push, deploy ni crear tags sin autorización expresa.
- No generar, reemplazar ni rotar claves.
- No ejecutar un build firmado sin autorización y acceso legítimo a la clave.
- No actualizar el baseline como parte automática del release.

## Inspección inicial

Ejecutar:

```powershell
git status --short --branch
git diff --check
git diff --stat
git diff
```

- Identificar todos los archivos modificados y no rastreados.
- Separar cambios esperados de cambios ajenos o inesperados.
- Detener la preparación si aparecen secretos, claves privadas o artefactos no autorizados.
- Verificar que no se hayan editado manualmente JSON generado o baseline.
- Verificar que los cambios correspondan al objetivo declarado.

## Matriz de validación

### Frontend

```powershell
npm run test-react
npm run react:build
```

Realizar revisión manual si cambia UI, navegación o interacción.

### Catálogo o importador

```powershell
npm run check-products
npm run compare-catalog
npm run test-importer
npm run test-react
npm run react:build
```

Confirmar que cualquier diferencia comercial esté explicada y aprobada.

### Integridad o publicación

```powershell
npm run test-integrity
```

Si se autorizó el build oficial:

```powershell
npm run react:build:signed
npm run integrity:verify
```

No exponer la clave privada ni su contenido.

## Evaluación de riesgos

Revisar compatibilidad hacia atrás, datos e IDs, carrito y checkout, responsive,
accesibilidad, reduced motion, artefactos generados, baseline, configuración
pública, firma, integridad y documentación afectada.

## Resumen final

Informar objetivo, archivos cambiados, comportamiento afectado, pruebas, tipo de
build, integridad, archivos inesperados, riesgos, pasos manuales pendientes y
confirmación de que no se hizo commit, push ni deploy.

No declarar “listo para publicar” si queda una validación pertinente pendiente.
