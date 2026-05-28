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

| Ruta | Función |
|------|---------|
| /login | Autenticación JWT |
| /dashboard | KPIs y gráficos Recharts |
| /envios | CRUD con filtros y paginación |
| /seguimiento | Timeline y cambio de estados |
| /incidencias | Registro de errores y retrasos |
| /reportes | Export PDF/Excel |
| /datamart | Vista diseño BI y ETL (admin) |
