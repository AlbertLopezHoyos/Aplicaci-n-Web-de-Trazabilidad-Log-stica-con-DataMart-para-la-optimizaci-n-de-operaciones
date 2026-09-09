# Alineación del sistema con la investigación

**Tesis:** *Aplicación Web de Trazabilidad Logística con DataMart para la optimización de operaciones en una empresa logística, Lima 2026.*

| | |
|---|---|
| **Variable independiente** | Aplicación web de trazabilidad logística con DataMart |
| **Variable dependiente** | Optimización de operaciones logísticas |
| **Dimensiones** | 4 (eficiencia operativa, calidad de la información, control y seguimiento, gestión de la información operativa) |
| **Indicadores** | TPRE, PER, PEEA, PIOIC |

---

## 1. Matriz de trazabilidad indicador → implementación

### Dimensión 1 — Eficiencia operativa

| Campo | Contenido |
|---|---|
| **Indicador** | TPRE — Tiempo promedio de registro de envíos |
| **Fórmula** | `TPRE = ΣTRE / NER` |
| **Tabla/campo origen** | `envios.hora_inicio_registro`, `envios.hora_fin_registro`, `envios.tiempo_registro_min` |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/medicion`, `GET /api/observacion/ficha/1` |
| **Pantalla** | Fichas de observación (dim. 1) · Medición de investigación |
| **Regla de cálculo** | Suma de `tiempo_registro_min` de los envíos evaluados dividida entre la cantidad de envíos con tiempo registrado (NER). Se excluyen los envíos sin tiempo capturado. Unidad: minutos. |

`tiempo_registro_min` se calcula en `calcularTiemposRegistro()` (`backend/src/services/envio.service.js`) a partir de la hora en que el frontend abre el formulario (`hora_inicio_registro`, enviada en el POST) y la hora de guardado en el servidor (`hora_fin_registro`). Los tres campos existían ya en el esquema; no se generan valores artificiales.

### Dimensión 2 — Calidad de la información logística

| Campo | Contenido |
|---|---|
| **Indicador** | PER — Porcentaje de errores en los registros |
| **Fórmula** | `PER = (RCE / TREg) × 100` |
| **Tabla/campo origen** | `envios.registro_correcto`, tabla `errores_registro` (`tipo_error`, `campo_afectado`) |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/ficha/2` |
| **Pantalla** | Fichas de observación (dim. 2) · Medición de investigación |
| **Regla de cálculo** | RCE = envíos evaluados que cumplen al menos una condición: `registro_correcto = 0`, o existe al menos una fila en `errores_registro` referida a ese envío. **Un envío con varios errores cuenta una sola vez.** TREg = total de envíos evaluados. |

Los errores no son subjetivos: provienen de las validaciones ya existentes de `express-validator`, que se persisten mediante `validateConRegistroErrores` en `errores_registro`, y de las correcciones marcadas por el operador.

### Dimensión 3 — Control y seguimiento de envíos

| Campo | Contenido |
|---|---|
| **Indicador** | PEEA — Porcentaje de envíos con estado actualizado |
| **Fórmula** | `PEEA = (EEA / TEE) × 100` |
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
| **Indicador** | PIOIC — Porcentaje de incidencias operativas con información completa |
| **Fórmula** | `PIOIC = (NIOC / NTIR) × 100` |
| **Tabla/campo origen** | `incidencias.tipo`, `incidencias.area`, `incidencias.titulo`, `incidencias.descripcion`, `incidencias.fuente_principal` |
| **Endpoint** | `GET /api/observacion/indicadores`, `GET /api/observacion/ficha/4` |
| **Pantalla** | Incidencias · Fichas de observación (dim. 4) · Medición de investigación |
| **Regla de cálculo** | NTIR = **incidencias registradas** en los envíos seleccionados (no los 50 envíos). NIOC = incidencias en las que los cinco campos obligatorios tienen contenido no vacío. |

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

---

## 2. Preprueba y posprueba

