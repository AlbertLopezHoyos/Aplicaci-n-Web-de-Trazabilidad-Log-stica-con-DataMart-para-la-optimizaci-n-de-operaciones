# Marco de trabajo Scrum

> **Advertencia metodológica.** Este documento **no reconstruye un historial de ceremonias**. Las
> historias de usuario y los criterios de aceptación se derivan de funcionalidades que existen y son
> verificables en el código del repositorio. Todo dato que no puede demostrarse desde el repositorio
> (nombres, fechas, duración de sprints, actas de reunión) aparece como **[PENDIENTE DE CONFIRMAR]**
> y debe completarlo el investigador con información real.

---

## 1. Visión del producto

Para el **personal operativo y administrativo de una empresa logística de Lima**, que necesita
registrar envíos, mantener su trazabilidad y disponer de información confiable para decidir, la
**Aplicación Web de Trazabilidad Logística con DataMart** es un sistema web que centraliza el
registro y seguimiento de envíos, controla la calidad de la información capturada y consolida las
operaciones en un modelo dimensional explotable con Power BI. A diferencia del registro manual en
hojas de cálculo, el sistema reduce el tiempo de registro, hace medible el error, mantiene el
estado del envío sincronizado con su historial y exige información completa en las incidencias.

## 2. Roles del equipo Scrum

| Rol | Responsabilidad | Asignado a |
|---|---|---|
| Product Owner | Prioriza el Product Backlog y valida los entregables | **[PENDIENTE DE CONFIRMAR]** |
| Scrum Master | Facilita el proceso y remueve impedimentos | **[PENDIENTE DE CONFIRMAR]** |
| Equipo de desarrollo | Construye el incremento | **[PENDIENTE DE CONFIRMAR]** |
| Stakeholders | Área de operaciones de la empresa | **[PENDIENTE DE CONFIRMAR]** |

## 3. Product Backlog

Prioridad: **A** alta, **M** media, **B** baja. La columna *Evidencia* indica dónde se comprueba la
funcionalidad en el repositorio.

| ID | Historia de usuario | Prioridad | Evidencia |
|---|---|---|---|
| HU-01 | Autenticación con usuario y contraseña | A | `routes/auth.routes.js`, `pages/LoginPage.jsx` |
| HU-02 | Control de acceso por rol (Administrador / Operador logístico) | A | `middlewares/auth.middleware.js`, `routes/AppRoutes.jsx` |
| HU-03 | Gestión de clientes | A | `routes/catalogo.routes.js`, `pages/ClientesPage.jsx` |
| HU-04 | Registro de envíos con medición del tiempo de registro | A | `services/envio.service.js`, `pages/EnvioFormPage.jsx` |
| HU-05 | Consulta y filtrado paginado de envíos | A | `repositories/envio.repository.js`, `pages/EnviosPage.jsx` |
| HU-06 | Edición y baja lógica de envíos | M | `services/envio.service.js` |
| HU-07 | Cambio de estado con registro en historial | A | `services/envio.service.js`, `models/HistorialEstado.js` |
| HU-08 | Seguimiento del envío y línea de tiempo de estados | A | `pages/SeguimientoPage.jsx` |
| HU-09 | Carga de evidencias asociadas al envío | M | `routes/evidencia.routes.js`, `middlewares/upload.middleware.js` |
| HU-10 | Registro de incidencias con información completa | A | `services/incidencia.service.js`, `utils/reglasIndicadores.js` |
| HU-11 | Registro automático de errores de validación | A | `middlewares/validate.middleware.js`, `services/errorRegistro.service.js` |
| HU-12 | Dashboard operativo con KPIs y gráficos | M | `pages/DashboardPage.jsx`, `services/dashboard.service.js` |
| HU-13 | Reportes operativos con exportación a Excel y PDF | M | `services/reporte.service.js`, `pages/ReportesPage.jsx` |
| HU-14 | Fichas de observación por dimensión con exportación | A | `services/observacion.service.js`, `pages/ObservacionPage.jsx` |
| HU-15 | Separación entre muestra de investigación y datos sintéticos | A | `07_muestra_investigacion.sql`, `marcar-muestra.js` |
| HU-16 | Pantalla de medición de investigación (preprueba/posprueba) | A | `pages/MedicionPage.jsx`, `GET /api/observacion/medicion` |
| HU-17 | Carga masiva de datos sintéticos para pruebas del DataMart | M | `database/seeders/seed-bulk.js` |
| HU-18 | ETL idempotente hacia el esquema estrella | A | `datamart/etl.service.js` |
| HU-19 | Bitácora de ejecuciones del ETL | M | tabla `etl_ejecuciones`, `GET /api/datamart/etl/ejecuciones` |
| HU-20 | Consultas analíticas del DataMart (OTIF, lead time, incidencias) | M | `GET /api/datamart/analytics` |
| HU-21 | Explotación del DataMart desde Power BI | M | `database/scripts/export-powerbi-csv.js`, `setup-powerbi-user.js` |
| HU-22 | Auditoría de operaciones sobre datos sensibles | B | `models/Auditoria.js` |
| HU-23 | Modo demostración sin backend | B | `services/mockData.js`, `VITE_DEMO_MODE` |

