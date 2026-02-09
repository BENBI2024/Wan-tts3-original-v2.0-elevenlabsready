import { useState, useRef, useCallback, useEffect } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ZoomIn, ZoomOut, Maximize, Move, Trash2, RefreshCw, Copy, Download, Edit3, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePendingAssets } from '@/contexts/PendingAssetsContext';
import { toast } from 'sonner';

interface CanvasImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
  type?: 'image' | 'video';
  name?: string;
}

interface InfiniteCanvasProps {
  images: CanvasImage[];
  onImageMove?: (id: string, x: number, y: number) => void;
  onImageSelect?: (id: string | null) => void;
  selectedImageId?: string | null;
  onImageDragStart?: (image: CanvasImage) => void;
  onImageDoubleClick?: (image: CanvasImage) => void;
  highlightedImageId?: string | null;
  onImageDelete?: (id: string) => void;
  onImageReplace?: (id: string) => void;
  onImageCopy?: (image: CanvasImage) => void;
  onNavigate?: (itemId: string) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function InfiniteCanvas({
  images,
  onImageMove,
  onImageSelect,
  selectedImageId,
  onImageDragStart,
  onImageDoubleClick,
  highlightedImageId,
  onImageDelete,
  onImageReplace,
  onImageCopy,
  onNavigate,
}: InfiniteCanvasProps) {
  const { addPendingAsset } = usePendingAssets();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Touch gesture state
  const touchState = useRef<{
    touches: React.Touch[];
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    centerX: number;
    centerY: number;
  } | null>(null);

  // Handle keyboard events for space-drag panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Prevent browser zoom when wheel in canvas area
  // Only prevent default, but allow event to bubble to React handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isInCanvas = 
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom;
        
        // Prevent browser zoom for all wheel events in canvas
        // But don't stop propagation so React handler can process it
        if (isInCanvas) {
          e.preventDefault();
        }
      }
    };

    // Use capture phase to intercept before browser default behavior
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  // Helper function to zoom towards a point - immediate response without delay
  const zoomTowardsPoint = useCallback((pointX: number, pointY: number, deltaZoom: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get point position relative to container
    const mouseX = pointX - rect.left;
    const mouseY = pointY - rect.top;
    
    // Use functional updates to get current state immediately (no dependency on stale state)
    setZoom((currentZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + deltaZoom));
      
      setPan((currentPan) => {
        // Calculate the point in canvas coordinates before zoom
        const canvasX = (mouseX - currentPan.x) / currentZoom;
        const canvasY = (mouseY - currentPan.y) / currentZoom;
        
        // Calculate new pan to keep the point at the same screen position
        const newPanX = mouseX - canvasX * newZoom;
        const newPanY = mouseY - canvasY * newZoom;
        
        return { x: newPanX, y: newPanY };
      });
      
      return newZoom;
    });
  }, []);

  // Handle mouse wheel zoom - zoom towards mouse position
  // Supports: regular wheel, trackpad pinch (Ctrl/Cmd + wheel), trackpad scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    // Handle different delta modes
    // deltaMode 0 = DOM_DELTA_PIXEL (trackpad, mouse wheel)
    // deltaMode 1 = DOM_DELTA_LINE (line-based scrolling)
    // deltaMode 2 = DOM_DELTA_PAGE (page-based scrolling)
    let deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      // Line mode: convert to pixel-like value (approximately 16px per line)
      deltaY = e.deltaY * 16;
    } else if (e.deltaMode === 2) {
      // Page mode: convert to pixel-like value
      deltaY = e.deltaY * 100;
    }
    
    // Detect trackpad vs mouse wheel
    // Trackpad typically has smaller, smoother deltaY values
    // Mouse wheel has larger, discrete deltaY values (usually > 100)
    const isTrackpad = Math.abs(deltaY) < 50 && e.deltaMode === 0;
    const isPinch = e.ctrlKey || e.metaKey;
    
    // Calculate zoom delta based on input type
    let zoomDelta: number;
    if (isPinch) {
      // Trackpad pinch gesture: use proportional scaling with higher sensitivity
      zoomDelta = -deltaY * 0.005; // Increased sensitivity for pinch
    } else if (isTrackpad) {
      // Trackpad scroll: use proportional steps with higher sensitivity
      zoomDelta = -deltaY * 0.008; // Increased sensitivity for trackpad scroll
    } else {
      // Mouse wheel: use discrete steps
      zoomDelta = deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    }
    
    // Clamp zoom delta to reasonable range (allow faster scaling)
    zoomDelta = Math.max(-ZOOM_STEP * 5, Math.min(ZOOM_STEP * 5, zoomDelta));
    
    zoomTowardsPoint(e.clientX, e.clientY, zoomDelta);
  }, [zoomTowardsPoint]);

  // Handle panning start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or space + left click
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      // Click on empty canvas deselects
      onImageSelect?.(null);
    }
  }, [isSpacePressed, onImageSelect]);

  // Handle panning move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isPanning]);

  // Handle panning end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Calculate distance between two touches
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Handle touch start for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      
      touchState.current = {
        touches: [touch1, touch2],
        initialDistance: distance,
        initialZoom: zoom,
        initialPan: { ...pan },
        centerX: center.x,
        centerY: center.y,
      };
    }
  }, [zoom, pan]);

  // Handle touch move for pinch zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      
      // Calculate zoom ratio
      const scale = currentDistance / touchState.current.initialDistance;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchState.current.initialZoom * scale));
      
      // Calculate pan to keep center point fixed
      if (!containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;
      
      const canvasX = (centerX - touchState.current.initialPan.x) / touchState.current.initialZoom;
      const canvasY = (centerY - touchState.current.initialPan.y) / touchState.current.initialZoom;
      
      const newPanX = centerX - canvasX * newZoom;
      const newPanY = centerY - canvasY * newZoom;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchState.current = null;
    }
  }, []);

  // Zoom controls - zoom towards center of container
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);
  
  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);
  
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle image drag - convert coordinates considering zoom and pan
  const handleDrag = (id: string) => (_e: DraggableEvent, data: DraggableData) => {
    // Convert from screen coordinates (with zoom/pan) to canvas coordinates
    // Draggable returns position in the transformed coordinate system
    // We need to convert back to the original coordinate system
    const canvasX = (data.x - pan.x) / zoom;
    const canvasY = (data.y - pan.y) / zoom;
    onImageMove?.(id, canvasX, canvasY);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full overflow-hidden',
        isPanning || isSpacePressed ? 'cursor-grab' : 'cursor-default',
        isPanning && 'cursor-grabbing'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Dot Pattern Background */}
      <div 
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas Layer - No transform here, we apply it to individual images */}
      <div
        className="canvas-background absolute inset-0"
      >
        {images.map((image, index) => {
          // Convert canvas coordinates to screen coordinates (with zoom/pan)
          const screenX = image.x * zoom + pan.x;
          const screenY = image.y * zoom + pan.y;
          
          return (
          <Draggable
            key={image.id}
              position={{ x: screenX, y: screenY }}
            onDrag={handleDrag(image.id)}
            onStart={() => onImageSelect?.(image.id)}
            disabled={isPanning || isSpacePressed}
            bounds={false}
            cancel=".no-drag"
          >
            <div
              className={cn(
                'absolute cursor-move rounded-lg bg-background shadow-lg',
                selectedImageId === image.id
                  ? 'ring-2 ring-primary shadow-xl z-50'
                  : 'ring-1 ring-border hover:shadow-xl',
                highlightedImageId === image.id && 'ring-2 ring-green-500 shadow-xl animate-pulse'
              )}
              style={{ 
                width: image.width * zoom, 
                height: image.height * zoom,
                zIndex: selectedImageId === image.id ? 50 : index + 1,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onImageSelect?.(image.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onImageDoubleClick?.(image);
              }}
            >
              {image.type === 'video' ? (
                <video
                  src={image.url}
                  className="h-full w-full rounded-lg object-cover pointer-events-none select-none"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={image.url}
                  alt={image.prompt || image.name || 'Generated image'}
                  className="h-full w-full rounded-lg object-cover pointer-events-none select-none"
                  draggable={false}
                />
              )}
              {/* Drag handle overlay for HTML5 drag (to input area) */}
              <div 
                className="no-drag absolute bottom-2 right-2 p-1.5 rounded bg-background/80 backdrop-blur-sm cursor-grab opacity-0 hover:opacity-100 transition-opacity"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    id: image.id,
                    url: image.url,
                    prompt: image.prompt,
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                  onImageDragStart?.(image);
                }}
              >
                <Move className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {/* Selection Handles */}
              {selectedImageId === image.id && (
                <>
                  <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  
                  {/* Action Toolbar - Right Side */}
                  <div 
                    className="no-drag absolute top-0 -right-12 flex flex-col items-center gap-1 rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageCopy?.(image);
                      }}
                      title="复制"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="下载"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageReplace?.(image.id);
                      }}
                      title="编辑"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageDelete?.(image.id);
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="w-6 h-px bg-border my-0.5" />
                    
                    {/* Add to Pending Assets Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        addPendingAsset({
                          id: `pending-${image.id}-${Date.now()}`,
                          name: image.prompt || image.name || '生成图片',
                          type: image.type || 'image',
                          thumbnail: image.url,
                        });
                        toast.success('已添加到待发布素材', {
                          action: {
                            label: '查看',
                            onClick: () => onNavigate?.('social-media-publishing'),
                          },
                        });
                      }}
                      title="进入待发布素材"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Draggable>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitToScreen}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Panning Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        <Move className="h-3.5 w-3.5" />
        <span>Space + Drag to pan</span>
      </div>
    </div>
  );
}
