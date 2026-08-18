import React, { useState } from 'react';
import { LineageNodeData, LineageEdgeData } from '../types/lineage';
import { Search, Database, Layers, Key, Clock, ShieldCheck, Zap, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

interface DataCatalogViewProps {
  nodes: LineageNodeData[];
  onSelectNodeInGraph: (nodeId: string) => void;
  onAnalyzeImpactForNode: (node: LineageNodeData) => void;
}

export const DataCatalogView: React.FC<DataCatalogViewProps> = ({
  nodes,
  onSelectNodeInGraph,
  onAnalyzeImpactForNode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [layerFilter, setLayerFilter] = useState<string>('all');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const filteredNodes = nodes.filter(n => {
    const matchSearch = !searchTerm || 
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.schema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.columns.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      n.owner.toLowerCase().includes(searchTerm.toLowerCase());

    const matchLayer = layerFilter === 'all' || n.layer === layerFilter;
    return matchSearch && matchLayer;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Database className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Governance Hub &bull; Metadata Dictionary
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Catalog &amp; Column Metadata
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Từ điển dữ liệu tập trung gồm {nodes.length} bảng và tài sản dữ liệu trải dài từ nguồn (Sources), Staging, Marts đến các báo cáo BI.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 lg:ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bảng, cột dữ liệu, chủ sở hữu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-64 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={layerFilter}
            onChange={(e) => setLayerFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="all">All Layers (Tất cả các tầng)</option>
            <option value="source">Sources (Nguồn Raw)</option>
            <option value="staging">Staging (Tầng chuẩn hóa)</option>
            <option value="intermediate">Intermediate (Tầng trung gian)</option>
            <option value="marts">Gold Marts (Tầng tổng hợp)</option>
            <option value="bi_dashboard">BI Dashboards (Báo cáo BI)</option>
            <option value="feature_store">Feature Store (Mô hình ML)</option>
            <option value="reverse_etl">Reverse ETL</option>
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-mono text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Asset Name (Tên bảng / Model)</th>
                <th className="py-3 px-4">Schema &amp; Layer (Tầng dữ liệu)</th>
                <th className="py-3 px-4">Quality &amp; Freshness (Chất lượng &amp; Cập nhật)</th>
                <th className="py-3 px-4">Owner (Chủ sở hữu)</th>
                <th className="py-3 px-4">Columns (Số cột)</th>
                <th className="py-3 px-4 text-right">Actions (Thao tác)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs">
                    No data assets match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const isExpanded = expandedNodeId === node.id;
                  return (
                    <React.Fragment key={node.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                            className="flex items-center gap-2 text-left font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{node.name}</span>
                          </button>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {node.description}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {node.schema}
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {node.layer.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{node.qualityScore}%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{node.freshness}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                          {node.owner}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {node.columns.length} cột
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onAnalyzeImpactForNode(node)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
                              title="Phân tích bán kính ảnh hưởng"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onSelectNodeInGraph(node.id)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                              title="Xem trên biểu đồ Lineage DAG"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Columns Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                          <td colSpan={6} className="p-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3">
                              <h4 className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                Columns &amp; Types for `{node.name}` (Chi tiết danh sách cột &amp; kiểu dữ liệu):
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {node.columns.map((c, i) => (
                                  <div
                                    key={i}
                                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      {c.isPrimaryKey && (
                                        <span title="Primary Key">
                                          <Key className="w-3 h-3 text-amber-500 shrink-0" />
                                        </span>
                                      )}
                                      <span className="text-slate-900 dark:text-white font-semibold truncate">{c.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      {c.type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
