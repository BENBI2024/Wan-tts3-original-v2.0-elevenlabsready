import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Loader2,
  Download,
  RefreshCw,
  MessageSquare,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskCenter } from '@/contexts/TaskCenterContext';
import { cn } from '@/lib/utils';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import type { CanvasTaskData } from './DigitalHumanGeneration';
import { digitalHumanAPI, type TaskStatusResponse } from '@/services/digitalHumanAPI';

interface VideoCanvasProps {
  taskId: string;
  taskData: CanvasTaskData;
  onBack: () => void;
}

interface CanvasVideo {
  id: string;
  taskId: string;
  status: 'generating' | 'completed' | 'failed';
  position: { x: number; y: number };
  size: { width: number; height: number };
  aspectRatio: '16:9' | '9:16' | '1:1';
  thumbnailUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  ttsEngineUsed?: string;
  audioSource?: string;
  audioDurationSec?: number;
  progress?: number;
  currentStep?: string;
  error?: string;
}

export function VideoCanvas({ taskId, taskData, onBack }: VideoCanvasProps) {
  const { t } = useTranslation();
  const { tasks, updateTask } = useTaskCenter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<CanvasVideo[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const initialSidebarWidth = 384;
  const minSidebarWidth = initialSidebarWidth;
  const maxSidebarWidth = Math.round(initialSidebarWidth * 2.5);
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(initialSidebarWidth);

  // Initialize with the current task
  useEffect(() => {
    const aspectRatio = taskData.platform === 'tiktok' ? '9:16' : '1:1';
    const initialWidth = aspectRatio === '9:16' ? 192 : 256;
    const initialHeight = aspectRatio === '9:16' ? 192 * (16 / 9) : 256;

    setVideos([{
      id: `video-${taskId}`,
      taskId,
      status: 'generating',
      position: { x: 100, y: 100 },
      size: { width: initialWidth, height: initialHeight },
      aspectRatio,
      progress: 0,
      currentStep: '正在初始化...',
    }]);
  }, [taskId, taskData.platform]);

  // Poll backend for task status
  useEffect(() => {
    const backendTaskId = taskData.backendTaskId;
    if (!backendTaskId) {
      console.warn('No backend task ID provided, cannot poll status');
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const pollStatus = async () => {
      if (!isMounted) return;

      try {
        setIsPolling(true);
        const status: TaskStatusResponse = await digitalHumanAPI.getTaskStatus(backendTaskId);

        if (!isMounted) return;

        // Update video status based on backend response
        setVideos(prev => prev.map(v => {
          if (v.taskId === taskId) {
            let newStatus: 'generating' | 'completed' | 'failed' = 'generating';
            if (status.status === 'completed') {
              newStatus = 'completed';
            } else if (status.status === 'failed') {
              newStatus = 'failed';
            }

            return {
              ...v,
              status: newStatus,
              progress: status.progress,
              currentStep: status.current_step,
              videoUrl: status.result?.video_url,
              audioUrl: status.result?.final_audio_url || status.result?.audio_url,
              ttsEngineUsed: status.result?.tts_engine_used,
              audioSource: status.result?.audio_source,
              audioDurationSec: status.result?.audio_duration_sec,
              thumbnailUrl: status.result?.model_image_url || status.result?.video_url,
              error: status.error || undefined,
            };
          }
          return v;
        }));

        // Update task center
        if (status.status === 'completed') {
          updateTask(taskId, { status: 'completed' });
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (status.status === 'failed') {
          updateTask(taskId, { status: 'failed' });
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }

      } catch (error) {
        console.error('Failed to poll task status:', error);
      } finally {
        setIsPolling(false);
      }
    };

    // Start polling
    pollStatus();
    pollInterval = setInterval(pollStatus, 5000); // Poll every 5 seconds

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [taskData.backendTaskId, taskId, updateTask]);

  const handleDrag = (videoId: string, x: number, y: number) => {
    setVideos(prev => prev.map(v =>
      v.id === videoId ? { ...v, position: { x, y } } : v
    ));
  };

  const handleResize = (videoId: string, width: number, height: number) => {
    setVideos(prev => prev.map(v =>
      v.id === videoId ? { ...v, size: { width, height } } : v
    ));
  };

  // Handle sidebar resize
  const beginResize = (clientX: number) => {
    resizeStartX.current = clientX;
    resizeStartWidth.current = sidebarWidth;
    setIsResizing(true);
  };

  const handleSidebarPointerDown = (e: React.PointerEvent) => {
    if (e.currentTarget && 'setPointerCapture' in e.currentTarget) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors
      }
    }
    beginResize(e.clientX);
    e.preventDefault();
  };

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    beginResize(e.clientX);
    e.preventDefault();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizing) return;
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(minSidebarWidth, Math.min(maxSidebarWidth, resizeStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleRegenerate = async (videoId: string) => {
    // TODO: Implement regeneration logic
    setVideos(prev => prev.map(v =>
      v.id === videoId ? { ...v, status: 'generating', progress: 0 } : v
    ));
  };

  const handleDownload = (video: CanvasVideo) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, '_blank');
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      className="flex h-full overflow-hidden bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Left Sidebar - Task Details */}
      <motion.div
        className="border-r border-border bg-card flex flex-col relative"
        style={{ width: sidebarCollapsed ? 48 : sidebarWidth }}
        initial={false}
        animate={{ width: sidebarCollapsed ? 48 : sidebarWidth }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize bg-border/40 hover:bg-primary/50 transition-colors z-50"
            onPointerDown={handleSidebarPointerDown}
            onMouseDown={handleSidebarMouseDown}
            style={{ touchAction: 'none' }}
            aria-label="Resize sidebar"
          />
        )}

        {/* Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {!sidebarCollapsed && (
          <>
            <div className="p-4 border-b border-border">
              <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
              <h2 className="font-semibold text-foreground">{t('videoCanvas.taskDetails')}</h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Uploaded Materials */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('videoCanvas.materials')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {taskData.sceneImages?.map((url, idx) => (
                      <div key={idx} className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img src={url} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {taskData.portraitImage && (
                      <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                        <img src={taskData.portraitImage} alt="Portrait" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!taskData.sceneImages?.length && !taskData.portraitImage && (
                      <div className="col-span-2 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                        {t('videoCanvas.noMaterials')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('digitalHuman.productName')}
                  </h4>
                  <p className="text-sm text-foreground">{taskData.productName || '-'}</p>
                </div>

                {/* Platform */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('digitalHuman.targetPlatform')}
                  </h4>
                  <Badge variant="secondary">
                    {taskData.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    音频信息
                  </h4>
                  <div className="text-sm text-foreground space-y-1">
                    <p>来源: {videos[0]?.audioSource || taskData.audioSource || '-'}</p>
                    <p>引擎: {videos[0]?.ttsEngineUsed || taskData.ttsEngineUsed || '-'}</p>
                    <p>时长: {videos[0]?.audioDurationSec?.toFixed(2) || taskData.audioDurationSec?.toFixed(2) || '-'} 秒</p>
                  </div>
                </div>

                {/* Generated Prompt */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('digitalHuman.generatedScript')}
                  </h4>
                  <div
                    className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap overflow-auto min-h-24 max-h-[60vh]"
                    style={{ resize: 'vertical' }}
                  >
                    {taskData.generatedPrompt}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        )}

        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-16 gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              title={t('common.back')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Toolbar */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('videoCanvas.title')}</span>
            <Badge variant="outline" className="text-xs">
              {videos.length} {t('videoCanvas.videosCount')}
            </Badge>
            {isPolling && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleResetZoom}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Infinite Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto bg-muted/20 relative"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          }}
        >
          <div
            className="relative min-w-[2000px] min-h-[2000px]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <AnimatePresence>
              {videos.map((video) => {
                const aspectRatioValue =
                  video.aspectRatio === '9:16'
                    ? 9 / 16
                    : video.aspectRatio === '1:1'
                      ? 1
                      : 16 / 9;

                return (
                  <Draggable
                    key={video.id}
                    position={video.position}
                    onStop={(_, data) => handleDrag(video.id, data.x, data.y)}
                    handle=".drag-handle"
                  >
                    <div className="absolute">
                      <Resizable
                        width={video.size.width}
                        height={video.size.height}
                        onResize={(_, { size }) => {
                          // Maintain aspect ratio
                          const newWidth = size.width;
                          const newHeight = newWidth / aspectRatioValue;
                          handleResize(video.id, newWidth, newHeight);
                        }}
                        lockAspectRatio={true}
                        minConstraints={[150, 150 / aspectRatioValue]}
                        maxConstraints={[600, 600 / aspectRatioValue]}
                        resizeHandles={['se', 'sw', 'ne', 'nw']}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="cursor-move"
                          style={{ width: video.size.width, height: video.size.height }}
                          onClick={() => setSelectedVideo(video.id)}
                        >
                          <Card className={cn(
                            "overflow-hidden transition-shadow h-full flex flex-col",
                            selectedVideo === video.id && "ring-2 ring-primary shadow-lg"
                          )}>
                            {/* Drag Handle */}
                            <div className="drag-handle h-8 bg-muted/50 flex items-center justify-center cursor-grab active:cursor-grabbing border-b border-border flex-shrink-0">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>

                            {/* Video Preview */}
                            <div className="bg-muted relative flex-1">
                              {video.status === 'generating' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                  <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
                                    <Loader2 className="w-16 h-16 absolute inset-0 animate-spin text-primary" />
                                  </div>
                                  <span className="text-sm text-muted-foreground text-center px-2">
                                    {video.currentStep || t('videoCanvas.generating')}
                                  </span>
                                  {video.progress !== undefined && video.progress > 0 && (
                                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${video.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : video.status === 'failed' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                                  <AlertCircle className="w-12 h-12 text-destructive" />
                                  <span className="text-sm text-destructive text-center">
                                    {video.error || '生成失败'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {video.videoUrl ? (
                                    <video
                                      src={video.videoUrl}
                                      className="w-full h-full object-cover"
                                      controls
                                      poster={video.thumbnailUrl}
                                    />
                                  ) : video.thumbnailUrl ? (
                                    <img
                                      src={video.thumbnailUrl}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Play className="w-12 h-12 text-muted-foreground" />
                                    </div>
                                  )}
                                  <Badge className="absolute top-2 right-2 bg-green-500">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {t('videoCanvas.completed')}
                                  </Badge>
                                </>
                              )}
                            </div>

                            {/* Action Bar */}
                            <CardContent className="p-2 flex items-center justify-center gap-1 bg-card flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                disabled={video.status === 'generating'}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                disabled={video.status !== 'completed' || !video.videoUrl}
                                onClick={() => handleDownload(video)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => handleRegenerate(video.id)}
                                disabled={video.status === 'generating'}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Resizable>
                    </div>
                  </Draggable>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
