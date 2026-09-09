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
| /incidencias | Registro de incidencias operativas (PIOIC) | Autenticado |
| /reportes | Export PDF/Excel | Autenticado |
| /observacion | Fichas de observación por dimensión (TPRE, PER, PEEA, PIOIC) | Autenticado |
| /medicion | Medición de investigación: preprueba vs. posprueba | **Administrador** |
| /datamart | Esquema estrella, ETL y KPIs analíticos | **Administrador** |

## Indicadores de investigación en la interfaz

- **`/observacion`** muestra las fichas de cada dimensión. El administrador puede elegir *Muestra de investigación* o *Toda la operación*. Por defecto se abre la operación completa.
- **`/medicion`** presenta preprueba y posprueba **por separado** para TPRE, PER, PEEA y PIOIC, con el numerador y el denominador de cada fórmula, las ventanas de los Anexos 2 y 3, y exportación por grupo. Estos indicadores **no** se mezclan con los KPI analíticos del DataMart.
- **`/datamart`** muestra hechos, dimensiones, KPIs analíticos (OTIF, lead time, incidencias) y la bitácora del ETL.
