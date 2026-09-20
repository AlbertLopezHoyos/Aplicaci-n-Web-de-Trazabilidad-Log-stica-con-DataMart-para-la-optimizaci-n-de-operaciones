# Alineación del sistema con la investigación

**Tesis:** *Aplicación Web de Trazabilidad Logística con DataMart para la optimización de operaciones en una empresa logística, Lima 2026.*

| | |
|---|---|
| **Variable independiente** | Aplicación web de trazabilidad logística con DataMart |
| **Variable dependiente** | Optimización de operaciones logísticas |
| **Dimensiones** | 4 (eficiencia operativa, calidad de la información, control y seguimiento, gestión de la información operativa) |
| **Indicadores** | TPDRE, PDRE, PDEEA, PDIOIC |

---

## 1. Matriz de trazabilidad indicador → implementación

### Dimensión 1 — Eficiencia operativa

| Campo | Contenido |
|---|---|
| **Indicador** | TPDRE — Tiempo promedio diario de registro de envíos |
| **Fórmula** | `TPDRE = ΣTRE / NERD` |
| **Tabla/campo origen** | `envios.hora_inicio_registro`, `envios.hora_fin_registro`, `envios.tiempo_registro_min` |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/medicion`, `GET /api/observacion/ficha/1` |
| **Pantalla** | Fichas de observación (dim. 1) · Medición de investigación |
| **Regla de cálculo** | Por jornada: ΣTRE / NERD, usando todos los registros reales de esa fecha. El indicador del periodo es la media de los TPDRE diarios. Unidad: minutos. |

`tiempo_registro_min` se calcula en `calcularTiemposRegistro()` (`backend/src/services/envio.service.js`) a partir de la hora en que el frontend abre el formulario (`hora_inicio_registro`, enviada en el POST) y la hora de guardado en el servidor (`hora_fin_registro`). Los tres campos existían ya en el esquema; no se generan valores artificiales.

### Dimensión 2 — Calidad de la información logística

| Campo | Contenido |
|---|---|
| **Indicador** | PDRE — Porcentaje diario de registros con error |
| **Fórmula** | `PDRE = (RCE / TRD) × 100` |
| **Tabla/campo origen** | `envios.registro_correcto`, tabla `errores_registro` (`tipo_error`, `campo_afectado`) |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/ficha/2` |
| **Pantalla** | Fichas de observación (dim. 2) · Medición de investigación |
| **Regla de cálculo** | Por jornada: (RCE / TRD) × 100. RCE = envíos de esa fecha con `registro_correcto = 0` o al menos una fila en `errores_registro`. Un envío con varios errores cuenta una sola vez. |

Los errores no son subjetivos: provienen de las validaciones ya existentes de `express-validator`, que se persisten mediante `validateConRegistroErrores` en `errores_registro`, y de las correcciones marcadas por el operador.

### Dimensión 3 — Control y seguimiento de envíos

| Campo | Contenido |
|---|---|
| **Indicador** | PDEEA — Porcentaje diario de envíos con estado actualizado |
| **Fórmula** | `PDEEA = (EEA / TED) × 100` |
| **Tabla/campo origen** | `envios.id_estado_actual`, `historial_estados.id_estado`, `historial_estados.fecha_hora`, `estados_envio` |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/ficha/3` |
| **Pantalla** | Fichas de observación (dim. 3) · Medición de investigación |
| **Regla de cálculo** | Un envío tiene estado actualizado cuando `envios.id_estado_actual` coincide con el `id_estado` del **último** movimiento de su `historial_estados`. Un envío sin historial **no** se considera actualizado. El Sí/No se deriva de los datos, no se captura manualmente. |

Nota sobre la interpretación: al dar de alta un envío, `envio.service.js` escribe el hito inicial en
`historial_estados`, de modo que un envío recién registrado y nunca modificado sí cumple el
criterio. El indicador detecta desincronización entre el estado mostrado y la traza real, que es
exactamente lo que la dimensión "control y seguimiento" busca medir.

### Dimensión 4 — Gestión de la información operativa

| Campo | Contenido |
|---|---|
| **Indicador** | PDIOIC — Porcentaje diario de incidencias operativas con información completa |
| **Fórmula** | `PDIOIC = (NIOC / TID) × 100` |
| **Tabla/campo origen** | `incidencias.tipo`, `incidencias.area`, `incidencias.titulo`, `incidencias.descripcion`, `incidencias.fuente_principal` |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/ficha/4` |
| **Pantalla** | Incidencias · Fichas de observación (dim. 4) · Medición de investigación |
| **Regla de cálculo** | Por jornada según `DATE(i.fecha_reporte)`: (NIOC / TID) × 100. Si TID = 0 se muestra N/A (no 0%). NIOC = incidencias con los cinco campos obligatorios no vacíos. |

#### Criterio exacto de "incidencia completa"

Una incidencia se considera **completa** cuando todos estos campos de la tabla `incidencias` tienen valor no vacío (se descartan cadenas en blanco):

