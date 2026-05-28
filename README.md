# Aplicación Web de Trazabilidad Logística con DataMart

**Tesis 2026** — Optimización de operaciones en empresa logística (Lima).

Referencia corporativa: [Grupo Logístico Salazar S.A.C.](https://www.gruposalazarperu.com/) — transporte de carga, reparto, mudanzas y logística.

## Objetivo del sistema

- Registrar y gestionar envíos con trazabilidad completa
- Seguimiento logístico con línea de tiempo (recibido → en tránsito → entregado / retrasado / cancelado)
- Reducir errores mediante incidencias y evidencias documentales
- Reportes operativos exportables (PDF / Excel)
- Arquitectura preparada para **DataMart** y Business Intelligence

## Estructura del proyecto

```
├── backend/     Node.js + Express + MySQL + Sequelize (MVC)
└── frontend/    React + Vite + Tailwind + Recharts
```

## Requisitos

- Node.js 18+
- MySQL 8.0+

## Instalación rápida

### 1. Base de datos

Ejecutar en MySQL Workbench o phpMyAdmin:

`backend/database/scripts/01_schema_completo.sql`

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

## Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@salazarlogistica.pe | Admin123! |
| Operador logístico | operador@salazarlogistica.pe | Operador123! |

## Módulos implementados

1. **Autenticación** — JWT, bcrypt, roles Administrador / Operador logístico  
2. **Dashboard** — KPIs, gráficos Recharts, accesos rápidos  
3. **Envíos** — CRUD, filtros, búsqueda, paginación  
4. **Seguimiento** — Actualización de estados + timeline  
5. **Incidencias** — Errores, retrasos, severidad, estados  
6. **Reportes** — envios_estado, tiempos, incidencias, productividad (PDF/Excel)  
7. **Evidencias** — Multer: imágenes, PDF, comprobantes  
8. **DataMart** — Esquema estrella, ETL staging, métricas KPI documentadas  

## Base de datos

Tablas operacionales: `usuarios`, `roles`, `envios`, `estados_envio`, `historial_estados`, `incidencias`, `reportes`, `evidencias`, `clientes`, `auditoria`

Tablas analíticas: `fact_operaciones_logisticas`, `dim_fecha`, `dim_cliente`, `dim_estado`, `dim_operador`

Incluye: procedimientos almacenados, vistas SQL, triggers de auditoría.

## Seguridad

- JWT en rutas protegidas  
- Contraseñas con bcrypt  
- Validación express-validator + sanitización básica  
- Manejo centralizado de errores  
- Registro en tabla `auditoria`  

## Documentación adicional

- [backend/README.md](backend/README.md)  
- [frontend/README.md](frontend/README.md)  
- [backend/src/datamart/star-schema.design.js](backend/src/datamart/star-schema.design.js)  

## Autor

Proyecto de tesis — Lima 2026
