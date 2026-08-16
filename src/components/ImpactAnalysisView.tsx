import React, { useState, useMemo } from 'react';
import { LineageNodeData, LineageEdgeData, ImpactAnalysisResult } from '../types/lineage';
import { computeImpactAnalysis, exportImpactReportToCSV } from '../services/lineageEngine';
import { 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  LayoutDashboard, 
  Cpu, 
  ArrowRight, 
  Layers, 
  Download, 
  Eye, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  FileCode2,
  Table2
} from 'lucide-react';

interface ImpactAnalysisViewProps {
  nodes: LineageNodeData[];
  edges: LineageEdgeData[];
  initialNodeId?: string;
  onNavigateToGraphWithImpact: (targetId: string, downstreamIds: string[], upstreamIds: string[]) => void;
  onAskCopilot: (question: string) => void;
  onApproveProposedChange?: (
    nodeId: string, 
    operation: string, 
    columnName: string, 
    newColumnName?: string, 
    notes?: string
  ) => void;
}

export const ImpactAnalysisView: React.FC<ImpactAnalysisViewProps> = ({
  nodes,
  edges,
  initialNodeId,
  onNavigateToGraphWithImpact,
  onAskCopilot,
  onApproveProposedChange
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(initialNodeId || (nodes[0]?.id || 'stg_orders'));
  const [operation, setOperation] = useState<ImpactAnalysisResult['operation']>('drop_column');
  const [selectedColumn, setSelectedColumn] = useState<string>('');

  // AI analysis flow states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analyzedResult, setAnalyzedResult] = useState<ImpactAnalysisResult | null>(null);

  // Approval modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [isApprovalSuccess, setIsApprovalSuccess] = useState(false);

  const targetNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalyzedResult(null);
    
    const steps = [
      '1. Phân tích cấu trúc SQL AST...',
      '2. Tracing quan hệ phụ thuộc...',
      '3. Đánh giá rủi ro với LLM...',
      '4. Tạo khuyến nghị giảm thiểu...'
    ];
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        setAnalysisStep(step);
      }, index * 300);
    });
    
    setTimeout(() => {
      if (targetNode) {
        const activeColumn = selectedColumn || (targetNode.columns[0]?.name || '');
        const res = computeImpactAnalysis(
          selectedNodeId,
          operation,
          activeColumn,
          nodes,
          edges
        );
        setAnalyzedResult(res);
      }
      setIsAnalyzing(false);
    }, steps.length * 300 + 100);
  };

  const handleConfirmApproval = () => {
    if (!onApproveProposedChange) return;
    const activeColumn = selectedColumn || (targetNode?.columns[0]?.name || '');
    onApproveProposedChange(selectedNodeId, operation, activeColumn, newColumnName, approveNotes);
    setIsApprovalSuccess(true);
    setTimeout(() => {
      setIsApproveModalOpen(false);
      setIsApprovalSuccess(false);
      setApproveNotes('');
      setNewColumnName('');
      setAnalyzedResult(null); // Clear after approval as it has been applied
    }, 1500);
  };

  const riskBadgeColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold font-mono tracking-tight">
              Automated Impact Analysis &amp; Blast Radius Engine
            </h2>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Mô phỏng bán kính ảnh hưởng lan truyền khi sửa đổi hoặc xoá bảng/cột dữ liệu trước khi tạo Pull Request. 
            Ngăn ngừa sự cố đứt gãy trên các báo cáo BI Dashboard, Feature Store ML và các bảng tổng hợp downstream.
          </p>
        </div>

        {analyzedResult && (
          <div className="flex items-center gap-3">
            <button
              id="export-impact-csv-btn"
              onClick={() => exportImpactReportToCSV(analyzedResult)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur border border-white/20 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export Impact CSV</span>
            </button>
            <button
              id="highlight-graph-btn"
              onClick={() => {
                const downstreamIds = analyzedResult.downstreamNodes.map(d => d.node.id);
                const upstreamIds = analyzedResult.upstreamNodes.map(u => u.node.id);
                onNavigateToGraphWithImpact(analyzedResult.targetNodeId, downstreamIds, upstreamIds);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur border border-white/20 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Xem trên Lineage Graph</span>
            </button>
            <button
              id="approve-change-btn"
              onClick={() => {
                setIsApproveModalOpen(true);
                setNewColumnName(operation === 'rename_column' ? selectedColumn || (targetNode?.columns[0]?.name || '') + '_new' : '');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Duyệt &amp; Áp dụng</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Panel: Select Target Model & Operation */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Target Model */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              1. Target Table / Model (Chọn bảng nguồn)
            </label>
            <select
              id="impact-target-node-select"
              value={selectedNodeId}
              onChange={(e) => {
                setSelectedNodeId(e.target.value);
                const node = nodes.find(n => n.id === e.target.value);
                if (node && node.columns.length > 0) {
                  setSelectedColumn(node.columns[0].name);
                }
                setAnalyzedResult(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  [{n.schema}] {n.name} ({n.layer})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Proposed Operation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              2. Proposed Schema Operation (Thao tác thay đổi)
            </label>
            <select
              id="impact-operation-select"
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value as any);
                setAnalyzedResult(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="drop_column">Drop Column (Xoá cột - Rủi ro phá vỡ downstream)</option>
              <option value="rename_column">Rename Column (Đổi tên cột - Cần refactor SQL)</option>
              <option value="modify_schema">Modify Data Type / Schema (Thay đổi kiểu dữ liệu)</option>
              <option value="drop_table">Drop Whole Model / Table (Xoá toàn bộ bảng)</option>
              <option value="change_logic">Change Business Join/Filter Logic (Đổi logic tính toán/Join)</option>
            </select>
          </div>

          {/* 3. Target Column (if column operation) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              3. Target Column (Cột dữ liệu tác động)
            </label>
            <select
              id="impact-column-select"
              value={selectedColumn}
              onChange={(e) => {
                setSelectedColumn(e.target.value);
                setAnalyzedResult(null);
              }}
              disabled={operation === 'drop_table'}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {targetNode?.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type}) {c.isPrimaryKey ? '[PK]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button to trigger AI check */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono text-left">
            * Bấm nút bên cạnh để chạy phân tích rủi ro hạ nguồn qua AI Engine.
          </p>
          <button
            id="run-impact-analysis-btn"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-650/10 transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 text-amber-300" />
                <span>Kiểm tra &amp; Phân tích Rủi ro</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Panel */}
      {isAnalyzing && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-sm text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
            <Cpu className="absolute inset-0 m-auto w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
          
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
              AI Engine đang phân tích...
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono italic animate-pulse">
              {analysisStep}
            </p>
          </div>
        </div>
      )}

      {/* Prompt State Panel */}
      {!isAnalyzing && !analyzedResult && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm max-w-xl mx-auto my-8 space-y-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto text-indigo-500">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              Chưa chạy phân tích tác động
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Hãy chọn thông tin phía trên và nhấn nút <strong className="text-indigo-500 font-semibold">"Kiểm tra &amp; Phân tích Rủi ro"</strong> để bắt đầu.
            </p>
          </div>
        </div>
      )}

      {analyzedResult && (
        <>
          {/* Risk Meter & Top Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Risk Score */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className={`p-3 rounded-xl ${
                analyzedResult.riskScore >= 70 ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400' :
                analyzedResult.riskScore >= 40 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' :
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  Blast Radius Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {analyzedResult.riskScore}/100
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    analyzedResult.riskScore >= 70 ? riskBadgeColors.CRITICAL :
                    analyzedResult.riskScore >= 40 ? riskBadgeColors.HIGH :
                    riskBadgeColors.LOW
                  }`}>
                    {analyzedResult.riskScore >= 70 ? 'NGUY CẤP' : analyzedResult.riskScore >= 40 ? 'RỦI RO CAO' : 'RỦI RO THẤP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Downstream Models */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  Downstream Models (Bảng phụ thuộc)
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {analyzedResult.totalImpactedCount}
                </div>
              </div>
            </div>

            {/* BI Dashboards at Risk */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  BI Dashboards at Risk (Báo cáo bị lỗi)
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {analyzedResult.criticalDashboards.length}
                </div>
              </div>
            </div>

            {/* Production ML Features */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  ML Features Affected (Mô hình AI bị ảnh hưởng)
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {analyzedResult.mlFeaturesAffected.length}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Impact Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Downstream Impact List (2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Downstream Blast Radius (Hiệu ứng lan truyền hạ nguồn)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {analyzedResult.downstreamNodes.length} nút phụ thuộc
                </span>
              </div>

              {analyzedResult.downstreamNodes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Không phát hiện bảng phụ thuộc downstream nào. An toàn để sửa đổi!
                </div>
              ) : (
                <div className="space-y-3">
                  {analyzedResult.downstreamNodes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {item.node.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Tầng: {item.node.layer}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            (Cấp độ sâu: {item.depth})
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${riskBadgeColors[item.riskLevel]}`}>
                          {item.riskLevel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                        {item.impactReason}
                      </p>

                      {/* Path Traversal */}
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1 overflow-x-auto py-1">
                        <span className="text-slate-500 dark:text-slate-400">Đường dẫn lan truyền:</span>
                        {item.path.map((p, pIdx) => (
                          <React.Fragment key={pIdx}>
                            <span className={pIdx === item.path.length - 1 ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>
                              {p}
                            </span>
                            {pIdx < item.path.length - 1 && <ArrowRight className="w-2.5 h-2.5 inline text-slate-400 shrink-0" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Upstream Lineage & Automated Mitigation Advice */}
            <div className="space-y-6">
              {/* Automated Mitigation Plan */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Recommended Mitigation Actions (Khuyến nghị giảm thiểu rủi ro)</span>
                </h3>
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  {analyzedResult.mitigationAdvice.map((advice, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 leading-relaxed font-sans"
                    >
                      {advice}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id="ask-copilot-mitigate-btn"
                    onClick={() => onAskCopilot(`Hãy phân tích và viết code refactor dbt an toàn khi sửa bảng ${analyzedResult.targetNodeName}, hạn chế ảnh hưởng tới các downstream.`)}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hỏi Copilot tạo kịch bản Refactor an toàn</span>
                  </button>
                </div>
              </div>

              {/* Upstream Data Provenance (Where does it come from?) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-sky-500" />
                  <span>Upstream Data Provenance ({analyzedResult.upstreamNodes.length} nguồn thượng nguồn)</span>
                </h3>
                {analyzedResult.upstreamNodes.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono">
                    Đây là nút nguồn gốc (Root Ingest Source Node).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analyzedResult.upstreamNodes.map((u, uIdx) => (
                      <div
                        key={uIdx}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono text-[11px]"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {u.node.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          {u.node.layer}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Approval Confirmation Modal */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 text-left">
            {isApprovalSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Phê Duyệt Thành Công!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thiết lập thay đổi schema đã được áp dụng trực tiếp và ghi nhật ký HITL thành công.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Duyệt &amp; Áp dụng thay đổi Schema</span>
                  </h3>
                  <button
                    onClick={() => setIsApproveModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1.5 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-500 text-[10px]">Bảng tác động:</span>{' '}
                      <span className="font-mono text-slate-900 dark:text-white font-bold">[{targetNode?.schema}] {targetNode?.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 text-[10px]">Thao tác đề xuất:</span>{' '}
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold">
                        {operation.toUpperCase()}
                      </span>
                    </div>
                    {operation !== 'drop_table' && (
                      <div>
                        <span className="font-semibold text-slate-500 text-[10px]">Cột tác động:</span>{' '}
                        <span className="font-mono text-slate-900 dark:text-white font-bold">{selectedColumn || (targetNode?.columns[0]?.name)}</span>
                      </div>
                    )}
                    {analyzedResult && (
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px]">
                        <span className="text-rose-500 font-medium">
                          ⚠️ Rủi ro: {analyzedResult.riskScore}/100 ({analyzedResult.riskScore >= 70 ? 'NGUY CẤP' : analyzedResult.riskScore >= 40 ? 'RỦI RO CAO' : 'RỦI RO THẤP'})
                        </span>
                        <span className="text-slate-500 font-medium">
                          {analyzedResult.totalImpactedCount} bảng hạ nguồn bị ảnh hưởng
                        </span>
                      </div>
                    )}
                  </div>

                  {operation === 'rename_column' && (
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Tên cột mới:
                      </label>
                      <input
                        type="text"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        placeholder="Nhập tên cột mới..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Ghi chú / Lý do phê duyệt (Notes / Reason):
                    </label>
                    <textarea
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      placeholder="Ví dụ: Đã kiểm tra code dbt và lấy ý kiến từ đội phân tích báo cáo..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-805 border border-slate-250 dark:border-slate-750 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setIsApproveModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmApproval}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/25"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận &amp; Áp dụng</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