- **50 registros** de preprueba y **50 registros** de posprueba, **diferentes entre sí**.
- Muestra total: **100 registros**. **No son muestras pareadas**; se reportan por separado y no se calcula diferencia por pares.
- Los periodos de observación están declarados en `reglasIndicadores.js` (Anexo 2: 1–31 ago 2026; Anexo 3: 1–20 set 2026).
- El volumen analítico del DataMart se mantiene separado de la muestra: los indicadores de investigación filtran `origen_dato = 'REAL'` y `grupo_muestra`.

### Cómo se separan los datos

Columnas añadidas por la migración `backend/database/scripts/07_muestra_investigacion.sql` en `envios` e `incidencias`:

| Columna | Valores | Uso |
|---|---|---|
| `origen_dato` | `REAL` \| `SINTETICO` | Procedencia del registro |
| `grupo_muestra` | `PREPRUEBA` \| `POSPRUEBA` \| `NO_MUESTRA` | Pertenencia a la muestra estadística |

Reglas aplicadas:

1. Los indicadores de investigación filtran siempre `origen_dato = 'REAL' AND grupo_muestra IN ('PREPRUEBA','POSPRUEBA')`.
2. `npm run db:seed-bulk` y `npm run db:seed` marcan todo lo que generan como `SINTETICO` / `NO_MUESTRA`.
3. Las incidencias heredan la clasificación del envío al que pertenecen.
4. `GET /api/observacion/indicadores?alcance=TODOS` permite ver el conjunto operativo completo. **Ese modo no debe usarse para el contraste de hipótesis.**

### Marcado de la muestra

```bash
cd backend
npm run db:muestra -- --estado                                        # ver distribución actual
npm run db:muestra -- --grupo=PREPRUEBA --desde=AAAA-MM-DD --hasta=AAAA-MM-DD   # simulación
npm run db:muestra -- --grupo=PREPRUEBA --desde=AAAA-MM-DD --hasta=AAAA-MM-DD --aplicar
npm run db:muestra -- --grupo=POSPRUEBA --codigos=GLS-2026-00120,GLS-2026-00121 --aplicar
```

El script **no genera registros**: solo etiqueta envíos ya existentes y rechaza intentos de incluir en la muestra registros que no sean `REAL` o que caigan fuera de la ventana del instrumento.

---

## 3. Endpoints de observación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/observacion/indicadores` | Autenticado | TPRE, PER, PEEA, PIOIC con numeradores y denominadores. Parámetros `alcance` (`MUESTRA` por defecto, `TODOS`) y `grupo` (`PREPRUEBA`, `POSPRUEBA`) |
| GET | `/api/observacion/medicion` | **Administrador** | Preprueba y posprueba por separado, cobertura de la muestra y ventanas de observación |
| GET | `/api/observacion/ficha/:1-4` | Autenticado | Filas de la ficha de observación de la dimensión indicada |
| GET | `/api/observacion/ficha/:1-4/export` | Autenticado | Payload de exportación a Excel (cabeceras + filas + indicadores) |
| GET | `/api/observacion/errores-registro` | Autenticado | Errores de validación registrados (insumo de PER) |
| POST | `/api/observacion/errores-registro` | Autenticado | Alta manual de un error detectado |

---

## 4. Pantallas

| Pantalla | Ruta | Rol | Contenido |
|---|---|---|---|
| Fichas de evidencia | `/observacion` | Autenticado | Fichas por dimensión, con selector de alcance (muestra / toda la operación) y exportación a Excel |
| Medición de investigación | `/medicion` | **Administrador** | Preprueba vs. posprueba para los cuatro indicadores, cobertura de la muestra y exportación por grupo |
| DataMart | `/datamart` | **Administrador** | KPIs analíticos, esquema estrella, ETL y bitácora |

Los indicadores de investigación **no** se mezclan con los KPI analíticos del DataMart (OTIF, lead time, tasa de incidencias): viven en pantallas distintas y se calculan sobre conjuntos distintos.
