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
| /incidencias | Registro de incidencias operativas | Autenticado |
| /reportes | Export PDF/Excel | Autenticado |
| /datamart | Análisis de operaciones, esquema estrella, ETL y KPIs analíticos | **Administrador** |

## Análisis de operaciones

`/datamart` muestra hechos, dimensiones, KPIs analíticos (OTIF, lead time, incidencias) y la bitácora del ETL. Es la interfaz de H.U.18.
