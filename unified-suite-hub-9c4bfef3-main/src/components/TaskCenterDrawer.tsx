import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTaskCenter, TaskType, GlobalTask } from '@/contexts/TaskCenterContext';
import { Trash2, Loader2, CheckCircle2, XCircle, Clock, Music, LayoutGrid, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TaskCenterDrawerProps {
  onNavigateToReport: (taskId: string) => void;
  onNavigateToCanvas: (taskId: string) => void;
}

export function TaskCenterDrawer({ onNavigateToReport, onNavigateToCanvas }: TaskCenterDrawerProps) {
  const { t } = useTranslation();
  const { tasks, isDrawerOpen, setDrawerOpen, clearCompletedTasks, getTasksByType } = useTaskCenter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusIcon = (status: GlobalTask['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: GlobalTask['status']) => {
    switch (status) {
      case 'generating':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {t('taskCenter.statusGenerating')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('taskCenter.statusCompleted')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            {t('taskCenter.statusFailed')}
          </Badge>
        );
    }
  };

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'tiktok-insights':
        return <Music className="w-4 h-4 text-muted-foreground" />;
      case 'digital-human':
        return <UserCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleTaskClick = (task: GlobalTask) => {
    if (task.status === 'completed') {
      if (task.type === 'tiktok-insights') {
        setDrawerOpen(false);
        onNavigateToReport(task.id);
      } else if (task.type === 'digital-human') {
        setDrawerOpen(false);
        onNavigateToCanvas(task.id);
      }
    }
  };

  const renderTaskList = (taskList: GlobalTask[]) => {
    if (taskList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">{t('taskCenter.noTasks')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {taskList.map((task) => (
          <div
            key={task.id}
            onClick={() => handleTaskClick(task)}
            className={cn(
              'p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors',
              task.status === 'completed' && 'cursor-pointer'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getTypeIcon(task.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-sm text-foreground truncate">{task.name}</h4>
                  {getStatusBadge(task.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
                  {task.status === 'generating' && (
                    <Progress value={Math.random() * 60 + 20} className="w-20 h-1.5" />
                  )}
                  {task.status === 'completed' && (
                    <span className="text-xs text-primary">{t('taskCenter.clickToView')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="left" className="w-[380px] sm:w-[420px] p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{t('taskCenter.title')}</SheetTitle>
            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompletedTasks}
                className="text-muted-foreground hover:text-destructive h-8"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('taskCenter.clearCompleted')}
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <Tabs defaultValue="all" className="flex-1">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                {t('taskCenter.tabAll')}
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tiktok-insights" className="flex-1">
                {t('taskCenter.tabTikTok')}
              </TabsTrigger>
              <TabsTrigger value="digital-human" className="flex-1">
                {t('taskCenter.tabDigitalHuman')}
              </TabsTrigger>
              <TabsTrigger value="other" className="flex-1">
                {t('taskCenter.tabOther')}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="px-4 py-3 mt-0 max-h-[calc(100vh-180px)] overflow-y-auto">
            {renderTaskList(getTasksByType('all'))}
          </TabsContent>
          <TabsContent value="tiktok-insights" className="px-4 py-3 mt-0 max-h-[calc(100vh-180px)] overflow-y-auto">
            {renderTaskList(getTasksByType('tiktok-insights'))}
          </TabsContent>
          <TabsContent value="digital-human" className="px-4 py-3 mt-0 max-h-[calc(100vh-180px)] overflow-y-auto">
            {renderTaskList(getTasksByType('digital-human'))}
          </TabsContent>
          <TabsContent value="other" className="px-4 py-3 mt-0 max-h-[calc(100vh-180px)] overflow-y-auto">
            {renderTaskList(getTasksByType('other'))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
