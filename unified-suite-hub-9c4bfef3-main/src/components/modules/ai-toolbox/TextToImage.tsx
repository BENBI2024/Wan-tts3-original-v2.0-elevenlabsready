import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, 
  Share2, 
  Edit3, 
  Trash2, 
  Send,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  Plus,
  Clock,
  PanelRightClose,
  MessageSquare,
  ImageIcon,
  RatioIcon,
  X,
  Copy,
  Clipboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InfiniteCanvas } from './InfiniteCanvas';
import { ImageCapsule, type SelectedImage } from './ImageCapsule';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  image?: string;
  timestamp: Date;
  status?: 'thinking' | 'analyzing' | 'designing' | 'optimizing' | 'complete';
  designThoughts?: string[];
  resultSummary?: string;
}

interface CanvasImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

const mockHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: '一只可爱的橘猫在阳光下打盹',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    type: 'system',
    content: '',
    timestamp: new Date(Date.now() - 299000),
    status: 'complete',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=400&fit=crop',
    designThoughts: [
      '图片理解：图片主体为一只橘色虎斑猫，毛色以橙黄为主，带有深色条纹',
      '正在设计：将用户上传的橘猫融入温暖的阳光场景中',
      '光影效果：根据自然光调整画面，阴影投向右下方，确保光线柔和',
    ],
    resultSummary: '已完成橘猫在阳光下打盹的场景生成，整体风格温馨自然，输出尺寸为1:1。',
  },
  {
    id: '3',
    type: 'user',
    content: 'A mountain landscape at sunset with dramatic clouds',
    timestamp: new Date(Date.now() - 200000),
  },
  {
    id: '4',
    type: 'system',
    content: '',
    timestamp: new Date(Date.now() - 199000),
    status: 'complete',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
    designThoughts: [
      '场景分析：山脉轮廓与落日余晖的构图设计',
      '色彩调整：暖色调渐变，从橙红到深紫的天空过渡',
      '云层渲染：动态云层形态，增强戏剧性视觉效果',
    ],
    resultSummary: '已生成日落山景图，云层层次丰富，整体氛围壮观，输出尺寸为16:9。',
  },
];

const initialCanvasImages: CanvasImage[] = [
  {
    id: 'img-1',
    url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&h=800&fit=crop',
    x: 100,
    y: 100,
    width: 280,
    height: 280,
    prompt: '一只可爱的橘猫在阳光下打盹',
  },
  {
    id: 'img-2',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
    x: 420,
    y: 80,
    width: 320,
    height: 200,
    prompt: 'A mountain landscape at sunset',
  },
  {
    id: 'img-3',
    url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=800&fit=crop',
    x: 150,
    y: 420,
    width: 240,
    height: 240,
    prompt: 'New Year greeting card',
  },
  {
    id: 'img-4',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop',
    x: 450,
    y: 340,
    width: 260,
    height: 260,
    prompt: 'Abstract digital art',
  },
];

interface TextToImageProps {
  onNavigate?: (itemId: string) => void;
}

