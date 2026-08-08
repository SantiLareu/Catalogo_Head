# Instrucciones permanentes para Codex

## Alcance del repositorio

Este repositorio implementa el catálogo mayorista RealStep / HEAD.

La arquitectura actual comprende:

- un importador Node.js que transforma `catalog/products.xlsx`;
- un catálogo generado en `generated/catalog.json`;
- una aplicación React/Vite en `src/`;
- carrito persistido y reconciliado en el navegador;
- checkout transitorio mediante EmailJS;
- un sistema de build firmado e integridad.

No existe todavía un backend autoritativo, API, PostgreSQL ni Prisma.

Antes de realizar cambios, leer:

1. `PROJECT_CONTEXT.md`;
2. `README.md`;
3. la documentación específica del subsistema afectado;
4. el código y las pruebas relacionadas.

Usar `.agents/CODEX_CONTEXT.md` para seleccionar la Skill apropiada.

## Reglas generales

- Preservar la arquitectura existente salvo que la tarea autorice explícitamente un cambio arquitectónico.
- Comprobar el estado real del código antes de asumir que una funcionalidad existe.
- Mantener los cambios pequeños, cohesivos y limitados al objetivo solicitado.
- Priorizar soluciones simples, explícitas y fáciles de verificar.
- No duplicar lógica existente.
- Reutilizar componentes, hooks, reducers, servicios, selectores y utilidades cuando sea apropiado.
- Mantener los componentes pequeños y con una responsabilidad clara.
- Preservar compatibilidad hacia atrás con datos, identificadores y carritos existentes.
- No normalizar ni corregir silenciosamente identificadores legacy.
- Minimizar regresiones y agregar o actualizar pruebas cuando cambie un contrato observable.
- Preservar cambios ajenos presentes en el árbol de trabajo.
- No modificar archivos fuera del alcance de la tarea.
- No instalar, actualizar ni eliminar dependencias sin una justificación concreta y autorización.
- No hacer commit, push, deploy, publicación ni crear releases sin autorización expresa.
- No leer, copiar, mostrar ni registrar claves privadas, secretos o archivos `.env`.
- No modificar firma, licencia, ownership ni configuración legal sin autorización expresa.

## Simplicidad

- Cuando una solución sencilla y otra más compleja produzcan el mismo resultado observable para el usuario, preferir la solución sencilla.
- No introducir patrones, capas, factories, repositories, adapters, DTOs, eventos, contextos o abstracciones sin un beneficio concreto y demostrable.
- No diseñar para requisitos futuros todavía no aprobados.
- Evitar refactors preventivos sin un problema actual verificable.

## Nuevas abstracciones

Antes de crear una abstracción nueva:

1. Buscar si ya existe una solución equivalente en el repositorio.
2. Explicar por qué la solución existente no alcanza.
3. Identificar qué duplicación, acoplamiento o complejidad real elimina.
4. Comparar su costo de mantenimiento con una solución directa.
5. No crearla si solamente cambia de lugar la complejidad.

## Análisis previo a cambios grandes

Antes de modificar un subsistema relevante:

1. Identificar sus contratos observables.
2. Identificar invariantes del dominio.
3. Localizar archivos y dependencias afectadas.
4. Revisar pruebas relacionadas.
5. Enumerar riesgos de regresión.
6. Distinguir causa raíz de síntomas.
7. Proponer primero la corrección mínima.
8. Evitar escribir código hasta comprender el flujo completo.

## Rendimiento

- No optimizar por intuición.
- Medir o identificar primero el cuello de botella.
- No añadir memoización, lazy loading, virtualización o caché sin una razón verificable.
- Preservar claridad y mantenibilidad si la mejora de rendimiento es despreciable.
- Considerar imágenes, red, bundle, render y layout antes de asumir que React es el problema.

## Arquitectura

- Una revisión arquitectónica no autoriza automáticamente un refactor.
- Distinguir deuda técnica real de preferencias estilísticas.
- No recomendar cambios masivos si el sistema actual cumple correctamente su función.
- Priorizar cambios incrementales, reversibles y verificables.
- Separar claramente estado de dominio, estado derivado y estado puramente visual.

## Archivos de catálogo y artefactos

