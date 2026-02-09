import { useModule } from '@/contexts/ModuleContext';
import { useTaskCenter } from '@/contexts/TaskCenterContext';
import { ModuleType } from '@/types/modules';
import {
  LayoutDashboard,
  PenTool,
  History,
  Users,
  Settings,
  MessageSquare,
  Key,
  Music,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet,
  User,
  TrendingUp,
  Megaphone,
  ImageIcon,
  Video,
  UserCircle,
  ShoppingBag,
  Layers,
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Share2,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

interface SidebarSubgroup {
  titleKey: string;
  items: SidebarItem[];
}

interface SidebarSection {
  titleKey: string;
  items?: SidebarItem[];
  subgroups?: SidebarSubgroup[];
  defaultOpen?: boolean;
  isGroupHeader?: boolean;
}

const sidebarConfig: Record<ModuleType, SidebarSection[]> = {
  'geo-insights': [
    {
      titleKey: '',
      items: [
        { id: 'dashboard', labelKey: 'geoInsights.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'write-article', labelKey: 'geoInsights.writeArticle', icon: <PenTool className="w-4 h-4" /> },
        { id: 'my-articles', labelKey: 'geoInsights.myArticles', icon: <FileText className="w-4 h-4" /> },
        { id: 'audit-history', labelKey: 'geoInsights.auditHistory', icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'competitor', labelKey: 'geoInsights.competitor', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'settings', labelKey: 'geoInsights.settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ],
  'llm-console': [
    {
      titleKey: '',
      items: [
        { id: 'playground', labelKey: 'llmConsole.playground', icon: <MessageSquare className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'dashboard', labelKey: 'llmConsole.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'tokens', labelKey: 'llmConsole.tokens', icon: <Key className="w-4 h-4" /> },
        { id: 'usage', labelKey: 'llmConsole.usage', icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: '',
      items: [
        { id: 'wallet', labelKey: 'llmConsole.wallet', icon: <Wallet className="w-4 h-4" /> },
        { id: 'profile', labelKey: 'llmConsole.profile', icon: <User className="w-4 h-4" /> },
      ],
    },
  ],
  'ai-toolbox': [
    {
      titleKey: '',
      items: [
        { id: 'app-plaza', labelKey: 'sidebar.appPlaza', icon: <LayoutGrid className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: 'sidebar.marketInsights',
      isGroupHeader: true,
      items: [
        { id: 'brand-health', labelKey: 'sidebar.brandHealth', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'tiktok-insights', labelKey: 'sidebar.tiktokInsights', icon: <Music className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: 'sidebar.marketingPlanning',
      isGroupHeader: true,
      items: [
        { id: 'campaign-planner', labelKey: 'sidebar.campaignPlanner', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'reference-to-video', labelKey: 'sidebar.videoReplication', icon: <Copy className="w-4 h-4" /> },
      ],
    },
    {
      titleKey: 'sidebar.materialGeneration',
      isGroupHeader: true,
      defaultOpen: true,
      subgroups: [
        {
          titleKey: 'sidebar.imageGeneration',
          items: [
            { id: 'text-to-image', labelKey: 'sidebar.textToImage', icon: <ImageIcon className="w-4 h-4" /> },
          ],
        },
        {
          titleKey: 'sidebar.videoGeneration',
          items: [
            { id: 'text-to-video', labelKey: 'sidebar.textToVideo', icon: <Video className="w-4 h-4" /> },
          ],
        },
        {
          titleKey: 'sidebar.digitalHuman',
          items: [
            { id: 'digital-human', labelKey: 'sidebar.digitalHumanGen', icon: <UserCircle className="w-4 h-4" /> },
          ],
        },
      ],
    },
    {
      titleKey: 'sidebar.publishingOperations',
      isGroupHeader: true,
      items: [
        { id: 'social-media-publishing', labelKey: 'sidebar.socialMediaPublishing', icon: <Share2 className="w-4 h-4" /> },
      ],
    },
  ],
};

interface DynamicSidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export function DynamicSidebar({ activeItem, onItemClick }: DynamicSidebarProps) {
  const { activeModule, sidebarCollapsed, setSidebarCollapsed } = useModule();
  const { tasks, setDrawerOpen } = useTaskCenter();
  const { t } = useTranslation();
  const sections = sidebarConfig[activeModule];
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((section) => {
      if (section.defaultOpen) {
        initial[section.titleKey] = true;
      }
    });
    return initial;
  });

  const toggleSection = (titleKey: string) => {
    setOpenSections((prev) => ({ ...prev, [titleKey]: !prev[titleKey] }));
  };

  const renderItem = (item: SidebarItem) => {
    const button = (
      <button
        key={item.id}
        onClick={() => onItemClick(item.id)}
        className={cn(
          'sidebar-menu-item w-full',
          activeItem === item.id && 'active',
          sidebarCollapsed && 'justify-center px-2'
        )}
      >
        {item.icon}
        {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
      </button>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {t(item.labelKey)}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out fixed h-screen top-0 pt-14 box-border',
          sidebarCollapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <div className="flex-1 py-4 overflow-y-auto">
          {sections.map((section, idx) => (
            <div key={section.titleKey || idx} className={cn(idx > 0 && section.isGroupHeader ? 'mt-2' : idx > 0 && 'mt-3')}>
              {section.subgroups ? (
                // Collapsible section with subgroups
                <Collapsible
                  open={sidebarCollapsed ? true : openSections[section.titleKey]}
                  onOpenChange={() => !sidebarCollapsed && toggleSection(section.titleKey)}
                >
                  <CollapsibleTrigger className="w-full">
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-foreground hover:text-foreground transition-colors">
                        <span>{t(section.titleKey)}</span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            openSections[section.titleKey] && 'rotate-180'
                          )}
                        />
                      </div>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={cn('space-y-2', sidebarCollapsed ? 'px-1' : 'px-2')}>
                      {section.subgroups.map((subgroup) => (
                        <div key={subgroup.titleKey}>
                          {!sidebarCollapsed && (
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {t(subgroup.titleKey)}
                            </div>
                          )}
                          <nav className="space-y-0.5">
                            {subgroup.items.map(renderItem)}
                          </nav>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Regular section
                <>
                  {!sidebarCollapsed && section.titleKey && (
                    <div className="px-4 py-2 text-sm font-semibold text-foreground">
                      {t(section.titleKey)}
                    </div>
                  )}
                  <nav className={cn('space-y-0.5', sidebarCollapsed ? 'px-1' : 'px-2')}>
                    {section.items?.map(renderItem)}
                  </nav>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Task Center Trigger */}
        <div className={cn('px-2 pb-2', sidebarCollapsed ? 'px-1' : '')}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
                onClick={() => setDrawerOpen(true)}
              >
                <ListTodo className="w-4 h-4" />
                {!sidebarCollapsed && <span>{t('taskCenter.title')}</span>}
                {tasks.filter(t => t.status === 'generating').length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'h-5 px-1.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      sidebarCollapsed ? 'absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center' : 'ml-auto'
                    )}
                  >
                    {tasks.filter(t => t.status === 'generating').length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                {t('taskCenter.title')}
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-sidebar-border">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4" />
                    <span>{t('common.collapse')}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                {t('common.expand')}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
