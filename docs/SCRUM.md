# Marco de trabajo Scrum

Documentación del desarrollo funcional de la **Aplicación Web de Trazabilidad Logística con DataMart**, alineada con el documento académico *Metodología de desarrollo de software Scrum*.

Scrum organizó iterativamente las funcionalidades de la aplicación web. El diseño interno del DataMart se documenta en [KIMBALL.md](./KIMBALL.md). Ambas metodologías forman parte de **una única solución tecnológica**.

---

## 1. Visión y Product Goal

Para el personal operativo y administrativo del área de operaciones de una empresa logística de Lima, la aplicación web centraliza la gestión y trazabilidad de las operaciones: clientes, envíos, estados, historial, incidencias, evidencias, reportes y consulta de información consolidada para el análisis.

**Product Goal.** Desarrollar una aplicación web que permita centralizar la gestión y trazabilidad de las operaciones logísticas, facilitando el registro de envíos, seguimiento de estados, gestión de incidencias, generación de reportes y consulta de información consolidada para el análisis de las operaciones.

A diferencia del registro manual en hojas de cálculo, el sistema autentica usuarios, valida la información capturada, mantiene el historial de estados y consolida las operaciones en un DataMart consultable desde el módulo Análisis de operaciones.

---

## 2. Cronograma general

| Etapa | Periodo |
|---|---|
| Inicio del proyecto | 10/07/2026 – 12/07/2026 |
| Planificación y estimación | 13/07/2026 – 17/07/2026 |
| Implementación iterativa | 18/07/2026 – 05/09/2026 |

El desarrollo se organizó en **cinco sprints** consecutivos de 10 días.

| Sprint | Periodo |
|---|---|
| Sprint 1 | 18/07/2026 – 27/07/2026 |
| Sprint 2 | 28/07/2026 – 06/08/2026 |
| Sprint 3 | 07/08/2026 – 16/08/2026 |
| Sprint 4 | 17/08/2026 – 26/08/2026 |
| Sprint 5 | 27/08/2026 – 05/09/2026 |

La integración funcional del componente analítico se realizó en el Sprint 5 (H.U.18).

---

## 3. Equipo Scrum

| Rol | Apellidos y nombres | Responsabilidad |
|---|---|---|
| Product Owner | Jorge Rudbel Salazar | Representar las necesidades de la empresa, priorizar funcionalidades y validar los incrementos |
| Scrum Master | Lopez Hoyos Albert Meliano | Facilitar Scrum, organizar las actividades de los sprints y hacer seguimiento del desarrollo |
| Developer | Lopez Hoyos Albert Meliano | Análisis, diseño, implementación, integración y pruebas |
| Developer | Huanachin Conislla Rony Danilo | Análisis, diseño, implementación, integración y pruebas |

Jorge Rudbel Salazar, en calidad de Gerente General, representó las necesidades de la empresa y participó en la priorización y validación de funcionalidades.

Debido al tamaño reducido del equipo, Lopez Hoyos Albert Meliano desempeñó simultáneamente los roles de Scrum Master y Developer.

---

## 4. Eventos y artefactos

| Evento | Aplicación en el proyecto |
|---|---|
| Sprint | Periodo en el que se desarrolló un conjunto determinado de funcionalidades |
| Sprint Planning | Estableció el Sprint Goal y seleccionó las historias del Sprint Backlog |
| Seguimiento del Sprint | Coordinó avance, pendientes y dificultades |
| Sprint Review | Revisó las funcionalidades desarrolladas en la iteración |
| Sprint Retrospective | Identificó dificultades y acciones de mejora |

Las coordinaciones de seguimiento fueron **breves** por el tamaño del equipo. No se generaron actas individuales de cada coordinación diaria. La evidencia documental se concentró en la **planificación y revisión** de cada sprint.

**Artefactos:** Product Backlog, Sprint Backlog e Incremento.

---

## 5. Product Backlog

El Product Backlog está formado por **18 requerimientos / 18 historias de usuario**. Total: **143 puntos de historia**.

Prioridad MoSCoW: **M** Must Have, **S** Should Have.

