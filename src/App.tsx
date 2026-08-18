import React, { useState, useEffect, useMemo } from 'react';
import { TabType, Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { LineageExplorer } from './components/LineageExplorer';
import { ImpactAnalysisView } from './components/ImpactAnalysisView';
import { HITLDashboard } from './components/HITLDashboard';
import { SqlIngestScanner } from './components/SqlIngestScanner';
import { DataCatalogView } from './components/DataCatalogView';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { FloatingChatbot } from './components/FloatingChatbot';
import { mockProjectsList, ProjectData } from './data/mockProjects';
import { LineageNodeData, LineageEdgeData, HITLQueueItem } from './types/lineage';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ecommerce-lakehouse');
  
  // Project Data State
  const [currentProject, setCurrentProject] = useState<ProjectData>(mockProjectsList[0]);
  const [nodes, setNodes] = useState<LineageNodeData[]>(mockProjectsList[0].nodes);
  const [edges, setEdges] = useState<LineageEdgeData[]>(mockProjectsList[0].edges);
  const [hitlQueue, setHitlQueue] = useState<HITLQueueItem[]>(mockProjectsList[0].hitlQueue);

  // Cross-tab interaction states
  const [targetImpactNodeId, setTargetImpactNodeId] = useState<string>('');
  const [impactedNodeIds, setImpactedNodeIds] = useState<string[]>([]);
  const [upstreamNodeIds, setUpstreamNodeIds] = useState<string[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');

  // Sync project change
  useEffect(() => {
    const proj = mockProjectsList.find(p => p.id === selectedProjectId) || mockProjectsList[0];
    setCurrentProject(proj);
    setNodes(proj.nodes);
    setEdges(proj.edges);
    setHitlQueue(proj.hitlQueue);
    setImpactedNodeIds([]);
    setUpstreamNodeIds([]);
  }, [selectedProjectId]);

  // Dark Mode class handling on <html> or container
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Navigation handlers
  const handleAnalyzeImpact = (node: LineageNodeData) => {
    setTargetImpactNodeId(node.id);
    setActiveTab('impact');
  };

  const handleNavigateToGraphWithImpact = (targetId: string, downstreamIds: string[], upstreamIds: string[]) => {
    setTargetImpactNodeId(targetId);
    setImpactedNodeIds([targetId, ...downstreamIds]);
    setUpstreamNodeIds(upstreamIds);
    setActiveTab('explorer');
  };

  const handleSelectNodeInGraph = (nodeId: string) => {
    setTargetImpactNodeId(nodeId);
    setActiveTab('explorer');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'explorer') {
      setTargetImpactNodeId('');
      setImpactedNodeIds([]);
      setUpstreamNodeIds([]);
    }
    setActiveTab(tab);
  };

  // HITL Decision Handlers
  const handleConfirmHITLEdge = (item: HITLQueueItem) => {
    // 1. Update HITL status
    setHitlQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'confirmed' } : q));

    // 2. Activate or create edge in official DAG with 1.0 confidence
    setEdges(prev => {
      const exists = prev.some(e => e.id === item.edgeId);
      if (exists) {
        return prev.map(e => e.id === item.edgeId ? {
          ...e,
          status: 'active',
          confidence: 1.0,
          inferredBy: 'human_verified',
          reviewedBy: 'Lead Data Engineer',
          reviewedAt: new Date().toISOString()
        } : e);
      } else {
        return [
          ...prev,
          {
            id: item.edgeId,
            source: item.sourceTable,
            target: item.targetTable,
            confidence: 1.0,
            inferredBy: 'human_verified',
            status: 'active',
            reasoning: 'Verified and approved by Data Engineer via HITL Queue.'
          }
        ];
      }
    });
  };

  const handleRejectHITLEdge = (item: HITLQueueItem) => {
    setHitlQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'rejected' } : q));
    setEdges(prev => prev.filter(e => e.id !== item.edgeId));
  };

  const handleEditAndConfirmHITLEdge = (item: HITLQueueItem, updatedMappings: { sourceCol: string; targetCol: string }[]) => {
    setHitlQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'edited', suggestedColumnMappings: updatedMappings } : q));
    setEdges(prev => {
      const exists = prev.some(e => e.id === item.edgeId);
      if (exists) {
        return prev.map(e => e.id === item.edgeId ? {
          ...e,
          status: 'active',
          confidence: 1.0,
          inferredBy: 'human_verified',
          columnMappings: updatedMappings.map(m => ({ sourceCol: m.sourceCol, targetCol: m.targetCol }))
        } : e);
      } else {
        return [
          ...prev,
          {
            id: item.edgeId,
            source: item.sourceTable,
            target: item.targetTable,
            confidence: 1.0,
            inferredBy: 'human_verified',
            status: 'active',
            columnMappings: updatedMappings.map(m => ({ sourceCol: m.sourceCol, targetCol: m.targetCol }))
          }
        ];
      }
    });
  };

  const handleBatchConfirmAll = () => {
    hitlQueue.filter(q => q.status === 'pending').forEach(item => {
      handleConfirmHITLEdge(item);
    });
  };

  // Approve proposed change from Impact Analysis view directly
  const handleApproveProposedChange = (
    nodeId: string, 
    operation: string, 
    columnName: string, 
    newColumnName?: string, 
    notes?: string
  ) => {
    // 1. Update nodes list depending on the operation
    setNodes(prevNodes => {
      if (operation === 'drop_table') {
        return prevNodes.filter(n => n.id !== nodeId);
      }
      return prevNodes.map(node => {
        if (node.id === nodeId) {
          if (operation === 'drop_column') {
            return {
              ...node,
              columns: node.columns.filter(c => c.name !== columnName)
            };
          } else if (operation === 'rename_column' && newColumnName) {
            return {
              ...node,
              columns: node.columns.map(c => c.name === columnName ? { ...c, name: newColumnName } : c)
            };
          }
        }
        return node;
      });
    });

    // 2. Update edges/lineage configurations
    setEdges(prevEdges => {
      if (operation === 'drop_table') {
        // Remove all edges connected to this deleted table
        return prevEdges.filter(e => e.source !== nodeId && e.target !== nodeId);
      } else if (operation === 'drop_column') {
        // Remove mappings for the deleted column
        return prevEdges.map(e => {
          if (e.source === nodeId || e.target === nodeId) {
            const updatedMappings = e.columnMappings?.filter(m => 
              !(e.source === nodeId && m.sourceCol === columnName) &&
              !(e.target === nodeId && m.targetCol === columnName)
            );
            return { ...e, columnMappings: updatedMappings };
          }
          return e;
        });
      } else if (operation === 'rename_column' && newColumnName) {
        // Update column mapping source/target names
        return prevEdges.map(e => {
          if (e.source === nodeId || e.target === nodeId) {
            const updatedMappings = e.columnMappings?.map(m => {
              let src = m.sourceCol;
              let tgt = m.targetCol;
              if (e.source === nodeId && m.sourceCol === columnName) src = newColumnName;
              if (e.target === nodeId && m.targetCol === columnName) tgt = newColumnName;
              return { sourceCol: src, targetCol: tgt };
            });
            return { ...e, columnMappings: updatedMappings };
          }
          return e;
        });
      }
      return prevEdges;
    });

    // 3. Log this approved action in the HITL queue for historical auditing
    const changeId = `change_${Date.now()}`;
    const opLabel = operation === 'drop_column' ? 'Xoá cột' :
                    operation === 'rename_column' ? 'Đổi tên cột' :
                    operation === 'modify_schema' ? 'Sửa Schema' :
                    operation === 'drop_table' ? 'Xoá bảng' : 'Thay đổi logic';
                    
    const newLogItem: HITLQueueItem = {
      id: changeId,
      edgeId: `${nodeId}_${operation}_${columnName || 'table'}_approved`,
      sourceTable: nodeId,
      targetTable: 'N/A',
      sourceSchema: 'public',
      targetSchema: 'N/A',
      confidence: 1.0,
      inferredBy: 'gemini_llm',
      detectedIssue: 'dynamic_sql',
      reason: `[Đã duyệt] ${opLabel} '${columnName || 'bảng'}' thành công. Ghi chú: ${notes || 'Không có.'}`,
      sqlSnippet: `-- Automated Impact & Risk Schema Action\n-- Operation: ${operation}\n-- Column: ${columnName || 'All'}\n-- Target: ${nodeId}`,
      filePath: `schema/modifications/${nodeId}.sql`,
      suggestedColumnMappings: [],
      status: 'confirmed',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    
    setHitlQueue(prev => [newLogItem, ...prev]);
  };

  // Database Node CRUD Handlers
  const handleAddNode = (newNode: LineageNodeData) => {
    setNodes(prev => [...prev, newNode]);
  };

  const handleUpdateNode = (updatedNode: LineageNodeData) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const handleDeleteNode = (nodeId: string) => {
    // Remove the node
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    // Remove related edges
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    // Remove from HITL queue if any
    setHitlQueue(prev => prev.filter(h => h.sourceTable !== nodeId && h.targetTable !== nodeId));
  };

  // Ingest handler
  const handleIngestSuccess = (newNode: LineageNodeData, newEdges: LineageEdgeData[], hitlItem?: HITLQueueItem) => {
    setNodes(prev => [...prev.filter(n => n.id !== newNode.id), newNode]);
    setEdges(prev => [...prev, ...newEdges]);
    if (hitlItem) {
      setHitlQueue(prev => [hitlItem, ...prev]);
    }
  };

  const hitlPendingCount = hitlQueue.filter(h => h.status === 'pending').length;

  return (
    <div className="h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row overflow-hidden font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Left Vertical Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        projects={mockProjectsList}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        hitlPendingCount={hitlPendingCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative flex flex-col">
        <div className="flex-1 pb-16">
          {activeTab === 'overview' && (
            <OverviewDashboard
              nodes={nodes}
              edges={edges}
              hitlQueue={hitlQueue}
              projectName={currentProject.name}
              onNavigateTab={handleTabChange}
              onSelectNodeInGraph={handleSelectNodeInGraph}
              onAnalyzeImpactForNode={handleAnalyzeImpact}
              onConfirmHITLEdge={handleConfirmHITLEdge}
              onRejectHITLEdge={handleRejectHITLEdge}
            />
          )}

          {activeTab === 'explorer' && (
            <LineageExplorer
              nodes={nodes}
              edges={edges}
              darkMode={darkMode}
              onAnalyzeImpact={handleAnalyzeImpact}
              onOpenHITL={() => handleTabChange('hitl')}
              selectedNodeId={targetImpactNodeId}
              impactedNodeIds={impactedNodeIds}
              upstreamNodeIds={upstreamNodeIds}
              layoutDirection={layoutDirection}
            />
          )}

          {activeTab === 'impact' && (
            <ImpactAnalysisView
              nodes={nodes}
              edges={edges}
              initialNodeId={targetImpactNodeId}
              onNavigateToGraphWithImpact={handleNavigateToGraphWithImpact}
              onAskCopilot={(q) => {
                // Trigger floating chatbot with prompt
              }}
              onApproveProposedChange={handleApproveProposedChange}
            />
          )}

          {activeTab === 'hitl' && (
            <HITLDashboard
              queue={hitlQueue}
              onConfirmEdge={handleConfirmHITLEdge}
              onRejectEdge={handleRejectHITLEdge}
              onEditAndConfirmEdge={handleEditAndConfirmHITLEdge}
              onBatchConfirmAll={handleBatchConfirmAll}
            />
          )}

          {activeTab === 'ingest' && (
            <SqlIngestScanner
              onIngestSuccess={handleIngestSuccess}
              onNavigateToGraph={() => handleTabChange('explorer')}
            />
          )}

          {activeTab === 'catalog' && (
            <DataCatalogView
              nodes={nodes}
              onSelectNodeInGraph={handleSelectNodeInGraph}
              onAnalyzeImpactForNode={handleAnalyzeImpact}
            />
          )}
        </div>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        nodes={nodes}
        edges={edges}
        hitlQueue={hitlQueue}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        layoutDirection={layoutDirection}
        setLayoutDirection={setLayoutDirection}
      />

      {/* Floating Chatbot Assistant (Bottom-Right) */}
      <FloatingChatbot
        nodes={nodes}
        edges={edges}
        hitlQueue={hitlQueue}
        projectName={currentProject.name}
        onNavigateToNode={handleSelectNodeInGraph}
        onOpenImpactForNode={(id) => {
          setTargetImpactNodeId(id);
          setActiveTab('impact');
        }}
        onNavigateTab={(tab) => handleTabChange(tab as TabType)}
      />
    </div>
  );
}