## 4. Historias de usuario con criterios de aceptación

Se detallan las historias directamente vinculadas a los indicadores de la investigación.

### HU-04 — Registro de envíos con medición del tiempo de registro

> Como **operador logístico** quiero **registrar un envío capturando el tiempo que me toma hacerlo**
> para que **la organización pueda medir la eficiencia del proceso de registro (TPRE)**.

**Criterios de aceptación**

1. El formulario marca la hora de inicio al abrirse y la envía en el POST.
2. Al guardar, el sistema calcula y persiste `hora_inicio_registro`, `hora_fin_registro` y
   `tiempo_registro_min`.
3. El envío recibe un código correlativo único con formato `GLS-AAAA-NNNNN`.
4. El envío queda en el estado inicial configurado y se crea su primer movimiento en el historial.
5. Los campos numéricos inválidos (peso o total negativos) son rechazados con HTTP 400.
6. La operación queda registrada en la tabla de auditoría.

### HU-10 — Registro de incidencias con información completa

> Como **operador logístico** quiero **registrar incidencias indicando su tipo, área, fuente,
> título y descripción** para que **la organización pueda medir la completitud de la información
> operativa (PIOIC)**.

**Criterios de aceptación**

1. La incidencia se asocia obligatoriamente a un envío existente.
2. Recibe un código único con formato `INC-AAAA-NNNNN`.
3. Al guardar, el sistema evalúa si la información está completa según los cinco campos
   obligatorios definidos en `reglasIndicadores.js`.
4. La interfaz indica al usuario qué campos determinan la completitud.
5. El indicador PIOIC se calcula sobre el total de incidencias registradas, no sobre los envíos.

### HU-11 — Registro automático de errores de validación

> Como **administrador** quiero **que el sistema registre los errores detectados al capturar
> información** para que **pueda medir objetivamente la calidad del registro (PER)**.

**Criterios de aceptación**

1. Todo fallo de validación en el alta de envíos genera una fila en `errores_registro` con tipo de
   error y campo afectado.
2. Un envío con varios errores cuenta una sola vez en el indicador PER.
3. El indicador nunca supera el 100 %.
4. Los errores son consultables mediante `GET /api/observacion/errores-registro`.

### HU-07 — Cambio de estado con registro en historial

> Como **operador logístico** quiero **actualizar el estado del envío dejando traza del cambio**
> para que **la organización pueda medir el control y seguimiento (PEEA)**.

**Criterios de aceptación**

1. Cada cambio de estado crea un movimiento en `historial_estados` con fecha, hora y usuario.
2. El campo `envios.id_estado_actual` queda sincronizado con el último movimiento.
3. Un envío se considera "con estado actualizado" cuando ambos coinciden.
4. Un envío sin historial no se contabiliza como actualizado.

### HU-15 — Separación entre muestra de investigación y datos sintéticos

> Como **investigador** quiero **distinguir los registros reales de la muestra de los datos
> sintéticos de prueba** para que **los indicadores de la tesis no se contaminen**.

**Criterios de aceptación**

1. `envios` e `incidencias` tienen las columnas `origen_dato` y `grupo_muestra`.
2. Los seeders marcan todo lo que generan como `SINTETICO` / `NO_MUESTRA`.
3. Los indicadores de investigación filtran `origen_dato = 'REAL'` y grupos de muestra.
4. Existe una herramienta para etiquetar registros existentes que **no** genera datos y rechaza
   incluir registros sintéticos en la muestra.
5. La migración no elimina ningún registro previo y es reejecutable.

### HU-18 — ETL idempotente hacia el esquema estrella

> Como **administrador** quiero **ejecutar el ETL cuantas veces sea necesario** para que **el
> DataMart se mantenga actualizado sin duplicar hechos**.

**Criterios de aceptación**

