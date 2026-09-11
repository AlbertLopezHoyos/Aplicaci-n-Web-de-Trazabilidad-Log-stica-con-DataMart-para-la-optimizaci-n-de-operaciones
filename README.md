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
| Eficiencia operativa | **TPRE** — Tiempo promedio de registro de envíos | `TPRE = ΣTRE / NER` |
| Calidad de la información logística | **PER** — Porcentaje de errores en los registros | `PER = (RCE / TREg) × 100` |
| Control y seguimiento de envíos | **PEEA** — Porcentaje de envíos con estado actualizado | `PEEA = (EEA / TEE) × 100` |
| Gestión de la información operativa | **PIOIC** — Porcentaje de incidencias operativas con información completa | `PIOIC = (NIOC / NTIR) × 100` |

### Datos: muestra de investigación vs. datos sintéticos

> **Muestra de investigación: 100 registros reales, 50 de preprueba y 50 de posprueba.**
> Los grupos son **diferentes entre sí** y **no constituyen muestras pareadas**.
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
`NO_MUESTRA`). Los indicadores de investigación filtran siempre los registros reales de la muestra.

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
5. `backend/database/scripts/08_incidencia_observacion.sql` (ficha 4: Título, Descripción y Observación por separado; PIOIC no usa Observación)

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
9. **Fichas de evidencia** — Una ficha por dimensión (TPRE, PER, PEEA, PIOIC), exportables a Excel. La ficha 4 incluye Título, Descripción y Observación por separado; PIOIC solo usa los cinco campos obligatorios.  
10. **Medición de investigación** — Preprueba y posprueba por separado (solo Administrador)  
11. **DataMart** — Esquema estrella, ETL idempotente con bitácora, KPIs analíticos  

## Marcado de la muestra de investigación

Los registros reales capturados desde la aplicación se etiquetan con una herramienta que **no genera
datos**, solo clasifica los existentes:

```bash
cd backend
npm run db:muestra -- --estado                                          # ver distribución
npm run db:muestra -- --grupo=PREPRUEBA --desde=AAAA-MM-DD --hasta=AAAA-MM-DD --aplicar
npm run db:muestra -- --grupo=POSPRUEBA --codigos=GLS-2026-00120,GLS-2026-00121 --aplicar
```

El script rechaza cualquier intento de incluir registros sintéticos en la muestra.

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
