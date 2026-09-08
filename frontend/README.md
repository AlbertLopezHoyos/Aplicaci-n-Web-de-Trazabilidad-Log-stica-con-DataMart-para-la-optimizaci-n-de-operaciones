# Frontend - Trazabilidad Logística

Interfaz React inspirada en **Grupo Logístico Salazar S.A.C.** — azul corporativo, diseño empresarial responsive.

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

### Sin base de datos (modo demo)

En `.env` deja `VITE_DEMO_MODE=true` (viene así por defecto). Abre el navegador y entrarás **directo al dashboard** como administrador, con datos simulados. No hace falta backend ni MySQL.

Cuando conectes MySQL, cambia a `VITE_DEMO_MODE=false` y levanta el backend.

## Módulos

| Ruta | Función | Rol |
|------|---------|-----|
| /login | Autenticación JWT | Público |
| /dashboard | KPIs y gráficos Recharts | Autenticado |
| /envios | CRUD con filtros y paginación | Autenticado |
| /clientes | Gestión de clientes | Autenticado |
| /seguimiento | Timeline y cambio de estados | Autenticado |
| /incidencias | Registro de incidencias operativas (PIOIC) | Autenticado |
| /reportes | Export PDF/Excel | Autenticado |
| /observacion | Fichas de observación por dimensión (TPRE, PER, PEEA, PIOIC) | Autenticado |
| /medicion | Medición de investigación: preprueba vs. posprueba | **Administrador** |
| /datamart | Esquema estrella, ETL y KPIs analíticos | **Administrador** |

## Indicadores de investigación en la interfaz

- **`/observacion`** muestra las fichas de cada dimensión con un selector de alcance:
  *Muestra de investigación* (por defecto, solo registros reales de preprueba y posprueba) o
  *Toda la operación* (incluye los datos sintéticos del DataMart, con advertencia visible).
- **`/medicion`** presenta preprueba y posprueba **por separado** para TPRE, PER, PEEA y PIOIC, con
  el numerador y el denominador de cada fórmula, y permite exportar la ficha de cada dimensión por
  grupo. Estos indicadores **no** se mezclan con los KPI analíticos del DataMart.
- **`/datamart`** advierte explícitamente que el conjunto masivo cargado contiene datos sintéticos
  generados para pruebas técnicas, que no participan del contraste de hipótesis.
