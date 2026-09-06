# Backend - Trazabilidad Logística

API REST para el sistema de trazabilidad logística (Tesis 2026), inspirado en **Grupo Logístico Salazar S.A.C.**

## Stack

- Node.js + Express.js
- MySQL + Sequelize ORM
- JWT + bcrypt
- Multer (evidencias)
- PDFKit / ExcelJS (reportes)

## Instalación

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con credenciales MySQL
```

### Base de datos

1. Ejecutar `database/scripts/01_schema_completo.sql`
2. Ejecutar `database/scripts/02_medicion_fichas.sql` (campos fichas observación)
3. Ejecutar `database/scripts/03_dimension4_gestion_informacion.sql` (dimensión 4 PICO)
4. Ejecutar seeder:

```bash
npm run db:seed
```

### Carga masiva para DataMart (sustentación ≥ 5,000 registros)

Genera envíos e incidencias históricos realistas (Lima 2024–2026) y carga el esquema estrella:

```bash
npm run db:seed          # 8 envíos demo (si la tabla está vacía)
npm run db:seed-bulk     # hasta 5,500 envíos activos (configurable)
npm run db:etl           # ETL → fact_operaciones_logisticas
```

Variables opcionales:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BULK_COUNT` | 5500 | Total objetivo de envíos activos |
| `BULK_BATCH` | 500 | Tamaño de lote de inserción |
| `BULK_INCIDENCIA_RATE` | 0.18 | % envíos con incidencia |

Ejemplo: `BULK_COUNT=6000 npm run db:seed-bulk`

Si ya cargaste datos con estados poco realistas, recalcular según fecha:

```bash
npm run db:fix-estados   # entregado/cancelado para envíos antiguos
npm run db:etl
```

La fecha de referencia operativa es `2026-05-31` (variable `BULK_REF_DATE`).

Luego en la web (admin): **DataMart → Ejecutar ETL** y verificar KPIs (OTIF, lead time, tasa incidencias).

### Iniciar servidor

```bash
npm run dev
```

API: `http://localhost:5000/api`

## Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@salazarlogistica.pe | Admin123! |
| Operador logístico | operador@salazarlogistica.pe | Operador123! |

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/dashboard | KPIs y gráficos |
| CRUD | /api/envios | Gestión de envíos |
| PATCH | /api/envios/:id/estado | Seguimiento |
| CRUD | /api/incidencias | Incidencias |
| POST | /api/evidencias/upload | Subir evidencia |
| POST | /api/reportes/generar | PDF/Excel |
| GET | /api/observacion/indicadores | KPIs TPRE, PER, PEEA, PICO |
| GET | /api/observacion/ficha/:1-4 | Datos ficha por dimensión |
| GET | /api/observacion/ficha/:dim/export | Excel ficha observación |
| GET | /api/datamart/preview | Conteo hechos y dimensiones |
| GET | /api/datamart/analytics | KPIs OTIF, lead time, incidencias |
| POST | /api/datamart/etl/run | Ejecutar ETL staging |

## Estructura MVC

`controllers` → `services` → `repositories` / `models`

Carpeta `src/datamart/` contiene diseño estrella y ETL de staging.