| Historia | Requerimiento | Nombre | Prioridad | Puntos |
|---|---|---|---|---|
| H.U.1 | RF01 Autenticación | Acceso al sistema | M | 5 |
| H.U.2 | RF02 Control de acceso | Control de acceso por roles | M | 5 |
| H.U.3 | RF03 Administración de usuarios | Administración de usuarios | M | 8 |
| H.U.4 | RF04 Gestión de clientes | Gestión de clientes | M | 8 |
| H.U.5 | RF05 Registro de envíos | Registro de envíos | M | 13 |
| H.U.6 | RF06 Consulta de envíos | Consulta de envíos | M | 8 |
| H.U.7 | RF07 Actualización de envíos | Actualización de envíos | S | 5 |
| H.U.8 | RF08 Alcance de registros | Alcance de registros | S | 5 |
| H.U.9 | RF09 Validación de información | Validación de información | M | 8 |
| H.U.10 | RF10 Actualización de estados | Actualización de estados | M | 8 |
| H.U.11 | RF11 Seguimiento y trazabilidad | Seguimiento y trazabilidad | M | 13 |
| H.U.12 | RF12 Gestión de evidencias | Gestión de evidencias | S | 5 |
| H.U.13 | RF13 Gestión de incidencias | Gestión de incidencias | M | 13 |
| H.U.14 | RF14 Dashboard operativo | Dashboard operativo | S | 8 |
| H.U.15 | RF15 Reportes operativos | Reportes operativos | S | 8 |
| H.U.16 | RF16 Exportación de información | Exportación de información | S | 5 |
| H.U.17 | RF17 Auditoría | Auditoría | S | 5 |
| H.U.18 | RF18 Análisis de operaciones | Análisis de operaciones | M | 13 |

No forman parte del Product Backlog original: fichas de investigación, separación preprueba/posprueba, ETL como historia independiente ni carga sintética. El ETL es una actividad técnica del componente analítico documentada en Kimball; la integración funcional se cubre con H.U.18.

---

## 6. Historias de usuario

Estructura: *Como [actor], quiero [funcionalidad], para [beneficio]*. Estimación en 5, 8 y 13 puntos.

### H.U.1 — Acceso al sistema (5)

> Como usuario de la aplicación, quiero iniciar sesión mediante mis credenciales para acceder de manera segura a las funcionalidades correspondientes a mi rol.

**Condición.** Cuenta activa y credenciales válidas. **Restricción.** Se rechaza el acceso con credenciales incorrectas o cuenta inactiva.

### H.U.2 — Control de acceso por roles (5)

> Como usuario autenticado, quiero acceder únicamente a las funcionalidades correspondientes a mi rol para mantener la seguridad y el control de las operaciones.

Roles: Administrador y Operador logístico. Las funcionalidades administrativas permanecen restringidas.

### H.U.3 — Administración de usuarios (8)

> Como administrador, quiero gestionar las cuentas de usuario para controlar quiénes pueden acceder a la aplicación.

Crear, editar, activar y desactivar cuentas.

### H.U.4 — Gestión de clientes (8)

> Como usuario autorizado, quiero registrar y consultar clientes para asociarlos con las operaciones de envío.

### H.U.5 — Registro de envíos (13)

> Como usuario autorizado, quiero registrar un envío para incorporar la operación al sistema de trazabilidad.

El alta persiste el envío, genera un código correlativo, deja el estado inicial y registra el primer movimiento en el historial. La captura de tiempos de registro (`hora_inicio_registro`, `hora_fin_registro`, `tiempo_registro_min`) forma parte de este proceso operativo.

### H.U.6 — Consulta de envíos (8)

> Como usuario autorizado, quiero buscar, filtrar y visualizar los envíos registrados para localizar una operación.

### H.U.7 — Actualización de envíos (5)

> Como usuario autorizado, quiero modificar información autorizada de una operación para mantenerla actualizada.

### H.U.8 — Alcance de registros (5)

> Como usuario autorizado, quiero visualizar los registros que me corresponden para respetar el alcance de mi trabajo.

Filtro operativo «todos / solo mis registros» en envíos, seguimiento e incidencias.

### H.U.9 — Validación de información (8)

> Como usuario autorizado, quiero que el sistema valide los datos ingresados antes de almacenarlos para reducir información incorrecta.

Los fallos de validación se rechazan (HTTP 400) y pueden persistirse en `errores_registro`.

### H.U.10 — Actualización de estados (8)

> Como usuario autorizado, quiero modificar el estado actual de un envío para reflejar su avance operativo.

Todo cambio se conserva en el historial.

### H.U.11 — Seguimiento y trazabilidad (13)

> Como usuario autorizado, quiero consultar el historial de un envío para conocer su evolución durante el proceso logístico.

Línea de tiempo de estados con fecha, hora y usuario.

### H.U.12 — Gestión de evidencias (5)

> Como usuario autorizado, quiero adjuntar evidencias relacionadas con las operaciones para documentar el proceso.

### H.U.13 — Gestión de incidencias (13)

> Como usuario autorizado, quiero registrar y consultar incidencias asociadas a los envíos para documentar eventos operativos.

Campos operativos: tipo, área, título, descripción y fuente principal, entre otros.

### H.U.14 — Dashboard operativo (8)

> Como usuario autorizado, quiero ver información resumida de las operaciones para disponer de una visión rápida del estado del área.

### H.U.15 — Reportes operativos (8)

> Como usuario autorizado, quiero generar consultas y reportes sobre la información almacenada.

### H.U.16 — Exportación de información (5)

> Como usuario autorizado, quiero exportar información en los formatos implementados (PDF / Excel) para su uso fuera de la aplicación.

