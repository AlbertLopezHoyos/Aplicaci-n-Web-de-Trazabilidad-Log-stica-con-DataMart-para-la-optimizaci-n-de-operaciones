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
3. Ejecutar `database/scripts/03_dimension4_gestion_informacion.sql` (dimensión 4, PIOIC)
4. Ejecutar `database/scripts/07_muestra_investigacion.sql` (separación muestra / datos sintéticos y bitácora ETL)
5. Ejecutar `database/scripts/08_incidencia_observacion.sql` (campo opcional `observacion` de la ficha 4; no altera PIOIC)
6. Ejecutar seeder:

```bash
npm run db:seed
```

El script 07 es **idempotente** y **no elimina registros**: añade `origen_dato` y `grupo_muestra` a
`envios` e `incidencias`, `origen_dato` a la tabla de hechos, crea `etl_ejecuciones`, garantiza el
grano con `UNIQUE(id_envio)` y clasifica los registros ya existentes.

En Windows, todo el pipeline en un solo comando: `npm run db:phase-b`.

### Carga masiva para pruebas técnicas del DataMart (≥ 5 000 registros)

> ⚠️ **Los registros generados son DATOS SINTÉTICOS.** No fueron proporcionados por la empresa: se
> generan artificialmente porque los datos históricos reales están sujetos a restricciones de
> confidencialidad. Quedan marcados como `origen_dato = 'SINTETICO'` y `grupo_muestra = 'NO_MUESTRA'`,
> y **están excluidos de los indicadores de investigación y del contraste de hipótesis**. Sirven para
> probar el ETL, el esquema estrella, las consultas analíticas, los dashboards y el volumen.

```bash
npm run db:seed          # 8 envíos de demostración (también sintéticos)
npm run db:seed-bulk     # hasta 5,500 envíos sintéticos (configurable)
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
| GET | /api/observacion/indicadores | Indicadores TPRE, PER, PEEA, PIOIC (`?alcance=MUESTRA\|TODOS`, `?grupo=PREPRUEBA\|POSPRUEBA`) |
| GET | /api/observacion/medicion | Preprueba y posprueba por separado (**solo Administrador**) |
| GET | /api/observacion/ficha/:1-4 | Datos ficha por dimensión |
| GET | /api/observacion/ficha/:dim/export | Excel ficha observación |
| GET | /api/datamart/preview | Conteo de hechos, dimensiones y últimas corridas del ETL |
| GET | /api/datamart/analytics | KPIs OTIF, lead time, incidencias |
| POST | /api/datamart/etl/run | Ejecutar ETL (idempotente) |
| GET | /api/datamart/etl/ejecuciones | Bitácora de ejecuciones del ETL |
| CRUD | /api/usuarios | Gestión de usuarios (**solo Administrador**) |

Por defecto los indicadores usan `alcance=MUESTRA`: solo registros con `origen_dato = 'REAL'` y
`grupo_muestra IN ('PREPRUEBA','POSPRUEBA')`. El modo `TODOS` existe para inspección operativa,
marca la respuesta con `incluyeDatosSinteticos: true` y **no debe usarse para la tesis**.

## Muestra de investigación

50 registros de preprueba + 50 de posprueba = 100 registros reales, no pareados. Se etiquetan con:

```bash
npm run db:muestra -- --estado                                          # distribución actual
npm run db:muestra -- --grupo=PREPRUEBA --desde=AAAA-MM-DD --hasta=AAAA-MM-DD   # simulación
npm run db:muestra -- --grupo=PREPRUEBA --desde=AAAA-MM-DD --hasta=AAAA-MM-DD --aplicar
npm run db:muestra -- --grupo=POSPRUEBA --codigos=GLS-2026-00120 --aplicar
```

El script solo clasifica registros existentes; nunca genera datos ni admite registros sintéticos.

## Reglas de cálculo de los indicadores

Centralizadas en `src/utils/reglasIndicadores.js`. Ahí se define, entre otras cosas, qué campos hacen
que una incidencia se considere completa para PIOIC (`tipo`, `area`, `titulo`, `descripcion`,
`fuente_principal`). La ficha 4 muestra además `observacion` como campo opcional de evidencia;
ese texto **no** entra en PIOIC. La expresión SQL equivalente se genera desde la misma constante, de modo que
backend, fichas y reportes no puedan divergir. Ver [../docs/ALINEACION_TESIS.md](../docs/ALINEACION_TESIS.md).

## Pruebas

```bash
npm test          # Jest + Supertest
npm run test:watch
```

Cobertura funcional: cálculo de TPRE, PER, PEEA y PIOIC, exclusión de datos sintéticos, idempotencia
del ETL, bitácora de ejecución y autorización de las rutas de administración. Detalle en
[../docs/PRUEBAS.md](../docs/PRUEBAS.md).

## Estructura MVC

`controllers` → `services` → `repositories` / `models`

Carpeta `src/datamart/` contiene el diseño del esquema estrella y el ETL.
