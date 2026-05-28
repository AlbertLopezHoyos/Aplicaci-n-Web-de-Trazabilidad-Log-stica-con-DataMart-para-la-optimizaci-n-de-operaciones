/**
 * Definiciones de métricas y KPIs para capa analítica / BI
 * Referencia para implementación futura en Power BI, Metabase, etc.
 */
module.exports = {
  kpis: [
    {
      id: 'OTIF',
      nombre: 'On Time In Full',
      formula: 'COUNT(entregado_a_tiempo=1) / COUNT(entregas) * 100',
      tabla: 'fact_operaciones_logisticas',
    },
    {
      id: 'LEAD_TIME',
      nombre: 'Tiempo promedio de tránsito (días)',
      formula: 'AVG(dias_transito)',
      tabla: 'fact_operaciones_logisticas',
    },
    {
      id: 'TASA_INCIDENCIAS',
      nombre: 'Incidencias por cada 100 envíos',
      formula: 'SUM(cantidad_incidencias) / COUNT(*) * 100',
      tabla: 'fact_operaciones_logisticas',
    },
    {
      id: 'PRODUCTIVIDAD_OPERADOR',
      nombre: 'Entregas por operador',
      formula: 'COUNT(*) GROUP BY id_dim_operador',
      tabla: 'fact_operaciones_logisticas',
    },
  ],
};
