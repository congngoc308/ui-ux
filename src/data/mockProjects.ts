import { LineageNodeData, LineageEdgeData, HITLQueueItem } from '../types/lineage';

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  nodes: LineageNodeData[];
  edges: LineageEdgeData[];
  hitlQueue: HITLQueueItem[];
}

export const mockEcommerceProject: ProjectData = {
  id: 'ecommerce-lakehouse',
  name: 'E-Commerce & Marketing Lakehouse',
  description: 'dbt Core pipeline transforming raw Shopify, Stripe & Ad platforms data into Gold Analytics Marts and Executive BI Dashboards.',
  nodes: [
    // Source Layer
    {
      id: 'raw_shopify_orders',
      name: 'raw_shopify_orders',
      schema: 'source_raw',
      layer: 'source',
      type: 'source_stream',
      description: 'Stream of raw customer orders directly ingested from Shopify Webhooks into S3 / Iceberg.',
      owner: 'Data Ingestion Team',
      tags: ['source', 'shopify', 'p0_stream'],
      freshness: '5 mins ago',
      rowCount: 1420500,
      qualityScore: 99.4,
      filePath: 'models/sources/shopify_sources.yml',
      columns: [
        { name: 'id', type: 'VARCHAR', isPrimaryKey: true, description: 'Order unique identifier' },
        { name: 'customer_id', type: 'VARCHAR', isForeignKey: true, description: 'Customer identifier' },
        { name: 'total_amount', type: 'DECIMAL(12,2)', description: 'Order gross amount' },
        { name: 'currency', type: 'VARCHAR(3)', description: 'ISO currency code' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' },
        { name: 'status', type: 'VARCHAR', description: 'Order fulfillment status' }
      ]
    },
    {
      id: 'raw_stripe_payments',
      name: 'raw_stripe_payments',
      schema: 'source_raw',
      layer: 'source',
      type: 'source_stream',
      description: 'Raw Stripe payment gateway event ledger containing charge IDs, fees and refund states.',
      owner: 'FinOps Team',
      tags: ['source', 'stripe', 'finance'],
      freshness: '12 mins ago',
      rowCount: 1390200,
      qualityScore: 99.8,
      filePath: 'models/sources/stripe_sources.yml',
      columns: [
        { name: 'charge_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'order_id', type: 'VARCHAR', isForeignKey: true },
        { name: 'amount_cents', type: 'BIGINT' },
        { name: 'fee_cents', type: 'BIGINT' },
        { name: 'payment_method', type: 'VARCHAR' },
        { name: 'payment_status', type: 'VARCHAR' },
        { name: 'captured_at', type: 'TIMESTAMP' }
      ]
    },
    {
      id: 'raw_google_ad_spend',
      name: 'raw_google_ad_spend',
      schema: 'source_raw',
      layer: 'source',
      type: 'source_stream',
      description: 'Daily marketing spend and impression metrics from Google Ads API connector.',
      owner: 'Growth Marketing',
      tags: ['source', 'marketing', 'ads'],
      freshness: '1 hour ago',
      rowCount: 450000,
      qualityScore: 98.2,
      filePath: 'models/sources/marketing_sources.yml',
      columns: [
        { name: 'campaign_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'date', type: 'DATE' },
        { name: 'spend_usd', type: 'DECIMAL(10,2)' },
        { name: 'clicks', type: 'INT' },
        { name: 'impressions', type: 'INT' }
      ]
    },
    {
      id: 'raw_legacy_crm_logs',
      name: 'raw_legacy_crm_logs',
      schema: 'source_raw',
      layer: 'source',
      type: 'table',
      description: 'Legacy CRM database audit dump containing customer lifecycle notes with unstructured payloads.',
      owner: 'Sales Operations',
      tags: ['legacy', 'crm', 'unstructured'],
      freshness: '6 hours ago',
      rowCount: 820000,
      qualityScore: 89.1,
      isDynamicSql: true,
      filePath: 'models/sources/legacy_crm.sql',
      columns: [
        { name: 'log_id', type: 'BIGINT', isPrimaryKey: true },
        { name: 'entity_type', type: 'VARCHAR' },
        { name: 'entity_id', type: 'VARCHAR' },
        { name: 'event_payload_json', type: 'JSON' },
        { name: 'recorded_at', type: 'TIMESTAMP' }
      ]
    },

    // Staging Layer
    {
      id: 'stg_orders',
      name: 'stg_orders',
      schema: 'staging',
      layer: 'staging',
      type: 'view',
      description: 'Standardized order records with cleaned timezone, normalized currencies, and deduplication logic.',
      owner: 'Data Engineering',
      tags: ['staging', 'dbt', 'orders'],
      freshness: '15 mins ago',
      rowCount: 1418000,
      qualityScore: 99.9,
      filePath: 'models/staging/stg_orders.sql',
      rawSql: `WITH source AS (
  SELECT * FROM {{ source('source_raw', 'raw_shopify_orders') }}
),
cleaned AS (
  SELECT
    id AS order_id,
    customer_id,
    CAST(total_amount AS DECIMAL(12,2)) AS order_total_usd,
    UPPER(currency) AS currency,
    LOWER(status) AS order_status,
    created_at AS order_created_at
  FROM source
  WHERE id IS NOT NULL
)
SELECT * FROM cleaned`,
      columns: [
        { name: 'order_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'customer_id', type: 'VARCHAR', isForeignKey: true },
        { name: 'order_total_usd', type: 'DECIMAL(12,2)' },
        { name: 'currency', type: 'VARCHAR(3)' },
        { name: 'order_status', type: 'VARCHAR' },
        { name: 'order_created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      id: 'stg_payments',
      name: 'stg_payments',
      schema: 'staging',
      layer: 'staging',
      type: 'view',
      description: 'Staging table converting Stripe cents into USD dollars and classifying payment methods.',
      owner: 'Data Engineering',
      tags: ['staging', 'dbt', 'payments'],
      freshness: '15 mins ago',
      rowCount: 1390000,
      qualityScore: 100,
      filePath: 'models/staging/stg_payments.sql',
      rawSql: `WITH source AS (
  SELECT * FROM {{ source('source_raw', 'raw_stripe_payments') }}
)
SELECT
  charge_id,
  order_id,
  amount_cents / 100.0 AS payment_amount_usd,
  fee_cents / 100.0 AS payment_fee_usd,
  payment_method,
  payment_status,
  captured_at
FROM source`,
      columns: [
        { name: 'charge_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'order_id', type: 'VARCHAR', isForeignKey: true },
        { name: 'payment_amount_usd', type: 'DECIMAL(12,2)' },
        { name: 'payment_fee_usd', type: 'DECIMAL(10,2)' },
        { name: 'payment_method', type: 'VARCHAR' },
        { name: 'payment_status', type: 'VARCHAR' },
        { name: 'captured_at', type: 'TIMESTAMP' }
      ]
    },
    {
      id: 'stg_ad_spend',
      name: 'stg_ad_spend',
      schema: 'staging',
      layer: 'staging',
      type: 'view',
      description: 'Cleaned marketing ad spend by campaign and normalized date partition.',
      owner: 'Analytics Engineering',
      tags: ['staging', 'marketing'],
      freshness: '1 hour ago',
      rowCount: 450000,
      qualityScore: 99.0,
      filePath: 'models/staging/stg_ad_spend.sql',
      columns: [
        { name: 'campaign_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'ad_date', type: 'DATE' },
        { name: 'spend_usd', type: 'DECIMAL(10,2)' },
        { name: 'clicks', type: 'INT' },
        { name: 'impressions', type: 'INT' }
      ]
    },
    {
      id: 'stg_legacy_crm_events',
      name: 'stg_legacy_crm_events',
      schema: 'staging',
      layer: 'staging',
      type: 'table',
      description: 'Parsed JSON attributes extracted from legacy CRM log entries using dynamic SQL procedures.',
      owner: 'Data Engineering',
      tags: ['staging', 'dynamic_sql', 'hitl_reviewed'],
      freshness: '6 hours ago',
      rowCount: 815000,
      qualityScore: 91.5,
      isDynamicSql: true,
      hasJinja: true,
      filePath: 'models/staging/stg_legacy_crm_events.sql',
      rawSql: `/* Dynamic SQL Unpivot & Jinja Macro Extraction */
{% set event_fields = ['churn_intent_flag', 'satisfaction_score', 'nps_rating'] %}
SELECT
  log_id,
  entity_id AS customer_id,
  {% for field in event_fields %}
    JSON_EXTRACT_SCALAR(event_payload_json, '$.{{ field }}') AS {{ field }},
  {% endfor %}
  recorded_at
FROM {{ source('source_raw', 'raw_legacy_crm_logs') }}`,
      columns: [
        { name: 'log_id', type: 'BIGINT', isPrimaryKey: true },
        { name: 'customer_id', type: 'VARCHAR', isForeignKey: true },
        { name: 'churn_intent_flag', type: 'BOOLEAN' },
        { name: 'satisfaction_score', type: 'INT' },
        { name: 'nps_rating', type: 'INT' },
        { name: 'recorded_at', type: 'TIMESTAMP' }
      ]
    },

    // Intermediate Layer
    {
      id: 'int_orders_joined_payments',
      name: 'int_orders_joined_payments',
      schema: 'intermediate',
      layer: 'intermediate',
      type: 'materialized_view',
      description: 'Intermediate reconciliation combining order headers with verified Stripe transaction states.',
      owner: 'Analytics Engineering',
      tags: ['intermediate', 'core_logic'],
      freshness: '20 mins ago',
      rowCount: 1410000,
      qualityScore: 99.7,
      filePath: 'models/intermediate/int_orders_joined_payments.sql',
      rawSql: `SELECT
  o.order_id,
  o.customer_id,
  o.order_total_usd,
  COALESCE(p.payment_amount_usd, 0) AS actual_paid_usd,
  COALESCE(p.payment_fee_usd, 0) AS processor_fee_usd,
  o.order_status,
  p.payment_method,
  o.order_created_at
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('stg_payments') }} p
  ON o.order_id = p.order_id`,
      columns: [
        { name: 'order_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'customer_id', type: 'VARCHAR', isForeignKey: true },
        { name: 'order_total_usd', type: 'DECIMAL(12,2)' },
        { name: 'actual_paid_usd', type: 'DECIMAL(12,2)' },
        { name: 'processor_fee_usd', type: 'DECIMAL(10,2)' },
        { name: 'order_status', type: 'VARCHAR' },
        { name: 'payment_method', type: 'VARCHAR' },
        { name: 'order_created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      id: 'int_customer_rfm_metrics',
      name: 'int_customer_rfm_metrics',
      schema: 'intermediate',
      layer: 'intermediate',
      type: 'table',
      description: 'Recency, Frequency, Monetary (RFM) calculations aggregate by customer profile.',
      owner: 'Data Science & Analytics',
      tags: ['intermediate', 'rfm', 'ml_prep'],
      freshness: '30 mins ago',
      rowCount: 295000,
      qualityScore: 99.2,
      filePath: 'models/intermediate/int_customer_rfm_metrics.sql',
      columns: [
        { name: 'customer_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'total_orders', type: 'INT' },
        { name: 'lifetime_spent_usd', type: 'DECIMAL(14,2)' },
        { name: 'first_order_date', type: 'TIMESTAMP' },
        { name: 'last_order_date', type: 'TIMESTAMP' },
        { name: 'avg_order_value_usd', type: 'DECIMAL(10,2)' }
      ]
    },

    // Marts / Gold Layer
    {
      id: 'fct_daily_sales_revenue',
      name: 'fct_daily_sales_revenue',
      schema: 'analytics_marts',
      layer: 'marts',
      type: 'table',
      description: 'Gold analytical fact table for daily executive revenue, net profit margins, and discount tracking.',
      owner: 'Lead Analytics Engineer',
      tags: ['gold', 'marts', 'p0_business'],
      freshness: '30 mins ago',
      rowCount: 1850,
      qualityScore: 100,
      filePath: 'models/marts/fct_daily_sales_revenue.sql',
      columns: [
        { name: 'sale_date', type: 'DATE', isPrimaryKey: true },
        { name: 'gross_revenue_usd', type: 'DECIMAL(14,2)' },
        { name: 'net_revenue_usd', type: 'DECIMAL(14,2)' },
        { name: 'total_transaction_fees', type: 'DECIMAL(10,2)' },
        { name: 'total_orders_count', type: 'INT' },
        { name: 'unique_purchasers', type: 'INT' }
      ]
    },
    {
      id: 'dim_customers_360',
      name: 'dim_customers_360',
      schema: 'analytics_marts',
      layer: 'marts',
      type: 'table',
      description: 'Unified customer 360 profile combining transactional history, lifetime value, and support NPS scores.',
      owner: 'Lead Analytics Engineer',
      tags: ['gold', 'dimension', 'customer_360'],
      freshness: '45 mins ago',
      rowCount: 295000,
      qualityScore: 98.9,
      filePath: 'models/marts/dim_customers_360.sql',
      columns: [
        { name: 'customer_id', type: 'VARCHAR', isPrimaryKey: true },
        { name: 'customer_tier', type: 'VARCHAR' },
        { name: 'lifetime_value_usd', type: 'DECIMAL(14,2)' },
        { name: 'rfm_segment', type: 'VARCHAR' },
        { name: 'nps_rating', type: 'INT' },
        { name: 'churn_risk_score', type: 'DECIMAL(4,3)' }
      ]
    },
    {
      id: 'fct_marketing_roi',
      name: 'fct_marketing_roi',
      schema: 'analytics_marts',
      layer: 'marts',
      type: 'table',
      description: 'Blended Customer Acquisition Cost (CAC) and Return on Ad Spend (ROAS) facts.',
      owner: 'Growth Analytics',
      tags: ['gold', 'marts', 'marketing'],
      freshness: '1 hour ago',
      rowCount: 1850,
      qualityScore: 98.4,
      filePath: 'models/marts/fct_marketing_roi.sql',
      columns: [
        { name: 'report_date', type: 'DATE', isPrimaryKey: true },
        { name: 'channel', type: 'VARCHAR' },
        { name: 'ad_spend_usd', type: 'DECIMAL(12,2)' },
        { name: 'attributed_revenue_usd', type: 'DECIMAL(12,2)' },
        { name: 'blended_roas', type: 'DECIMAL(6,2)' },
        { name: 'new_customers_acquired', type: 'INT' }
      ]
    },

    // Downstream Applications (BI, ML, Reverse ETL)
    {
      id: 'bi_executive_revenue_dashboard',
      name: 'Executive Revenue & CAC Dashboard (Tableau)',
      schema: 'bi_consumers',
      layer: 'bi_dashboard',
      type: 'dashboard',
      description: 'Critical Board of Directors & C-Level revenue metrics dashboard viewed daily.',
      owner: 'VP of Finance & Data',
      tags: ['bi', 'tableau', 'critical_c_suite'],
      freshness: 'Realtime Sync',
      rowCount: 0,
      qualityScore: 100,
      columns: [
        { name: 'metric_daily_gross_rev', type: 'KPI' },
        { name: 'metric_net_margin_pct', type: 'KPI' },
        { name: 'metric_blended_roas', type: 'KPI' }
      ]
    },
    {
      id: 'reverse_etl_hubspot_sync',
      name: 'HubSpot High-Value Customer Sync (Census/Hightouch)',
      schema: 'reverse_etl',
      layer: 'reverse_etl',
      type: 'view',
      description: 'Automated reverse ETL pipeline syncing VIP customer segments to sales team CRM.',
      owner: 'RevOps Team',
      tags: ['reverse_etl', 'hubspot', 'crm_sync'],
      freshness: 'Hourly Sync',
      rowCount: 25000,
      qualityScore: 99.5,
      columns: [
        { name: 'customer_id', type: 'VARCHAR' },
        { name: 'customer_tier', type: 'VARCHAR' },
        { name: 'lifetime_value_usd', type: 'DECIMAL(14,2)' }
      ]
    },
    {
      id: 'ml_churn_prediction_feature_store',
      name: 'Customer Churn XGBoost Feature Store (Feast)',
      schema: 'ml_platform',
      layer: 'feature_store',
      type: 'ml_feature',
      description: 'Online & offline machine learning feature table used by production churn prevention inference model.',
      owner: 'ML Engineering Team',
      tags: ['ml', 'feature_store', 'xgboost', 'production_model'],
      freshness: 'Daily Batch',
      rowCount: 295000,
      qualityScore: 97.8,
      columns: [
        { name: 'customer_id', type: 'VARCHAR' },
        { name: 'rfm_segment', type: 'VARCHAR' },
        { name: 'avg_order_value_usd', type: 'DECIMAL(10,2)' },
        { name: 'churn_risk_score', type: 'FLOAT' }
      ]
    }
  ],

  edges: [
    // Source -> Staging (Parser First: sqlglot = 1.0)
    {
      id: 'edge_raw_shopify_to_stg_orders',
      source: 'raw_shopify_orders',
      target: 'stg_orders',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Direct source() reference in stg_orders.sql parsed deterministically by sqlglot AST.',
      columnMappings: [
        { sourceCol: 'id', targetCol: 'order_id' },
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'total_amount', targetCol: 'order_total_usd' },
        { sourceCol: 'status', targetCol: 'order_status' }
      ]
    },
    {
      id: 'edge_raw_stripe_to_stg_payments',
      source: 'raw_stripe_payments',
      target: 'stg_payments',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Direct source() reference in stg_payments.sql verified by sqlglot syntax tree.',
      columnMappings: [
        { sourceCol: 'charge_id', targetCol: 'charge_id' },
        { sourceCol: 'order_id', targetCol: 'order_id' },
        { sourceCol: 'amount_cents', targetCol: 'payment_amount_usd' }
      ]
    },
    {
      id: 'edge_raw_google_ads_to_stg_ad_spend',
      source: 'raw_google_ad_spend',
      target: 'stg_ad_spend',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Standard 1-to-1 extraction verified by sqlglot AST parser.',
      columnMappings: [
        { sourceCol: 'campaign_id', targetCol: 'campaign_id' },
        { sourceCol: 'spend_usd', targetCol: 'spend_usd' }
      ]
    },

    // Source -> Staging (LLM Fallback due to dynamic SQL / Jinja)
    {
      id: 'edge_legacy_crm_to_stg_crm_events',
      source: 'raw_legacy_crm_logs',
      target: 'stg_legacy_crm_events',
      confidence: 0.94,
      inferredBy: 'gemini_llm',
      status: 'active',
      reasoning: 'Dynamic Jinja iteration `{% for field in event_fields %}` with JSON_EXTRACT_SCALAR inferred via LLM fallback analyzer.',
      columnMappings: [
        { sourceCol: 'entity_id', targetCol: 'customer_id' },
        { sourceCol: 'event_payload_json', targetCol: 'churn_intent_flag' },
        { sourceCol: 'event_payload_json', targetCol: 'nps_rating' }
      ]
    },

    // Staging -> Intermediate
    {
      id: 'edge_stg_orders_to_int_orders_payments',
      source: 'stg_orders',
      target: 'int_orders_joined_payments',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Deterministic LEFT JOIN ref("stg_orders") validated by sqlglot AST analyzer.',
      columnMappings: [
        { sourceCol: 'order_id', targetCol: 'order_id' },
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'order_total_usd', targetCol: 'total_order_amount_usd' },
        { sourceCol: 'order_status', targetCol: 'order_status' },
        { sourceCol: 'order_created_at', targetCol: 'order_created_at' }
      ]
    },
    {
      id: 'edge_stg_payments_to_int_orders_payments',
      source: 'stg_payments',
      target: 'int_orders_joined_payments',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Deterministic JOIN on order_id validated by sqlglot AST analyzer.',
      columnMappings: [
        { sourceCol: 'order_id', targetCol: 'order_id' },
        { sourceCol: 'payment_amount_usd', targetCol: 'total_paid_usd' },
        { sourceCol: 'payment_fee_usd', targetCol: 'payment_fee_usd' },
        { sourceCol: 'payment_method', targetCol: 'primary_payment_method' },
        { sourceCol: 'payment_status', targetCol: 'payment_status' }
      ]
    },
    {
      id: 'edge_stg_orders_to_int_rfm',
      source: 'stg_orders',
      target: 'int_customer_rfm_metrics',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Aggregation query `GROUP BY customer_id` parsed via sqlglot.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'order_id', targetCol: 'total_orders_count', transformType: 'COUNT()' },
        { sourceCol: 'order_total_usd', targetCol: 'lifetime_spend_usd', transformType: 'SUM()' },
        { sourceCol: 'order_total_usd', targetCol: 'average_order_value_usd', transformType: 'AVG()' },
        { sourceCol: 'order_created_at', targetCol: 'last_order_timestamp', transformType: 'MAX()' }
      ]
    },

    // Intermediate / Staging -> Marts
    {
      id: 'edge_int_orders_payments_to_fct_daily_revenue',
      source: 'int_orders_joined_payments',
      target: 'fct_daily_sales_revenue',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Direct reference in fct_daily_sales_revenue.sql parsed by sqlglot.',
      columnMappings: [
        { sourceCol: 'order_id', targetCol: 'total_orders', transformType: 'COUNT(DISTINCT)' },
        { sourceCol: 'total_order_amount_usd', targetCol: 'gross_revenue_usd', transformType: 'SUM()' },
        { sourceCol: 'payment_fee_usd', targetCol: 'net_revenue_usd', transformType: 'SUM(rev - fees)' },
        { sourceCol: 'order_created_at', targetCol: 'sales_date', transformType: 'DATE_TRUNC' }
      ]
    },
    {
      id: 'edge_int_rfm_to_dim_customers_360',
      source: 'int_customer_rfm_metrics',
      target: 'dim_customers_360',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Core customer profile join parsed by sqlglot.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'lifetime_spend_usd', targetCol: 'lifetime_spend_usd' },
        { sourceCol: 'total_orders_count', targetCol: 'total_orders' },
        { sourceCol: 'average_order_value_usd', targetCol: 'avg_order_value_usd' },
        { sourceCol: 'rfm_segment', targetCol: 'customer_tier' }
      ]
    },
    {
      id: 'edge_stg_crm_events_to_dim_customers_360',
      source: 'stg_legacy_crm_events',
      target: 'dim_customers_360',
      confidence: 0.88,
      inferredBy: 'gemini_llm',
      status: 'active',
      reasoning: 'Customer sentiment & NPS aggregation inferred by LLM model due to dynamic pivot macro.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'churn_intent_flag', targetCol: 'churn_risk_flag' },
        { sourceCol: 'nps_rating', targetCol: 'nps_score' }
      ]
    },
    {
      id: 'edge_stg_ad_spend_to_fct_marketing_roi',
      source: 'stg_ad_spend',
      target: 'fct_marketing_roi',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Marketing attribution join parsed by sqlglot.',
      columnMappings: [
        { sourceCol: 'campaign_id', targetCol: 'channel' },
        { sourceCol: 'spend_usd', targetCol: 'ad_spend_usd' },
        { sourceCol: 'spend_date', targetCol: 'report_date' }
      ]
    },
    {
      id: 'edge_fct_daily_revenue_to_fct_marketing_roi',
      source: 'fct_daily_sales_revenue',
      target: 'fct_marketing_roi',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Revenue cross-reference in blended ROAS metric.',
      columnMappings: [
        { sourceCol: 'gross_revenue_usd', targetCol: 'attributed_revenue_usd' },
        { sourceCol: 'net_revenue_usd', targetCol: 'blended_roas', transformType: 'Formula(rev/spend)' },
        { sourceCol: 'sales_date', targetCol: 'report_date' }
      ]
    },

    // Marts -> Downstream Consumers
    {
      id: 'edge_fct_daily_revenue_to_bi_exec_dashboard',
      source: 'fct_daily_sales_revenue',
      target: 'bi_executive_revenue_dashboard',
      confidence: 1.0,
      inferredBy: 'human_verified',
      status: 'active',
      reasoning: 'Tableau data source binding to fct_daily_sales_revenue.',
      columnMappings: [
        { sourceCol: 'gross_revenue_usd', targetCol: 'metric_daily_gross_rev' },
        { sourceCol: 'net_revenue_usd', targetCol: 'metric_net_margin_pct' }
      ]
    },
    {
      id: 'edge_fct_marketing_roi_to_bi_exec_dashboard',
      source: 'fct_marketing_roi',
      target: 'bi_executive_revenue_dashboard',
      confidence: 1.0,
      inferredBy: 'human_verified',
      status: 'active',
      reasoning: 'Tableau visual sheet for CAC/ROAS breakdown.',
      columnMappings: [
        { sourceCol: 'blended_roas', targetCol: 'metric_blended_roas' }
      ]
    },
    {
      id: 'edge_dim_customers_360_to_reverse_etl_hubspot',
      source: 'dim_customers_360',
      target: 'reverse_etl_hubspot_sync',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Hightouch query definition selecting VIP tiers.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'customer_tier', targetCol: 'customer_tier' },
        { sourceCol: 'lifetime_spend_usd', targetCol: 'lifetime_value_usd' }
      ]
    },
    {
      id: 'edge_dim_customers_360_to_ml_churn_feature_store',
      source: 'dim_customers_360',
      target: 'ml_churn_prediction_feature_store',
      confidence: 0.95,
      inferredBy: 'gemini_llm',
      status: 'active',
      reasoning: 'Feast feature definition referencing customer 360 profile.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'avg_order_value_usd', targetCol: 'avg_order_value_usd' },
        { sourceCol: 'churn_risk_flag', targetCol: 'churn_risk_score' }
      ]
    },
    {
      id: 'edge_int_rfm_to_ml_churn_feature_store',
      source: 'int_customer_rfm_metrics',
      target: 'ml_churn_prediction_feature_store',
      confidence: 1.0,
      inferredBy: 'sqlglot_parser',
      status: 'active',
      reasoning: 'Direct behavioral feature ingest into Feast store.',
      columnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'rfm_segment', targetCol: 'rfm_segment' },
        { sourceCol: 'average_order_value_usd', targetCol: 'avg_order_value_usd' }
      ]
    },

    // Low confidence edge (Pending in HITL Queue)
    {
      id: 'edge_raw_shopify_to_ml_churn_suspect',
      source: 'raw_shopify_orders',
      target: 'ml_churn_prediction_feature_store',
      confidence: 0.62,
      inferredBy: 'gpt4o_mini',
      status: 'pending_hitl',
      reasoning: 'Suspected direct feature extraction from raw order JSON via experimental dynamic SQL script.'
    },
    {
      id: 'edge_raw_legacy_crm_to_fct_daily_rev_suspect',
      source: 'raw_legacy_crm_logs',
      target: 'fct_daily_sales_revenue',
      confidence: 0.58,
      inferredBy: 'gemini_llm',
      status: 'pending_hitl',
      reasoning: 'Detected string concatenation SQL querying legacy audit log inside revenue adjustment stored procedure.'
    }
  ],

  hitlQueue: [
    {
      id: 'hitl_001',
      edgeId: 'edge_raw_shopify_to_ml_churn_suspect',
      sourceTable: 'raw_shopify_orders',
      targetTable: 'ml_churn_prediction_feature_store',
      sourceSchema: 'source_raw',
      targetSchema: 'ml_platform',
      confidence: 0.62,
      inferredBy: 'gpt4o_mini',
      detectedIssue: 'dynamic_sql',
      reason: 'SQL uses string concatenation inside a Python UDF to dynamically query `raw_shopify_orders` without dbt ref() macro.',
      sqlSnippet: `def get_recent_cart_abandons(customer_id):
    query = f"SELECT COUNT(*) FROM source_raw.raw_shopify_orders WHERE customer_id = '{customer_id}' AND status = 'abandoned'"
    return spark.sql(query).collect()[0][0]`,
      filePath: 'pipelines/ml/feature_extraction_udf.py',
      suggestedColumnMappings: [
        { sourceCol: 'customer_id', targetCol: 'customer_id' },
        { sourceCol: 'status', targetCol: 'churn_risk_score' }
      ],
      status: 'pending',
      timestamp: '2026-08-15 11:45:00'
    },
    {
      id: 'hitl_002',
      edgeId: 'edge_raw_legacy_crm_to_fct_daily_rev_suspect',
      sourceTable: 'raw_legacy_crm_logs',
      targetTable: 'fct_daily_sales_revenue',
      sourceSchema: 'source_raw',
      targetSchema: 'analytics_marts',
      confidence: 0.58,
      inferredBy: 'gemini_llm',
      detectedIssue: 'string_concatenation',
      reason: 'Stored procedure `sp_reconcile_disputes` executes dynamic SQL string building against legacy audit logs.',
      sqlSnippet: `SET @sql = CONCAT('SELECT SUM(JSON_EXTRACT(event_payload_json, "$.dispute_amt")) FROM source_raw.raw_legacy_crm_logs WHERE entity_type = "DISPUTE"');
PREPARE stmt FROM @sql;
EXECUTE stmt;`,
      filePath: 'procedures/sp_reconcile_disputes.sql',
      suggestedColumnMappings: [
        { sourceCol: 'event_payload_json', targetCol: 'net_revenue_usd' }
      ],
      status: 'pending',
      timestamp: '2026-08-15 11:52:30'
    },
    {
      id: 'hitl_003',
      edgeId: 'edge_unresolved_jinja_macro_attribution',
      sourceTable: 'raw_google_ad_spend',
      targetTable: 'int_customer_rfm_metrics',
      sourceSchema: 'source_raw',
      targetSchema: 'intermediate',
      confidence: 0.69,
      inferredBy: 'gemini_llm',
      detectedIssue: 'jinja_macro',
      reason: 'Uncompiled Jinja macro `{{ generate_campaign_weighting(source("source_raw", "raw_google_ad_spend")) }}` lacks compiled target resolution.',
      sqlSnippet: `{{ config(materialized='table') }}
SELECT
  c.customer_id,
  {{ generate_campaign_weighting(source('source_raw', 'raw_google_ad_spend')) }} as ad_touch_score
FROM {{ ref('stg_orders') }} c`,
      filePath: 'models/intermediate/int_customer_rfm_metrics.sql',
      suggestedColumnMappings: [
        { sourceCol: 'campaign_id', targetCol: 'customer_id' }
      ],
      status: 'pending',
      timestamp: '2026-08-15 12:00:10'
    }
  ]
};

