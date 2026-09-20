# Diagramas por sprint — dbdiagram.io

Scripts DBML alineados con los cinco sprints Scrum (secciones 3.1–3.5) y con el modelo Kimball.

Describen el modelo operacional y el DataMart de la solución tecnológica.

## Uso

1. Abrir [dbdiagram.io](https://dbdiagram.io/home)
2. Pegar el contenido del `.dbml` del sprint
3. **Auto Arrange** → Export PNG/PDF para la tesis

## Vistas generales (todas las tablas)

| Vista | Archivo | Contenido |
|-------|---------|-----------|
| Operacional (OLTP) | `modelo-operacional.dbml` | 12 tablas transaccionales de la app |
| DataMart (Kimball) | `modelo-datamart.dbml` | 4 dimensiones + 1 hecho + bitácora ETL |
| Completo | `modelo-completo.dbml` | OLTP + DataMart con linaje ETL |

## Correspondencia sprint → entregable

| Sprint | Archivo | Incremento en el diagrama | Pantallas / servicios |
|--------|---------|---------------------------|------------------------|
| 1 | `sprint-01-base-seguridad.dbml` | `roles`, `usuarios`, `clientes`, `auditoria` | Login, usuarios, ClientesPage |
| 2 | `sprint-02-nucleo-envios.dbml` | `estados_envio`, `envios`, `errores_registro` | EnviosPage, EnvioFormPage |
| 3 | `sprint-03-trazabilidad.dbml` | `historial_estados`, `incidencias`, `evidencias` | SeguimientoPage, IncidenciasPage |
| 4 | `sprint-04-reportes.dbml` | `dashboard_operativo`, `reportes` | DashboardPage, ReportesPage |
| 5 | `sprint-05-analisis-operaciones.dbml` | `aplicacion_web`, `etl_ejecuciones`, `componente_analitico`, `analisis_operaciones` | DataMartPage, RF18 |
| Kimball | `sprint-06-datamart.dbml` | `dim_*`, `fact_*` | ETL, Power BI (nombre de archivo histórico; **no** es un Sprint 6 de Scrum) |
| — | `sprint-06-vista-completa.dbml` | Modelo integrado OLTP + DataMart | Arquitectura de datos |

## Sprint 5 (RF18)

Scrum documenta solo la **integración funcional**:

`Aplicación web → Información operacional → Componente analítico → Análisis de operaciones`

El diseño dimensional (`dim_*`, `fact_*`) está en **`sprint-06-datamart.dbml`** (Kimball; el número 06 es el nombre del archivo, no un sexto sprint Scrum).

Las tablas sin color son **contexto** de sprints anteriores; las coloreadas son el **incremento** del sprint.
