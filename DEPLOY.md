# Despliegue en la nube — Trazabilidad Logística

Stack recomendado (gratis / bajo costo para demo):

| Componente | Servicio |
|------------|----------|
| MySQL | **Railway** |
| Backend API | **Render** |
| Frontend React | **Vercel** |

---

## Paso 1 — Subir código a GitHub

El repo debe tener el código actualizado en `main`.

---

## Paso 2 — MySQL en Railway

1. Entra a [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project** → **Provision MySQL**
3. Clic en el servicio MySQL → pestaña **Variables** o **Connect**
4. Anota:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
5. En **Settings** → **Networking** → activa **Public Networking** (TCP proxy) si quieres conectar desde Workbench.
6. En **MySQL Workbench** (conexión con host/puerto público de Railway):
   - Ejecuta `backend/database/scripts/01_schema_railway.sql` (o `01_schema_completo.sql` adaptado a BD `railway`)
   - Ejecuta `backend/database/scripts/02_medicion_fichas_railway.sql`
   - Ejecuta `backend/database/scripts/03_dimension4_gestion_informacion.sql` (PIOIC / incidencias)
   - Ejecuta `backend/database/scripts/07_muestra_investigacion.sql` (muestra vs. datos sintéticos, bitácora ETL)

> Host público típico: `tokaido.proxy.rlwy.net` — el puerto lo ves en Railway → MySQL → Connect.

---

## Paso 2b — Carga masiva DataMart en Railway (≥ 5,000 registros)

Desde tu PC, **sin cambiar** el `.env` local (usa un archivo aparte):

### 1. Obtener credenciales en Railway

1. [railway.app](https://railway.app) → tu proyecto → servicio **MySQL**
2. Pestaña **Variables** o **Connect**
3. Anota: `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`

### 2. Crear `backend/.env.railway`

```powershell
cd backend
copy .env.railway.example .env.railway
```

Edita `.env.railway` y pega tu password de Railway (no lo subas a GitHub).

### 3. Ejecutar pipeline (5–10 min)

```powershell
npm run db:railway:all
```

Esto hace en orden:

| Paso | Qué hace |
|------|----------|
| `db:seed` | Contraseñas + 8 envíos demo (si vacío) |
| `db:seed-bulk` | Hasta **5.500** envíos históricos |
| `db:fix-estados` | ~99% entregado/cancelado según fecha |
| `db:etl` | Carga **fact_operaciones_logisticas** |

### 4. Verificar en producción

1. Abre https://aplicaci-n-web-de-trazabilidad-log.vercel.app
2. Login admin → **DataMart**
3. Debe aparecer: *“Listo para sustentación: 5,500 registros”* y KPIs (OTIF, lead time)

### Comandos por separado (opcional)

Con `.env.railway` configurado, puedes correr solo un paso apuntando a Railway:

```powershell
# Cargar env Railway en la sesión (PowerShell)
Get-Content .env.railway | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }
npm run db:seed-bulk
npm run db:fix-estados
npm run db:etl
```

O usa el atajo: `npm run db:railway:all`

---

## Paso 3 — Backend en Render

1. [render.com](https://render.com) → **Sign up with GitHub**
2. **New** → **Web Service** → conecta tu repo
3. Configuración:

| Campo | Valor |
|-------|--------|
| Name | `trazabilidad-api` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance | Free |

4. **Environment Variables**:

```
NODE_ENV=production
PORT=10000
DB_HOST=<MYSQLHOST de Railway>
DB_PORT=<MYSQLPORT>
DB_NAME=<MYSQLDATABASE>
DB_USER=<MYSQLUSER>
DB_PASSWORD=<MYSQLPASSWORD>
DB_SSL=true
JWT_SECRET=<clave larga aleatoria min 32 chars>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://TU-APP.vercel.app,http://localhost:5173
UPLOAD_MAX_SIZE=5242880
UPLOAD_PATH=uploads
```

5. **Create Web Service** → espera el deploy.
6. Prueba: `https://TU-API.onrender.com/api/health`

### Cargar datos demo (una vez)

En tu PC, con `.env` apuntando a Railway (host público):

```bash
cd backend
npm run db:seed
```

O ejecuta inserts manualmente en Workbench.

---

## Paso 4 — Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Login with GitHub**
2. **Add New Project** → importa el mismo repo
3. Configuración:

| Campo | Valor |
|-------|--------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. **Environment Variables**:

```
VITE_DEMO_MODE=false
VITE_API_URL=https://TU-API.onrender.com/api
```

5. **Deploy** → copia la URL (ej. `https://trazabilidad-xxx.vercel.app`)

6. Vuelve a **Render** y actualiza `CORS_ORIGIN` con la URL exacta de Vercel → **Manual Deploy**

---

## Paso 5 — Probar

1. Abre la URL de Vercel
2. Login: `admin@salazarlogistica.pe` / `Admin123!`
3. Revisa envíos, reportes, DataMart (ETL)

---

## Redeploy después de cambios

```bash
git add .
git commit -m "descripción del cambio"
git push origin main
```

- **Vercel** y **Render** redeployan automáticamente si el repo está conectado.
- Si cambias tablas SQL, ejecuta migraciones en Railway MySQL.

---

## Notas

- Plan free de Render **duerme** tras ~15 min sin uso; la primera carga puede tardar ~1 min.
- Archivos subidos (evidencias) en Render free son **temporales** (se pierden al redeploy). Para producción real usar S3/Cloudinary.
- No subas `.env` a GitHub; solo variables en los paneles de Render/Vercel.
