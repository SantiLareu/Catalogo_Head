---
name: develop-react-frontend
description: Desarrollar y revisar el frontend React/Vite de RealStep. Usar ante tareas sobre componentes, hooks de interfaz, reducers de selección, CSS, responsive, accesibilidad, navegación, UX, animaciones o comportamiento visual dentro de react-app/. Para investigaciones de rendimiento medibles, combinar con analyze-performance.
---

# Desarrollar el frontend React

## Preparación

1. Leer `AGENTS.md`.
2. Consultar las secciones relevantes de `PROJECT_CONTEXT.md`.
3. Inspeccionar el componente, hook, CSS y pruebas relacionados.
4. Revisar `react-app/src/main.jsx` antes de alterar el orden o alcance de estilos.

## Arquitectura

- Mantener componentes funcionales y la organización existente por responsabilidad.
- Extraer componentes o hooks sólo cuando reduzcan complejidad o duplicación real.
- Mantener lógica de presentación fuera de los contratos del dominio.
- Reutilizar selectores de `react-app/src/data/catalogSelectors.js`.
- Reutilizar hooks de foco, scroll lock, carrito y selección existentes.
- Usar reducers para transiciones de estado relacionadas y predecibles.
- No trasladar estado derivable a estados independientes sin necesidad.

## React y render

- Mantener dependencias de hooks completas y estables.
- Evitar estado duplicado y efectos usados para derivar valores sin necesidad.
- No introducir `useMemo`, `useCallback` o `memo` por costumbre.
- Delegar análisis y optimizaciones medibles a `analyze-performance`.

## Accesibilidad

- Usar elementos semánticos y controles nativos.
- Mantener nombre accesible, foco visible y navegación por teclado.
- Preservar `aria-expanded`, `aria-pressed`, `aria-live` y roles existentes.
- Mantener focus trap, bloqueo de scroll y retorno de foco en diálogos.
- No comunicar estado únicamente mediante color o movimiento.
- Verificar orden lógico y operabilidad en móvil.

## CSS y responsive

- Reutilizar las variables de `styles/variables.css`.
- Mantener CSS global organizado por componente y `responsive.css` al final.
- Conservar la estética editorial: alto contraste, fondos neutros y acento rojo.
- Evitar efectos decorativos ajenos al lenguaje existente.
- Evitar cambios de tamaño que produzcan layout shift durante hover o focus.
- Revisar como mínimo los breakpoints existentes de 980, 768, 680 y 480 píxeles.

## Movimiento

- Mantener animaciones breves, sutiles y funcionales.
- Usar los tokens de movimiento existentes.
- Respetar `prefers-reduced-motion` tanto en CSS como en APIs JavaScript.
- Usar desplazamiento instantáneo cuando el usuario solicita movimiento reducido.
- No retrasar interacción, foco, navegación ni desmontaje crítico por una animación.

## Verificación

Ejecutar, según el cambio:

```powershell
npm run test-react
npm run react:build
git diff --check
```

Realizar revisión manual cuando cambien layout o interacción: desktop y móvil,
teclado y foco, reduced motion, navegación por hash y cualquier drawer, modal o
lightbox afectado. Informar toda verificación manual no realizada.
