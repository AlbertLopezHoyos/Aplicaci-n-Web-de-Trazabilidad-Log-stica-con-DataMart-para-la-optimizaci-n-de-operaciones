# Alineación del sistema con la investigación

**Tesis:** *Aplicación Web de Trazabilidad Logística con DataMart para la optimización de operaciones en una empresa logística, Lima 2026.*

| | |
|---|---|
| **Variable independiente** | Aplicación web de trazabilidad logística con DataMart |
| **Variable dependiente** | Optimización de operaciones logísticas |
| **Unidad de análisis** | Jornada operativa |
| **Muestra** | 40 jornadas operativas (20 preprueba y 20 posprueba) |
| **Indicadores** | TPDRE, PDRE, PDEEA, PDIOIC |

Los indicadores siguientes operacionalizan la variable dependiente. **No son módulos, historias de usuario ni requerimientos funcionales del producto.** Se calculan a partir de datos que ya genera la operación diaria (envíos, validación, historial de estados e incidencias). La contrastación estadística se realiza en SPSS, fuera de la aplicación.

---

## 1. Operacionalización

### TPDRE — Tiempo promedio diario de registro de envíos

`TPDRE = ΣTRE / NERD`

Origen: `envios.tiempo_registro_min` (derivado de `hora_inicio_registro` y `hora_fin_registro` en el registro de envíos, H.U.5). Solo participan tiempos válidos (`IS NOT NULL` y `>= 0`). Si una jornada no tiene tiempos válidos, TPDRE = N/A.

### PDRE — Porcentaje diario de registros con error

`PDRE = (RCE / TRD) × 100`

Origen: `envios.registro_correcto` y `errores_registro` (validación de información, H.U.9). Un envío con varios errores cuenta una sola vez.

### PDEEA — Porcentaje diario de envíos con estado actualizado

`PDEEA = (EEA / TED) × 100`

Origen: `envios.id_estado_actual` y el último movimiento de `historial_estados` (H.U.10 y H.U.11). Un envío se considera actualizado cuando ambos coinciden. Sin historial no se considera actualizado.

### PDIOIC — Porcentaje diario de incidencias operativas con información completa

`PDIOIC = (NIOC / TID) × 100`

Origen: incidencias (H.U.13) agrupadas por `DATE(fecha_reporte)`. Completa si `tipo`, `area`, `titulo`, `descripcion` y `fuente_principal` no están vacíos. El campo `observacion` **no** entra en PDIOIC. Si TID = 0, PDIOIC = N/A (no 0 %).

Criterio centralizado en `backend/src/utils/reglasIndicadores.js`.

---

## 2. Unidad de análisis

La unidad de análisis es la **jornada operativa** (fecha con al menos una operación de envío real válida). Los envíos individuales son datos dentro de cada jornada; no constituyen el *n* estadístico.

La muestra de la investigación es de **40 jornadas operativas** (20 de preprueba y 20 de posprueba). La preprueba no se calcula ni se gestiona como funcionalidad del software.

Los indicadores de investigación no se mezclan con las métricas del DataMart (`peso_kg`, `dias_transito`, `cantidad_incidencias`, `tuvo_retraso`, `entregado_a_tiempo`). Ver [KIMBALL.md](./KIMBALL.md).

---

## 3. Datos sintéticos

Columnas de control en `envios` e `incidencias`: `origen_dato` (`REAL` \| `SINTETICO`) y `grupo_muestra` (`PREPRUEBA` \| `POSPRUEBA` \| `NO_MUESTRA`).

Los seeders marcan lo generado como `SINTETICO` / `NO_MUESTRA`. Esos registros sirven para pruebas técnicas del ETL, volumen, esquema estrella y consultas analíticas. **No participan** en TPDRE, PDRE, PDEEA ni PDIOIC.
