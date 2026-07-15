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
3. Ejecutar seeder:

```bash
npm run db:seed
```

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
| GET | /api/observacion/indicadores | KPIs TPRE, PER, PEEA, TPGRO |
| GET | /api/observacion/ficha/:1-4 | Datos ficha por dimensión |
| GET | /api/observacion/ficha/:dim/export | Excel ficha observación |
| POST | /api/observacion/errores-registro | Registrar error validación |

## Estructura MVC

`controllers` → `services` → `repositories` / `models`

Carpeta `src/datamart/` contiene diseño estrella y ETL de staging.
