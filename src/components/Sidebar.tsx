import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Network, 
  Zap, 
  ShieldCheck, 
  FileCode, 
  Database, 
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Settings,
  Download
} from 'lucide-react';
import { ProjectData } from '../data/mockProjects';

export type TabType = 'overview' | 'explorer' | 'impact' | 'hitl' | 'ingest' | 'catalog';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  projects: ProjectData[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  hitlPendingCount: number;
  onOpenSettings: () => void;
  onOpenExport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  projects,
  selectedProjectId,
  onSelectProject,
  hitlPendingCount,
  onOpenSettings,
  onOpenExport
}) => {
  const currentProj = projects.find(p => p.id === selectedProjectId) || projects[0];

  interface NavItem {
    id: TabType;
    label: string;
    description: string;
    icon: any;
    badge?: string | number | null;
    badgeColor?: string;
  }

  const navItems: NavItem[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      description: '',
      icon: LayoutDashboard
    },
    { 
      id: 'explorer', 
      label: 'Lineage DAG', 
      description: '',
      icon: Network 
    },
    { 
      id: 'impact', 
      label: 'Impact & Risk', 
      description: '',
      icon: Zap
    },
    { 
      id: 'hitl', 
      label: 'HITL Queue', 
      description: '',
      icon: ShieldCheck, 
      badge: hitlPendingCount > 0 ? hitlPendingCount : null,
      badgeColor: hitlPendingCount > 0 ? 'bg-orange-500 text-white animate-pulse' : undefined
    },
    { 
      id: 'ingest', 
      label: 'Database to Lineage', 
      description: '',
      icon: FileCode
    },
    { 
      id: 'catalog', 
      label: 'Database & Catalog', 
      description: '',
      icon: Database
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 select-none shrink-0 ${
        isCollapsed ? 'w-16 sm:w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Top Header & Brand */}
      <div className={`p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          /* Collapsed Mode: Only Logo is visible, hovering reveals the outward arrow, clicking expands sidebar */
          <div
            id="sidebar-collapsed-logo-toggle"
            onClick={() => setIsCollapsed(false)}
            className="relative group cursor-pointer"
            title="Nhấn để mở rộng thanh điều hướng"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white transition-all group-hover:scale-105 group-hover:shadow-indigo-500/40">
              <Network className="w-5 h-5 transition-all duration-200 group-hover:opacity-0 group-hover:scale-75" />
              <ChevronRight className="w-5 h-5 absolute inset-0 m-auto text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
          </div>
        ) : (
          /* Expanded Mode: Logo + Title on Left, Collapse button on Right */
          <div className="flex items-center justify-between gap-2">
            <div 
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden group"
              title="DATA-04 Lineage AI"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0 group-hover:scale-105 transition-transform">
                <Network className="w-5 h-5" />
              </div>
              
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                    DATA-04
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Lineage AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Baby Sharks (P-116)
                </p>
              </div>
            </div>

            {/* Toggle Sidebar Collapse Button (Collapse to icon only) */}
            <button
              id="sidebar-toggle-collapse-btn"
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Thu gọn thanh điều hướng"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Project Selector (When Expanded) */}
        {!isCollapsed && (
          <div className="mt-3 relative">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                id="sidebar-project-selector"
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Center Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 sm:px-3 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center rounded-2xl transition-all cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3' 
                    : 'gap-3 px-3.5 py-2.5 text-left'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight">
                        {item.label}
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${
                          item.badgeColor || (isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300')
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500 rounded font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Actions (Settings, Export & Dark Mode) */}
      <div className="p-2 sm:p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* Architecture Status Info (When Expanded) */}
        {!isCollapsed && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[10px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-bold">
              <span>DUAL ENGINE STATUS</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-mono">AST sqlglot</span>
              <span className="text-emerald-500 font-bold">Ready</span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-mono">AI LLM Fallback</span>
              <span className="text-indigo-400 font-bold">Online</span>
            </div>
          </div>
        )}

        {/* Export Database Button */}
        {onOpenExport && (
          <button
            id="sidebar-export-csdl-btn"
            onClick={onOpenExport}
            className={`w-full rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer flex items-center justify-center ${
              isCollapsed ? 'p-2.5' : 'px-3 py-2.5 gap-2 text-xs font-bold text-left'
            }`}
            title="Export DB & Lineage (SQL, CSV, JSON)"
          >
            <Download className="w-4 h-4 text-indigo-500 shrink-0" />
            {!isCollapsed && <span>Export DB &amp; Lineage</span>}
          </button>
        )}

        {/* Settings Button */}
        <button
          id="sidebar-settings-btn"
          onClick={onOpenSettings}
          className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-center ${
            isCollapsed ? 'p-2.5' : 'px-3 py-2.5 gap-2 text-xs font-bold text-left'
          }`}
          title="System Settings"
        >
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          {!isCollapsed && <span>System Settings</span>}
        </button>
      </div>
    </aside>
  );
};

