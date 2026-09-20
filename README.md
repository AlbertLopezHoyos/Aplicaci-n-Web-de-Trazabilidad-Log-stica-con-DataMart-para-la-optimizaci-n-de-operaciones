# Aplicación Web de Trazabilidad Logística con DataMart

**Tesis 2026** — Optimización de operaciones en una empresa logística, Lima.

Referencia corporativa: [Grupo Logístico Salazar S.A.C.](https://www.gruposalazarperu.com/) — transporte de carga, reparto, mudanzas y logística.

## Objetivo del sistema

- Registrar y gestionar envíos con trazabilidad completa
- Seguimiento logístico con línea de tiempo (recibido → en tránsito → entregado / retrasado / cancelado)
- Reducir errores mediante incidencias y evidencias documentales
- Reportes operativos exportables (PDF / Excel)
- Consolidar las operaciones en un **DataMart** en esquema estrella explotable con Power BI

## Alineación con la investigación

| Concepto | Definición |
|---|---|
| Variable independiente | Aplicación web de trazabilidad logística con DataMart |
| Variable dependiente | Optimización de operaciones logísticas |

| Dimensión | Indicador | Fórmula |
|---|---|---|
| Eficiencia operativa | **TPDRE** — Tiempo promedio diario de registro de envíos | `TPDRE = ΣTRE / NERD` |
| Calidad de la información logística | **PDRE** — Porcentaje diario de registros con error | `PDRE = (RCE / TRD) × 100` |
| Control y seguimiento de envíos | **PDEEA** — Porcentaje diario de envíos con estado actualizado | `PDEEA = (EEA / TED) × 100` |
| Gestión de la información operativa | **PDIOIC** — Porcentaje diario de incidencias operativas con información completa | `PDIOIC = (NIOC / TID) × 100` |

### Datos: jornadas de investigación vs. datos sintéticos

> **El módulo de observación utiliza jornadas operativas posteriores a la implementación.**
> Cada fila de las fichas representa una jornada y los indicadores se calculan con los
> registros reales existentes en la base de datos. **La preprueba no es gestionada por el software.**
>
> **Carga del DataMart: más de 5 000 registros para pruebas técnicas, que son datos sintéticos.**
> Se generan artificialmente con `npm run db:seed-bulk` porque los datos históricos reales de la
> empresa están sujetos a restricciones de confidencialidad. **No fueron proporcionados por la
> empresa.**
>
> **Los datos sintéticos NO forman parte del contraste de hipótesis.** Se usan exclusivamente para
> probar el ETL, demostrar el esquema estrella, ejecutar consultas analíticas, alimentar dashboards
> y validar el comportamiento con volumen.

La separación es explícita en la base de datos: las tablas `envios` e `incidencias` tienen las
columnas `origen_dato` (`REAL` | `SINTETICO`) y `grupo_muestra` (`PREPRUEBA` | `POSPRUEBA` |
`NO_MUESTRA`). Los indicadores de investigación filtran registros reales de las jornadas
posteriores a la implementación y no mezclan datos sintéticos.

Detalle completo en [docs/ALINEACION_TESIS.md](docs/ALINEACION_TESIS.md).

## Estructura del proyecto

```
├── backend/     Node.js + Express + MySQL + Sequelize (MVC)
└── frontend/    React + Vite + Tailwind + Recharts
```

## Requisitos

- Node.js 18+
- MySQL 8.0+

## Acceso

Las cuentas se gestionan en el propio sistema (Administrador). No se publican contraseñas en el repositorio. El modo demostración está desactivado: el frontend exige backend y base de datos.

## Instalación rápida

### 1. Base de datos

Ejecutar en MySQL Workbench, en este orden:

1. `backend/database/scripts/01_schema_completo.sql`
2. `backend/database/scripts/02_medicion_fichas.sql`
3. `backend/database/scripts/03_dimension4_gestion_informacion.sql`
4. `backend/database/scripts/07_muestra_investigacion.sql`
5. `backend/database/scripts/08_incidencia_observacion.sql` (ficha 4: Título, Descripción y Observación por separado; PDIOIC no usa Observación)

O bien, en Windows con el cliente de MySQL instalado, todo el pipeline de una vez:

```bash
cd backend
npm run db:phase-b
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurar DB_USER, DB_PASSWORD, JWT_SECRET
npm run db:seed
npm run dev
```

API: `http://localhost:5000/api`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Web: `http://localhost:5173`

## Módulos implementados

1. **Autenticación** — JWT, bcrypt, roles Administrador / Operador logístico  
2. **Usuarios** — Alta, edición y activación/desactivación (solo Administrador)  
3. **Dashboard** — KPIs, gráficos Recharts, accesos rápidos  
4. **Envíos** — CRUD, filtros, búsqueda, paginación, alcance (todos / solo mis registros)  
5. **Seguimiento** — Actualización de estados + timeline  
6. **Incidencias** — Errores, retrasos, severidad, estados  
7. **Reportes** — envios_estado, tiempos, incidencias, productividad (PDF/Excel)  
8. **Evidencias** — Multer: imágenes, PDF, comprobantes  
9. **Fichas de observación** — TPDRE, PDRE, PDEEA y PDIOIC, una fila por jornada, exportables a Excel.  
10. **Medición de investigación** — Consolidación de indicadores de las jornadas posteriores a la implementación (solo Administrador)  
11. **DataMart** — Esquema estrella, ETL idempotente con bitácora, KPIs analíticos  

## Clasificación histórica de registros

Existe una herramienta de etiquetado que **no genera datos** y solo clasifica registros existentes.
El software de fichas no gestiona la preprueba; el script se conserva por compatibilidad histórica:

```bash
cd backend
npm run db:muestra -- --estado
```

El script rechaza cualquier intento de incluir registros sintéticos en esa clasificación.

## Base de datos

Una sola base de datos, `trazabilidad_logistica`, con el modelo operacional y el DataMart.

Tablas operacionales: `usuarios`, `roles`, `envios`, `estados_envio`, `historial_estados`, `incidencias`, `reportes`, `evidencias`, `clientes`, `errores_registro`, `auditoria`

Tablas analíticas: `fact_operaciones_logisticas`, `dim_fecha`, `dim_cliente`, `dim_estado`, `dim_operador`, `etl_ejecuciones`

Incluye: procedimientos almacenados, vistas SQL, triggers de auditoría.

## Pruebas

```bash
cd backend && npm test        # Jest + Supertest
cd frontend && npm run build  # Compilación de producción
```

## Seguridad

- JWT en rutas protegidas  
- Contraseñas con bcrypt  
- Validación express-validator + sanitización básica  
- Manejo centralizado de errores  
- Registro en tabla `auditoria`  

## Documentación adicional

Documentación técnica de la tesis en [`docs/`](docs/):

| Documento | Contenido |
|---|---|
| [docs/ALINEACION_TESIS.md](docs/ALINEACION_TESIS.md) | Matriz dimensión → indicador → fórmula → tabla → endpoint → pantalla → regla de cálculo |
| [docs/KIMBALL.md](docs/KIMBALL.md) | Diseño dimensional: proceso, grano, dimensiones, hechos, ETL, SCD y datos sintéticos |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Frontend, backend, API REST, MySQL, OLTP, DataMart y flujo de información |
| [docs/SCRUM.md](docs/SCRUM.md) | Visión, Product Backlog, historias, criterios de aceptación, sprints y DoD |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Casos de prueba, resultados y evidencias pendientes |
| [docs/POWERBI.md](docs/POWERBI.md) | Conexión remota de Power BI Desktop al MySQL (Railway) y modelo estrella |

Otros:

- [powerbi/](powerbi/) — plantilla `.pbids`, medidas DAX de ejemplo  

- [backend/README.md](backend/README.md)  
- [frontend/README.md](frontend/README.md)  
- [backend/src/datamart/star-schema.design.js](backend/src/datamart/star-schema.design.js)  

## Autor

Proyecto de tesis — Lima 2026
