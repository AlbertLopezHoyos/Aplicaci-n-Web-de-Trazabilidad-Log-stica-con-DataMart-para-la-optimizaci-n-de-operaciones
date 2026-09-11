# Power BI — archivos de conexión

| Archivo | Uso |
|---------|-----|
| [Conexion-Railway.pbids](./Conexion-Railway.pbids) | Plantilla de conexión MySQL (editar host/puerto/base) |
| [medidas-ejemplo.dax](./medidas-ejemplo.dax) | Medidas DAX OTIF, incidencias, filtros REAL/SINTETICO |

**Guía completa:** [docs/POWERBI.md](../docs/POWERBI.md)

**Setup en Railway (una vez):**

```bash
cd backend
npm run db:powerbi-setup
npm run db:powerbi-test
```