export function TextToImage({ onNavigate }: TextToImageProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [workMode, setWorkMode] = useState('text-to-image');
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState('flux-schnell');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [messages, setMessages] = useState<ChatMessage[]>(mockHistory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>(initialCanvasImages);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedImage, setCopiedImage] = useState<CanvasImage | null>(null);
  const [highlightedImageId, setHighlightedImageId] = useState<string | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(30); // 百分比宽度，默认35%
  const [isResizing, setIsResizing] = useState(false);

  const workModes = [
    { id: 'text-to-image', label: isZh ? '文生图' : 'Text to Image' },
  ];

  // Mock history sessions for the sidebar
  const historySessions = [
    { id: 'session-1', title: '橘猫阳光场景生成', timestamp: new Date(Date.now() - 3600000), messageCount: 4 },
    { id: 'session-2', title: '山脉日落风景图', timestamp: new Date(Date.now() - 86400000), messageCount: 6 },
    { id: 'session-3', title: '新年贺卡设计', timestamp: new Date(Date.now() - 172800000), messageCount: 3 },
    { id: 'session-4', title: '抽象数字艺术', timestamp: new Date(Date.now() - 259200000), messageCount: 5 },
  ];

  // Handle new conversation - clears chat AND canvas (but preserves copied image)
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setSelectedImages([]);
    setPrompt('');
    setCanvasImages([]);
    setSelectedImageId(null);
    // Note: copiedImage is intentionally NOT cleared to allow cross-session paste
  }, []);

  // Handle loading history session
  const handleLoadSession = useCallback((sessionId: string) => {
    // In a real app, this would load the session from backend
    // For now, we'll just reset to mock history as a demo
    setMessages(mockHistory);
    setSelectedImages([]);
    setShowHistory(false);
  }, []);

  const models = [
    { id: 'flux-schnell', label: 'FLUX Schnell' },
    { id: 'flux-dev', label: 'FLUX Dev' },
    { id: 'dall-e-3', label: 'DALL-E 3' },
    { id: 'midjourney', label: 'Midjourney v6' },
  ];

  const aspectRatios = [
    { id: '1:1', label: '1:1' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
    { id: '4:3', label: '4:3' },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getStatusText = (status?: string) => {
    if (!status) return '';
    const statusMap: Record<string, { zh: string; en: string }> = {
      thinking: { zh: '思考中...', en: 'Thinking...' },
      analyzing: { zh: '图片理解', en: 'Image Understanding' },
      designing: { zh: '正在设计', en: 'Designing...' },
      optimizing: { zh: '优化细节...', en: 'Optimizing details...' },
      complete: { zh: '任务已结束', en: 'Task Completed' },
    };
    return statusMap[status]?.[isZh ? 'zh' : 'en'] || status;
  };

  const handleImageMove = useCallback((id: string, x: number, y: number) => {
    setCanvasImages(prev => 
      prev.map(img => img.id === id ? { ...img, x, y } : img)
    );
  }, []);

  // Handle removing selected image from input area
  const handleRemoveSelectedImage = useCallback((id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // Handle adding image to selected (from drag or auto-attach)
  const handleAddSelectedImage = useCallback((image: SelectedImage) => {
    setSelectedImages(prev => {
      // Prevent duplicates
      if (prev.some(img => img.id === image.id)) return prev;
      return [...prev, image];
    });
  }, []);

  // Handle double-click on canvas image to attach to input
  const handleImageDoubleClick = useCallback((image: CanvasImage) => {
    const selectedImage: SelectedImage = {
      id: image.id,
      url: image.url,
      prompt: image.prompt,
    };
    
    // Add to selected images (prevent duplicates)
    setSelectedImages(prev => {
      if (prev.some(img => img.id === image.id)) {
        toast.info(isZh ? '该图片已在输入框中' : 'Image already attached');
        return prev;
      }
      return [...prev, selectedImage];
    });
    
    // Show visual feedback with highlight
    setHighlightedImageId(image.id);
    toast.success(isZh ? '已添加到输入框' : 'Added to input');
    
    // Remove highlight after animation
    setTimeout(() => {
      setHighlightedImageId(null);
    }, 600);
  }, [isZh]);

  // Handle copying image to clipboard for cross-session paste
  const handleCopyImage = useCallback((image: CanvasImage) => {
    setCopiedImage(image);
    toast.success(isZh ? '已复制到剪贴板，可在新画布粘贴' : 'Copied to clipboard, can paste in new canvas');
  }, [isZh]);

  // Handle pasting copied image to canvas (clears copiedImage after paste)
  const handlePasteImage = useCallback(() => {
    if (copiedImage) {
      const newImage: CanvasImage = {
        ...copiedImage,
        id: `img-${Date.now()}`,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
      };
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setCopiedImage(null); // Clear after paste - single use
      toast.success(isZh ? '已粘贴图片到画布' : 'Image pasted to canvas');
    }
  }, [copiedImage, isZh]);

  // Handle keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedImageId) {
        const image = canvasImages.find(img => img.id === selectedImageId);
        if (image) handleCopyImage(image);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedImage) {
        handlePasteImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, canvasImages, copiedImage, handleCopyImage, handlePasteImage]);

  // Drag and drop handlers for input area
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const imageData = JSON.parse(data) as SelectedImage;
        handleAddSelectedImage(imageData);
      }
    } catch (err) {
      console.error('Failed to parse dropped image data:', err);
    }
  }, [handleAddSelectedImage]);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = prompt;
    setPrompt('');
    setIsGenerating(true);

    const systemMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      content: '',
      timestamp: new Date(),
      status: 'thinking',
      designThoughts: [],
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, systemMessage]);
    }, 300);

    const newImageUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop';
    
    const designSteps = isZh ? [
      `图片理解：${currentPrompt}`,
      '正在设计：分析画面构图与色彩搭配',
      '光影效果：根据场景调整光线与阴影',
    ] : [
      `Image Understanding: ${currentPrompt}`,
      'Designing: Analyzing composition and color palette',
      'Lighting: Adjusting light and shadow based on scene',
    ];
    
    const resultSummary = isZh 
      ? `已完成图片生成，整体风格协调，输出尺寸为1:1。`
      : `Image generation complete, overall style harmonious, output size 1:1.`;

    // Progress through design thoughts
    designSteps.forEach((thought, index) => {
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === systemMessage.id 
              ? { 
                  ...msg, 
                  status: index < designSteps.length - 1 ? 'designing' : 'optimizing',
                  designThoughts: [...(msg.designThoughts || []), thought],
                }
              : msg
          )
        );
      }, (index + 1) * 600);
    });

    // Complete with image
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'complete',
                image: newImageUrl,
                resultSummary,
              }
            : msg
        )
      );
      // Add new image to canvas at center
      const newImage: CanvasImage = {
        id: `img-${Date.now()}`,
        url: newImageUrl,
        x: 300,
        y: 200,
        width: 280,
        height: 280,
        prompt: currentPrompt,
      };
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      
      // Auto-attach newly generated image to input area
      handleAddSelectedImage({
        id: newImage.id,
        url: newImage.url,
        prompt: newImage.prompt,
      });
      
      setIsGenerating(false);
    }, (designSteps.length + 1) * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const newWidthPercent = (e.clientX / containerWidth) * 100;
      
      // 限制宽度范围：最小20%，最大60%
      const clampedWidth = Math.max(20, Math.min(60, newWidthPercent));
      setChatPanelWidth(clampedWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleDeleteImage = () => {
    if (selectedImageId) {
      setCanvasImages(prev => prev.filter(img => img.id !== selectedImageId));
      setSelectedImageId(null);
    }
  };

  const selectedImage = canvasImages.find(img => img.id === selectedImageId);

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-3.5rem)] gap-0 animate-fade-in overflow-hidden bg-background">
      {/* Left Panel - Chat Interface - Fixed height with flex layout */}
      <div 
        className="h-full flex flex-col border-r border-border bg-background overflow-hidden"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header Bar - Fixed at top */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          {/* Back Button + Title - Merged as single clickable component */}
          <button 
            className="flex items-center gap-1 hover:text-primary transition-colors group"
            onClick={() => onNavigate?.('app-plaza')}
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-base font-medium">
              {isZh ? '文生图' : 'Text to Image'}
            </span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleNewConversation}
            >
              <Plus className="h-3.5 w-3.5" />
              {isZh ? '新建' : 'New'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 gap-1.5 px-2 text-xs hover:text-foreground",
                showHistory ? "text-foreground bg-muted" : "text-muted-foreground"
              )}
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-3.5 w-3.5" />
              {isZh ? '历史' : 'History'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
              <PanelRightClose className="h-3.5 w-3.5" />
              {isZh ? '收起' : 'Collapse'}
            </Button>
          </div>
        </div>

        {/* Chat Content Area - Scrollable middle section */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showHistory ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* History Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <h3 className="text-sm font-medium">{isZh ? '历史记录' : 'History'}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
                <div className="space-y-1">
                  {historySessions.map((session) => (
                    <button
                      key={session.id}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                      onClick={() => handleLoadSession(session.id)}
                    >
                      <p className="text-sm font-medium truncate group-hover:text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.timestamp.toLocaleDateString(isZh ? 'zh-CN' : 'en-US')} · {session.messageCount} {isZh ? '条消息' : 'messages'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {isZh ? '开始一个新的对话' : 'Start a new conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {isZh ? '输入描述来生成图片' : 'Enter a description to generate images'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex flex-col gap-2',
                        message.type === 'user' ? 'items-start' : 'items-start'
                      )}
                    >
                      {message.type === 'user' ? (
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-lg">•</span>
                          <p className="text-sm leading-relaxed text-foreground">{message.content}</p>
                        </div>
                      ) : (
                        <div className="w-full space-y-3">
                          {/* Design Thoughts */}
                          {message.designThoughts && message.designThoughts.length > 0 && (
                            <div className="space-y-2">
                              {message.designThoughts.map((thought, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="mt-0.5 text-primary">•</span>
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {thought.split('：')[0]}：
                                    </span>
                                    {thought.split('：').slice(1).join('：')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Status indicator when still processing */}
                          {message.status && message.status !== 'complete' && (
                            <div className="flex items-center gap-2 py-1">
                              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              <span className="text-sm text-muted-foreground">
                                {getStatusText(message.status)}
                              </span>
                            </div>
                          )}
                          
                          {/* Generated Image */}
                          {message.image && message.status === 'complete' && (
                            <div className="relative mt-2">
                              <div 
                                className="relative w-56 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md"
                                onClick={() => {
                                  const img = canvasImages.find(i => i.url === message.image);
                                  if (img) setSelectedImageId(img.id);
                                }}
                              >
                                <img
                                  src={message.image}
                                  alt="Generated"
                                  className="aspect-square w-full object-cover"
                                />
                                {/* Feedback Button */}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute bottom-2 right-2 h-7 gap-1 rounded-md bg-background/90 px-2 text-xs backdrop-blur-sm hover:bg-background"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {isZh ? '反馈' : 'Feedback'}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Result Summary */}
                          {message.resultSummary && message.status === 'complete' && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {message.resultSummary}
                            </p>
                          )}
                          
                          {/* Task Complete indicator */}
                          {message.status === 'complete' && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {getStatusText('complete')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
          {/* Input Container with Drop Zone */}
          <div 
            className={cn(
              "relative rounded-xl border bg-muted/30 shadow-sm transition-all",
              "focus-within:ring-2 focus-within:ring-primary/20",
              isDragOver 
                ? "border-primary border-dashed bg-primary/5 ring-2 ring-primary/30" 
                : "border-border"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Selected Images Capsules */}
            {selectedImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-1">
                {selectedImages.map((img) => (
                  <ImageCapsule
                    key={img.id}
                    image={img}
                    onRemove={handleRemoveSelectedImage}
                  />
                ))}
              </div>
            )}
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isZh ? '描述您想要生成的图片...' : 'Describe the image you want to generate...'}
              rows={2}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none",
                selectedImages.length > 0 ? "pt-2 pb-3" : "py-3"
              )}
            />
            
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* Model Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {models.find(m => m.id === model)?.label}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    {models.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={cn(model === m.id && 'bg-accent')}
                      >
                        {m.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Aspect Ratio Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RatioIcon className="h-3.5 w-3.5" />
                      {aspectRatio}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {aspectRatios.map((ar) => (
                      <DropdownMenuItem
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        className={cn(aspectRatio === ar.id && 'bg-accent')}
                      >
                        {ar.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isZh ? '添加' : 'Add'}
                </Button>
              </div>
              
              {/* Send Button */}
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Footer note */}
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            {isZh ? '请使用有权素材，并合法使用生成结果' : 'Please use authorized materials and use results legally'}
          </p>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className={cn(
          "w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex-shrink-0",
          isResizing && "bg-primary"
        )}
        style={{ touchAction: 'none' }}
      />

      {/* Right Panel - Infinite Canvas */}
      <div 
        className="relative flex flex-col bg-muted/20"
        style={{ width: `${100 - chatPanelWidth}%` }}
      >
        {/* Workspace Header - Fixed Position */}
        <div className="pointer-events-none absolute left-10 top-10 z-10">
          <h1 className="text-2xl font-bold text-foreground/90">
            {isZh ? '文生图' : 'Text to Image'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isZh ? '通过文字描述创建精美视觉图像' : 'Create stunning visuals from text descriptions'}
          </p>
        </div>

        <InfiniteCanvas
          images={canvasImages}
          onImageMove={handleImageMove}
          onImageSelect={setSelectedImageId}
          selectedImageId={selectedImageId}
          onImageDragStart={(image) => {
            // Optional: could show visual feedback when drag starts
          }}
          onImageDoubleClick={handleImageDoubleClick}
          highlightedImageId={highlightedImageId}
          onImageDelete={handleDeleteImage}
          onNavigate={onNavigate}
        />

        {/* Selected Image Floating Toolbar */}
        {selectedImage && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm animate-fade-in">
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedImage.prompt}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={() => handleCopyImage(selectedImage)}
              title={isZh ? '复制到新对话' : 'Copy to new session'}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteImage}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Paste Button - Shows when image is copied */}
        {copiedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute left-4 top-4 gap-1.5 shadow-sm"
            onClick={handlePasteImage}
          >
            <Clipboard className="h-4 w-4" />
            {isZh ? '粘贴图片' : 'Paste Image'}
          </Button>
        )}

        {/* Image Count Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-4 top-4 shadow-sm"
        >
          {canvasImages.length} {isZh ? '张图片' : 'images'}
        </Badge>
      </div>
    </div>
  );
}