- Tratar `catalog/products.xlsx` como la única fuente manual del catálogo.
- No modificar Excel salvo que la tarea requiera explícitamente cambiar datos del catálogo.
- No editar manualmente `generated/catalog.json`.
- Regenerar `generated/catalog.json` únicamente mediante `npm run import-products`.
- No editar manualmente `tests/fixtures/catalog-baseline.json`.
- No ejecutar `npm run update-catalog-baseline` sin revisión consciente y aprobación del cambio comercial.
- No modificar archivos generados, manifests, firmas o `dist` salvo que el flujo solicitado lo requiera.
- Preservar el carácter determinista del importador.
- Preservar literalmente los IDs, incluidos espacios finales y valores legacy.
- No interpretar stock numérico como inventario cuantitativo mientras `stockIsAvailabilityOnly` sea `true`.

## Frontend

- Mantener React y Vite en la raíz del repositorio, junto a `scripts/`.
- Preservar la separación actual entre componentes, hooks, reducers, servicios, datos, configuración y estilos.
- Mantener la estética editorial y deportiva del catálogo: composición clara, alto contraste, base monocromática y acento rojo.
- Evitar efectos visuales genéricos, excesivos o inconsistentes con la identidad existente.
- Diseñar primero para accesibilidad y comportamiento responsive.
- Conservar HTML semántico, nombres accesibles, foco visible, navegación por teclado, focus traps y retorno de foco.
- Respetar `prefers-reduced-motion` en CSS y JavaScript.
- Mantener las animaciones sutiles, breves y no bloqueantes.
- No sacrificar claridad, accesibilidad o rendimiento por animaciones decorativas.
- Evitar renders innecesarios, pero no introducir memoización sin una razón verificable.
- Mantener estable la identidad de callbacks o valores contextuales cuando afecte renders o efectos.
- No usar datos del navegador como autoridad.
- No introducir `dangerouslySetInnerHTML` ni HTML sin sanitización.
- Mantener responsive el catálogo en desktop, tablet y móvil.

## Carrito y checkout

- Tratar las líneas persistidas como referencias, no como autoridad de nombres, precios, imágenes o totales.
- Resolver la información vigente desde el catálogo activo.
- Conservar líneas legacy e inválidas para su reconciliación; no eliminarlas silenciosamente.
- Bloquear checkout ante problemas de producto, variante, talle, disponibilidad o precio sin reconocer.
- Preservar `priceSnapshot` y el reconocimiento explícito de cambios de precio.
- No vaciar el carrito si el checkout falla o queda parcialmente completado.
- No asumir seguridad server-side en la reconciliación frontend.
- Mantener el aviso de que el pedido está sujeto a confirmación.
- No convertir el flujo en ecommerce con pago sin una tarea y diseño explícitos.

## Backend futuro

- No modificar el frontend sólo para “preparar” un backend inexistente.
- No introducir clientes API, capas de repositorio, DTOs o abstracciones anticipadas sin un caso de uso aprobado.
- Tratar Node.js y PostgreSQL como dirección aprobada, no como implementación existente.
- Tratar Express/Fastify, Prisma, autenticación, roles y esquema de datos como decisiones aún abiertas.
- Todo backend futuro deberá validar y recalcular productos, variantes, talles, disponibilidad, cantidades, precios y totales.
- Persistir el pedido antes de enviar notificaciones.
- Diseñar idempotencia, concurrencia, transacciones, autenticación, autorización y privacidad explícitamente.

## Verificación

Seleccionar verificaciones según el alcance:

- frontend, carrito o checkout: `npm run test-react`;
- catálogo o importador: `npm run check-products`, `npm run compare-catalog` y `npm run test-importer`;
- integridad o publicación: `npm run test-integrity`;
- comprobación local del frontend: `npm run react:build`;
- revisión de formato Git: `git diff --check`.

No ejecutar comandos que escriban catálogo, baseline, claves, firmas o publicaciones si la tarea no los autoriza.

El build firmado requiere autorización expresa y acceso legítimo a la clave privada:

`npm run react:build:signed`

Después de un build firmado autorizado, ejecutar:

`npm run integrity:verify`

Cuando una verificación pertinente no pueda ejecutarse, informarlo claramente.

## Entrega

Al finalizar una modificación, informar:

- archivos creados o modificados;
- comportamiento afectado;
- pruebas y builds ejecutados;
- verificaciones no ejecutadas;
- riesgos, supuestos o limitaciones restantes.

No afirmar que una prueba pasó si no fue ejecutada.
No afirmar que un release está listo sin revisar el diff y completar las verificaciones pertinentes.
