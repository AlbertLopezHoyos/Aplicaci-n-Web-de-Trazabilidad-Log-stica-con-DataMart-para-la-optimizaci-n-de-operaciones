/**
 * DISEÑO DEL DATAMART - ESQUEMA ESTRELLA (Kimball)
 * Proyecto: Trazabilidad Logística - Grupo Logístico Salazar S.A.C.
 *
 * Este módulo describe la arquitectura analítica TAL COMO ESTÁ IMPLEMENTADA
 * físicamente en MySQL (ver 01_schema_completo.sql y 07_muestra_investigacion.sql).
 * Documentación ampliada en docs/KIMBALL.md.
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
 * GRANO: una fila de la tabla de hechos representa UNA OPERACIÓN DE ENVÍO.
 * No existen snapshots periódicos: el ETL mantiene una sola fila por
 * id_envio (garantizado por UNIQUE uk_fact_envio) y refresca sus métricas.
 *
 * ADVERTENCIA SOBRE LOS DATOS:
 * la carga masiva (`npm run db:seed-bulk`) genera DATOS SINTÉTICOS para las
 * pruebas técnicas del DataMart, porque los datos históricos reales de la
 * empresa están sujetos a confidencialidad. Esas filas llevan
 * origen_dato = 'SINTETICO' y no participan del contraste de hipótesis.
 */

module.exports = {
  nombre: 'DataMart Operaciones Logísticas',
  version: '2.0.0',
  esquema: 'estrella',
  procesoNegocio: 'Gestión de operaciones logísticas de envíos',
  tablas: {
    hechos: {
      fact_operaciones_logisticas: {
        descripcion: 'Una fila por operación de envío, con sus métricas de desempeño',
        grain: 'Una fila de la tabla de hechos representa una operación de envío',
        tipo: 'Tabla de hechos de una fila por envío, cuyas métricas se refrescan al reejecutar el ETL. No hay snapshots periódicos.',
        clavesForaneas: [
          'id_fecha_registro → dim_fecha',
          'id_fecha_entrega → dim_fecha (rol-playing, puede ser NULL)',
          'id_dim_cliente → dim_cliente',
          'id_dim_estado → dim_estado',
          'id_dim_operador → dim_operador (puede ser NULL)',
        ],
        metricas: {
          peso_kg: { tipo: 'DECIMAL(10,2)', aditividad: 'aditiva' },
          dias_transito: { tipo: 'INT NULL', aditividad: 'semiaditiva (se promedia, no se suma)' },
          cantidad_incidencias: { tipo: 'INT', aditividad: 'aditiva' },
          tuvo_retraso: { tipo: 'TINYINT(1)', aditividad: 'aditiva como conteo de banderas' },
          entregado_a_tiempo: { tipo: 'TINYINT(1) NULL', aditividad: 'aditiva como conteo; NULL si aún no hay entrega' },
        },
        atributosDegenerados: ['codigo_envio'],
        control: ['origen_dato (REAL | SINTETICO)'],
      },
    },
    dimensiones: {
      dim_fecha: {
        tipoImplementado: 'SCD Tipo 0 (dimensión estática precargada 2024-2027)',
        atributos: ['anio', 'trimestre', 'mes', 'nombre_mes', 'dia', 'dia_semana', 'nombre_dia', 'es_fin_semana', 'semana_anio'],
      },
      dim_cliente: {
        tipoImplementado: 'SCD Tipo 1 (sobrescritura, sin historial)',
        nota: 'Las columnas vigente_desde / vigente_hasta / es_actual existen físicamente, pero el ETL nunca cierra versiones: no hay historial. No debe documentarse como Tipo 2.',
        atributos: ['razon_social', 'ruc', 'ciudad', 'distrito', 'segmento'],
      },
      dim_estado: {
        tipoImplementado: 'SCD Tipo 1 (sobrescritura, sin historial)',
        nota: 'Catálogo cerrado de estados operativos; el versionado no aporta valor analítico actual.',
        atributos: ['codigo', 'nombre', 'es_final', 'categoria'],
      },
      dim_operador: {
        tipoImplementado: 'SCD Tipo 1 (sobrescritura, sin historial)',
        nota: 'Un cambio de rol sobrescribe el atributo. Si en el futuro se requiere analizar desempeño por rol histórico, deberá implementarse SCD Tipo 2 real.',
        atributos: ['nombre_completo', 'rol'],
      },
    },
    control: {
      etl_ejecuciones: {
        descripcion: 'Bitácora de cada corrida del ETL',
        campos: ['fecha_inicio', 'fecha_fin', 'estado', 'registros_extraidos', 'registros_transformados', 'registros_cargados', 'mensaje_error'],
      },
    },
  },
  dimensionesEvaluadasNoImplementadas: {
    dim_ruta: {
      decision: 'No implementada',
      motivo: 'Los dashboards y consultas analíticas actuales no agrupan sistemáticamente por origen/destino. Los campos origen y destino permanecen en la tabla operacional envios. Añadirla sería sobreingeniería sin requerimiento que la respalde.',
    },
  },
  etl: {
    extraccion: 'Tablas operacionales: envios, historial_estados, incidencias, clientes, usuarios, estados_envio',
    transformacion: 'Resolución de claves de dimensión, tratamiento de nulos (COALESCE en peso_kg y tipo_carga), descarte de envíos sin fecha_registro y cálculo de métricas derivadas',
    carga: 'INSERT idempotente (NOT EXISTS + UNIQUE uk_fact_envio) en dimensiones y en fact_operaciones_logisticas, más UPDATE de métricas de los hechos existentes',
    idempotencia: 'Reejecutar el ETL actualiza métricas pero no duplica filas de hechos',
    frecuenciaRecomendada: 'Bajo demanda desde /datamart o batch diario',
    bitacora: 'etl_ejecuciones',
  },
  dashboardsBI: [
    'Panel ejecutivo OTIF y lead time',
    'Productividad por operador',
    'Incidencias por tipo y periodo',
    'Tendencia de volumen y peso transportado',
  ],
};
