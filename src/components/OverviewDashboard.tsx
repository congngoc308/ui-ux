import React, { useMemo } from 'react';
import { LineageNodeData, LineageEdgeData, HITLQueueItem } from '../types/lineage';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Database, 
  ArrowRight, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  GitBranch, 
  Activity, 
  ExternalLink,
  Table,
  ShieldCheck,
  Flame,
  Check,
  Zap,
  BrainCircuit,
  Server
} from 'lucide-react';

interface OverviewDashboardProps {
  nodes: LineageNodeData[];
  edges: LineageEdgeData[];
  hitlQueue: HITLQueueItem[];
  projectName: string;
  onNavigateTab: (tab: any) => void;
  onSelectNodeInGraph: (nodeId: string) => void;
  onAnalyzeImpactForNode: (node: LineageNodeData) => void;
  onConfirmHITLEdge: (item: HITLQueueItem) => void;
  onRejectHITLEdge: (item: HITLQueueItem) => void;
  onAskCopilot?: (question: string) => void;
}

const LAYER_COLORS: Record<string, string> = {
  source: '#64748b',       // Slate (Bronze)
  staging: '#06b6d4',      // Cyan (Silver)
  intermediate: '#3b82f6', // Blue
  marts: '#f59e0b',        // Amber (Gold)
  bi_dashboard: '#8b5cf6', // Purple
  feature_store: '#10b981',// Emerald
  reverse_etl: '#ec4899',  // Pink
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  nodes,
  edges,
  hitlQueue,
  projectName,
  onNavigateTab,
  onSelectNodeInGraph,
  onAnalyzeImpactForNode,
  onConfirmHITLEdge,
  onRejectHITLEdge
}) => {
  // Computed Telemetry Metrics
  const totalAssets = nodes.length;
  const totalCols = useMemo(() => nodes.reduce((acc, n) => acc + n.columns.length, 0), [nodes]);
  const totalEdges = edges.length;
  const parserEdgesCount = useMemo(() => edges.filter(e => e.inferredBy === 'sqlglot_parser' || e.inferredBy === 'human_verified').length, [edges]);
  const llmEdgesCount = useMemo(() => edges.filter(e => e.inferredBy === 'gemini_llm').length, [edges]);
  const astRate = totalEdges > 0 ? Math.round((parserEdgesCount / totalEdges) * 100) : 85;
  const totalRowsCount = useMemo(() => nodes.reduce((acc, n) => acc + (n.rowCount || 0), 0), [nodes]);
  const avgQualityScore = useMemo(() => {
    const sum = nodes.reduce((acc, n) => acc + (n.qualityScore || 99), 0);
    return (sum / (nodes.length || 1)).toFixed(1);
  }, [nodes]);
  const biConsumersCount = useMemo(() => nodes.filter(n => n.layer === 'bi_dashboard' || n.layer === 'feature_store' || n.layer === 'reverse_etl').length, [nodes]);
  const pendingHitlCount = useMemo(() => hitlQueue.filter(h => h.status === 'pending').length, [hitlQueue]);

  // Static Defined Metric Cards with English Titles & Vietnamese Descriptions
  const metricCards = [
    {
      id: 'card-assets',
      title: 'Total Data Assets',
      subtitle: 'Phân tầng qua 7 lớp kiến trúc',
      value: totalAssets,
      icon: Database,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 hover:border-indigo-500',
      targetTab: 'catalog'
    },
    {
      id: 'card-columns',
      title: 'Schema Columns',
      subtitle: 'Theo dõi chi tiết cấp trường',
      value: totalCols,
      icon: Table,
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 hover:border-cyan-500',
      targetTab: 'catalog'
    },
    {
      id: 'card-rows',
      title: 'Total Data Rows',
      subtitle: 'Tổng số bản ghi trong hồ dữ liệu',
      value: totalRowsCount.toLocaleString(),
      icon: Server,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 hover:border-amber-500',
      targetTab: 'catalog'
    },
    {
      id: 'card-edges',
      title: 'Lineage Edges',
      subtitle: 'Mối quan hệ liên kết trong DAG',
      value: totalEdges,
      icon: GitBranch,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 hover:border-emerald-500',
      targetTab: 'explorer'
    },
    {
      id: 'card-hitl',
      title: 'HITL Review Queue',
      subtitle: 'Liên kết cần kỹ sư xác nhận',
      value: pendingHitlCount,
      icon: AlertTriangle,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 hover:border-rose-500',
      targetTab: 'hitl'
    }
  ];

  // 1. Data Layer Distribution Chart Data
  const layerDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach(n => {
      counts[n.layer] = (counts[n.layer] || 0) + 1;
    });
    return Object.entries(counts).map(([layer, count]) => ({
      name: layer.replace('_', ' ').toUpperCase(),
      layerKey: layer,
      count,
      color: LAYER_COLORS[layer] || '#6366f1'
    }));
  }, [nodes]);

  // 2. Engine Breakdown Chart Data
  const engineBreakdown = useMemo(() => {
    return [
      { name: 'Pure AST (sqlglot)', value: parserEdgesCount, color: '#10b981' },
      { name: 'LLM Fallback (Gemini)', value: llmEdgesCount, color: '#f59e0b' }
    ];
  }, [parserEdgesCount, llmEdgesCount]);

  // 3. Column Data Types Distribution
  const dataTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'TIMESTAMP / DATE': 0,
      'DECIMAL / NUMERIC': 0,
      'VARCHAR / STRING': 0,
      'INTEGER / BIGINT': 0,
      'BOOLEAN / JSON': 0
    };
    nodes.forEach(n => {
      n.columns.forEach(col => {
        const t = col.type.toUpperCase();
        if (t.includes('TIME') || t.includes('DATE')) counts['TIMESTAMP / DATE']++;
        else if (t.includes('DECIMAL') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('NUMERIC')) counts['DECIMAL / NUMERIC']++;
        else if (t.includes('INT')) counts['INTEGER / BIGINT']++;
        else if (t.includes('BOOL') || t.includes('JSON')) counts['BOOLEAN / JSON']++;
        else counts['VARCHAR / STRING']++;
      });
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [nodes]);

  // 4. Total Data Rows Table Data
  const totalRowsTableData = useMemo(() => {
    return [...nodes]
      .filter(n => n.type === 'table' || n.rowCount !== undefined)
      .sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0));
  }, [nodes]);

  // 5. Quality SLA by Layer
  const qualityByLayer = useMemo(() => {
    const layerStats: Record<string, { totalScore: number; count: number }> = {};
    nodes.forEach(n => {
      if (!layerStats[n.layer]) {
        layerStats[n.layer] = { totalScore: 0, count: 0 };
      }
      layerStats[n.layer].totalScore += (n.qualityScore || 99);
      layerStats[n.layer].count += 1;
    });

    return Object.entries(layerStats).map(([layer, stats]) => ({
      layer: layer.replace('_', ' ').toUpperCase(),
      avgQuality: Number((stats.totalScore / stats.count).toFixed(1))
    }));
  }, [nodes]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      
      {/* 1. Header Banner (English Title with Vietnamese Subtitle) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DATA-04 &bull; Governance Hub
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] text-slate-300 bg-slate-800/80 border border-slate-700">
              Project: {projectName}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Data Architecture &amp; Lineage Intelligence
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hệ thống quản trị luồng dữ liệu kết hợp phân tích cú pháp AST (sqlglot), suy luận AI Fallback và kiểm duyệt chuyên gia (HITL).
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          <button
            onClick={() => onNavigateTab('explorer')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <GitBranch className="w-4 h-4" />
            <span>Mở Lineage DAG</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateTab('impact')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Mô phỏng Impact</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Telemetry Grid (English Title + Vietnamese Subtitle) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Key Metrics &amp; Telemetry
          </h2>
          <span className="text-xs text-slate-400">
            Giám sát thời gian thực
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metricCards.map((card) => {
            return (
              <div 
                key={card.id}
                onClick={() => card.targetTab && onNavigateTab(card.targetTab)}
                className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all cursor-pointer group hover:shadow-md hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-tight uppercase truncate" title={card.title}>
                    {card.title}
                  </span>
                </div>

                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {card.value}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {card.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Visual Charts Grid (3 Multi-Angle Perspectives) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Data Layer Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Data Layer Distribution
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Số lượng tài sản qua từng tầng kiến trúc từ Bronze đến Gold &amp; BI
                </p>
              </div>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={layerDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  angle={-30} 
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {layerDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Inference Engine Split */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  Inference Engine Split
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tỷ lệ phân giải chính xác bằng AST toán học so với AI Fallback
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('ingest')}
              className="text-[10px] font-mono text-indigo-500 hover:underline font-semibold cursor-pointer"
            >
              Kiểm tra &rarr;
            </button>
          </div>

          <div className="h-60 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engineBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {engineBreakdown.map((entry, index) => (
                    <Cell key={`cell-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {astRate}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">Độ chính xác AST</span>
            </div>
          </div>

          <div className="flex items-center justify-around text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>AST ({parserEdgesCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>AI Fallback ({llmEdgesCount})</span>
            </div>
          </div>
        </div>

        {/* Chart 3: Column Feature Types */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Column Feature Types
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cơ cấu kiểu dữ liệu trên toàn bộ {totalCols} trường
                </p>
              </div>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical" 
                data={dataTypeDistribution} 
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Layer Quality & Density */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Layer Quality &amp; Density</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Điểm chất lượng trung bình theo tầng dữ liệu.
          </p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityByLayer} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <XAxis dataKey="layer" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="avgQuality" name="Chất lượng" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
          <div>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
              Tổng số bản ghi
            </span>
            <span className="text-[11px] text-slate-400">Giám sát thời gian thực</span>
          </div>
          <span className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {totalRowsCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5. Quick HITL Review Center (Actionable Queue) */}
      {pendingHitlCount > 0 && (
        <div className="bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-900 border border-orange-500/30 rounded-3xl p-6 shadow-md text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Duyệt HITL: {pendingHitlCount} liên kết
                </h3>
                <p className="text-xs text-slate-300">
                  Liên kết AI đề xuất trong Dynamic SQL/Jinja cần kiểm duyệt.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('hitl')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer self-start sm:self-auto transition-all"
            >
              <span>Xem hàng đợi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hitlQueue.filter(h => h.status === 'pending').slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-slate-200 truncate">
                    `{item.sourceTable}` &rarr; `{item.targetTable}`
                  </div>
                  <span className="text-[10px] text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-900 shrink-0">
                    Độ tin cậy: {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {item.reason}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onRejectHITLEdge(item)}
                    className="px-3 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => onConfirmHITLEdge(item)}
                    className="px-3.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Phê duyệt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
