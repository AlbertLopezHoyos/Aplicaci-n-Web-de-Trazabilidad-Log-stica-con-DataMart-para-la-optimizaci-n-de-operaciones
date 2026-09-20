# Aplicación Web de Trazabilidad Logística con DataMart

**Tesis 2026** — Optimización de operaciones en una empresa logística, Lima.

Referencia corporativa: [Grupo Logístico Salazar S.A.C.](https://www.gruposalazarperu.com/) — transporte de carga, reparto, mudanzas y logística.

## Objetivo del sistema

- Registrar y gestionar envíos con trazabilidad completa
- Seguimiento logístico con línea de tiempo (recibido → en tránsito → entregado / retrasado / cancelado)
- Reducir errores mediante incidencias y evidencias documentales
- Reportes operativos exportables (PDF / Excel)
- Consolidar las operaciones en un **DataMart** en esquema estrella para su análisis mediante la aplicación web

## Alineación con la investigación

| Concepto | Definición |
|---|---|
| Variable independiente | Aplicación web de trazabilidad logística con DataMart |
| Variable dependiente | Optimización de operaciones logísticas |
| Unidad de análisis | Jornada operativa |

| Dimensión | Indicador | Fórmula |
|---|---|---|
| Eficiencia operativa | **TPDRE** — Tiempo promedio diario de registro de envíos | `TPDRE = ΣTRE / NERD` |
| Calidad de la información logística | **PDRE** — Porcentaje diario de registros con error | `PDRE = (RCE / TRD) × 100` |
| Control y seguimiento de envíos | **PDEEA** — Porcentaje diario de envíos con estado actualizado | `PDEEA = (EEA / TED) × 100` |
| Gestión de la información operativa | **PDIOIC** — Porcentaje diario de incidencias operativas con información completa | `PDIOIC = (NIOC / TID) × 100` |

Estos indicadores operacionalizan la variable dependiente a partir de datos operativos ya capturados (envíos, validación, historial e incidencias). **No son módulos ni historias de usuario del producto.** El detalle está en [docs/ALINEACION_TESIS.md](docs/ALINEACION_TESIS.md).

La carga masiva (`npm run db:seed-bulk`) genera datos sintéticos para pruebas técnicas del ETL, el esquema estrella, volumen y consultas analíticas. Quedan como `origen_dato = 'SINTETICO'` y `grupo_muestra = 'NO_MUESTRA'`. **No participan** en TPDRE, PDRE, PDEEA ni PDIOIC.

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
5. `backend/database/scripts/08_incidencia_observacion.sql` (campo opcional `observacion` en incidencias; no altera PDIOIC)

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
9. **DataMart** — Esquema estrella, ETL idempotente con bitácora, análisis de operaciones (H.U.18)  
10. **Auditoría** — Registro de acciones relevantes sobre datos sensibles  

## Datos sintéticos y scripts históricos

Los seeders marcan lo que generan como `SINTETICO` / `NO_MUESTRA`. Los scripts históricos de
etiquetado o mantenimiento se conservan por compatibilidad; no forman parte del Product Backlog.

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
| [docs/ALINEACION_TESIS.md](docs/ALINEACION_TESIS.md) | Operacionalización de TPDRE, PDRE, PDEEA y PDIOIC (metodología, no módulos de producto) |
| [docs/KIMBALL.md](docs/KIMBALL.md) | Diseño dimensional: proceso, grano, dimensiones, hechos, ETL, SCD y datos sintéticos |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Frontend, backend, API REST, MySQL, OLTP, DataMart y flujo de información |
| [docs/SCRUM.md](docs/SCRUM.md) | Visión, Product Backlog, historias, criterios de aceptación, sprints y DoD |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Casos de prueba, resultados y evidencias pendientes |

Otros:

- [backend/README.md](backend/README.md)  
- [frontend/README.md](frontend/README.md)  
- [backend/src/datamart/star-schema.design.js](backend/src/datamart/star-schema.design.js)  

## Autor

Proyecto de tesis — Lima 2026
