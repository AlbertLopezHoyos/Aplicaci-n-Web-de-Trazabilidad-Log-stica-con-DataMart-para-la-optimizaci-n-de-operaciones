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

---

## 2. Pruebas de la solución tecnológica

Estado ✅ = aserción presente en `backend/tests/`.

### 2.1 Autenticación y autorización (H.U.2)

Fuente: `rutas.autorizacion.test.js`.

| Caso | Resultado esperado | Estado |
|---|---|---|
| Petición a ruta administrativa sin token | HTTP 401 | ✅ |
| Token inválido | HTTP 401 | ✅ |
| Usuario desactivado | HTTP 401 | ✅ |
| Operador logístico en ruta de Administrador | HTTP 403 | ✅ |
| Administrador | acceso permitido | ✅ |
| Rutas DataMart (`etl/run`, `preview`, `analytics`, `etl/ejecuciones`) | 401 sin token y 403 con rol Operador | ✅ |

### 2.2 ETL y DataMart (H.U.18)

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

### 2.3 Anonimización

Fuente: `anonimizacion.service.test.js`.

| Caso | Resultado esperado | Estado |
|---|---|---|
| Cliente con DNI y teléfono | se enmascaran; se expone alias académico | ✅ |
| Envío anonimizado | conserva `codigo_envio`, origen, destino y peso | ✅ |
| Cliente sintético | `tipo_cliente` indica origen sintético | ✅ |

---

## 3. Compilación

| Comando | Resultado esperado |
|---|---|
| `cd backend && npm test` | Suites en verde |
| `cd frontend && npm run build` | Compilación sin errores |

El aviso de Vite sobre *chunks* mayores a 500 kB es una recomendación de tamaño, no un error de build.

---

## 4. Pruebas auxiliares internas de investigación

Estas pruebas no corresponden a funcionalidades del producto ni forman parte del Product Backlog. Verifican cálculos usados para obtener datos de la tesis (SPSS se aplica fuera de la aplicación).

| Archivo | Propósito interno |
|---|---|
| `reglasIndicadores.test.js` | Fórmulas TPDRE, PDRE, PDEEA y PDIOIC |
| `observacion.service.test.js` | Consolidación por jornada operativa, solo lectura |

No se documentan aquí como cobertura funcional del producto.
