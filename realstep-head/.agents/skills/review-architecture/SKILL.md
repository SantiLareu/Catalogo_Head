---
name: review-architecture
description: Realizar revisiones consultivas de arquitectura, mantenibilidad y deuda técnica de RealStep. Usar para auditorías, refactors grandes, evaluación de responsabilidades, cohesión, acoplamiento, duplicación, dependencias, límites de subsistemas, contratos, invariantes, testabilidad, complejidad accidental o riesgos de evolución. Trabajar en modo de sólo lectura salvo autorización posterior explícita.
---

# Revisar arquitectura

## Límites

- Analizar por defecto; no implementar ni modificar archivos durante una auditoría.
- No considerar la revisión como autorización automática para refactorizar.
- No recomendar patrones por moda.
- No confundir archivos grandes con mala arquitectura automáticamente.
- No exigir separación en capas si no aporta valor verificable.
- No proponer microservicios.
- No recomendar backend, repositories, adapters o DTOs preventivos.
- No considerar deuda técnica una decisión intencional, documentada y funcional.

## Criterios

- Mapear responsabilidades, cohesión, acoplamiento, duplicación y dependencias.
- Revisar límites entre frontend, carrito, importador, integridad y backend futuro.
- Separar estado de dominio, estado derivado y estado puramente visual.
- Identificar contratos observables e invariantes antes de evaluar estructura.
- Evaluar testabilidad, complejidad accidental y riesgos de evolución.
- Distinguir para cada observación: problema actual, riesgo futuro o preferencia estilística.
- Clasificar hallazgos por impacto y urgencia.
- Proponer la corrección mínima antes de un refactor estructural.
- Indicar explícitamente qué puede esperar.

## Formato de la revisión

A. Mapa del subsistema.
B. Contratos observables.
C. Invariantes.
D. Hallazgos reales.
E. Riesgos.
F. Qué no conviene cambiar.
G. Opciones de solución.
H. Recomendación mínima.
I. Pruebas necesarias.
J. Orden de implementación.

Para cada hallazgo incluir:

- evidencia;
- impacto;
- probabilidad;
- severidad;
- esfuerzo;
- recomendación;
- si requiere acción ahora o puede esperar.

Respaldar conclusiones con rutas, contratos y pruebas existentes. Si luego se
autoriza implementar, activar también la Skill especializada del subsistema.
