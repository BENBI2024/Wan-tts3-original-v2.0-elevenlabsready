import { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ModuleProvider, useModule } from '@/contexts/ModuleContext';
import { PendingAssetsProvider } from '@/contexts/PendingAssetsContext';
import { LLMConsoleModule } from '@/components/modules/llm-console/LLMConsoleModule';
import { GEOInsightsModule } from '@/components/modules/geo-insights/GEOInsightsModule';
import { AIToolboxModule } from '@/components/modules/ai-toolbox/AIToolboxModule';
import { TaskCenterDrawer } from '@/components/TaskCenterDrawer';

function ModuleRenderer({ 
  activeItem, 
  onNavigate,
  reportTaskId,
  canvasTaskId,
}: { 
  activeItem: string; 
  onNavigate: (itemId: string) => void;
  reportTaskId?: string;
  canvasTaskId?: string;
}) {
  const { activeModule } = useModule();

  switch (activeModule) {
    case 'llm-console':
      return <LLMConsoleModule activeItem={activeItem} />;
    case 'geo-insights':
      return <GEOInsightsModule activeItem={activeItem} />;
    case 'ai-toolbox':
      return (
        <AIToolboxModule 
          activeItem={activeItem} 
          onNavigate={onNavigate} 
          externalReportTaskId={reportTaskId}
          externalCanvasTaskId={canvasTaskId}
        />
      );
    default:
      return <LLMConsoleModule activeItem={activeItem} />;
  }
}

const Index = () => {
  const [reportTaskId, setReportTaskId] = useState<string | undefined>();
  const [canvasTaskId, setCanvasTaskId] = useState<string | undefined>();

  const handleNavigateToReport = useCallback((taskId: string) => {
    setReportTaskId(taskId);
  }, []);

  const handleNavigateToCanvas = useCallback((taskId: string) => {
    setCanvasTaskId(taskId);
  }, []);

  return (
    <ModuleProvider>
      <PendingAssetsProvider>
        <AppShell>
          {(activeItem, onNavigate) => {
            // If we have a reportTaskId from task center, navigate to report
            if (reportTaskId && activeItem !== 'tiktok-report') {
              onNavigate('tiktok-report');
            }
            // If we have a canvasTaskId from task center, navigate to canvas
            if (canvasTaskId && activeItem !== 'video-canvas') {
              onNavigate('video-canvas');
            }
            
            return (
              <>
                <ModuleRenderer 
                  activeItem={activeItem} 
                  onNavigate={(itemId) => {
                    if (itemId !== 'tiktok-report') {
                      setReportTaskId(undefined);
                    }
                    if (itemId !== 'video-canvas') {
                      setCanvasTaskId(undefined);
                    }
                    onNavigate(itemId);
                  }} 
                  reportTaskId={reportTaskId}
                  canvasTaskId={canvasTaskId}
                />
                <TaskCenterDrawer 
                  onNavigateToReport={handleNavigateToReport}
                  onNavigateToCanvas={handleNavigateToCanvas}
                />
              </>
            );
          }}
        </AppShell>
      </PendingAssetsProvider>
    </ModuleProvider>
  );
};

export default Index;