1. La primera ejecución carga dimensiones y hechos.
2. Una segunda ejecución no inserta hechos nuevos y actualiza las métricas existentes.
3. Existe una restricción de unicidad por `id_envio` en la tabla de hechos.
4. Un fallo revierte toda la transacción.
5. Cada corrida queda registrada con estado y conteos.

## 5. Agrupación propuesta en sprints

> Agrupación **propuesta** por afinidad funcional y dependencias técnicas, elaborada a partir del
> alcance real del sistema. La duración, las fechas y la asignación de cada sprint son
> **[PENDIENTE DE CONFIRMAR]**.

| Sprint | Objetivo | Historias | Entregable |
|---|---|---|---|
| 1 | Base técnica y seguridad | HU-01, HU-02, HU-22 | Esquema de base de datos, autenticación JWT y control de acceso por rol operativos |
| 2 | Núcleo operativo de envíos | HU-03, HU-04, HU-05, HU-06 | Gestión de clientes y CRUD de envíos con captura de tiempos de registro |
| 3 | Trazabilidad y evidencias | HU-07, HU-08, HU-09 | Cambios de estado con historial, pantalla de seguimiento y carga de evidencias |
| 4 | Calidad e incidencias | HU-10, HU-11, HU-12 | Registro de incidencias con evaluación de completitud, captura de errores y dashboard |
| 5 | Instrumentación de la investigación | HU-13, HU-14, HU-15, HU-16 | Reportes, fichas de observación, separación de la muestra y pantalla de medición |
| 6 | DataMart y BI | HU-17, HU-18, HU-19, HU-20, HU-21 | Esquema estrella cargado, ETL idempotente con bitácora y explotación en Power BI |

| Dato del sprint | Valor |
|---|---|
| Duración de cada sprint | **[PENDIENTE DE CONFIRMAR]** |
| Fecha de inicio del Sprint 1 | **[PENDIENTE DE CONFIRMAR]** |
| Fecha de cierre del Sprint 6 | **[PENDIENTE DE CONFIRMAR]** |
| Participantes en cada ceremonia | **[PENDIENTE DE CONFIRMAR]** |
| Actas de sprint review y retrospectiva | **[PENDIENTE DE CONFIRMAR]** |

## 6. Definition of Done

Una historia se considera terminada cuando cumple **todos** estos criterios:

1. La funcionalidad satisface todos sus criterios de aceptación.
2. El endpoint respeta el contrato de respuesta `{ success, message, data }`.
3. Los datos de entrada están validados y los errores devuelven el código HTTP correspondiente.
4. Las rutas sensibles exigen autenticación y el rol adecuado.
5. Los cambios de esquema tienen su script SQL reejecutable y no destruyen datos existentes.
6. Si la historia toca un indicador de la investigación, la regla de cálculo está centralizada en
   `reglasIndicadores.js` y cubierta por pruebas automatizadas.
7. `npm test` pasa en el backend y `npm run build` compila el frontend sin errores.
8. La documentación afectada (`docs/`, `README.md`) queda actualizada.
9. El código está versionado en el repositorio.

## 7. Entregables por sprint

| Sprint | Entregables verificables en el repositorio |
|---|---|
| 1 | `database/scripts/01_schema_completo.sql`, `src/config/`, `src/middlewares/auth.middleware.js`, `models/`, `pages/LoginPage.jsx` |
| 2 | `services/envio.service.js`, `repositories/envio.repository.js`, `pages/EnviosPage.jsx`, `pages/EnvioFormPage.jsx`, `pages/ClientesPage.jsx` |
| 3 | `models/HistorialEstado.js`, `routes/evidencia.routes.js`, `middlewares/upload.middleware.js`, `pages/SeguimientoPage.jsx` |
| 4 | `services/incidencia.service.js`, `services/errorRegistro.service.js`, `services/dashboard.service.js`, `pages/IncidenciasPage.jsx`, `pages/DashboardPage.jsx` |
| 5 | `services/reporte.service.js`, `services/observacion.service.js`, `utils/reglasIndicadores.js`, `07_muestra_investigacion.sql`, `pages/ObservacionPage.jsx`, `pages/MedicionPage.jsx` |
| 6 | `database/seeders/seed-bulk.js`, `datamart/etl.service.js`, `datamart/star-schema.design.js`, `database/scripts/export-powerbi-csv.js`, `pages/DataMartPage.jsx` |

> **[PENDIENTE DE CONFIRMAR]** Evidencias fotográficas o documentales de las ceremonias
> (planificación, revisión, retrospectiva) si se realizaron.
