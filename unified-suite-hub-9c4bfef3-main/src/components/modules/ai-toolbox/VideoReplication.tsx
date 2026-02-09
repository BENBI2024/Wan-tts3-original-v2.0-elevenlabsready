import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  Play, 
  X, 
  ChevronDown,
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Edit3,
  Check,
  Loader2,
  Plus,
  History,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteCanvas } from './InfiniteCanvas';
import { usePendingAssets } from '@/contexts/PendingAssetsContext';

interface VideoReplicationProps {
  onNavigate?: (itemId: string) => void;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  originalPrompt: string;
  newPrompt: string;
  isEditing: boolean;
  thumbnail?: string;
  isSelected: boolean;
}

interface UploadedFile {
  id: string;
  type: 'video' | 'image' | 'text';
  name: string;
  url: string;
  thumbnail?: string;
  isFromReference?: boolean; // Flag to indicate this came from TikTok reference
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  segmentId?: string;
}

// View state: 'upload' -> 'analyzing' -> 'prompts' -> 'chat'
type ViewState = 'upload' | 'analyzing' | 'prompts' | 'chat';

interface CanvasItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

// History interface for saving projects
interface ProjectHistoryItem {
  id: string;
  name: string;
  createdAt: Date;
  viewState: ViewState;
  originalVideoName: string | null;
  referenceImageName: string | null;
  sellingPoints: string;
  segmentsCount: number;
  // We store serializable data only (no blob URLs)
  segments: VideoSegment[];
  messages: Message[];
}

