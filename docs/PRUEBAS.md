# Plan y resultados de pruebas

## 1. Infraestructura

| Aspecto | Valor |
|---|---|
| Framework | Jest |
| Pruebas de API | Supertest |
| Ubicación | `backend/tests/` |
| Ejecución | `cd backend && npm test` |
| Estrategia | Servicios con `sequelize.query` simulado (`jest.mock`); las pruebas verifican reglas y SQL generado sin modificar una base de datos |

Las pruebas funcionales de caja negra usadas durante los sprints son un **mecanismo técnico de verificación**. No son un evento ni un artefacto obligatorio de Scrum. Ver [SCRUM.md](./SCRUM.md).

Suites actuales:

| Archivo | Enfoque |
|---|---|
| `reglasIndicadores.test.js` | Fórmulas TPDRE, PDRE, PDEEA, PDIOIC |
| `observacion.service.test.js` | Consolidación de indicadores por jornada operativa (herramienta interna; no es un requisito funcional del Product Backlog) |
| `etl.service.test.js` | Idempotencia, bitácora y transacción del ETL (H.U.18) |
| `rutas.autorizacion.test.js` | JWT, roles y validación de parámetros (H.U.2) |
| `anonimizacion.service.test.js` | Anonimización de datos sensibles |

---

## 2. Casos de prueba verificados en el código

Estado ✅ = aserción presente en `backend/tests/`.

### 2.1 TPDRE, PDRE, PDEEA y PDIOIC (operacionalización)

Fuente: `reglasIndicadores.test.js`.

| Caso | Entrada / condición | Resultado esperado | Estado |
|---|---|---|---|
| TPDRE | ΣTRE = 20, NERD = 4 | 5 | ✅ |
| TPDRE | Valores nulos o no numéricos | se ignoran; no rompen el promedio | ✅ |
| TPDRE | Lista vacía | 0 sin división por cero | ✅ |
| PDRE | RCE = 2, TRD = 20 | 10 % | ✅ |
| PDRE | Un envío con varios errores | cuenta una sola vez | ✅ |
| PDRE | Datos coherentes | nunca supera 100 % | ✅ |
| PDEEA | Estado actual = último historial | actualizado | ✅ |
| PDEEA | Historial desfasado o ausente | no actualizado | ✅ |
| PDEEA | EEA = 18, TED = 20 | 90 % | ✅ |
| PDIOIC | Campos obligatorios | `tipo`, `area`, `titulo`, `descripcion`, `fuente_principal` | ✅ |
| PDIOIC | Campo `observacion` | no forma parte de la completitud | ✅ |
| PDIOIC | NIOC = 9, TID = 12 | 75 % | ✅ |
| PDIOIC | TID = 0 | el 0 numérico no se interpreta como 0 % metodológico | ✅ |

### 2.2 Consolidación por jornada operativa

Fuente: `observacion.service.test.js`. Estas pruebas cubren el cálculo interno por jornada;
**no** documentan un módulo de producto ni historias de usuario adicionales.

| Caso | Resultado esperado | Estado |
|---|---|---|
| Media de TPDRE, PDRE, PDEEA y PDIOIC por jornada | fórmulas aplicadas sobre filas diarias | ✅ |
| TID = 0 | PDIOIC = N/A (excluido de la media) | ✅ |
| Agrupación D4 | `DATE(i.fecha_reporte)` | ✅ |
| Jornada operativa | fecha con al menos una operación válida | ✅ |
| Días sin operaciones | no se inventan filas para completar 20 | ✅ |
| TPDRE | el mismo conjunto en ΣTRE y NERD; `NULL` no infla el denominador | ✅ |
| Lista única | consolidación diaria, exportación y resumen usan las mismas fechas | ✅ |
| Incidencia en fecha ajena a las jornadas | no entra en PDIOIC | ✅ |
| `jornadasDisponibles` | independiente de `detalle.tpdre.n_jornadas` | ✅ |
| Datos sintéticos | se excluyen (`origen_dato = REAL`) | ✅ |
| Alcance TODOS / grupo PREPRUEBA | no mezclan sintéticos ni calculan preprueba | ✅ |
| Solo lectura | el servicio no contiene INSERT, UPDATE ni DELETE | ✅ |
| Operaciones posteriores al periodo | no invalidan la cobertura | ✅ |

### 2.3 ETL (H.U.18)

Fuente: `etl.service.test.js`.

| Caso | Resultado esperado | Estado |
|---|---|---|
| Primera carga | `INSERT` de hechos con `NOT EXISTS` sobre `id_envio` | ✅ |
| Segunda ejecución | 0 hechos nuevos; actualización de métricas | ✅ |
| Dimensiones | `NOT EXISTS` sobre clave natural | ✅ |
| `origen_dato` | se propaga a la tabla de hechos | ✅ |
| Miembro de origen no vigente | `es_actual = 0`, `vigente_hasta = CURDATE()` | ✅ |
| Transacción exitosa | `commit` | ✅ |
| Error en extracción | `rollback` y bitácora `FALLIDO` | ✅ |
| Bitácora exitosa | `EN_PROCESO` → `EXITOSO` con conteos | ✅ |
| Tabla `etl_ejecuciones` ausente | el ETL no se interrumpe | ✅ |

### 2.4 Autenticación y autorización (H.U.2)

Fuente: `rutas.autorizacion.test.js`.

| Caso | Resultado esperado | Estado |
|---|---|---|
| Petición a ruta administrativa sin token | HTTP 401 | ✅ |
| Token inválido | HTTP 401 | ✅ |
| Usuario desactivado | HTTP 401 | ✅ |
| Operador logístico en ruta de Administrador | HTTP 403 | ✅ |
| Administrador | acceso permitido | ✅ |
| Rutas DataMart (`etl/run`, `preview`, `analytics`, `etl/ejecuciones`) | 401 sin token y 403 con rol Operador | ✅ |
| Endpoints de escritura no expuestos en consolidación de indicadores | no hay aleatorización ni POST de errores | ✅ |

---

## 3. Compilación

| Comando | Resultado esperado |
|---|---|
| `cd backend && npm test` | Suites en verde |
| `cd frontend && npm run build` | Compilación sin errores |

El aviso de Vite sobre *chunks* mayores a 500 kB es una recomendación de tamaño, no un error de build.

---

## 4. Fuera de alcance de este documento

No se documentan como requisitos del producto ni como casos vigentes:

- TPRE, PER, PEEA, PIOIC
- muestra de 50 o 100 envíos
- `LIMIT 50`
- cálculo de preprueba desde el software
- alcance `TODOS` mezclando datos sintéticos
