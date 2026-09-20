# Frontend - Trazabilidad Logística

Interfaz React de **Grupo Logístico Salazar S.A.C.** — paleta institucional (rojo ladrillo y grafito), logos oficiales y diseño responsive.

## Stack

- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Axios · Context API
- Recharts · SweetAlert2 · Lucide Icons

## Instalación

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

Requiere backend en marcha (`VITE_DEMO_MODE=false` y `VITE_API_URL` apuntando a la API).

## Módulos

| Ruta | Función | Rol |
|------|---------|-----|
| /login | Autenticación JWT | Público |
| /dashboard | KPIs y gráficos Recharts | Autenticado |
| /envios | CRUD con filtros, paginación y alcance (todos / mis registros) | Autenticado |
| /clientes | Gestión de clientes | Autenticado |
| /seguimiento | Timeline y cambio de estados | Autenticado |
| /incidencias | Registro de incidencias operativas (PDIOIC) | Autenticado |
| /reportes | Export PDF/Excel | Autenticado |
| /observacion | Fichas de observación por dimensión (TPDRE, PDRE, PDEEA, PDIOIC) | Autenticado |
| /medicion | Medición de las jornadas posteriores a la implementación | **Administrador** |
| /datamart | Esquema estrella, ETL y KPIs analíticos | **Administrador** |

## Indicadores de investigación en la interfaz

- **`/observacion`** muestra una fila por jornada y permite exportar las cuatro fichas. Solo lectura: no aleatoriza ni modifica registros.
- **`/medicion`** presenta TPDRE, PDRE, PDEEA y PDIOIC de las jornadas posteriores a la implementación. No muestra preprueba ni comparación pre-post. Estos indicadores **no** se mezclan con los KPI analíticos del DataMart.
- **`/datamart`** muestra hechos, dimensiones, KPIs analíticos (OTIF, lead time, incidencias) y la bitácora del ETL.
