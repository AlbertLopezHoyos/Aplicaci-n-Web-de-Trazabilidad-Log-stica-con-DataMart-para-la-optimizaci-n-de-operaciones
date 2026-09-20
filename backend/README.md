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

### A. Scripts de infraestructura / producto

1. Ejecutar `database/scripts/01_schema_completo.sql` (modelo operacional + DataMart)

Scripts complementarios que añaden columnas operativas usadas por el producto (tiempos de registro, campos de incidencias, `origen_dato`, `etl_ejecuciones`). Los nombres de archivo son históricos:

2. `database/scripts/02_medicion_fichas.sql` — tiempos de registro y validación (H.U.5, H.U.9)
3. `database/scripts/03_dimension4_gestion_informacion.sql` — campos de incidencia (`area`, `titulo`, `fuente_principal`)
4. `database/scripts/07_muestra_investigacion.sql` — `origen_dato`, bitácora ETL y `UNIQUE(id_envio)`
5. `database/scripts/08_incidencia_observacion.sql` — campo opcional `observacion` en incidencias

```bash
npm run db:seed
```

El script 07 es **idempotente** y **no elimina registros**.

En Windows, el pipeline local: `npm run db:phase-b`.

### B. Utilidades auxiliares de investigación

Los scripts de etiquetado de muestra, volumen de jornadas o captura de posprueba **no** son el flujo funcional del backend. Se conservan en `database/scripts/` por compatibilidad. No son módulos del Product Backlog.

### Carga masiva para pruebas técnicas del DataMart (≥ 5 000 registros)

> ⚠️ **Los registros generados son DATOS SINTÉTICOS.** No fueron proporcionados por la empresa.
> Quedan marcados como `origen_dato = 'SINTETICO'` y `grupo_muestra = 'NO_MUESTRA'`.
> Sirven para pruebas del ETL, esquema estrella, consultas analíticas y volumen.

```bash
npm run db:seed          # 8 envíos de demostración (también sintéticos)
npm run db:seed-bulk     # hasta 5,500 envíos sintéticos (configurable)
npm run db:etl           # ETL → fact_operaciones_logisticas
```

Luego en la web (Administrador): **Análisis de operaciones → Actualizar indicadores**.

### Iniciar servidor

```bash
npm run dev
```

API: `http://localhost:5000/api`

Las cuentas de acceso se dan de alta en el sistema (rol Administrador). No se publican contraseñas en este repositorio.

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
| GET | /api/datamart/preview | Conteo de hechos, dimensiones y últimas corridas del ETL |
| GET | /api/datamart/analytics | KPIs OTIF, lead time, incidencias |
| POST | /api/datamart/etl/run | Ejecutar ETL (idempotente) |
| GET | /api/datamart/etl/ejecuciones | Bitácora de ejecuciones del ETL |
| CRUD | /api/usuarios | Gestión de usuarios (**solo Administrador**) |

## Pruebas

```bash
npm test          # Jest + Supertest
npm run test:watch
```

Cobertura de producto: autorización, ETL idempotente, bitácora y anonimización. Detalle en [../docs/PRUEBAS.md](../docs/PRUEBAS.md).

## Estructura MVC

`controllers` → `services` → `repositories` / `models`

Carpeta `src/datamart/` contiene el diseño del esquema estrella y el ETL.
