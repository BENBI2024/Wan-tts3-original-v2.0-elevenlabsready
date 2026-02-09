import { Bell, Settings, ChevronDown, BarChart3, MessageSquare, Wand2, Globe } from 'lucide-react';
import { useModule } from '@/contexts/ModuleContext';
import { MODULES, ModuleType } from '@/types/modules';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const moduleIcons: Record<ModuleType, React.ReactNode> = {
  'geo-insights': <BarChart3 className="w-4 h-4" />,
  'llm-console': <MessageSquare className="w-4 h-4" />,
  'ai-toolbox': <Wand2 className="w-4 h-4" />,
};

const moduleKeys: Record<ModuleType, string> = {
  'geo-insights': 'geoInsights',
  'llm-console': 'llmConsole',
  'ai-toolbox': 'aiToolbox',
};

export function TopNav() {
  const { activeModule, setActiveModule } = useModule();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 top-0 z-50 fixed left-0 w-screen">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
          <span className="text-background font-bold text-sm">S</span>
        </div>
        <span className="font-semibold text-lg">SuperApp</span>
      </div>

      {/* Center: Module Switcher */}
      <nav className="flex items-center gap-1 bg-muted p-1 rounded-lg">
        {MODULES.map((module) => (
          <button
            key={module.id}
            onClick={() => setActiveModule(module.id)}
            className={`module-nav-item flex items-center gap-2 ${
              activeModule === module.id ? 'active' : ''
            }`}
          >
            {moduleIcons[module.id]}
            <span className="hidden sm:inline">{t(`modules.${moduleKeys[module.id]}`)}</span>
          </button>
        ))}
      </nav>

      {/* Right: User Actions */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={toggleLanguage}
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium">{i18n.language === 'zh' ? '中文' : 'EN'}</span>
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  JD
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>{t('common.profile')}</DropdownMenuItem>
            <DropdownMenuItem>{t('common.billing')}</DropdownMenuItem>
            <DropdownMenuItem>{t('common.team')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t('common.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
