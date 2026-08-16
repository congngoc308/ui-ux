import React, { useState, useRef, useEffect } from 'react';
import { LineageNodeData, LineageEdgeData, HITLQueueItem, CopilotMessage } from '../types/lineage';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  X, 
  Minimize2, 
  Maximize2, 
  MessageSquare, 
  Layers, 
  Zap, 
  HelpCircle, 
  ShieldCheck, 
  ExternalLink,
  RotateCcw,
  ChevronRight,
  Database
} from 'lucide-react';

interface FloatingChatbotProps {
  nodes: LineageNodeData[];
  edges: LineageEdgeData[];
  hitlQueue: HITLQueueItem[];
  projectName: string;
  onNavigateToNode: (nodeId: string) => void;
  onOpenImpactForNode: (nodeId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({
  nodes,
  edges,
  hitlQueue,
  projectName,
  onNavigateToNode,
  onOpenImpactForNode,
  onNavigateTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content: `Xin chào! Tôi là **Lineage Copilot AI** (Trợ lý thông minh phân tích hồ dữ liệu **${projectName}**).
      
Tôi có thể hỗ trợ bạn:
- Tra cứu nguồn gốc dữ liệu (**Upstream Provenance**)
- Phân tích rủi ro & phạm vi ảnh hưởng (**Downstream Blast Radius**)
- Kiểm tra các liên kết nghi vấn đang chờ phê duyệt trong **HITL Queue**
- Giải thích chi tiết các thuật toán phân tích **AST sqlglot** và **LLM Fallback**

Hãy chọn câu hỏi gợi ý bên dưới hoặc nhập câu hỏi của bạn!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQueries: [
        'Báo cáo Tableau Revenue có nguy cơ lỗi nếu sửa stg_orders không?',
        'Bảng fct_daily_sales_revenue được tạo ra từ những nguồn nào?',
        'Cạnh nào đang dùng LLM Fallback và cần tối ưu sang SQL thuần?',
        'Có những bảng nào có bán kính ảnh hưởng (Blast Radius) cao nhất?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const graphContext = {
        nodesSummary: nodes.map(n => ({ id: n.id, name: n.name, schema: n.schema, layer: n.layer })),
        edgesSummary: edges.filter(e => e.status === 'active').map(e => ({ source: e.source, target: e.target, confidence: e.confidence, inferredBy: e.inferredBy })),
        hitlSummary: hitlQueue.filter(h => h.status === 'pending').map(h => ({ source: h.sourceTable, target: h.targetTable, confidence: h.confidence, reason: h.reason }))
      };

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          graphContext,
          history: messages.slice(-4)
        })
      });

      const data = await res.json();

      const botMsg: CopilotMessage = {
        id: `bot_${Date.now()}`,
        sender: 'agent',
        content: data.answer || 'Xin lỗi, tôi không thể xử lý câu trả lời ngay lúc này.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relatedNodes: data.referencedNodes || data.relatedNodes || [],
        suggestedQueries: data.suggestedFollowUps || [
          'Chi tiết về các bảng bị ảnh hưởng hạ nguồn',
          'Mở bảng này trong biểu đồ Lineage DAG',
          'Chạy mô phỏng rủi ro phá vỡ schema (Blast Radius)'
        ]
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      // Local intelligent fallback in case server endpoint fails
      const botMsg: CopilotMessage = {
        id: `bot_fallback_${Date.now()}`,
        sender: 'agent',
        content: `**Phân tích từ Lineage AI:**
        
Dựa trên cấu trúc đồ thị hiện tại của dự án **${projectName}** (${nodes.length} tài sản dữ liệu, ${edges.length} liên kết):
- **Phân tích AST Pure:** ${edges.filter(e => e.inferredBy === 'sqlglot_parser').length} quan hệ được xác thực toán học 100%.
- **LLM Fallback & Dynamic SQL:** ${edges.filter(e => e.inferredBy === 'gemini_llm').length} quan hệ qua mô hình suy luận.
- **Hàng đợi HITL:** Hiện có ${hitlQueue.filter(h => h.status === 'pending').length} mục đang chờ chuyên gia phê duyệt.

Bạn có thể mở trực tiếp **Lineage DAG** hoặc **Impact & Risk** để tương tác trực quan!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQueries: [
          'Xem các bảng thuộc tầng Gold Marts',
          'Kiểm tra chất lượng dữ liệu của raw_orders',
          'Xem hàng đợi HITL Review'
        ]
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        content: `Đoạn hội thoại đã được đặt lại. Tôi sẵn sàng hỗ trợ phân tích luồng dữ liệu cho dự án **${projectName}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQueries: [
          'Báo cáo Tableau Revenue có nguy cơ lỗi nếu sửa stg_orders không?',
          'Bảng fct_daily_sales_revenue được tạo ra từ những nguồn nào?',
          'Cạnh nào đang dùng LLM Fallback và cần tối ưu sang SQL thuần?'
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          id="floating-copilot-launcher-btn"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white rounded-full shadow-2xl hover:scale-110 hover:shadow-indigo-500/50 transition-all duration-300 flex items-center gap-2.5 group cursor-pointer border-2 border-white/20"
          aria-label="Open Lineage Copilot Chatbot"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-900 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-900 rounded-full" />
          </div>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-mono text-xs font-bold pr-1">
            Lineage Copilot AI
          </span>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden ${
            isExpanded
              ? 'bottom-4 right-4 left-4 top-20 sm:left-auto sm:top-auto sm:w-[680px] sm:h-[750px] sm:bottom-6 sm:right-6'
              : 'bottom-6 right-6 w-[92vw] sm:w-[460px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xs font-bold text-white tracking-wide">
                    Lineage Copilot AI
                  </h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                  {projectName} &bull; DATA-04
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Referenced Nodes Actions */}
                  {msg.relatedNodes && msg.relatedNodes.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                        Tài sản dữ liệu liên quan:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.relatedNodes.map(nodeId => {
                          const node = nodes.find(n => n.id === nodeId);
                          return (
                            <div
                              key={nodeId}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                              onClick={() => {
                                onNavigateToNode(nodeId);
                                setIsOpen(false);
                              }}
                            >
                              <Database className="w-3 h-3 text-indigo-500" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {node ? node.name : nodeId}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested follow-up queries */}
                  {msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        <span>Gợi ý câu hỏi tiếp theo:</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {msg.suggestedQueries.map((query, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSend(query)}
                            className="text-left px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="truncate">{query}</span>
                            <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] font-mono opacity-50 text-right">
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs font-mono">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>AI đang phân tích DAG đồ thị &amp; bảng dữ liệu...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[10px] font-mono shrink-0">
            <span className="text-slate-400 font-bold whitespace-nowrap">Phím tắt:</span>
            <button
              onClick={() => {
                onNavigateTab('explorer');
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-500 whitespace-nowrap cursor-pointer"
            >
              Mở Lineage DAG
            </button>
            <button
              onClick={() => {
                onNavigateTab('impact');
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-500 whitespace-nowrap cursor-pointer"
            >
              Mô phỏng Impact
            </button>
            <button
              onClick={() => {
                onNavigateTab('hitl');
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-500 whitespace-nowrap cursor-pointer"
            >
              Duyệt HITL
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về luồng dữ liệu, blast radius, nguồn gốc..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
