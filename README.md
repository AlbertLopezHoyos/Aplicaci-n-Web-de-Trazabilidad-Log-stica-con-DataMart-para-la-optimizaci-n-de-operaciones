# Aplicación Web de Trazabilidad Logística con DataMart

**Tesis 2026** — Optimización de operaciones en una empresa logística, Lima.

Referencia corporativa: [Grupo Logístico Salazar S.A.C.](https://www.gruposalazarperu.com/) — transporte de carga, reparto, mudanzas y logística.

La solución tecnológica es **una sola solución integrada**: aplicación web de trazabilidad logística + DataMart.

```
Aplicación web → modelo operacional → ETL → DataMart → API /api/datamart → Análisis de operaciones
```

Se implementaron **dos modelos lógicos de datos dentro de una única base de datos física MySQL**.

## Objetivo del sistema

- Registrar y gestionar envíos con trazabilidad completa
- Seguimiento logístico con línea de tiempo (recibido → en tránsito → entregado / retrasado / cancelado)
- Reducir errores mediante incidencias y evidencias documentales
- Reportes operativos exportables (PDF / Excel)
- Consolidar las operaciones en un **DataMart** en esquema estrella para su análisis mediante la aplicación web

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Node.js, Express, Sequelize |
| Base de datos | MySQL 8 |
| Arquitectura | Frontend → API REST → Backend → MySQL |

## Estructura del proyecto

```
├── backend/     Node.js + Express + MySQL + Sequelize
└── frontend/    React + Vite + Tailwind + Recharts
```

## Requisitos

- Node.js 18+
- MySQL 8.0+

## Acceso

Las cuentas se gestionan en el propio sistema (Administrador). No se publican contraseñas en el repositorio. El modo demostración está desactivado: el frontend exige backend y base de datos.

## Instalación rápida

### 1. Base de datos

Ejecutar en MySQL Workbench:

1. `backend/database/scripts/01_schema_completo.sql` — esquema operacional y dimensional

Scripts complementarios que añaden columnas operativas usadas por el producto (tiempos de registro, campos de incidencias, `origen_dato`, bitácora ETL). Conservan nombres históricos de archivo:

2. `backend/database/scripts/02_medicion_fichas.sql`
3. `backend/database/scripts/03_dimension4_gestion_informacion.sql`
4. `backend/database/scripts/07_muestra_investigacion.sql`
5. `backend/database/scripts/08_incidencia_observacion.sql`

En Windows, con el cliente de MySQL instalado:

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

## Módulos de la solución tecnológica

1. **Autenticación** — JWT, bcrypt, roles Administrador / Operador logístico
2. **Usuarios** — Alta, edición y activación/desactivación (solo Administrador)
3. **Dashboard** — KPIs, gráficos Recharts, accesos rápidos
4. **Envíos** — CRUD, filtros, búsqueda, paginación, alcance (todos / solo mis registros)
5. **Clientes** — Registro y consulta de clientes
6. **Seguimiento** — Actualización de estados + timeline
7. **Incidencias** — Errores, retrasos, severidad, estados
8. **Reportes** — envíos por estado, tiempos, incidencias, productividad (PDF/Excel)
9. **Evidencias** — Multer: imágenes, PDF, comprobantes
10. **Análisis de operaciones (H.U.18)** — DataMart, ETL idempotente con bitácora, KPIs analíticos
11. **Auditoría** — Registro de acciones relevantes sobre datos sensibles

## DataMart y ETL

Esquema estrella: `dim_fecha`, `dim_cliente`, `dim_estado`, `dim_operador` y `fact_operaciones_logisticas`.

El ETL (`backend/src/datamart/etl.service.js`) extrae del modelo operacional, transforma, carga dimensiones y hechos, y registra la corrida en `etl_ejecuciones`. La consulta se realiza desde el módulo **Análisis de operaciones** (`/datamart`) mediante `/api/datamart`.

## Datos sintéticos

La carga masiva (`npm run db:seed-bulk`) genera datos sintéticos para pruebas técnicas del ETL, el esquema estrella, volumen y consultas analíticas. Quedan como `origen_dato = 'SINTETICO'` y `grupo_muestra = 'NO_MUESTRA'`.

## Pruebas técnicas

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

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Frontend, backend, API REST, MySQL, OLTP, DataMart y flujo de información |
| [docs/SCRUM.md](docs/SCRUM.md) | Visión, Product Backlog, 18 historias, 5 sprints y DoD |
| [docs/KIMBALL.md](docs/KIMBALL.md) | Diseño dimensional: proceso, grano, dimensiones, hechos y ETL |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Pruebas de la solución tecnológica |
| [docs/ALINEACION_TESIS.md](docs/ALINEACION_TESIS.md) | Operacionalización de la investigación (no es funcionalidad de producto) |

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

> El repositorio contiene utilidades internas empleadas para la obtención y verificación de datos de investigación. Estas utilidades no forman parte de las funcionalidades oficiales de la aplicación.

## Autor

Proyecto de tesis — Lima 2026
