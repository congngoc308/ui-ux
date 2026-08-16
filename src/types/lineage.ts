export type DataLayer = 'source' | 'staging' | 'intermediate' | 'marts' | 'bi_dashboard' | 'feature_store' | 'reverse_etl';

export type ConfidenceTier = 'verified_parser' | 'high_llm' | 'low_llm_hitl';

export type AssetConnector = 'snowflake' | 'dbt' | 'postgres' | 'bigquery' | 'tableau' | 'powerbi' | 'databricks' | 'airflow' | 'kafka' | 's3';
export type CertificationStatus = 'VERIFIED' | 'DRAFT' | 'DEPRECATED' | 'UNDER_REVIEW';
export type AssetTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface ColumnDef {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  description?: string;
  sourceColumns?: { tableId: string; column: string }[];
  transformType?: 'DIRECT' | 'DERIVED' | 'AGGREGATION' | 'JOIN';
}

export interface LineageNodeData {
  id: string;
  name: string;
  schema: string;
  layer: DataLayer;
  type: 'table' | 'view' | 'materialized_view' | 'source_stream' | 'dashboard' | 'ml_feature';
  description: string;
  columns: ColumnDef[];
  owner: string;
  tags: string[];
  rawSql?: string;
  compiledSql?: string;
  freshness?: string;
  rowCount?: number;
  qualityScore?: number;
  isDynamicSql?: boolean;
  hasJinja?: boolean;
  filePath?: string;
  connector?: AssetConnector;
  certification?: CertificationStatus;
  tier?: AssetTier;
  glossaryTerms?: string[];
  popularityScore?: number;
}

export interface LineageEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  confidence: number; // 0.0 - 1.0
  inferredBy: 'sqlglot_parser' | 'gemini_llm' | 'gpt4o_mini' | 'human_verified';
  status: 'active' | 'pending_hitl' | 'rejected' | 'modified';
  reasoning?: string;
  sqlSnippet?: string;
  columnMappings?: { sourceCol: string; targetCol: string; transformType?: string }[];
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface HITLQueueItem {
  id: string;
  edgeId: string;
  sourceTable: string;
  targetTable: string;
  sourceSchema: string;
  targetSchema: string;
  confidence: number;
  inferredBy: 'gemini_llm' | 'gpt4o_mini';
  reason: string;
  sqlSnippet: string;
  filePath: string;
  suggestedColumnMappings: { sourceCol: string; targetCol: string }[];
  status: 'pending' | 'confirmed' | 'rejected' | 'edited';
  timestamp: string;
  detectedIssue: 'dynamic_sql' | 'jinja_macro' | 'string_concatenation' | 'ambiguous_alias';
}

export interface ImpactAnalysisResult {
  targetNodeId: string;
  targetNodeName: string;
  operation: 'drop_table' | 'modify_schema' | 'drop_column' | 'rename_column' | 'change_logic';
  impactedColumn?: string;
  upstreamNodes: {
    node: LineageNodeData;
    depth: number;
    path: string[];
  }[];
  downstreamNodes: {
    node: LineageNodeData;
    depth: number;
    path: string[];
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    impactReason: string;
    affectedColumns?: string[];
  }[];
  totalImpactedCount: number;
  criticalDashboards: string[];
  mlFeaturesAffected: string[];
  riskScore: number; // 0 to 100
  mitigationAdvice: string[];
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  thoughtProcess?: {
    step: string;
    action: string;
    observation: string;
  }[];
  relatedNodes?: string[];
  impactData?: Partial<ImpactAnalysisResult>;
  suggestedQueries?: string[];
}

export interface IngestJob {
  id: string;
  fileName: string;
  totalModels: number;
  parsedBySqlglot: number;
  routedToLLM: number;
  routedToHITL: number;
  status: 'scanning' | 'parsing_sqlglot' | 'llm_fallback' | 'hitl_queued' | 'completed' | 'failed';
  log: string[];
  startTime: string;
}
