import React, { useState } from 'react';
import { HITLQueueItem, LineageEdgeData } from '../types/lineage';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  FileCode2, 
  ArrowRight, 
  Bot, 
  HelpCircle, 
  Sparkles, 
  RefreshCw,
  Layers,
  Code
} from 'lucide-react';

interface HITLDashboardProps {
  queue: HITLQueueItem[];
  onConfirmEdge: (item: HITLQueueItem) => void;
  onRejectEdge: (item: HITLQueueItem) => void;
  onEditAndConfirmEdge: (item: HITLQueueItem, updatedMappings: { sourceCol: string; targetCol: string }[]) => void;
  onBatchConfirmAll: () => void;
}

export const HITLDashboard: React.FC<HITLDashboardProps> = ({
  queue,
  onConfirmEdge,
  onRejectEdge,
  onEditAndConfirmEdge,
  onBatchConfirmAll
}) => {
  const [editingItem, setEditingItem] = useState<HITLQueueItem | null>(null);
  const [editedMappings, setEditedMappings] = useState<{ sourceCol: string; targetCol: string }[]>([]);

  const pendingItems = queue.filter(item => item.status === 'pending');
  const reviewedItems = queue.filter(item => item.status !== 'pending');

  const handleConfirm = (item: HITLQueueItem) => {
    onConfirmEdge(item);
    if (pendingItems.length === 1) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const openEditModal = (item: HITLQueueItem) => {
    setEditingItem(item);
    setEditedMappings([...item.suggestedColumnMappings]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold font-mono tracking-tight">
              Human-in-the-Loop (HITL) Lineage Review Queue
            </h2>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Khi mã nguồn SQL chứa Dynamic SQL, Jinja macro chưa biên dịch hoặc phép nối chuỗi động, cơ chế LLM Fallback (Gemini) sẽ tự động suy luận quan hệ dữ liệu.
            Các liên kết có độ tin cậy thấp (&lt; 0.8) được đưa vào hàng đợi phê duyệt HITL tại đây để kỹ sư dữ liệu rà soát trước khi ghi nhận chính thức vào biểu đồ Lineage DAG.
          </p>
        </div>

        {pendingItems.length > 0 && (
          <button
            id="batch-confirm-all-btn"
            onClick={() => {
              onBatchConfirmAll();
              confetti({ particleCount: 100, spread: 70 });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Phê duyệt tất cả ({pendingItems.length} liên kết)</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase">Pending Review (Chờ duyệt)</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingItems.length}
            </div>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500/30" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase">Confirmed Lineages (Đã xác nhận)</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {queue.filter(q => q.status === 'confirmed' || q.status === 'edited').length}
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase">Rejected Hallucinations (Đã từ chối)</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {queue.filter(q => q.status === 'rejected').length}
            </div>
          </div>
          <XCircle className="w-8 h-8 text-rose-500/30" />
        </div>
      </div>

      {/* Main Review Cards */}
      <div className="space-y-4">
        {pendingItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
              HITL Queue is All Clear!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Tất cả các mối quan hệ lineage do LLM suy luận đã được xác nhận và đồng bộ an toàn vào biểu đồ DAG chính thức.
            </p>
          </div>
        ) : (
          pendingItems.map((item) => (
            <div
              key={item.id}
              id={`hitl-item-${item.id}`}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    <span className="text-slate-500 dark:text-slate-400">[{item.sourceSchema}]</span>
                    <span>{item.sourceTable}</span>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                    <span className="text-slate-500 dark:text-slate-400">[{item.targetSchema}]</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{item.targetTable}</span>
                  </div>
                </div>

                {/* Confidence Meter Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">LLM Confidence:</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Bot className="w-3.5 h-3.5" />
                    {(item.confidence * 100).toFixed(0)}% (Chờ kiểm duyệt)
                  </div>
                </div>
              </div>

              {/* Reason & Detected Root Issue */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase mb-0.5">
                    Parser Obstacle (Vấn đề cú pháp)
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase font-mono">
                    {item.detectedIssue.replace('_', ' ')}
                  </span>
                </div>
                <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase mb-0.5">
                    LLM Inference Justification (Lý do AI suy luận)
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-sans">
                    {item.reason}
                  </span>
                </div>
              </div>

              {/* Problematic SQL / Code Snippet */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                    {item.filePath}
                  </span>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
                  {item.sqlSnippet}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">
                  Thời gian tạo: {item.timestamp}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`reject-edge-${item.id}`}
                    onClick={() => onRejectEdge(item)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối (Ảo giác AI)</span>
                  </button>

                  <button
                    id={`edit-edge-${item.id}`}
                    onClick={() => openEditModal(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa Mapping</span>
                  </button>

                  <button
                    id={`confirm-edge-${item.id}`}
                    onClick={() => handleConfirm(item)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận &amp; Lưu vào Graph</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Mapping Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">
              Edit Column Lineage Mapping
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tùy chỉnh liên kết cột nguồn và cột đích cho liên kết: <span className="font-mono font-semibold text-indigo-500">{editingItem.sourceTable} &rarr; {editingItem.targetTable}</span>
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {editedMappings.map((map, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={map.sourceCol}
                    onChange={(e) => {
                      const updated = [...editedMappings];
                      updated[idx].sourceCol = e.target.value;
                      setEditedMappings(updated);
                    }}
                    placeholder="Cột nguồn (Source Column)"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                  />
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={map.targetCol}
                    onChange={(e) => {
                      const updated = [...editedMappings];
                      updated[idx].targetCol = e.target.value;
                      setEditedMappings(updated);
                    }}
                    placeholder="Cột đích (Target Column)"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onEditAndConfirmEdge(editingItem, editedMappings);
                  setEditingItem(null);
                  confetti({ particleCount: 60 });
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Lưu &amp; Xác nhận Edge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lịch sử Duyệt & Audit Logs */}
      {reviewedItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Audit Logs &amp; Lịch sử Phê Duyệt ({reviewedItems.length} mục)</span>
            </h3>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {reviewedItems.map((item) => (
              <div 
                key={item.id} 
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-left"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      item.status === 'edited' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-850 dark:text-slate-205">
                      {item.sourceTable} {item.targetTable !== 'N/A' && `→ ${item.targetTable}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                    {item.reason}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 self-end sm:self-center shrink-0">
                  {item.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
