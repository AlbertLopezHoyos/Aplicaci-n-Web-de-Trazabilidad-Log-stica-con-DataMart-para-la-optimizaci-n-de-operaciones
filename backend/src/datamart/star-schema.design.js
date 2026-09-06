/**
 * DISEÑO INICIAL DEL DATAMART - ESQUEMA ESTRELLA
 * Proyecto: Trazabilidad Logística - Grupo Logístico Salazar S.A.C.
 *
 * Este módulo documenta la arquitectura analítica preparada para BI.
 * Las tablas físicas ya existen en MySQL (fact_*, dim_*).
 *
 *                    ┌─────────────────┐
 *                    │   dim_fecha     │
 *                    └────────┬────────┘
 *                             │
 * ┌──────────────┐   ┌───────▼──────────────────────────┐   ┌──────────────┐
 * │ dim_cliente  │──►│ fact_operaciones_logisticas      │◄──│ dim_estado   │
 * └──────────────┘   └───────▲──────────────────────────┘   └──────────────┘
 *                             │
 *                    ┌────────┴────────┐
 *                    │  dim_operador   │
 *                    └─────────────────┘
 *
 * MÉTRICAS (hechos):
 * - peso_kg, dias_transito, cantidad_incidencias, tuvo_retraso, entregado_a_tiempo
 *
 * KPIs ANALÍTICOS FUTUROS:
 * - OTIF (On Time In Full)
 * - Tasa de incidencias por operador
 * - Volumen de carga por cliente/periodo
 * - Lead time promedio por ruta (origen-destino)
 */

module.exports = {
  nombre: 'DataMart Operaciones Logísticas',
  version: '1.0.0',
  esquema: 'estrella',
  tablas: {
    hechos: {
      fact_operaciones_logisticas: {
        descripcion: 'Registro granular de cada operación de envío para análisis',
        grain: 'Un registro por envío por snapshot de carga ETL',
        metricas: ['peso_kg', 'dias_transito', 'cantidad_incidencias', 'tuvo_retraso', 'entregado_a_tiempo'],
      },
    },
    dimensiones: {
      dim_fecha: { tipo: 'SCD Tipo 0', atributos: ['anio', 'trimestre', 'mes', 'dia_semana', 'es_fin_semana'] },
      dim_cliente: { tipo: 'SCD Tipo 2', atributos: ['razon_social', 'dni', 'segmento'] },
      dim_estado: { tipo: 'SCD Tipo 2', atributos: ['codigo', 'nombre', 'es_final', 'categoria'] },
      dim_operador: { tipo: 'SCD Tipo 2', atributos: ['nombre_completo', 'rol'] },
    },
  },
  etl: {
    extraccion: 'Tablas operacionales: envios, historial_estados, incidencias, clientes, usuarios',
    transformacion: 'Cálculo de métricas derivadas, slowly changing dimensions, limpieza',
    carga: 'INSERT/UPDATE en fact_operaciones_logisticas y dimensiones',
    frecuenciaRecomendada: 'Diaria (batch nocturno) o near-real-time vía cola de eventos',
  },
  dashboardsBI: [
    'Panel ejecutivo OTIF y SLA',
    'Productividad por operador',
    'Mapa de calor de incidencias por tipo',
    'Tendencia de volumen y peso transportado',
  ],
};