| Campo | Significado |
|---|---|
| `tipo` | Clasificación de la incidencia (error, retraso, daño, pérdida, observación, otro) |
| `area` | Área operativa responsable |
| `titulo` | Enunciado de la incidencia |
| `descripcion` | Detalle de lo ocurrido |
| `fuente_principal` | Fuente principal de la información |

El criterio está centralizado en `backend/src/utils/reglasIndicadores.js` (`esIncidenciaCompleta`) y la expresión SQL equivalente se **genera a partir de la misma constante** (`CAMPOS_INCIDENCIA_COMPLETA`) en `observacion.service.js`, de modo que backend, fichas y reportes no puedan divergir. La columna `incidencias.informacion_completa` se sigue guardando al crear/editar como caché de consulta, pero el indicador se recalcula siempre desde los campos.

La ficha de la Dimensión 4 agrupa por jornada (`DATE(i.fecha_reporte)`). Cada fila muestra Fecha, TID, NIOC, incidencias incompletas y PDIOIC. `incidencias.observacion` es opcional y **no** forma parte de PDIOIC.

| Columna de la ficha | Origen |
|---|---|
| Fecha | `incidencias.fecha_reporte` |
| Código de incidencia | `incidencias.codigo_incidencia` |
| Tipo de incidencia | `incidencias.tipo` |
| Área | `incidencias.area` |
| Código de envío | `envios.codigo_envio` |
| Estado de incidencia | `incidencias.estado_incidencia` |
| Título | `incidencias.titulo` |
| Descripción | `incidencias.descripcion` |
| Información completa (Sí/No) | Recalculado con la regla PDIOIC (cinco campos) |
| Fuente principal de información | `incidencias.fuente_principal` |
| Observación | `incidencias.observacion` (opcional; no entra en PDIOIC) |

---

## 2. Unidad de análisis y postest

- La unidad de análisis es la **jornada operativa**. Cada fila de ficha es un día (1–20 set 2026).
- Se leen **todos** los registros reales y válidos de esa fecha. No hay cantidad fija, ni `LIMIT 50`, ni sorteo.
- La **preprueba no forma parte del software**: no se muestra, no se calcula y no se compara.
- El módulo se limita a: **LEER → AGRUPAR POR JORNADA → CALCULAR → MOSTRAR → EXPORTAR**.
- El DataMart permanece separado: los indicadores filtran `origen_dato = 'REAL'` y excluyen `grupo_muestra = 'PREPRUEBA'` y los datos `SINTETICO`.

### Cómo se separan los datos

Columnas históricas en `envios` e `incidencias` (compatibilidad técnica; el módulo actual no depende de PREPRUEBA):

| Columna | Valores | Uso |
|---|---|---|
| `origen_dato` | `REAL` \| `SINTETICO` | Procedencia del registro |
| `grupo_muestra` | `PREPRUEBA` \| `POSPRUEBA` \| `NO_MUESTRA` | Clasificación histórica |

Reglas aplicadas:

1. Las fichas e indicadores usan `origen_dato = 'REAL' AND grupo_muestra <> 'PREPRUEBA'` en la ventana 1–20 set 2026.
2. `npm run db:seed-bulk` y `npm run db:seed` marcan todo lo que generan como `SINTETICO` / `NO_MUESTRA`.
3. PDIOIC agrupa por `DATE(i.fecha_reporte)`, no por la fecha de registro del envío.

---

## 3. Endpoints de observación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/observacion/indicadores` | Autenticado | TPDRE, PDRE, PDEEA, PDIOIC (media diaria del postest) |
| GET | `/api/observacion/medicion` | **Administrador** | Indicadores de las jornadas posteriores a la implementación |
| GET | `/api/observacion/ficha/:1-4` | Autenticado | Una fila por jornada de la dimensión indicada |
| GET | `/api/observacion/ficha/:1-4/export` | Autenticado | Payload de exportación a Excel (cabeceras + filas + indicadores) |
| GET | `/api/observacion/errores-registro` | Autenticado | Errores de validación registrados (insumo de PDRE) |
| POST | `/api/observacion/errores-registro` | Autenticado | Alta operativa de un error detectado (no forma parte del cálculo de fichas) |

---

## 4. Pantallas

| Pantalla | Ruta | Rol | Contenido |
|---|---|---|---|
| Fichas de evidencia | `/observacion` | Autenticado | Cuatro fichas diarias (TPDRE, PDRE, PDEEA, PDIOIC) y exportación a Excel. Solo lectura. |
| Medición de investigación | `/medicion` | **Administrador** | Indicadores de las jornadas posteriores a la implementación. Sin preprueba ni comparación pre-post. |
| DataMart | `/datamart` | **Administrador** | KPIs analíticos, esquema estrella, ETL y bitácora |

Los indicadores de investigación **no** se mezclan con los KPI analíticos del DataMart (OTIF, lead time, tasa de incidencias): viven en pantallas distintas y se calculan sobre conjuntos distintos.
