import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Plus,
  Upload,
  CalendarIcon,
  Clock,
  Image as ImageIcon,
  Video,
  Send,
  Settings,
  X,
  Eye,
  Check,
  Trash2,
} from 'lucide-react';
import { usePendingAssets } from '@/contexts/PendingAssetsContext';

// Platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

interface BoundAccount {
  id: string;
  platform: 'tiktok' | 'facebook' | 'instagram';
  accountName: string;
  isOnline: boolean;
}

interface Asset {
  id: string;
  name: string;
  type: 'video' | 'image';
  thumbnail: string;
  isPublished: boolean;
  publishedAt?: string;
}

export function SocialMediaPublishing() {
  const { pendingAssets, markAsPublished: markPendingAsPublished, removePendingAsset } = usePendingAssets();
  
  // Account Management State
  const [accounts, setAccounts] = useState<BoundAccount[]>([
    { id: '1', platform: 'tiktok', accountName: '@brand_official', isOnline: true },
    { id: '2', platform: 'instagram', accountName: '@brand_ig', isOnline: true },
  ]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: 'tiktok', name: '', token: '' });

  // Asset Library State - Combine local assets with pending assets from context
  const [localAssets, setLocalAssets] = useState<Asset[]>([
    { id: '1', name: 'Summer Campaign Hero', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop', isPublished: false },
    { id: '2', name: 'Product Showcase', type: 'image', thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop', isPublished: false },
    { id: '4', name: 'Lifestyle Collection', type: 'image', thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=500&fit=crop', isPublished: true, publishedAt: '2024-01-15' },
    { id: '6', name: 'New Arrivals', type: 'image', thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop', isPublished: true, publishedAt: '2024-01-10' },
  ]);
  
  // Merge pending assets from context with local assets
  const assets: Asset[] = [
    ...pendingAssets.map(pa => ({
      id: pa.id,
      name: pa.name,
      type: pa.type,
      thumbnail: pa.thumbnail,
      isPublished: pa.isPublished,
      publishedAt: pa.publishedAt,
    })),
    ...localAssets,
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'unpublished' | 'published'>('unpublished');

  // Publishing Panel State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [publishMode, setPublishMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('12:00');

  const getPlatformIcon = (platform: string, size = 'w-4 h-4') => {
    switch (platform) {
      case 'tiktok':
        return <TikTokIcon className={size} />;
      case 'facebook':
        return <FacebookIcon className={size} />;
      case 'instagram':
        return <InstagramIcon className={size} />;
      default:
        return null;
    }
  };

  const handleAddAccount = () => {
    if (newAccount.name && newAccount.token) {
      const account: BoundAccount = {
        id: Date.now().toString(),
        platform: newAccount.platform as 'tiktok' | 'facebook' | 'instagram',
        accountName: newAccount.name,
        isOnline: true,
      };
      setAccounts([...accounts, account]);
      setNewAccount({ platform: 'tiktok', name: '', token: '' });
      setIsAccountModalOpen(false);
    }
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
    setSelectedAccounts(selectedAccounts.filter(aid => aid !== id));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newAssets: Asset[] = Array.from(files).map(file => ({
        id: Date.now().toString() + Math.random(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        thumbnail: '/placeholder.svg',
        isPublished: false,
      }));
      setLocalAssets(prev => [...newAssets, ...prev]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsPanelOpen(true);
    setCaption('');
    setSelectedAccounts([]);
  };

  const toggleAccountSelection = (id: string) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handlePublish = () => {
    if (selectedAsset) {
      // Check if it's a pending asset (from context)
      if (selectedAsset.id.startsWith('pending-')) {
        markPendingAsPublished(selectedAsset.id);
      } else {
        // It's a local asset
        setLocalAssets(prev => prev.map(a => 
          a.id === selectedAsset.id 
            ? { ...a, isPublished: true, publishedAt: new Date().toISOString().split('T')[0] }
            : a
        ));
      }
      setIsPanelOpen(false);
      setSelectedAsset(null);
    }
  };

  const filteredAssets = assets.filter(a => 
    activeTab === 'unpublished' ? !a.isPublished : a.isPublished
  );

  const onlineAccounts = accounts.filter(a => a.isOnline);

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Minimal Header */}
      <header className="px-8 py-5 bg-white border-b border-gray-100/80">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">素材投放</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理和发布您的创意素材</p>
          </div>

          {/* Account Status Bar */}
          <div className="flex items-center gap-3">
            {/* Connected Accounts Mini Icons */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full">
              {onlineAccounts.map((account) => (
                <div key={account.id} className="relative group">
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    {getPlatformIcon(account.platform)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                  {/* Tooltip */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {account.accountName}
                  </div>
                </div>
              ))}
              {onlineAccounts.length === 0 && (
                <span className="text-xs text-gray-400">暂无账号</span>
              )}
            </div>

            {/* Account Settings Button */}
            <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-900">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">账号设置</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg">账号管理</DialogTitle>
                </DialogHeader>
                
                {/* Existing Accounts */}
                <div className="space-y-3 py-4">
                  {accounts.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">暂无绑定账号</p>
                  ) : (
                    accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                              {getPlatformIcon(account.platform, 'w-5 h-5')}
                            </div>
                            <span className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-50",
                              account.isOnline ? "bg-emerald-400" : "bg-gray-300"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{account.accountName}</p>
                            <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveAccount(account.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Account Form */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">绑定新账号</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">平台</Label>
                      <Select
                        value={newAccount.platform}
                        onValueChange={(v) => setNewAccount({ ...newAccount, platform: v })}
                      >
                        <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-50">
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">账号名</Label>
                      <Input
                        placeholder="@username"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        className="rounded-xl h-10 border-gray-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">访问令牌</Label>
                    <Input
                      type="password"
                      placeholder="输入API Token"
                      value={newAccount.token}
                      onChange={(e) => setNewAccount({ ...newAccount, token: e.target.value })}
                      className="rounded-xl h-10 border-gray-200"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button onClick={handleAddAccount} className="w-full rounded-xl h-10">
                    <Plus className="w-4 h-4 mr-1.5" />
                    绑定账号
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Upload Button */}
            <Button 
              size="sm" 
              className="gap-1.5 rounded-full px-4 shadow-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              上传素材
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unpublished' | 'published')}>
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              <TabsTrigger 
                value="unpublished"
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-gray-900 data-[state=active]:text-white",
                  "data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                )}
              >
                未发布
                <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 text-xs px-1.5">
                  {assets.filter(a => !a.isPublished).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="published"
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-gray-900 data-[state=active]:text-white",
                  "data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                )}
              >
                已发布
                <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 text-xs px-1.5">
                  {assets.filter(a => a.isPublished).length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Asset Library - Main Content */}
      <main 
        className={cn(
          "flex-1 p-8 overflow-auto transition-colors",
          isDragging && "bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop Zone Indicator */}
        {isDragging && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-gray-900">释放以上传素材</p>
              <p className="text-sm text-gray-500 mt-1">支持图片和视频文件</p>
            </div>
          </div>
        )}

        {filteredAssets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                {activeTab === 'unpublished' ? '暂无待发布素材' : '暂无已发布素材'}
              </p>
              <p className="text-sm text-gray-500 mt-1">拖拽文件到此处或点击上传按钮</p>
            </div>
          </div>
        ) : (
          /* Masonry-style Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset, index) => (
              <div
                key={asset.id}
                className={cn(
                  "group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer",
                  // Varying heights for masonry effect
                  index % 5 === 0 && "row-span-2",
                  index % 7 === 3 && "row-span-2"
                )}
                onClick={() => handleAssetClick(asset)}
              >
                <div className={cn(
                  "relative w-full",
                  (index % 5 === 0 || index % 7 === 3) ? "h-80" : "h-48"
                )}>
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm",
                        asset.type === 'video' 
                          ? "bg-purple-500/90 text-white" 
                          : "bg-white/90 text-gray-700"
                      )}
                    >
                      {asset.type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                      {asset.type === 'video' ? 'Video' : 'Image'}
                    </Badge>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full bg-white/95 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Preview action
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      预览
                    </Button>
                    {!asset.isPublished && (
                      <Button
                        size="sm"
                        className="rounded-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssetClick(asset);
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        发布
                      </Button>
                    )}
                  </div>

                  {/* Asset Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium truncate">{asset.name}</p>
                    {asset.isPublished && asset.publishedAt && (
                      <p className="text-white/70 text-xs mt-0.5">发布于 {asset.publishedAt}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Publishing Slide-over Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-md border-l-0 shadow-2xl p-0 bg-white">
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <SheetHeader className="p-6 pb-4 border-b border-gray-100">
              <SheetTitle className="text-left text-lg font-semibold">发布设置</SheetTitle>
            </SheetHeader>

            {/* Panel Content */}
            <ScrollArea className="flex-1 p-6">
              {selectedAsset && (
                <div className="space-y-6">
                  {/* Selected Asset Preview */}
                  <div className="relative rounded-2xl overflow-hidden">
                    <img
                      src={selectedAsset.thumbnail}
                      alt={selectedAsset.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white font-medium text-sm">{selectedAsset.name}</p>
                      <Badge 
                        className={cn(
                          "mt-1.5 text-[10px] px-2 py-0.5 rounded-full",
                          selectedAsset.type === 'video' 
                            ? "bg-purple-500 text-white" 
                            : "bg-white/90 text-gray-700"
                        )}
                      >
                        {selectedAsset.type === 'video' ? 'Video' : 'Image'}
                      </Badge>
                    </div>
                  </div>

                  {/* Account Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">发布到</Label>
                    <div className="space-y-2">
                      {onlineAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                            selectedAccounts.includes(account.id)
                              ? "border-primary bg-primary/5"
                              : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                          )}
                          onClick={() => toggleAccountSelection(account.id)}
                        >
                          <Checkbox
                            checked={selectedAccounts.includes(account.id)}
                            onCheckedChange={() => toggleAccountSelection(account.id)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            {getPlatformIcon(account.platform)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{account.accountName}</p>
                            <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                          </div>
                          {selectedAccounts.includes(account.id) && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      ))}
                      {onlineAccounts.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          请先在账号设置中绑定账号
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">发布文案</Label>
                    <Textarea
                      placeholder="写点什么来介绍这个内容..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="min-h-[120px] resize-none rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                    <p className="text-xs text-gray-400 text-right">{caption.length}/2200</p>
                  </div>

                  {/* Publish Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">发布时间</Label>
                    <RadioGroup
                      value={publishMode}
                      onValueChange={(v) => setPublishMode(v as 'immediate' | 'scheduled')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="immediate"
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                          publishMode === 'immediate'
                            ? "border-primary bg-primary/5"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <RadioGroupItem value="immediate" id="immediate" className="sr-only" />
                        <Send className="w-4 h-4" />
                        <span className="text-sm font-medium">立即发布</span>
                      </Label>
                      <Label
                        htmlFor="scheduled"
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                          publishMode === 'scheduled'
                            ? "border-primary bg-primary/5"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <RadioGroupItem value="scheduled" id="scheduled" className="sr-only" />
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">定时发布</span>
                      </Label>
                    </RadioGroup>

                    {publishMode === 'scheduled' && (
                      <div className="flex gap-3 mt-3 animate-fade-in">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start gap-2 rounded-xl h-11 border-gray-200">
                              <CalendarIcon className="w-4 h-4 text-gray-400" />
                              <span className={scheduledDate ? "text-gray-900" : "text-gray-400"}>
                                {scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : '选择日期'}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-center gap-2 px-3 border border-gray-200 rounded-xl">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <Input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="border-0 p-0 h-11 w-20 focus-visible:ring-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Panel Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50">
              <Button
                size="lg"
                className="w-full rounded-xl h-12 text-base font-medium shadow-sm"
                onClick={handlePublish}
                disabled={selectedAccounts.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                确认发布
              </Button>
              <p className="text-xs text-gray-400 text-center mt-3">
                将发布到 {selectedAccounts.length} 个账号
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