const HISTORY_STORAGE_KEY = 'video-replication-history';

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  // Get pending video reference from context
  const { pendingVideoReference, clearPendingVideoReference } = usePendingAssets();
  
  // View state
  const [viewState, setViewState] = useState<ViewState>('upload');
  
  // Upload state
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [sellingPoints, setSellingPoints] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Reference video info from TikTok report
  const [referenceVideoInfo, setReferenceVideoInfo] = useState<{
    title: string;
    hashtags: string;
    strategy: string;
  } | null>(null);
  
  // Segmentation state
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState<string>('');
  
  // Dialog state for prompt editing
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPromptText, setDialogPromptText] = useState('');
  const [dialogSegmentId, setDialogSegmentId] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Canvas state
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  
  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryItem[]>([]);
  
  // Panel resize
  const [chatPanelWidth, setChatPanelWidth] = useState(35);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Handle pending video reference from TikTok report - directly populate video upload area
  useEffect(() => {
    if (pendingVideoReference) {
      // Set the video reference as the original video to upload area
      setOriginalVideo({
        id: crypto.randomUUID(),
        type: 'video',
        name: pendingVideoReference.title,
        url: pendingVideoReference.thumbnail || '', // Use thumbnail as preview
        thumbnail: pendingVideoReference.thumbnail,
      });
      
      // Store additional reference info
      setReferenceVideoInfo({
        title: pendingVideoReference.title,
        hashtags: pendingVideoReference.hashtags,
        strategy: pendingVideoReference.strategy,
      });
      
      // Pre-fill selling points from hashtags/strategy
      if (pendingVideoReference.hashtags) {
        setSellingPoints(pendingVideoReference.hashtags.replace(/#/g, '').replace(/\s+/g, '、'));
      }
      
      // Add to canvas as video placeholder
      setCanvasItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'video',
        url: pendingVideoReference.thumbnail || '',
        name: pendingVideoReference.title,
        x: 50,
        y: 50,
        width: 320,
        height: 180,
      }]);
      
      toast.success(`已加载参考视频到上传区域`);
      clearPendingVideoReference();
    }
  }, [pendingVideoReference, clearPendingVideoReference]);
  
  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const history = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          messages: item.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setProjectHistory(history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // Save history to localStorage
  const saveHistoryToStorage = useCallback((history: ProjectHistoryItem[]) => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, []);

  // Save current project to history
  const saveToHistory = useCallback(() => {
    if (!originalVideo && segments.length === 0) {
      toast.error('当前项目为空，无法保存');
      return;
    }

    const historyItem: ProjectHistoryItem = {
      id: crypto.randomUUID(),
      name: originalVideo?.name || `项目 ${new Date().toLocaleString('zh-CN')}`,
      createdAt: new Date(),
      viewState,
      originalVideoName: originalVideo?.name || null,
      referenceImageName: referenceImage?.name || null,
      sellingPoints,
      segmentsCount: segments.length,
      segments,
      messages,
    };

    const newHistory = [historyItem, ...projectHistory].slice(0, 20); // Keep last 20 items
    setProjectHistory(newHistory);
    saveHistoryToStorage(newHistory);
    toast.success('项目已保存到历史记录');
  }, [originalVideo, referenceImage, sellingPoints, segments, messages, viewState, projectHistory, saveHistoryToStorage]);

  // Restore project from history
  const restoreFromHistory = useCallback((item: ProjectHistoryItem) => {
    setViewState(item.viewState === 'upload' ? 'prompts' : item.viewState);
    setSegments(item.segments);
    setMessages(item.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })));
    setSellingPoints(item.sellingPoints);
    setSelectedSegments(new Set());
    setCanvasItems([]);
    setGeneratedVideo(null);
    // Note: We can't restore actual video/image files (blob URLs are not persistent)
    // So we set them to null and inform the user
    setOriginalVideo(null);
    setReferenceImage(null);
    setHistoryOpen(false);
    toast.success('项目已恢复，请重新上传视频和参考图');
  }, []);

  // Delete from history
  const deleteFromHistory = useCallback((id: string) => {
    const newHistory = projectHistory.filter(item => item.id !== id);
    setProjectHistory(newHistory);
    saveHistoryToStorage(newHistory);
    toast.success('已从历史记录中删除');
  }, [projectHistory, saveHistoryToStorage]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle video upload
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('请上传视频文件');
      return;
    }
    
    const url = URL.createObjectURL(file);
    
    // Check if replacing an existing item
    if (replacingItemId) {
      const oldItem = canvasItems.find(i => i.id === replacingItemId);
      setCanvasItems(prev => prev.map(item => 
        item.id === replacingItemId 
          ? { ...item, url, name: file.name }
          : item
      ));
      // Update sidebar state if the replaced item was the original video
      if (oldItem && originalVideo && oldItem.url === originalVideo.url) {
        setOriginalVideo({
          id: crypto.randomUUID(),
          type: 'video',
          name: file.name,
          url,
        });
      }
      setReplacingItemId(null);
      toast.success('视频已替换');
    } else {
      setOriginalVideo({
        id: crypto.randomUUID(),
        type: 'video',
        name: file.name,
        url,
      });
      
      // Add to canvas
      setCanvasItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'video',
        url,
        name: file.name,
        x: 50,
        y: 50,
        width: 320,
        height: 180,
      }]);
      
      toast.success('视频上传成功');
    }
    
    // Reset input
    e.target.value = '';
  }, [replacingItemId, canvasItems, originalVideo]);

  // Handle reference image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    
    const url = URL.createObjectURL(file);
    
    // Check if replacing an existing item
    if (replacingItemId) {
      const oldItem = canvasItems.find(i => i.id === replacingItemId);
      setCanvasItems(prev => prev.map(item => 
        item.id === replacingItemId 
          ? { ...item, url, name: file.name }
          : item
      ));
      // Update sidebar state if the replaced item was the reference image
      if (oldItem && referenceImage && oldItem.url === referenceImage.url) {
        setReferenceImage({
          id: crypto.randomUUID(),
          type: 'image',
          name: file.name,
          url,
        });
      }
      setReplacingItemId(null);
      toast.success('图片已替换');
    } else {
      setReferenceImage({
        id: crypto.randomUUID(),
        type: 'image',
        name: file.name,
        url,
      });
      
      // Add to canvas
      setCanvasItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: file.name,
        x: 400,
        y: 50,
        width: 200,
        height: 200,
      }]);
      
      toast.success('参考图上传成功');
    }
    
    // Reset input
    e.target.value = '';
  }, [replacingItemId, canvasItems, referenceImage]);

  // Analyze video and generate segments, then auto-generate new prompts
  const handleAnalyzeVideo = useCallback(async () => {
    if (!originalVideo) {
      toast.error('请先上传原视频');
      return;
    }
    
    setViewState('analyzing');
    
    // Mock API call - replace with actual LLM integration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock segments with original prompts
    const mockSegments: VideoSegment[] = [
      {
        id: '1',
        startTime: 0,
        endTime: 5,
        originalPrompt: '产品展示镜头，特写产品外观，柔和的灯光环境',
        newPrompt: '',
        isEditing: false,
        isSelected: false,
      },
      {
        id: '2',
        startTime: 5,
        endTime: 12,
        originalPrompt: '产品功能演示，手部操作特写，流畅的动作',
        newPrompt: '',
        isEditing: false,
        isSelected: false,
      },
      {
        id: '3',
        startTime: 12,
        endTime: 18,
        originalPrompt: '使用场景展示，生活化环境，自然光线',
        newPrompt: '',
        isEditing: false,
        isSelected: false,
      },
      {
        id: '4',
        startTime: 18,
        endTime: 25,
        originalPrompt: '品牌logo展示，简洁背景，产品卖点文字叠加',
        newPrompt: '',
        isEditing: false,
        isSelected: false,
      },
    ];
    
    // Auto-generate new prompts based on product info
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate new prompts based on selling points and reference image
    const segmentsWithNewPrompts = mockSegments.map(segment => ({
      ...segment,
      newPrompt: `[新商品] ${segment.originalPrompt}，融入${sellingPoints || '产品特色'}，参考商品图片风格`,
    }));
    
    setSegments(segmentsWithNewPrompts);
    setViewState('prompts');
    
    toast.success('复刻分析完成');
  }, [originalVideo, sellingPoints]);

  // Handle prompt click - open dialog
  const handlePromptClick = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setDialogSegmentId(segmentId);
      setDialogPromptText(segment.newPrompt);
      setDialogOpen(true);
    }
  }, [segments]);

  // Handle dialog send - save and enter chat view
  const handleDialogSend = useCallback(() => {
    if (dialogSegmentId && dialogPromptText.trim()) {
      // Update the segment's prompt
      setSegments(prev => prev.map(s => 
        s.id === dialogSegmentId 
          ? { ...s, newPrompt: dialogPromptText }
          : s
      ));
      
      // Add to messages
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: `修改片段 ${dialogSegmentId} 的prompt为: ${dialogPromptText}`,
        timestamp: new Date(),
      }, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '已更新prompt。您可以继续修改其他片段或直接生成视频。',
        timestamp: new Date(),
      }]);
      
      // Close dialog and enter chat view
      setDialogOpen(false);
      setDialogSegmentId(null);
      setDialogPromptText('');
      setViewState('chat');
      
      toast.success('已保存修改');
    }
  }, [dialogSegmentId, dialogPromptText]);

  // Handle segment selection (click = toggle single, ctrl+click = multi-select)
  const handleSegmentClick = useCallback((segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSegments(prev => {
      const newSet = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        // Multi-select mode
        if (newSet.has(segmentId)) {
          newSet.delete(segmentId);
        } else {
          newSet.add(segmentId);
        }
      } else {
        // Single select mode
        if (newSet.has(segmentId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(segmentId);
        }
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedSegments.size === segments.length) {
      setSelectedSegments(new Set());
    } else {
      setSelectedSegments(new Set(segments.map(s => s.id)));
    }
  }, [segments, selectedSegments]);

  // Handle double-click to edit
  const handleSegmentDoubleClick = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setEditingSegmentId(segmentId);
      setEditingPromptText(segment.newPrompt || segment.originalPrompt);
    }
  }, [segments]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editingSegmentId) {
      setSegments(prev => prev.map(s => 
        s.id === editingSegmentId 
          ? { ...s, newPrompt: editingPromptText }
          : s
      ));
      setEditingSegmentId(null);
      setEditingPromptText('');
      toast.success('已保存修改');
    }
  }, [editingSegmentId, editingPromptText]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditingPromptText('');
  }, []);

  // Handle chat message send
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    
    const selectedIds = Array.from(selectedSegments);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      segmentId: selectedIds.length === 1 ? selectedIds[0] : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);
    
    // Mock LLM response - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update selected segments' prompts
    if (selectedIds.length > 0) {
      setSegments(prev => prev.map(s => 
        selectedIds.includes(s.id)
          ? { ...s, newPrompt: `${s.newPrompt} [用户修改: ${inputMessage}]` }
          : s
      ));
    }
    
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: selectedIds.length === segments.length
        ? '已根据您的要求更新所有片段的prompt。您可以继续优化或直接生成视频。'
        : selectedIds.length > 0
          ? `已根据您的要求更新 ${selectedIds.length} 个片段的prompt。您可以继续优化或选择其他片段。`
          : '收到您的反馈。请在时间轴选择片段进行修改，或者直接点击"生成视频"按钮。',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsGenerating(false);
  }, [inputMessage, selectedSegments, segments.length]);

  // Handle video generation
  const handleGenerateVideo = useCallback(async () => {
    if (segments.length === 0 || !segments.some(s => s.newPrompt)) {
      toast.error('请先生成新的prompt');
      return;
    }
    
    setIsGenerating(true);
    
    // Mock video generation - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Use original video as mock result
    const mockGeneratedUrl = originalVideo?.url || '';
    setGeneratedVideo(mockGeneratedUrl);
    
    // Add to canvas
    setCanvasItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'video',
      url: mockGeneratedUrl,
      name: '复刻视频_' + new Date().toISOString().slice(0, 10),
      x: 50,
      y: 300,
      width: 320,
      height: 180,
    }]);
    
    setIsGenerating(false);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '视频生成完成！您可以在右侧画布查看生成的复刻视频。',
      timestamp: new Date(),
    }]);
    
    toast.success('视频生成完成');
  }, [segments, originalVideo]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setChatPanelWidth(Math.max(25, Math.min(50, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Check if ready to analyze
  const canAnalyze = originalVideo && viewState === 'upload';
  const canGenerateVideo = segments.some(s => s.newPrompt) && !isGenerating;

  return (
    <div className="h-[calc(100vh-72px)] flex bg-background">
      {/* Left Panel - Chat & Controls */}
      <div 
        className="flex flex-col border-r border-border bg-card"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-medium">复刻视频</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                // Save current before creating new
                if (originalVideo || segments.length > 0) {
                  saveToHistory();
                }
                // Reset all state for new project
                setViewState('upload');
                setOriginalVideo(null);
                setReferenceImage(null);
                setSellingPoints('');
                setSegments([]);
                setSelectedSegments(new Set());
                setMessages([]);
                setCanvasItems([]);
                setGeneratedVideo(null);
                toast.success('已创建新项目');
              }}
              title="新建项目"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant={historyOpen ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="历史记录"
            >
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* History View */}
        {historyOpen && (
          <div className="flex-1 flex flex-col min-h-0 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <History className="w-4 h-4" />
                历史记录
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setHistoryOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {projectHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无历史记录</p>
                  <p className="text-sm mt-1">开始复刻视频后会自动保存</p>
                </div>
              ) : (
                <div className="space-y-3 pr-2">
                  {projectHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.createdAt.toLocaleString('zh-CN')}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.originalVideoName && (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                <Video className="w-3 h-3" />
                                视频
                              </span>
                            )}
                            {item.referenceImageName && (
                              <span className="inline-flex items-center gap-1 text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded">
                                <ImageIcon className="w-3 h-3" />
                                参考图
                              </span>
                            )}
                            {item.segmentsCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                {item.segmentsCount} 个片段
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => restoreFromHistory(item)}
                            title="恢复项目"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteFromHistory(item.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Upload Section */}
        {!historyOpen && viewState === 'upload' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Video Upload */}
            {!originalVideo ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">上传原视频</p>
                <p className="text-sm text-muted-foreground">点击或拖拽上传需要复刻的视频</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{originalVideo.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => {
                      setOriginalVideo(null);
                      setReferenceVideoInfo(null);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {/* Show thumbnail image for reference videos, video player for uploaded videos */}
                {originalVideo.thumbnail ? (
                  <div className="relative w-full h-32 rounded-md bg-black overflow-hidden">
                    <img 
                      src={originalVideo.thumbnail} 
                      alt={originalVideo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-10 h-10 text-white/80" />
                    </div>
                    {referenceVideoInfo && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs text-white/90 line-clamp-1">{referenceVideoInfo.hashtags}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <video 
                    src={originalVideo.url} 
                    className="w-full h-32 object-cover rounded-md bg-black"
                    controls
                  />
                )}
              </div>
            )}

            {/* Reference Image Upload */}
            {!referenceImage ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">上传参考图（商品图）</p>
                <p className="text-sm text-muted-foreground">上传您的商品图片作为风格参考</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{referenceImage.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setReferenceImage(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <img 
                  src={referenceImage.url} 
                  alt="参考图预览"
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}

            {/* Selling Points Input */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">商品卖点</span>
              </div>
              <Textarea
                placeholder="输入您的商品核心卖点，例如：高品质材料、独特设计、功能创新..."
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Reference Video Strategy Hint - shown when video came from TikTok */}
            {referenceVideoInfo && originalVideo && (
              <div className="border border-primary/30 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">参考策略</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{referenceVideoInfo.strategy}</p>
              </div>
            )}

            {/* Analyze Button */}
            {originalVideo && referenceImage && sellingPoints.trim() && (
              <Button 
                className="w-full"
                onClick={handleAnalyzeVideo}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                开始复刻
              </Button>
            )}
          </div>
        )}

        {/* Analyzing Animation */}
        {!historyOpen && viewState === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-medium mb-2">正在分析视频...</h3>
            <p className="text-sm text-muted-foreground text-center">
              AI正在识别视频片段并生成新的prompt
            </p>
          </div>
        )}

        {/* Prompts List View (after analysis, before chat) */}
        {!historyOpen && viewState === 'prompts' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-y-auto">
            <div className="text-center mb-2">
              <h3 className="font-medium">生成的Prompt列表</h3>
              <p className="text-sm text-muted-foreground">点击任意片段进行修改</p>
            </div>
            
            {/* Prompt Cards */}
            <div className="space-y-3">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all hover:bg-muted/30"
                  onClick={() => handlePromptClick(segment.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary">
                      片段 {segment.id} • {segment.startTime}s - {segment.endTime}s
                    </span>
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm">{segment.newPrompt}</p>
                </div>
              ))}
            </div>
            
            {/* Direct Generate Button */}
            <Button 
              className="w-full mt-4"
              onClick={handleGenerateVideo}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  生成中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  直接生成视频
                </>
              )}
            </Button>
          </div>
        )}

        {/* Prompt Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                编辑片段 {dialogSegmentId} 的Prompt
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={dialogPromptText}
                onChange={(e) => setDialogPromptText(e.target.value)}
                placeholder="输入新的prompt..."
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleDialogSend}>
                <Send className="w-4 h-4 mr-2" />
                发送并继续编辑
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat View with Timeline */}
        {!historyOpen && viewState === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Timeline Segments */}
            {segments.length > 0 && (
              <div className="px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    时间轴（单击选中，Ctrl+单击多选，双击编辑）
                  </p>
                  <button
                    className={cn(
                      "text-xs px-2 py-1 rounded transition-colors",
                      selectedSegments.size === segments.length 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                    onClick={handleSelectAll}
                  >
                    {selectedSegments.size === segments.length ? '取消全选' : '全选'}
                  </button>
                </div>
                
                {/* Horizontal Timeline */}
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="flex gap-2 min-w-max">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className={cn(
                          "relative flex-shrink-0 w-[180px] p-2 rounded-lg border cursor-pointer transition-all select-none",
                          selectedSegments.has(segment.id) 
                            ? "border-primary bg-primary/10 ring-1 ring-primary" 
                            : "border-border hover:border-primary/50",
                          editingSegmentId === segment.id && "ring-2 ring-primary"
                        )}
                        onClick={(e) => handleSegmentClick(segment.id, e)}
                        onDoubleClick={() => handleSegmentDoubleClick(segment.id)}
                      >
                        {/* Time indicator */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-primary">
                            {segment.startTime}s - {segment.endTime}s
                          </span>
                          {segment.newPrompt && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        
                        {/* Prompt content */}
                        {editingSegmentId === segment.id ? (
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <Textarea
                              value={editingPromptText}
                              onChange={(e) => setEditingPromptText(e.target.value)}
                              className="text-xs min-h-[60px] resize-none"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={handleSaveEdit}>
                                <Check className="w-3 h-3 mr-1" />
                                保存
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={handleCancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground line-clamp-2" title={segment.originalPrompt}>
                              原: {segment.originalPrompt}
                            </p>
                            {segment.newPrompt && (
                              <p className="text-[10px] text-foreground line-clamp-2" title={segment.newPrompt}>
                                新: {segment.newPrompt}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Selection indicator */}
                        {selectedSegments.has(segment.id) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Selection hint */}
                {selectedSegments.size > 0 && (
                  <p className="text-xs text-primary mt-2">
                    已选中 {selectedSegments.size} 个片段，在下方输入修改建议
                  </p>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-muted/50 text-muted-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border shrink-0 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    selectedSegments.size > 0 
                      ? `对 ${selectedSegments.size} 个片段提出修改建议...` 
                      : "选择片段后输入修改建议..."
                  }
                  className="min-h-[44px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="shrink-0 h-11 w-11"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Generate Video Button */}
              {segments.some(s => s.newPrompt) && (
                <Button 
                  className="w-full"
                  onClick={handleGenerateVideo}
                  disabled={!canGenerateVideo}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      生成视频
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 cursor-col-resize hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - Canvas */}
      <div className="flex-1 flex flex-col bg-muted/30">
        <InfiniteCanvas
          images={canvasItems}
          onImageMove={(id, x, y) => {
            setCanvasItems(prev => prev.map(item => 
              item.id === id ? { ...item, x, y } : item
            ));
          }}
          onImageSelect={setSelectedCanvasItem}
          selectedImageId={selectedCanvasItem}
          onImageDelete={(id) => {
            const item = canvasItems.find(i => i.id === id);
            setCanvasItems(prev => prev.filter(item => item.id !== id));
            setSelectedCanvasItem(null);
            // Sync with sidebar state
            if (item && originalVideo && item.url === originalVideo.url) {
              setOriginalVideo(null);
            }
            if (item && referenceImage && item.url === referenceImage.url) {
              setReferenceImage(null);
            }
            toast.success('已删除');
          }}
          onImageReplace={(id) => {
            const item = canvasItems.find(i => i.id === id);
            setReplacingItemId(id);
            if (item?.type === 'video') {
              fileInputRef.current?.click();
            } else {
              imageInputRef.current?.click();
            }
          }}
          onImageCopy={(image) => {
            const newItem: CanvasItem = {
              id: crypto.randomUUID(),
              type: (image.type as 'video' | 'image') || 'image',
              url: image.url,
              name: image.name || '',
              x: image.x + 30,
              y: image.y + 30,
              width: image.width,
              height: image.height,
            };
            setCanvasItems(prev => [...prev, newItem]);
            toast.success('已复制');
          }}
        />
      </div>

    </div>
  );
}
