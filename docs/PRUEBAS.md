# Plan y resultados de pruebas

## 1. Infraestructura

| Aspecto | Valor |
|---|---|
| Framework | Jest 30 |
| Pruebas de API | Supertest |
| Ubicación | `backend/tests/` |
| Ejecución | `cd backend && npm test` |
| Estrategia | Los servicios se prueban con `sequelize.query` simulado (`jest.mock`), de modo que las pruebas verifican reglas y SQL generado sin depender de una base de datos activa |

Resultado de la última ejecución: **4 suites, 46 casos, 46 correctos, 0 fallidos.**

```
Test Suites: 4 passed, 4 total
Tests:       46 passed, 46 total
```

Antes de esta auditoría **no existían pruebas automatizadas** en el proyecto.

---

## 2. Casos de prueba

Estado: ✅ correcto · ⏳ pendiente de evidencia manual.

### 2.1 TPRE — Tiempo promedio de registro de envíos

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-01 | HU-04 / TPRE | Tiempos `[4, 6, 8, 2]` min | Promedio 5 min; ΣTRE 20; NER 4 | 5 / 20 / 4 | ✅ | — |
| CP-02 | HU-04 / TPRE | Tiempos con nulos y texto `[3, null, undefined, 'x', 5]` | Promedio 4 min (solo valores válidos) | 4 | ✅ | — |
| CP-03 | HU-04 / TPRE | Lista vacía | 0 sin división por cero | 0 | ✅ | — |
| CP-04 | HU-04 / TPRE | Fila simulada `ner = 50`, `suma_tre = 250` | `tpre = 5` con detalle ΣTRE/NER | 5 | ✅ | — |
| CP-05 | HU-04 / TPRE | Registro real desde el formulario web | `tiempo_registro_min` persistido y coherente con el reloj | — | ⏳ | Captura del envío registrado con sus horas de inicio y fin |

### 2.2 PER — Porcentaje de errores en los registros

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-06 | HU-11 / PER | RCE 7, TREg 50 | 14 % | 14 | ✅ | — |
| CP-07 | HU-11 / PER | Envío con `registro_correcto = false` y 3 errores asociados | Se cuenta una sola vez | 1 envío erróneo | ✅ | — |
| CP-08 | HU-11 / PER | Envío correcto con 1 error en `errores_registro` | Se marca como erróneo | `true` | ✅ | — |
| CP-09 | HU-11 / PER | Envío correcto sin errores asociados | No se marca como erróneo | `false` | ✅ | — |
| CP-10 | HU-11 / PER | RCE 50, TREg 50 | 100 % (nunca superior) | 100 | ✅ | — |
| CP-11 | HU-11 / PER | Alta de envío con datos inválidos vía API | HTTP 400 y fila en `errores_registro` | — | ⏳ | Consulta a `errores_registro` tras el intento fallido |

### 2.3 PEEA — Porcentaje de envíos con estado actualizado

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-12 | HU-07 / PEEA | Estado actual 3, último historial 3 | Actualizado | `true` | ✅ | — |
| CP-13 | HU-07 / PEEA | Estado actual 3, último historial 1 | No actualizado | `false` | ✅ | — |
| CP-14 | HU-07 / PEEA | Envío sin historial | No actualizado | `false` | ✅ | — |
| CP-15 | HU-07 / PEEA | EEA 41, TEE 50 | 82 % | 82 | ✅ | — |
| CP-16 | HU-07 / PEEA | Cambio de estado desde la pantalla de seguimiento | Historial y estado actual sincronizados | — | ⏳ | Captura del historial del envío tras el cambio |

### 2.4 PIOIC — Porcentaje de incidencias con información completa

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-17 | HU-10 / PIOIC | Lista de campos obligatorios | Exactamente `tipo`, `area`, `titulo`, `descripcion`, `fuente_principal` | Coincide | ✅ | — |
| CP-18 | HU-10 / PIOIC | Incidencia con los cinco campos | Completa | `true` | ✅ | — |
| CP-19 | HU-10 / PIOIC | Incidencia sin `fuente_principal`; incidencia con `area` en blanco | Incompleta en ambos casos | `false` | ✅ | — |
| CP-20 | HU-10 / PIOIC | Incidencia con `area` vacía y `descripcion` nula | Lista de campos faltantes `['area','descripcion']` | Coincide | ✅ | — |
| CP-21 | HU-10 / PIOIC | 12 incidencias, 9 completas | 75 %, denominador 12 (**no 50**) | 75 / 12 | ✅ | — |
| CP-22 | HU-10 / PIOIC | 0 incidencias | 0 % sin división por cero | 0 | ✅ | — |
| CP-23 | HU-10 / PIOIC | SQL generado para la ficha 4 | Exige los mismos cinco campos que la regla en JavaScript; no usa `observacion` | Coincide | ✅ | — |
| CP-23b | HU-14 / ficha 4 | Columnas de la ficha 4 | Fecha, código, tipo, área, envío, estado, título, descripción, info. completa, fuente, observación | Coincide | ✅ | — |
| CP-23c | HU-14 / ficha 4 | SQL de la ficha 4 | `titulo`, `descripcion` y `observacion` independientes; no alias `descripcion AS observacion` | Coincide | ✅ | — |

