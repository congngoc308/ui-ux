import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant,
  Panel,
  ReactFlowInstance
} from '@xyflow/react';
import { LineageNodeData, LineageEdgeData, DataLayer, ColumnDef } from '../types/lineage';
import { CustomTableNode, LineageViewMode, AffectedColumnInfo } from './CustomTableNode';
import { 
  Search, 
  Layers, 
  ShieldCheck, 
  RotateCcw, 
  X, 
  Zap, 
  Code2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  GitBranch,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Table,
  Info,
  Clock,
  User,
  Tag,
  Hash,
  ExternalLink,
  Copy,
  Check,
  Flame,
  GitCommit,
  Share2
} from 'lucide-react';

interface LineageExplorerProps {
  nodes: LineageNodeData[];
  edges: LineageEdgeData[];
  darkMode: boolean;
  onAnalyzeImpact: (node: LineageNodeData) => void;
  onOpenHITL: () => void;
  selectedNodeId?: string;
  impactedNodeIds?: string[];
  upstreamNodeIds?: string[];
  layoutDirection: 'LR' | 'TB';
}

const nodeTypes = {
  customTable: CustomTableNode
};

const layerOrder: Record<DataLayer, number> = {
  source: 0,
  staging: 1,
  intermediate: 2,
  marts: 3,
  bi_dashboard: 4,
  feature_store: 4,
  reverse_etl: 4
};

