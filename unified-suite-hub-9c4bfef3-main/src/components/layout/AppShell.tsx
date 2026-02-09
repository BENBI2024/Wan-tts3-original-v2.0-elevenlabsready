import { ReactNode, useState, useEffect } from 'react';
import { TopNav } from './TopNav';
import { DynamicSidebar } from './DynamicSidebar';
import { useModule } from '@/contexts/ModuleContext';
import { ModuleType } from '@/types/modules';

interface AppShellProps {
  children: (activeItem: string, onNavigate: (itemId: string) => void) => ReactNode;
}

const defaultItems: Record<ModuleType, string> = {
  'llm-console': 'playground',
  'geo-insights': 'dashboard',
  'ai-toolbox': 'app-plaza',
};

// Items that should trigger auto-collapse (tool/canvas views)
const toolItems = [
  'text-to-image',
  'ecommerce-assets',
  'reference-to-image',
  'text-to-video',
  'reference-to-video',
  'digital-human',
];

// Items that should trigger auto-expand (home/dashboard views)
const homeItems = [
  'app-plaza',
  'dashboard',
  'playground',
];

export function AppShell({ children }: AppShellProps) {
  const { activeModule, sidebarCollapsed, setSidebarCollapsed } = useModule();
  const [activeItem, setActiveItem] = useState(defaultItems[activeModule]);

  useEffect(() => {
    setActiveItem(defaultItems[activeModule]);
  }, [activeModule]);

  // Auto-collapse/expand based on active item
  useEffect(() => {
    if (toolItems.includes(activeItem)) {
      setSidebarCollapsed(true);
    } else if (homeItems.includes(activeItem)) {
      setSidebarCollapsed(false);
    }
  }, [activeItem, setSidebarCollapsed]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <DynamicSidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className={`flex-1 overflow-auto pt-14 transition-all duration-500 ${sidebarCollapsed ? 'pl-[64px]' : 'pl-64'}`}>
          {children(activeItem, setActiveItem)}
        </main>
      </div>
    </div>
  );
}
