import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Cpu, 
  Layout, 
  Sliders, 
  Moon, 
  Sun, 
  RotateCcw, 
  Check, 
  Sparkles,
  ShieldAlert,
  Database,
  Network
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  setDarkMode
}) => {
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.80);
  const [enableLLMFallback, setEnableLLMFallback] = useState<boolean>(true);
  const [enableCLLAnimations, setEnableCLLAnimations] = useState<boolean>(true);
  const [edgeStyle, setEdgeStyle] = useState<'smoothstep' | 'bezier'>('smoothstep');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                Lineage System Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh động cơ phân tích AST, ngưỡng phê duyệt HITL và giao diện đồ thị
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[70vh] space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Section 1: Ingestion & Parser Engine */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-mono font-bold">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Parser Engine &amp; AI Fallback</span>
            </div>
            
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Kích hoạt AI Fallback (Gemini / GPT-4o-mini)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động suy luận phụ thuộc khi gặp Dynamic SQL hoặc Jinja macro phức tạp
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLLMFallback}
                    onChange={(e) => setEnableLLMFallback(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Ngưỡng tự động duyệt HITL (Confidence Threshold)
                  </div>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Các liên kết AI có độ tin cậy thấp hơn mức này sẽ được đưa vào hàng đợi HITL để kỹ sư duyệt thủ công.
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Graph Visualization Preferences */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-mono font-bold">
              <Layout className="w-4 h-4 text-cyan-500" />
              <span>DAG Visualization Preferences</span>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Hướng bố cục mặc định (DAG Layout Direction)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Trải đồ thị từ trái sang phải (LR) hoặc từ trên xuống dưới (TB)
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    onClick={() => setLayoutDirection('LR')}
                    className={`px-2.5 py-1 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${
                      layoutDirection === 'LR' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Left → Right
                  </button>
                  <button
                    onClick={() => setLayoutDirection('TB')}
                    className={`px-2.5 py-1 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${
                      layoutDirection === 'TB' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Top → Bottom
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Hiệu ứng luồng dữ liệu (CLL Animation)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hiển thị hoạt họa tia hạt chuyển động trên đường nối cấp trường
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCLLAnimations}
                    onChange={(e) => setEnableCLLAnimations(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Kiểu dáng đường nối (Edge Curve Style)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Đường gấp khúc mượt (SmoothStep) hoặc đường cong Bezier
                  </div>
                </div>
                <select
                  value={edgeStyle}
                  onChange={(e) => setEdgeStyle(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="smoothstep">Smooth Step</option>
                  <option value="bezier">Bezier Curve</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Appearance */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-mono font-bold">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Display Theme</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(false)}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-mono font-bold transition-all cursor-pointer ${
                  !darkMode 
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
              </button>

              <button
                onClick={() => setDarkMode(true)}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-mono font-bold transition-all cursor-pointer ${
                  darkMode 
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-400 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Theme</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Đã lưu thành công</span>
              </>
            ) : (
              <span>Lưu Cấu Hình</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