Esta historia cubre la **exportación operativa** (reportes). No documenta exportaciones de instrumentos de investigación.

### H.U.17 — Auditoría (5)

> Como administrador, quiero mantener trazabilidad sobre las acciones relevantes realizadas dentro de la aplicación.

Tabla `auditoria` con datos anteriores y nuevos.

### H.U.18 — Análisis de operaciones (13)

> Como administrador, quiero consultar información consolidada de las operaciones logísticas para analizar su comportamiento.

**Condición.** Debe existir información operacional disponible para su procesamiento. **Restricción.** La actualización de la información analítica no debe duplicar operaciones ya procesadas.

Desde Scrum, H.U.18 es la integración funcional con el componente analítico: ejecución controlada del ETL, consulta de dimensiones y hechos, KPIs analíticos y bitácora. El modelo dimensional, el grano, las dimensiones y el ETL se documentan en Kimball.

---

## 7. Distribución por sprint

| Sprint | Historias | Puntos | Sprint Goal |
|---|---|---|---|
| 1 | H.U.1, H.U.2, H.U.3, H.U.4, H.U.17 | 31 | Establecer la infraestructura, seguridad, usuarios y gestión básica de clientes |
| 2 | H.U.5, H.U.6, H.U.7, H.U.8, H.U.9 | 39 | Implementar el registro y administración de los envíos |
| 3 | H.U.10, H.U.11, H.U.12, H.U.13 | 39 | Implementar trazabilidad, evidencias e incidencias |
| 4 | H.U.14, H.U.15, H.U.16 | 21 | Implementar dashboard, reportes y exportación |
| 5 | H.U.18 | 13 | Integrar funcionalmente el componente analítico y estabilizar la solución |

**Total: 143 puntos.**

---

## 8. Sprints

### Sprint 1 — Estructura base, seguridad, usuarios y clientes

**Objetivo.** Establecer la infraestructura inicial e implementar autenticación, autorización, administración de usuarios, gestión de clientes y auditoría.

**Backlog.** H.U.1, H.U.2, H.U.3, H.U.4, H.U.17 (31 puntos).

**Incremento.** Esquema de base de datos, autenticación JWT, control de acceso por rol, gestión de usuarios y clientes, auditoría.

### Sprint 2 — Gestión de envíos

**Objetivo.** Implementar el registro y administración de los envíos.

**Backlog.** H.U.5, H.U.6, H.U.7, H.U.8, H.U.9 (39 puntos).

**Incremento.** CRUD de envíos, validación, alcance de registros, códigos correlativos.

### Sprint 3 — Trazabilidad, evidencias e incidencias

**Objetivo.** Implementar el seguimiento de los envíos mediante estados e historial, incorporando incidencias y evidencias.

**Backlog.** H.U.10, H.U.11, H.U.12, H.U.13 (39 puntos).

**Incremento.** Cambio de estado, historial, pantalla de seguimiento, incidencias y evidencias.

### Sprint 4 — Dashboard y reportes operativos

**Objetivo.** Implementar dashboard, reportes y exportación.

**Backlog.** H.U.14, H.U.15, H.U.16 (21 puntos).

**Incremento.** Dashboard operativo, reportes y exportación PDF/Excel de información operativa.

### Sprint 5 — Integración analítica y estabilización

**Objetivo.** Integrar funcionalmente la aplicación web con el componente analítico y realizar las actividades finales de verificación y estabilización.

**Backlog.** H.U.18 — Análisis de operaciones (13 puntos).

| Actividad | Fechas |
|---|---|
| Sprint Planning | 27/08/2026 |
| Integración funcional del componente analítico | 28/08/2026 – 30/08/2026 |
| Interfaz de Análisis de operaciones | 31/08/2026 – 01/09/2026 |
| Pruebas funcionales e integración | 01/09/2026 – 02/09/2026 |
| Correcciones y estabilización | 03/09/2026 |
| Sprint Review final | 04/09/2026 |
| Sprint Retrospective y cierre | 05/09/2026 |

Scrum documenta únicamente la **integración funcional** del componente analítico. El diseño interno del DataMart corresponde a [KIMBALL.md](./KIMBALL.md).

---

## 9. Definition of Done

Una historia se consideró terminada cuando:

1. La funcionalidad cumplía el requerimiento y sus restricciones.
2. Incorporaba las validaciones correspondientes y mantenía la integridad de la información.
3. Estaba integrada con los componentes relacionados.
4. Permitía ejecutar los escenarios funcionales considerados sin errores que impidieran usar lo ya construido.

---

## 10. Pruebas en Scrum

Las pruebas utilizadas durante los sprints fueron **pruebas funcionales de caja negra**. Sirvieron como **mecanismo técnico de verificación** de los incrementos.

No constituyen un evento Scrum ni un artefacto obligatorio de Scrum. El detalle de las pruebas automatizadas actuales está en [PRUEBAS.md](./PRUEBAS.md).
