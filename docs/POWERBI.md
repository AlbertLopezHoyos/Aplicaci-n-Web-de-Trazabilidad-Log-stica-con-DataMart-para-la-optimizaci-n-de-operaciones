# Power BI — Conexión remota al DataMart en la nube

Esta guía deja listo **Power BI Desktop** para conectarse al MySQL de **Railway** (misma base que usa Render/Vercel en producción).

---

## 1. Requisitos previos

| Paso | Comando / acción |
|------|------------------|
| DataMart cargado | En la app: **DataMart → Ejecutar ETL**, o `npm run db:etl` |
| Credenciales Railway | Archivo `backend/.env` o `backend/.env.railway` con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Usuario Power BI | Una sola vez: `npm run db:powerbi-setup` (desde `backend/`) |
| Power BI Desktop | Versión reciente con conector **MySQL database** |

---

## 2. Preparar la base (una sola vez)

Desde la carpeta `backend/`:

```bash
# Con las credenciales de Railway en .env
npm run db:powerbi-setup

# O forzando .env.railway
npm run db:powerbi-setup:railway
```

El script:

1. Crea vistas `pbi_*` (solo DataMart, dimensiones vigentes).
2. Crea el usuario **`powerbi`** (en Railway usa `caching_sha2_password`; en local puede usar `mysql_native_password`).
3. Concede **SELECT** únicamente sobre tablas/vistas analíticas.
4. Muestra en consola servidor, puerto, usuario y contraseña.

Verificar la conexión:

```bash
npm run db:powerbi-test
```

Contraseña por defecto: `PowerBISalazar2026` (cámbiela con `POWERBI_DB_PASSWORD` en `.env` antes del setup).

---

## 3. Conectar Power BI Desktop (remoto)

### Opción A — Conector MySQL (recomendada)

1. **Obtener datos** → **Base de datos** → **Base de datos de MySQL**.
2. **Servidor:** `HOST:PUERTO` de Railway  
   Ejemplo: `tokaido.proxy.rlwy.net:18507`  
   (Railway → servicio MySQL → **Connect** → **Public network**).
3. **Base de datos:** valor de `DB_NAME` (ej. `railway`).
4. **Modo de conectividad de datos:** **Importar** (recomendado para ~5 500+ filas).
5. Credenciales:
   - Usuario: `powerbi`
   - Contraseña: la definida en el setup.
6. Si pide SSL: aceptar / usar conexión segura (Railway lo requiere).
7. En el navegador de tablas, seleccionar:

| Vista / tabla | Uso |
|---------------|-----|
| `pbi_fact_operaciones` | Tabla de hechos |
| `pbi_dim_fecha` | Dimensión fecha (role-playing) |
| `pbi_dim_cliente` | Dimensión cliente |
| `pbi_dim_estado` | Dimensión estado |
| `pbi_dim_operador` | Dimensión operador |
| `pbi_etl_ejecuciones` | Bitácora ETL (opcional) |

8. **Cargar** → ir a **Vista de modelo** y crear relaciones (sección 4).

### Opción B — Plantilla `.pbids`

Abrir `powerbi/Conexion-Railway.pbids` con Power BI Desktop. Editar antes el servidor y la base de datos con sus valores de Railway.

### Opción C — CSV (sin MySQL en Power BI)

Si el conector MySQL falla en su red:

```bash
npm run db:export-powerbi:railway
```

Genera CSV en `backend/exports/powerbi/`. En Power BI: **Texto/CSV** → cargar cada archivo → relacionar en el modelo.

---

## 4. Modelo en Power BI (esquema estrella)

Relaciones (desde `pbi_fact_operaciones`):

| Desde (hechos) | Hacia (dimensión) | Cardinalidad |
|----------------|-------------------|--------------|
| `id_fecha_registro` | `pbi_dim_fecha[id_fecha]` | N:1 — renombrar dimensión a **Fecha registro** |
| `id_fecha_entrega` | `pbi_dim_fecha[id_fecha]` | N:1 — duplicar dimensión: **Fecha entrega** |
| `id_dim_cliente` | `pbi_dim_cliente[id_dim_cliente]` | N:1 |
| `id_dim_estado` | `pbi_dim_estado[id_dim_estado]` | N:1 |
| `id_dim_operador` | `pbi_dim_operador[id_dim_operador]` | N:1 |

Para fecha role-playing: en Power BI, cargue `pbi_dim_fecha` dos veces (o use una dimensión y una columna calculada; lo habitual es **duplicar la consulta** y renombrar).

### Filtro de datos sintéticos (tesis)

Los ~5 500 registros de prueba del DataMart tienen `origen_dato = 'SINTETICO'`.  
Para dashboards operativos reales, filtre o excluya en Power Query:

```powerquery
= Table.SelectRows(pbi_fact_operaciones, each [origen_dato] = "REAL")
```

Para análisis de volumen / demostración técnica, use todos o filtre `SINTETICO`.

---

## 5. Medidas DAX de ejemplo

Copie desde `powerbi/medidas-ejemplo.dax` o cree en Power BI:

| Medida | Fórmula resumida |
|--------|------------------|
| Total envíos | `COUNTROWS(pbi_fact_operaciones)` |
| OTIF % | entregados a tiempo / entregados |
| Peso promedio | `AVERAGE(pbi_fact_operaciones[peso_kg])` |
| Tasa incidencias | envíos con incidencias / total |

---

## 6. Actualizar datos

| Escenario | Acción |
|-----------|--------|
| **Import (Desktop)** | Ejecutar ETL en la app o `npm run db:etl` → en Power BI: **Actualizar** |
| **Power BI Service** | Publicar el `.pbix`; programar actualización. MySQL en Railway suele requerir **Puerta de enlace de datos local** instalada en un PC encendido, o seguir en modo Import manual desde Desktop |
| **CSV** | `npm run db:export-powerbi:railway` y volver a cargar archivos |

---

## 7. Seguridad

- El usuario `powerbi` solo tiene **SELECT** sobre el DataMart (vistas `pbi_*` y tablas `dim_*` / `fact_*`).
- No expone tablas OLTP (`envios`, `usuarios`, etc.) salvo lo que el ETL ya consolidó en hechos.
- No suba `.env.railway` ni contraseñas al repositorio.
- Use contraseña distinta a la de `root` en producción (`POWERBI_DB_PASSWORD`).

---

## 8. Solución de problemas

| Síntoma | Solución |
|---------|----------|
| Error de autenticación | Ejecute de nuevo `npm run db:powerbi-setup`; verifique usuario `powerbi` |
| Plugin `caching_sha2_password` | En Railway es el predeterminado; use Power BI Desktop actualizado con SSL |
| `mysql_native_password` no cargado | Normal en Railway; el setup detecta la nube y usa autenticación estándar |
| Tablas vacías | Ejecute ETL: pantalla DataMart o `npm run db:etl` |
| Timeout / firewall | Confirme en Railway que **Public Networking** está activo en MySQL |
| Caracteres raros | Las vistas usan UTF-8; en Power BI elige codificación UTF-8 al importar CSV |

---

## 9. Evidencia para la tesis (HU-21)

1. Captura de **Power BI Desktop** conectado al servidor Railway.
2. Vista de modelo con relaciones del esquema estrella.
3. Visual con filtro `origen_dato` (REAL vs SINTETICO).
4. Consulta de verificación en MySQL:

```sql
SELECT origen_dato, COUNT(*) AS filas
FROM pbi_fact_operaciones
GROUP BY origen_dato;
```