### 2.5 Exclusión de datos sintéticos

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-24 | HU-15 | `calcularIndicadores()` sin parámetros | Las 4 consultas filtran `origen_dato = 'REAL'` y `grupo_muestra IN ('PREPRUEBA','POSPRUEBA')` | Coincide en las 4 | ✅ | — |
| CP-25 | HU-15 | `calcularIndicadores({ grupo: 'PREPRUEBA' })` | Filtra solo preprueba; `incluyeDatosSinteticos = false` | Coincide | ✅ | — |
| CP-26 | HU-15 | `calcularIndicadores({ alcance: 'TODOS' })` | Sin filtro de origen y `incluyeDatosSinteticos = true` | Coincide | ✅ | — |
| CP-27 | HU-15 | Alcance desconocido `'DATAMART'` | Se ignora y vuelve a alcance `MUESTRA` | `MUESTRA` | ✅ | — |
| CP-28 | HU-14 | Ficha de la dimensión 4 con límite 50 | SQL sobre `incidencias` con filtro de muestra y `LIMIT 50` | Coincide | ✅ | — |
| CP-29 | HU-14 | Dimensión 9 | Error "Dimensión no válida" | Excepción lanzada | ✅ | — |
| CP-30 | HU-15 | Ejecución de `npm run db:seed-bulk` | Todos los registros quedan como `SINTETICO` / `NO_MUESTRA` | — | ⏳ | `SELECT origen_dato, COUNT(*) FROM envios GROUP BY origen_dato` |

### 2.6 ETL sin duplicación

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-31 | HU-18 | Primera ejecución de `runStaging()` | `INSERT` de hechos condicionado con `NOT EXISTS` sobre `id_envio` | Coincide | ✅ | — |
| CP-32 | HU-18 | Segunda ejecución | 0 hechos nuevos, N actualizados, mensaje de idempotencia | 0 / 5500 | ✅ | — |
| CP-33 | HU-18 | Carga de dimensiones | Los 3 `INSERT` de dimensión usan `NOT EXISTS` | Coincide | ✅ | — |
| CP-34 | HU-15 / HU-18 | Carga de hechos | `origen_dato` se propaga a la tabla de hechos | Coincide | ✅ | — |
| CP-35 | HU-18 | Ejecución exitosa | `commit` una vez, sin `rollback` | Coincide | ✅ | — |
| CP-36 | HU-19 | Ejecución exitosa | Bitácora abierta en `EN_PROCESO` y cerrada en `EXITOSO` con conteos | Coincide | ✅ | — |
| CP-37 | HU-19 | Error durante la extracción | `rollback` y bitácora en `FALLIDO` con el mensaje del error | Coincide | ✅ | — |
| CP-38 | HU-19 | Tabla `etl_ejecuciones` inexistente | El ETL termina bien con `idEjecucion = null` | Coincide | ✅ | — |
| CP-39 | HU-18 | Doble ejecución sobre MySQL real | `SELECT id_envio, COUNT(*) ... HAVING COUNT(*) > 1` devuelve 0 filas | — | ⏳ | Captura de la consulta de verificación del grano |

### 2.7 Autenticación y autorización

| Caso | Requisito / Historia | Entrada | Resultado esperado | Resultado obtenido | Estado | Evidencia pendiente |
|---|---|---|---|---|---|---|
| CP-40 | HU-02 | `GET /api/observacion/medicion` sin token | HTTP 401 | 401 | ✅ | — |
| CP-41 | HU-02 | Token con firma inválida | HTTP 401 | 401 | ✅ | — |
| CP-42 | HU-02 | Token de un usuario desactivado | HTTP 401 | 401 | ✅ | — |
| CP-43 | HU-02 / HU-16 | Token de Operador logístico | HTTP 403 | 403 | ✅ | — |
| CP-44 | HU-02 / HU-16 | Token de Administrador | Acceso permitido (ni 401 ni 403) | Permitido | ✅ | — |
| CP-45 | HU-02 | `POST /datamart/etl/run`, `GET /datamart/preview`, `/analytics`, `/etl/ejecuciones` | 401 sin token y 403 con rol Operador | Coincide en las 4 rutas | ✅ | — |
| CP-46 | HU-14 | `GET /api/observacion/ficha/9` | HTTP 400 por parámetro inválido | 400 | ✅ | — |
| CP-47 | HU-14 | `GET /api/observacion/indicadores?alcance=DATAMART` | HTTP 400 por parámetro inválido | 400 | ✅ | — |

*(CP-45 agrupa cuatro aserciones parametrizadas de una misma prueba.)*

---

## 3. Pruebas de compilación

| Caso | Comando | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| CP-48 | `cd backend && npm test` | Todas las suites en verde | 46/46 correctos | ✅ |
| CP-49 | `cd frontend && npm run build` | Compilación sin errores | `built in 35.34s`, sin errores | ✅ |

El aviso de Vite sobre *chunks* mayores a 500 kB es una recomendación de optimización, no un error;
existía antes de esta intervención.

---

## 4. Pruebas manuales pendientes

Requieren una base de datos poblada y decisiones del investigador:

| Nº | Prueba | Requisito previo |
|---|---|---|
| 1 | Verificar TPRE, PER, PEEA y PIOIC de la preprueba sobre los 50 registros reales | Marcar la muestra con `npm run db:muestra` |
| 2 | Verificar los mismos indicadores para la posprueba | Ídem |
| 3 | Comprobar que la pantalla *Medición de investigación* muestra ambos grupos separados | Muestra marcada |
| 4 | Ejecutar el ETL dos veces seguidas y verificar el conteo de hechos | Migración 07 aplicada |
| 5 | Conectar Power BI al esquema estrella y filtrar por `origen_dato` | DataMart cargado |

> **[PENDIENTE DE CONFIRMAR]** Adjuntar las capturas de pantalla y consultas SQL de las pruebas
> manuales como anexo de la tesis.
