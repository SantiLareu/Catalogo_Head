---
name: design-future-backend
description: Diseñar o implementar de forma explícita el backend futuro de RealStep con Node.js, Express o Fastify, PostgreSQL, Prisma opcional, REST, autenticación, seguridad, transacciones y testing. Usar sólo cuando la tarea solicite arquitectura o código backend; no usar para modificar preventivamente el frontend ni asumir decisiones todavía abiertas.
---

# Diseñar el backend futuro

## Estado actual

El backend no existe en este repositorio. Node.js y PostgreSQL son la dirección
aprobada. Express, Fastify, Prisma, autenticación, autorización, proveedores y
esquema definitivo siguen sujetos a diseño.

No modificar el frontend sólo para anticipar este backend. No introducir
adaptadores, DTOs, clientes HTTP o capas vacías sin un caso de uso aprobado.

## Principios

- Preferir un monolito modular antes que microservicios.
- Mantener límites claros entre catálogo, pedidos, clientes, inventario y notificaciones.
- Tratar el servidor como autoridad del pedido.
- Tratar todo dato del navegador como no confiable.
- Persistir antes de notificar.
- Usar el correo como notificación, no como registro maestro.
- Diseñar migraciones y compatibilidad de forma explícita.

## API REST

- Definir recursos, estados y contratos antes de implementar endpoints.
- Versionar la API cuando exista un requisito de compatibilidad.
- Validar cuerpo, parámetros y autenticación en el límite.
- Usar códigos HTTP y errores consistentes.
- No exponer detalles internos, secretos ni trazas sensibles.
- Aplicar límites de tamaño, rate limiting y timeouts según el riesgo.

## Pedidos y transacciones

Dentro de una operación consistente:

1. Validar identidad y autorización.
2. Cargar productos y variantes vigentes.
3. Validar talles, disponibilidad y cantidades.
4. Recalcular precios y totales.
5. Crear el pedido y sus snapshots históricos.
6. Aplicar reservas o movimientos de stock si el modelo los requiere.
7. Confirmar la transacción.
8. Emitir la notificación después de persistir.

- Diseñar idempotencia para reintentos.
- Controlar concurrencia y doble envío.
- No confiar en `priceSnapshot` recibido como precio autoritativo.
- Definir estados del pedido y transiciones válidas.

## PostgreSQL y Prisma

- Diseñar constraints, índices, claves foráneas y transacciones desde el dominio.
- No depender sólo de validación de aplicación.
- Evaluar Prisma frente a las necesidades reales antes de adoptarlo.
- Generar migraciones revisables y reversibles.
- Evitar cambios destructivos de esquema sin migración y respaldo.

## Autenticación y seguridad

- Usar almacenamiento seguro de contraseñas si se implementan credenciales.
- Elegir sesiones o tokens según el modelo de clientes y amenazas.
- Implementar autorización por recurso, no sólo autenticación.
- Proteger secretos mediante configuración externa.
- Minimizar datos personales, logs y retención.
- Diseñar auditoría, recuperación, backups y borrado.
- Aplicar protección CSRF, CORS y cookies seguras según el mecanismo elegido.

## Testing

Cubrir validación, autenticación, autorización, idempotencia, transacciones,
rollback, concurrencia de stock, recálculo de precios, errores de proveedores,
persistencia antes de notificación, PostgreSQL y compatibilidad REST.

No usar mocks como única evidencia para invariantes de base de datos.

## Antes de tocar el frontend

Definir contrato API, despliegue, autenticación, errores, migración desde EmailJS
y `localStorage`, y compatibilidad temporal. Modificar el frontend sólo cuando
una tarea posterior autorice explícitamente integrar ese contrato.