export const LineageExplorer: React.FC<LineageExplorerProps> = ({
  nodes: initialNodesData,
  edges: initialEdgesData,
  darkMode,
  onAnalyzeImpact,
  onOpenHITL,
  selectedNodeId: externalSelectedNodeId,
  impactedNodeIds = [],
  upstreamNodeIds = [],
  layoutDirection
}) => {
  // Atlan State Controls
  const [viewMode, setViewMode] = useState<LineageViewMode>('compact');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');

  // Active column trace (Column-Level Lineage - CLL)
  const [activeTracedColumn, setActiveTracedColumn] = useState<{ nodeId: string; colName: string } | null>(null);

  // Selected Node / 360° Drawer state
  const [selectedNode, setSelectedNode] = useState<LineageNodeData | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'overview' | 'columns' | 'lineage' | 'sql'>('overview');
  const [selectedEdge, setSelectedEdge] = useState<LineageEdgeData | null>(null);

  // Focus / Isolation Mode
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Expanded Nodes set to track which cards are expanded in layout to prevent overlap
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const handleToggleExpandNode = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);


  // Sync external selected node
  useEffect(() => {
    if (externalSelectedNodeId) {
      const match = initialNodesData.find(n => n.id === externalSelectedNodeId);
      if (match) {
        setSelectedNode(match);
        setFocusedNodeId(match.id);
        setIsFocusMode(true);
      }
    }
  }, [externalSelectedNodeId, initialNodesData]);

  // Fit viewport when drawer opens/closes to prevent node overlapping
  useEffect(() => {
    if (rfInstance) {
      const timer = setTimeout(() => {
        rfInstance.fitView({ duration: 600, padding: 0.15 });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [selectedNode, selectedEdge, rfInstance]);


  // Compute matched nodes, edges, affected columns and direct column-to-column connections for active Column-Level Lineage
  const { cllMatchedNodeIds, cllMatchedEdgeIds, nodeAffectedColumns, cllEdgesList } = useMemo(() => {
    if (!activeTracedColumn) {
      return { 
        cllMatchedNodeIds: new Set<string>(), 
        cllMatchedEdgeIds: new Set<string>(),
        nodeAffectedColumns: {} as Record<string, AffectedColumnInfo[]>,
        cllEdgesList: [] as Array<{
          id: string;
          source: string;
          target: string;
          sourceCol: string;
          targetCol: string;
          transformType?: string;
          isVerified: boolean;
        }>
      };
    }

    const matchedNodes = new Set<string>([activeTracedColumn.nodeId]);
    const matchedEdges = new Set<string>();
    const affectedMap: Record<string, AffectedColumnInfo[]> = {};
    const edgesList: Array<{
      id: string;
      source: string;
      target: string;
      sourceCol: string;
      targetCol: string;
      transformType?: string;
      isVerified: boolean;
    }> = [];

    // 1. Trace Downstream
    const downstreamQueue: { nodeId: string; colName: string }[] = [
      { nodeId: activeTracedColumn.nodeId, colName: activeTracedColumn.colName }
    ];
    const visitedDownstream = new Set<string>([`${activeTracedColumn.nodeId}:${activeTracedColumn.colName}`]);

    while (downstreamQueue.length > 0) {
      const { nodeId: currNodeId, colName: currColName } = downstreamQueue.shift()!;
      
      initialEdgesData.forEach(edge => {
        if (edge.source === currNodeId) {
          let mappingsFound: Array<{ sourceCol: string; targetCol: string; transformType?: string }> = [];

          if (edge.columnMappings && edge.columnMappings.length > 0) {
            mappingsFound = edge.columnMappings.filter(m => 
              m.sourceCol.toLowerCase() === currColName.toLowerCase()
            );
          }

          const targetNode = initialNodesData.find(n => n.id === edge.target);
          if (mappingsFound.length === 0 && targetNode) {
            const exactCol = targetNode.columns.find(c => c.name.toLowerCase() === currColName.toLowerCase());
            if (exactCol) {
              mappingsFound = [{ sourceCol: currColName, targetCol: exactCol.name, transformType: 'Pass-through' }];
            }
          }

          mappingsFound.forEach(mapping => {
            const targetColName = mapping.targetCol;
            const transformType = mapping.transformType || (edge.inferredBy === 'gemini_llm' ? 'AI Inferred' : 'Direct SQL');
            const targetColDef = targetNode?.columns.find(c => c.name === targetColName);

            matchedEdges.add(edge.id);
            matchedNodes.add(edge.target);

            if (!affectedMap[edge.target]) {
              affectedMap[edge.target] = [];
            }
            if (!affectedMap[edge.target].some(x => x.colName.toLowerCase() === targetColName.toLowerCase())) {
              affectedMap[edge.target].push({
                colName: targetColName,
                type: targetColDef?.type,
                transformType,
                isStartNode: false,
                isPrimaryKey: targetColDef?.isPrimaryKey,
                isForeignKey: targetColDef?.isForeignKey,
                sourceCol: currColName
              });
            }

            edgesList.push({
              id: `cll-down-${edge.id}-${currNodeId}-${currColName}-${edge.target}-${targetColName}`,
              source: currNodeId,
              target: edge.target,
              sourceCol: currColName,
              targetCol: targetColName,
              transformType,
              isVerified: edge.confidence === 1.0
            });

            const stateKey = `${edge.target}:${targetColName}`;
            if (!visitedDownstream.has(stateKey)) {
              visitedDownstream.add(stateKey);
              downstreamQueue.push({ nodeId: edge.target, colName: targetColName });
            }
          });
        }
      });
    }

    // 2. Trace Upstream
    const upstreamQueue: { nodeId: string; colName: string }[] = [
      { nodeId: activeTracedColumn.nodeId, colName: activeTracedColumn.colName }
    ];
    const visitedUpstream = new Set<string>([`${activeTracedColumn.nodeId}:${activeTracedColumn.colName}`]);

    while (upstreamQueue.length > 0) {
      const { nodeId: currNodeId, colName: currColName } = upstreamQueue.shift()!;

      initialEdgesData.forEach(edge => {
        if (edge.target === currNodeId) {
          let mappingsFound: Array<{ sourceCol: string; targetCol: string; transformType?: string }> = [];

          if (edge.columnMappings && edge.columnMappings.length > 0) {
            mappingsFound = edge.columnMappings.filter(m => 
              m.targetCol.toLowerCase() === currColName.toLowerCase()
            );
          }

          const sourceNode = initialNodesData.find(n => n.id === edge.source);
          if (mappingsFound.length === 0 && sourceNode) {
            const exactCol = sourceNode.columns.find(c => c.name.toLowerCase() === currColName.toLowerCase());
            if (exactCol) {
              mappingsFound = [{ sourceCol: exactCol.name, targetCol: currColName, transformType: 'Source Origin' }];
            }
          }

          mappingsFound.forEach(mapping => {
            const sourceColName = mapping.sourceCol;
            const transformType = mapping.transformType || 'Source Lineage';
            const sourceColDef = sourceNode?.columns.find(c => c.name === sourceColName);

            matchedEdges.add(edge.id);
            matchedNodes.add(edge.source);

            if (!affectedMap[edge.source]) {
              affectedMap[edge.source] = [];
            }
            if (!affectedMap[edge.source].some(x => x.colName.toLowerCase() === sourceColName.toLowerCase())) {
              affectedMap[edge.source].push({
                colName: sourceColName,
                type: sourceColDef?.type,
                transformType,
                isStartNode: false,
                isPrimaryKey: sourceColDef?.isPrimaryKey,
                isForeignKey: sourceColDef?.isForeignKey,
                sourceCol: currColName
              });
            }

            edgesList.push({
              id: `cll-up-${edge.id}-${edge.source}-${sourceColName}-${currNodeId}-${currColName}`,
              source: edge.source,
              target: currNodeId,
              sourceCol: sourceColName,
              targetCol: currColName,
              transformType,
              isVerified: edge.confidence === 1.0
            });

            const stateKey = `${edge.source}:${sourceColName}`;
            if (!visitedUpstream.has(stateKey)) {
              visitedUpstream.add(stateKey);
              upstreamQueue.push({ nodeId: edge.source, colName: sourceColName });
            }
          });
        }
      });
    }

    return { 
      cllMatchedNodeIds: matchedNodes, 
      cllMatchedEdgeIds: matchedEdges, 
      nodeAffectedColumns: affectedMap,
      cllEdgesList: edgesList
    };
  }, [activeTracedColumn, initialNodesData, initialEdgesData]);

  // Compute transitive upstream & downstream for card isolation mode
  const { focusedUpstreamIds, focusedDownstreamIds, directNeighborIds } = useMemo(() => {
    if (!isFocusMode || !focusedNodeId) {
      return {
        focusedUpstreamIds: new Set<string>(),
        focusedDownstreamIds: new Set<string>(),
        directNeighborIds: new Set<string>()
      };
    }

    const upstream = new Set<string>();
    const downstream = new Set<string>();
    const direct = new Set<string>();

    // Direct neighbors
    initialEdgesData.forEach(e => {
      if (e.target === focusedNodeId) {
        direct.add(e.source);
      }
      if (e.source === focusedNodeId) {
        direct.add(e.target);
      }
    });

    // Full Upstream traversal
    let upQueue = [focusedNodeId];
    while (upQueue.length > 0) {
      const curr = upQueue.shift()!;
      initialEdgesData.forEach(e => {
        if (e.target === curr && !upstream.has(e.source)) {
          upstream.add(e.source);
          upQueue.push(e.source);
        }
      });
    }

    // Full Downstream traversal
    let downQueue = [focusedNodeId];
    while (downQueue.length > 0) {
      const curr = downQueue.shift()!;
      initialEdgesData.forEach(e => {
        if (e.source === curr && !downstream.has(e.target)) {
          downstream.add(e.target);
          downQueue.push(e.target);
        }
      });
    }

    return { focusedUpstreamIds: upstream, focusedDownstreamIds: downstream, directNeighborIds: direct };
  }, [isFocusMode, focusedNodeId, initialEdgesData]);

  // Handler: Select column to trace Column-Level Lineage (CLL) with isolation
  const handleSelectColumn = useCallback((nodeId: string, colName: string) => {
    if (activeTracedColumn?.nodeId === nodeId && activeTracedColumn?.colName === colName) {
      setActiveTracedColumn(null);
    } else {
      setActiveTracedColumn({ nodeId, colName });
      setFocusedNodeId(nodeId);
      setIsFocusMode(true);
      const match = initialNodesData.find(n => n.id === nodeId);
      if (match) {
        setSelectedNode(match);
        setActiveDrawerTab('columns');
        setSelectedEdge(null);
      }
    }
  }, [activeTracedColumn, initialNodesData]);

  // Handler: Click on node/card immediately turns on isolation for that card
  const handleInspectNode = useCallback((node: LineageNodeData) => {
    setSelectedNode(node);
    setFocusedNodeId(node.id);
    setIsFocusMode(true);
    setActiveTracedColumn(null); // Clear specific column to isolate full table flow
    setSelectedEdge(null);
    setActiveDrawerTab('overview');
  }, []);

  // Compute active nodes based on selected relationship filter to hide unconnected ones
  const activeEdgeNodeIds = useMemo(() => {
    if (selectedRelationship === 'all') return null;
    const ids = new Set<string>();
    initialEdgesData.forEach(e => {
      const isVerified = e.confidence === 1.0 || e.inferredBy === 'sqlglot_parser' || e.inferredBy === 'human_verified';
      const isPendingHITL = e.status === 'pending_hitl';
      
      let matches = false;
      if (selectedRelationship === 'verified') {
        matches = isVerified && !isPendingHITL;
      } else if (selectedRelationship === 'llm') {
        matches = !isVerified && !isPendingHITL;
      } else if (selectedRelationship === 'hitl') {
        matches = isPendingHITL;
      }
      
      if (matches) {
        ids.add(e.source);
        ids.add(e.target);
      }
    });
    return ids;
  }, [initialEdgesData, selectedRelationship]);


  // Compute Node Positioning (Clean Layer Columns) with Dimming Support
  const computeInitialNodes = useCallback((mode: LineageViewMode) => {
    const layerBuckets: Record<number, LineageNodeData[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    };

    const filteredNodesData = activeEdgeNodeIds 
      ? initialNodesData.filter(n => activeEdgeNodeIds.has(n.id))
      : initialNodesData;

    filteredNodesData.forEach(n => {
      const col = layerOrder[n.layer] ?? 2;
      layerBuckets[col].push(n);
    });

    const isCompactMode = mode === 'compact';
    const xSpacing = isCompactMode ? 340 : 550;
    const gap = 35;
    const nodeWidth = isCompactMode ? 260 : 300;

    // Helper to calculate height of a node dynamically based on actual column count to prevent overlapping
    const getNodeHeight = (item: LineageNodeData) => {
      const isExpanded = expandedNodeIds.has(item.id) || (activeTracedColumn?.nodeId === item.id) || (selectedNode?.id === item.id);
      const columnCount = item.columns.length;

      // Spacing for affected columns when tracing a column (CLL)
      const affectedCols = nodeAffectedColumns[item.id] || [];
      const hasAffectedCols = affectedCols.length > 0 && activeTracedColumn?.nodeId !== item.id;
      const affectedHeight = hasAffectedCols ? (50 + affectedCols.length * 32) : 0;

      if (isCompactMode) {
        if (isExpanded) {
          // Dynamic columns list container height: 32px per column + 24px header, capped at 220px
          const colsHeight = Math.min(220, columnCount * 32 + 24);
          // Base compact collapsed height (145px) + columns container height + padding (20px)
          return 145 + colsHeight + 20 + affectedHeight;
        } else {
          return 145 + affectedHeight;
        }
      } else {
        if (isExpanded) {
          // Dynamic columns list container height: 33px per column (no capping in full mode)
          const colsHeight = columnCount * 33;
          // Base full height (header, padding, column titles, and action footer) = ~200px
          // Let's add 20px extra padding/breathing room to satisfy "các bảng cách nhau 1 khoảng"
          return 200 + colsHeight + 20 + affectedHeight;
        } else {
          // Collapsed shows up to 4 columns
          const colsCountToShow = Math.min(columnCount, 4);
          const colsHeight = colsCountToShow * 33;
          // Base full height (header, padding, column titles, and action footer) = ~200px
          // Plus "+X more columns" text link (~24px)
          return 200 + colsHeight + 24 + 20 + affectedHeight;
        }
      }
    };

    // Pre-calculate heights for all columns to get tallest column height
    const colHeights: Record<number, number> = {};
    const colNodeHeights: Record<number, number[]> = {};

    Object.entries(layerBuckets).forEach(([colStr, items]) => {
      const col = parseInt(colStr, 10);
      const heights = items.map(item => getNodeHeight(item));
      colNodeHeights[col] = heights;
      colHeights[col] = heights.reduce((sum, h) => sum + h, 0) + Math.max(0, items.length - 1) * gap;
    });

    const canvasHeight = Math.max(...Object.values(colHeights), 100);
    const result: Node[] = [];

    // TB Pre-calculations
    const xGap = 40;
    const layerWidths: Record<number, number> = {};
    Object.entries(layerBuckets).forEach(([colStr, items]) => {
      const col = parseInt(colStr, 10);
      layerWidths[col] = items.length * nodeWidth + Math.max(0, items.length - 1) * xGap;
    });
    const canvasWidth = Math.max(...Object.values(layerWidths), 100);

    const layerYOffset: Record<number, number> = {};
    const yGap = isCompactMode ? 140 : 200;
    let accumulatedY = 60;
    for (let l = 0; l <= 4; l++) {
      layerYOffset[l] = accumulatedY;
      const heights = colNodeHeights[l] || [];
      const maxHeight = heights.length > 0 ? Math.max(...heights) : 0;
      accumulatedY += maxHeight + yGap;
    }

    Object.entries(layerBuckets).forEach(([colStr, items]) => {
      const col = parseInt(colStr, 10);
      const columnHeight = colHeights[col];
      const startYOffset = (canvasHeight - columnHeight) / 2;

      let currentY = 60 + startYOffset;

      items.forEach((item, index) => {
        const nodeHeight = colNodeHeights[col][index];
        
        let xPos = 60 + col * xSpacing;
        let yPos = currentY;

        if (layoutDirection === 'TB') {
          const layerWidth = layerWidths[col];
          const startXOffset = (canvasWidth - layerWidth) / 2;
          xPos = 60 + startXOffset + index * (nodeWidth + xGap);
          yPos = layerYOffset[col];
        }

        // Advance currentY for the next node
        currentY += nodeHeight + gap;

        const isImpacted = impactedNodeIds.includes(item.id);
        const isUpstream = upstreamNodeIds.includes(item.id);
        const isColumnMatched = activeTracedColumn ? cllMatchedNodeIds.has(item.id) : false;
        const isFocused = isFocusMode && focusedNodeId === item.id;
        const isDirectNeighbor = directNeighborIds.has(item.id);
        const affectedColumns = nodeAffectedColumns[item.id] || [];

        // Calculate whether this node should be dimmed (mờ các bảng khác)
        let isDimmed = false;
        if (activeTracedColumn) {
          isDimmed = !cllMatchedNodeIds.has(item.id);
        } else if (isFocusMode && focusedNodeId) {
          const isRelevant = item.id === focusedNodeId || focusedUpstreamIds.has(item.id) || focusedDownstreamIds.has(item.id);
          isDimmed = !isRelevant;
        }

        const nodeViewMode: LineageViewMode = activeTracedColumn 
          ? (item.id === activeTracedColumn.nodeId ? 'full' : 'compact')
          : mode;

        const isNodeExpanded = expandedNodeIds.has(item.id) || (activeTracedColumn?.nodeId === item.id) || (selectedNode?.id === item.id);

        result.push({
          id: item.id,
          type: 'customTable',
          position: {
            x: xPos,
            y: yPos
          },
          data: {
            ...item,
            viewMode: nodeViewMode,
            layoutDirection,
            isImpacted,
            isUpstream,
            isFocused,
            isDirectNeighbor,
            isDimmed,
            isColumnMatched,
            affectedColumns,
            isExpanded: isNodeExpanded,
            selectedColumnName: activeTracedColumn?.nodeId === item.id ? activeTracedColumn.colName : null,
            onInspect: (n: LineageNodeData) => handleInspectNode(n),
            onAnalyzeImpact: (n: LineageNodeData) => onAnalyzeImpact(n),
            onSelectColumn: (nodeId: string, colName: string) => handleSelectColumn(nodeId, colName),
            onToggleExpand: () => handleToggleExpandNode(item.id)
          }
        });
      });
    });

    return result;
  }, [
    activeEdgeNodeIds,
    initialNodesData, 
    impactedNodeIds, 
    upstreamNodeIds, 
    onAnalyzeImpact, 
    activeTracedColumn, 
    cllMatchedNodeIds, 
    isFocusMode, 
    focusedNodeId, 
    focusedUpstreamIds, 
    focusedDownstreamIds, 
    directNeighborIds, 
    nodeAffectedColumns, 
    handleInspectNode, 
    handleSelectColumn,
    expandedNodeIds,
    selectedNode,
    handleToggleExpandNode,
    layoutDirection
  ]);

  const initialNodes = useMemo(() => computeInitialNodes(viewMode), [computeInitialNodes, viewMode]);

  // Transform Edges for ReactFlow with Green (Verified) and Orange (LLM) flow animations
  // When activeTracedColumn is active, direct connections go from clicked column to compact tables!
  const initialEdges: Edge[] = useMemo(() => {
    // Filter initial edges data based on the relationship status filter
    const filteredEdgesData = initialEdgesData.filter(e => {
      if (selectedRelationship === 'all') return true;
      const isVerified = e.confidence === 1.0 || e.inferredBy === 'sqlglot_parser' || e.inferredBy === 'human_verified';
      const isPendingHITL = e.status === 'pending_hitl';
      
      if (selectedRelationship === 'verified') {
        return isVerified && !isPendingHITL;
      } else if (selectedRelationship === 'llm') {
        return !isVerified && !isPendingHITL;
      } else if (selectedRelationship === 'hitl') {
        return isPendingHITL;
      }
      return true;
    });

    if (activeTracedColumn && cllEdgesList.length > 0) {
      // 1. Column-to-column connections
      const directCllEdges: Edge[] = cllEdgesList.map(c => {
        const strokeColor = c.isVerified ? '#10b981' : '#f97316';

        return {
          id: c.id,
          source: c.source,
          target: c.target,
          sourceHandle: `out-col-${c.sourceCol}`,
          targetHandle: `in-col-${c.targetCol}`,
          animated: true,
          className: 'cll-active animated',
          style: {
            stroke: strokeColor,
            strokeWidth: 3.2,
            opacity: 1,
            transition: 'opacity 0.2s ease, stroke 0.2s ease'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14
          },
          label: c.transformType,
          labelStyle: {
            fontSize: 10,
            fontWeight: 700,
            fill: c.isVerified ? '#047857' : '#c2410c',
            fontFamily: 'monospace'
          },
          labelBgStyle: {
            fill: darkMode ? '#0f172a' : '#ffffff',
            fillOpacity: 0.95,
            rx: 4,
            ry: 4
          }
        };
      });

      // 2. Dimmed background table edges
      const bgEdges: Edge[] = filteredEdgesData.map(e => ({
        id: `bg-${e.id}`,
        source: e.source,
        target: e.target,
        sourceHandle: 'out',
        targetHandle: 'in',
        animated: false,
        className: '',
        style: {
          stroke: '#94a3b8',
          strokeWidth: 1.2,
          opacity: 0.08
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
          width: 10,
          height: 10
        }
      }));

      return [...directCllEdges, ...bgEdges];
    }

    return filteredEdgesData.map(e => {
      const isVerified = e.inferredBy === 'sqlglot_parser' || e.inferredBy === 'human_verified' || e.confidence === 1.0;
      const isPendingHITL = e.status === 'pending_hitl';
      const isImpacted = impactedNodeIds.includes(e.source) && impactedNodeIds.includes(e.target);

      // Visual styling: Green for Verified, Orange for LLM Inferred
      const baseColor = isVerified ? '#10b981' : '#f97316';

      let strokeColor = baseColor;
      let strokeWidth = 2.2;
      let opacity = 1;
      let animated = false;
      let edgeClass = '';

      if (isFocusMode && focusedNodeId) {
        const isSourceRelevant = focusedNodeId === e.source || focusedUpstreamIds.has(e.source) || focusedDownstreamIds.has(e.source);
        const isTargetRelevant = focusedNodeId === e.target || focusedUpstreamIds.has(e.target) || focusedDownstreamIds.has(e.target);
        const isRelevantEdge = isSourceRelevant && isTargetRelevant;

        if (isRelevantEdge) {
          strokeColor = baseColor;
          strokeWidth = 2.6;
          opacity = 1;
          animated = true;
          edgeClass = 'animated';
        } else {
          opacity = 0.12;
          strokeColor = '#94a3b8';
          strokeWidth = 1.2;
          animated = false;
          edgeClass = '';
        }
      } else if (isImpacted) {
        strokeColor = '#ef4444';
        strokeWidth = 2.8;
        animated = true;
        edgeClass = 'impacted animated';
      } else if (isPendingHITL) {
        strokeColor = '#f97316';
        strokeWidth = 2.2;
        animated = true;
        edgeClass = 'animated';
      }

      const strokeDasharray = isPendingHITL ? '5,5' : undefined;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: 'out',
        targetHandle: 'in',
        animated,
        className: edgeClass,
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity,
          strokeDasharray,
          transition: 'opacity 0.2s ease, stroke 0.2s ease'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14
        },
        label: e.confidence < 1.0 ? `${(e.confidence * 100).toFixed(0)}% AI` : undefined,
        labelStyle: {
          fontSize: 10,
          fontWeight: 700,
          fill: isVerified ? '#047857' : '#c2410c',
          fontFamily: 'monospace'
        },
        labelBgStyle: {
          fill: darkMode ? '#0f172a' : '#ffffff',
          fillOpacity: 0.92,
          rx: 4,
          ry: 4
        },
        data: e as any
      };
    });
  }, [
    initialEdgesData, 
    selectedRelationship,
    impactedNodeIds, 
    activeTracedColumn, 
    cllEdgesList, 
    isFocusMode, 
    focusedNodeId, 
    focusedUpstreamIds, 
    focusedDownstreamIds, 
    darkMode
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Fit viewport automatically when layoutDirection or relationship filter changes
  useEffect(() => {
    if (rfInstance) {
      const timer = setTimeout(() => {
        rfInstance.fitView({ duration: 600, padding: 0.15 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [layoutDirection, selectedRelationship, rfInstance]);

  // Handler: Reset layout / node positions to default
  const handleResetPositions = useCallback(() => {
    const freshNodes = computeInitialNodes(viewMode);
    setNodes(freshNodes);
    setTimeout(() => {
      rfInstance?.fitView({ duration: 500, padding: 0.15 });
    }, 50);
  }, [computeInitialNodes, viewMode, setNodes, rfInstance]);

  // Handler: Change view mode (Tinh gọn collapses all details)
  const handleChangeViewMode = (newMode: LineageViewMode) => {
    setViewMode(newMode);
    setExpandedNodeIds(new Set());
    const updated = computeInitialNodes(newMode);
    setNodes(updated);
    setTimeout(() => {
      rfInstance?.fitView({ duration: 400, padding: 0.15 });
    }, 50);
  };

  // Handler: Click blank canvas to disable isolation mode and clear selection
  const onPaneClick = useCallback(() => {
    setIsFocusMode(false);
    setFocusedNodeId(null);
    setActiveTracedColumn(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setExpandedNodeIds(new Set());
  }, []);

  // Filtered nodes (Search, Layer)
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const data = node.data as unknown as LineageNodeData;
      
      // Search term
      const matchesSearch = !searchTerm || 
        data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.schema.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        data.columns.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

      // Layer Filter
      const matchesLayer = selectedLayer === 'all' || data.layer === selectedLayer;

      return matchesSearch && matchesLayer;
    });
  }, [nodes, searchTerm, selectedLayer]);

  // Click on node in graph
  const onNodeClick = useCallback((_: any, node: Node) => {
    const matched = initialNodesData.find(n => n.id === node.id);
    if (matched) {
      handleInspectNode(matched);
    }
  }, [initialNodesData, handleInspectNode]);

  // Click on edge (Inspect Process / Transformation)
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const matched = initialEdgesData.find(e => e.id === edge.id);
    if (matched) {
      setSelectedEdge(matched);
      setSelectedNode(null);
    }
  }, [initialEdgesData]);

  // Copy SQL helper
  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-2rem)] flex overflow-hidden">
      
      {/* 1. Atlan-Style Control & Filter Toolbar (Top Header) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-[calc(100vw-6rem)]">
        
        {/* View Mode Segmented Selector (Compact View / Full View) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            id="view-mode-compact-btn"
            onClick={() => handleChangeViewMode('compact')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Dạng tinh gọn: Tích hợp Column-Level Lineage (CLL), hover/click để xem cột & truy vết"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compact View</span>
          </button>

          <button
            id="view-mode-full-btn"
            onClick={() => handleChangeViewMode('full')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              viewMode === 'full'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Dạng đầy đủ: Tích hợp Column-Level Lineage (CLL), hiển thị schema và nhấp cột để truy vết"
          >
            <List className="w-3.5 h-3.5" />
            <span>Full View</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="explorer-search-input"
            type="text"
            placeholder="Search tables, schema, columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-40 sm:w-56 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Relationship Status Filter */}
        <div className="hidden sm:flex items-center">
          <select
            id="explorer-relationship-filter"
            value={selectedRelationship}
            onChange={(e) => setSelectedRelationship(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none font-mono"
          >
            <option value="all">All Status</option>
            <option value="verified">🟢 Verified Flow</option>
            <option value="llm">🟠 LLM Generated</option>
            <option value="hitl">🟠--- HITL Queue</option>
          </select>
        </div>
      </div>

      {/* 2. Active Column-Level Lineage (CLL) Banner Indicator */}
      {activeTracedColumn && (
        <div className="absolute top-20 left-4 z-20 flex items-center gap-3 px-4 py-2 bg-indigo-900/95 text-white rounded-2xl border border-indigo-700 shadow-xl text-xs animate-in slide-in-from-top duration-200 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-600 text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span>Tracing Column:</span>
            <strong className="text-amber-300 underline font-bold font-mono">
              {activeTracedColumn.nodeId}.{activeTracedColumn.colName}
            </strong>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-indigo-200 pl-2 border-l border-indigo-700">
            <span>{cllMatchedNodeIds.size} bảng trong luồng dữ liệu</span>
            <span>&bull;</span>
            <span>{cllMatchedEdgeIds.size} bước chuyển đổi</span>
          </div>

          <button
            onClick={() => setActiveTracedColumn(null)}
            className="px-2 py-0.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-[10px] font-bold border border-indigo-600 cursor-pointer transition-colors"
          >
            Clear Trace &times;
          </button>
        </div>
      )}

      {/* 3. Atlan Bottom Legend & Status Bar */}
      <div className="absolute bottom-4 left-[80px] z-20 flex flex-wrap items-center gap-4 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 shadow-md">
        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>Lineage Flow:</span>
        </span>
        <div className="flex items-center gap-2" title="Đường kết nối màu xanh lá biểu thị luồng dữ liệu đã được Parser sqlglot/Kỹ sư dữ liệu xác thực (100%)">
          <span className="w-6 h-[3px] bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50 inline-block" />
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Verified Flow</span>
        </div>
        <div className="flex items-center gap-2" title="Đường kết nối màu cam biểu thị luồng suy luận tự động bởi Gemini LLM">
          <span className="w-6 h-[3px] bg-orange-500 rounded-full shadow-sm shadow-orange-500/50 inline-block" />
          <span className="text-orange-600 dark:text-orange-400 font-semibold">LLM Generated</span>
        </div>
        <div className="flex items-center gap-2" title="Đường đứt nét màu cam biểu thị luồng đang chờ xác thực HITL">
          <span className="w-6 h-0 border-t-2 border-dashed border-orange-500 inline-block" />
          <span className="text-orange-600 dark:text-orange-400 font-semibold">HITL Queue</span>
        </div>
        {isFocusMode && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              Isolated Mode
            </span>
            <span className="text-slate-400 text-[10px] hidden sm:inline">(Nhấp vùng trống để bỏ cô lập)</span>
          </div>
        )}
      </div>

      {/* 4. React Flow Graph Canvas */}
      <div className={`h-full transition-all duration-300 ${
        (selectedNode || selectedEdge) ? 'w-full lg:w-[calc(100%-440px)]' : 'w-full'
      }`}>
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color={darkMode ? '#334155' : '#cbd5e1'}
          />
          <Controls 
            showFitView={false} 
            showInteractive={false}
            className="!bg-slate-900 !border-slate-800 !rounded-2xl !shadow-lg" 
          >
            <ControlButton 
              onClick={handleResetPositions}
              title="Khôi phục vị trí các bảng về bố cục phân tầng chuẩn"
              aria-label="Reset Positions"
              className="reset-position-button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </ControlButton>
          </Controls>
          <MiniMap
            nodeStrokeColor={darkMode ? '#475569' : '#cbd5e1'}
            nodeColor={darkMode ? '#1e293b' : '#f1f5f9'}
            nodeBorderRadius={4}
            className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 !rounded-2xl !shadow-lg !bottom-[100px]"
          />
        </ReactFlow>
      </div>

      {/* 5. Atlan 360° Metadata Slide-over Profile Drawer */}
      {selectedNode && (
        <aside 
          id="node-inspector-drawer"
          className="absolute right-4 top-4 bottom-4 w-[420px] max-w-[calc(100vw-3rem)] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {/* Drawer Top Header */}
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    {selectedNode.schema}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedNode.layer.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <h3 className="font-mono text-lg font-bold text-slate-900 dark:text-white truncate" title={selectedNode.name}>
                  {selectedNode.name}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="close-drawer-btn"
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Atlan Drawer Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pt-2 text-xs font-semibold">
              <button
                onClick={() => setActiveDrawerTab('overview')}
                className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveDrawerTab('columns')}
                className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeDrawerTab === 'columns'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span>Columns</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
                  {selectedNode.columns.length}
                </span>
              </button>
              <button
                onClick={() => setActiveDrawerTab('lineage')}
                className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'lineage'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Lineage
              </button>
              {selectedNode.rawSql && (
                <button
                  onClick={() => setActiveDrawerTab('sql')}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                    activeDrawerTab === 'sql'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  SQL Code
                </button>
              )}
            </div>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 custom-scrollbar">
            
            {/* TAB 1: OVERVIEW & GOVERNANCE */}
            {activeDrawerTab === 'overview' && (
              <div className="space-y-3 text-xs">
                {/* Description */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">
                    Asset Description
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Key Governance Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Data Quality SLA</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {selectedNode.qualityScore || 99.5}% Passed
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Freshness SLA</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {selectedNode.freshness || 'Real-time'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Asset Owner</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {selectedNode.owner}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Row Count</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedNode.rowCount ? selectedNode.rowCount.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Business Glossary Tags */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">
                    Business Glossary &amp; Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] flex items-center gap-1"
                      >
                        <Hash className="w-2.5 h-2.5" />
                        <span>{tag}</span>
                      </span>
                    ))}
                    {selectedNode.isDynamicSql && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
                        Dynamic SQL
                      </span>
                    )}
                  </div>
                </div>

                {/* File Path */}
                {selectedNode.filePath && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-500">
                    <span className="text-slate-400 block">Repository File:</span>
                    <code className="text-slate-700 dark:text-slate-300">{selectedNode.filePath}</code>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCHEMA & COLUMNS (Trace CLL 1-Click) */}
            {activeDrawerTab === 'columns' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Click any column to trace end-to-end lineage</span>
                </div>

                <div className="space-y-1.5">
                  {selectedNode.columns.map((col, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {col.isPrimaryKey && <span className="text-amber-500 text-[10px]">PK</span>}
                          {col.isForeignKey && <span className="text-indigo-500 text-[10px]">FK</span>}
                          <span>{col.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                            {col.type}
                          </span>
                          <button
                            onClick={() => handleSelectColumn(selectedNode.id, col.name)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-mono font-semibold border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Trace CLL</span>
                          </button>
                        </div>
                      </div>

                      {col.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {col.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: LINEAGE & BLAST RADIUS */}
            {activeDrawerTab === 'lineage' && (
              <div className="space-y-3 text-xs">
                {/* Direct Upstream Parents */}
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Direct Upstream Sources ({initialEdgesData.filter(e => e.target === selectedNode.id).length})
                  </span>
                  <div className="space-y-1">
                    {initialEdgesData.filter(e => e.target === selectedNode.id).map(e => {
                      const parent = initialNodesData.find(n => n.id === e.source);
                      return (
                        <div key={e.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{parent?.name || e.source}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{e.inferredBy}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Downstream Children */}
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Direct Downstream Consumers ({initialEdgesData.filter(e => e.source === selectedNode.id).length})
                  </span>
                  <div className="space-y-1">
                    {initialEdgesData.filter(e => e.source === selectedNode.id).map(e => {
                      const child = initialNodesData.find(n => n.id === e.target);
                      return (
                        <div key={e.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{child?.name || e.target}</span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{child?.layer}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SQL DEFINITION */}
            {activeDrawerTab === 'sql' && selectedNode.rawSql && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                    dbt SQL Model Code
                  </span>
                  <button
                    onClick={() => handleCopySql(selectedNode.rawSql || '')}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-800 max-h-72 leading-relaxed">
                  {selectedNode.rawSql}
                </pre>
              </div>
            )}

          </div>

          {/* Drawer Bottom Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              id="drawer-impact-btn"
              onClick={() => onAnalyzeImpact(selectedNode)}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all font-mono"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate Blast Radius</span>
            </button>
          </div>
        </aside>
      )}

      {/* 6. Atlan Process / Edge Transformation Inspector Drawer */}
      {selectedEdge && (
        <aside 
          id="edge-inspector-drawer"
          className="absolute right-4 top-4 bottom-4 w-96 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Lineage Transformation Process
                </span>
                <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-white mt-1">
                  `{selectedEdge.source}` &rarr; `{selectedEdge.target}`
                </h3>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inference & Parser Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Resolution Engine:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedEdge.inferredBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Confidence SLA:</span>
                <span className="font-bold text-slate-900 dark:text-white">{(selectedEdge.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-indigo-500 uppercase">{selectedEdge.status}</span>
              </div>
            </div>

            {/* Reasoning / SQL details */}
            {selectedEdge.reasoning && (
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                  Transformation Logic
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {selectedEdge.reasoning}
                </p>
              </div>
            )}

            {/* Column Mappings if any */}
            {selectedEdge.columnMappings && selectedEdge.columnMappings.length > 0 && (
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                  Column Mappings
                </span>
                <div className="space-y-1">
                  {selectedEdge.columnMappings.map((m, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] font-mono flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300">{m.sourceCol}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{m.targetCol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedEdge(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </aside>
      )}

    </div>
  );
};
