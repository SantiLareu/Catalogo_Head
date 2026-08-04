---
name: analyze-performance
description: Analizar y optimizar el rendimiento medible del catálogo RealStep. Usar sólo ante problemas de lentitud, renders, Context, cálculos derivados, imágenes, carga inicial, bundle, CSS, layout shift, animaciones, interacción móvil, red, caché, catálogo JSON, galerías, lightbox, Lighthouse o Core Web Vitals, o cuando la tarea solicite explícitamente optimización.
---

# Analizar rendimiento

## Límites

- Medir antes de optimizar y establecer una línea base reproducible.
- Identificar el cuello de botella real antes de cambiar código.
- Distinguir rendimiento de desarrollo y producción.
- No aplicar `useMemo`, `useCallback` o `memo` automáticamente.
- No introducir virtualización si el volumen actual no la justifica.
- No instalar librerías de rendimiento sin autorización.
- No sacrificar accesibilidad, claridad ni mantenibilidad por velocidad.
- Revertir o rechazar optimizaciones sin mejora objetiva.

## Áreas de inspección

- Revisar renders, dependencias de hooks, coste de Context, selectores y cálculos derivados.
- Revisar carga inicial, tamaño y composición del bundle y división de código.
- Revisar red, caché y tamaño o parseo de `catalog.json`.
- Revisar dimensiones, formatos y peso de imágenes antes de culpar al JavaScript.
- Evaluar lazy loading sólo cuando reduzca trabajo o transferencia relevante.
- Revisar CSS, fuentes, layout shift y propiedades animadas.
- No animar propiedades que provoquen layout innecesario.
- No aplicar `will-change` de forma global.
- Revisar interacción móvil, galerías, miniaturas, zoom y lightbox.
- Usar Lighthouse y Core Web Vitals cuando el entorno permita mediciones comparables.

## Flujo

1. Inspeccionar el flujo afectado y su entorno de ejecución.
2. Formular una hipótesis concreta y falsable.
3. Medir y registrar la línea base.
4. Aplicar el cambio mínimo que ataque el cuello de botella.
5. Repetir la medición bajo las mismas condiciones.
6. Comparar métricas y descartar ruido o diferencias no significativas.
7. Ejecutar pruebas funcionales y revisar accesibilidad.
8. Informar resultado, coste y riesgos.

## Verificación

Ejecutar sólo cuando corresponda:

```powershell
npm run react:build
npm run test-react
git diff --check
```

La entrega debe indicar:

- problema medido;
- métrica inicial;
- cambio realizado;
- métrica final;
- beneficio observado;
- coste o riesgo;
- verificaciones no realizadas.