export const mockProjectsList: ProjectData[] = [
  mockEcommerceProject,
  {
    id: 'fintech-fraud-ledger',
    name: 'FinTech Core Ledger & Fraud Graph',
    description: 'Real-time card transactions, ISO 20022 clearing, ML fraud scoring & Central Bank regulatory filings.',
    nodes: [
      {
        id: 'raw_card_swipes',
        name: 'raw_card_swipes',
        schema: 'core_banking',
        layer: 'source',
        type: 'source_stream',
        description: 'Kafka stream of POS & Online EMV 3DS transactions.',
        owner: 'Switch Team',
        tags: ['fintech', 'pci_dss', 'p0'],
        columns: [
          { name: 'pan_token', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'amount_usd', type: 'DECIMAL(12,2)' },
          { name: 'merchant_mcc', type: 'VARCHAR(4)' },
          { name: 'timestamp', type: 'TIMESTAMP' }
        ]
      },
      {
        id: 'stg_card_transactions',
        name: 'stg_card_transactions',
        schema: 'staging',
        layer: 'staging',
        type: 'view',
        description: 'Normalized ledger debit/credit entries with ISO currency conversion.',
        owner: 'FinData Team',
        tags: ['staging'],
        columns: [
          { name: 'txn_id', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'pan_token', type: 'VARCHAR' },
          { name: 'amount_usd', type: 'DECIMAL(12,2)' },
          { name: 'status', type: 'VARCHAR' }
        ]
      },
      {
        id: 'fct_fraud_risk_scores',
        name: 'fct_fraud_risk_scores',
        schema: 'analytics_marts',
        layer: 'marts',
        type: 'table',
        description: 'Real-time and batch fraud probability scoring model table.',
        owner: 'Risk AI Team',
        tags: ['fraud', 'risk', 'gold'],
        columns: [
          { name: 'txn_id', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'fraud_score', type: 'FLOAT' },
          { name: 'decision', type: 'VARCHAR' }
        ]
      },
      {
        id: 'bi_regulatory_anti_money_laundering_report',
        name: 'Anti-Money Laundering (AML) Compliance Dashboard',
        schema: 'compliance',
        layer: 'bi_dashboard',
        type: 'dashboard',
        description: 'Mandatory daily SAR/AML regulatory filings for Central Bank auditing.',
        owner: 'Compliance Officer',
        tags: ['regulatory', 'compliance', 'critical'],
        columns: [
          { name: 'suspicious_txn_count', type: 'INT' },
          { name: 'total_flagged_volume_usd', type: 'DECIMAL(14,2)' }
        ]
      }
    ],
    edges: [
      {
        id: 'edge_swipes_to_stg',
        source: 'raw_card_swipes',
        target: 'stg_card_transactions',
        confidence: 1.0,
        inferredBy: 'sqlglot_parser',
        status: 'active'
      },
      {
        id: 'edge_stg_to_fraud',
        source: 'stg_card_transactions',
        target: 'fct_fraud_risk_scores',
        confidence: 1.0,
        inferredBy: 'sqlglot_parser',
        status: 'active'
      },
      {
        id: 'edge_fraud_to_bi',
        source: 'fct_fraud_risk_scores',
        target: 'bi_regulatory_anti_money_laundering_report',
        confidence: 1.0,
        inferredBy: 'human_verified',
        status: 'active'
      }
    ],
    hitlQueue: []
  }
];
