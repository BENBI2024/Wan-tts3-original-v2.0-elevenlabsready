import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, Eye, Heart, ShoppingCart, TrendingUp, Volume2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePendingAssets } from '@/contexts/PendingAssetsContext';
import { toast } from 'sonner';

interface TikTokReportProps {
  taskId?: string;
  onBack: () => void;
  onNavigateToReplication?: () => void;
}

// Mock data for the report - Realistic TikTok style content
const mockVideos = [
  {
    id: 'video-1',
    title: '这个控油粉饼真的绝了！12小时不脱妆实测',
    hashtags: '#控油神器 #油皮救星 #粉饼测评',
    strategy: '使用"实测对比"手法，通过12小时前后对比强化产品功效，配合素人出镜增强可信度。',
    views: 2340000,
    likes: 186000,
    sales: 12800,
    conversionRate: 5.47,
    sellingPointMatch: 92,
    duration: '0:28',
  },
  {
    id: 'video-2',
    title: 'POV: 你发现了最适合亚洲肤质的定妆喷雾',
    hashtags: '#定妆喷雾 #亚洲肤质 #美妆好物',
    strategy: '采用POV沉浸式叙事，让观众代入使用场景，结合"专属定制"概念提升产品独特性认知。',
    views: 1890000,
    likes: 142000,
    sales: 9600,
    conversionRate: 5.08,
    sellingPointMatch: 88,
    duration: '0:22',
  },
  {
    id: 'video-3',
    title: '闺蜜问我为什么约会前要偷偷补这个？',
    hashtags: '#约会妆容 #便携补妆 #女生秘密',
    strategy: '悬念式开头激发好奇心，利用"闺蜜种草"社交场景，暗示产品的便携性与约会必备属性。',
    views: 3120000,
    likes: 267000,
    sales: 18500,
    conversionRate: 5.93,
    sellingPointMatch: 95,
    duration: '0:18',
  },
  {
    id: 'video-4',
    title: '油痘肌7天挑战：每天只用这一个粉饼',
    hashtags: '#油痘肌 #7天挑战 #真实记录',
    strategy: '挑战类内容激发完播率，通过7天纪实形式展示产品持续使用效果，建立用户信任。',
    views: 4560000,
    likes: 389000,
    sales: 24300,
    conversionRate: 5.33,
    sellingPointMatch: 91,
    duration: '0:45',
  },
  {
    id: 'video-5',
    title: '化妆师不会告诉你的控油技巧（最后一个绝了）',
    hashtags: '#化妆技巧 #控油秘籍 #专业分享',
    strategy: '权威背书+悬念钩子，利用"专业人士不外传"心理，配合listicle形式提升完播。',
    views: 5230000,
    likes: 456000,
    sales: 31200,
    conversionRate: 5.97,
    sellingPointMatch: 89,
    duration: '0:38',
  },
  {
    id: 'video-6',
    title: '我的天！这个粉扑居然可以水洗100次',
    hashtags: '#环保美妆 #可持续 #省钱妙招',
    strategy: '惊叹式开头抓眼球，突出产品耐用性与环保卖点，迎合年轻用户环保消费趋势。',
    views: 1670000,
    likes: 134000,
    sales: 7800,
    conversionRate: 4.67,
    sellingPointMatch: 76,
    duration: '0:25',
  },
  {
    id: 'video-7',
    title: '韩国小姐姐教我的3秒定妆法，太香了',
    hashtags: '#韩系妆容 #定妆技巧 #快速化妆',
    strategy: '借势韩流文化背书，"3秒"数字化表达强调便捷性，满足快节奏生活用户需求。',
    views: 2890000,
    likes: 231000,
    sales: 15600,
    conversionRate: 5.40,
    sellingPointMatch: 87,
    duration: '0:19',
  },
  {
    id: 'video-8',
    title: '别再交智商税了！药店平替vs大牌测评',
    hashtags: '#平替测评 #省钱攻略 #理性消费',
    strategy: '对比测评引发争议讨论，"智商税"触发用户防坑心理，高互动性提升算法推荐。',
    views: 6780000,
    likes: 567000,
    sales: 42100,
    conversionRate: 6.21,
    sellingPointMatch: 83,
    duration: '0:52',
  },
  {
    id: 'video-9',
    title: '夏天通勤2小时，妆容居然还在？',
    hashtags: '#通勤妆容 #持妆测试 #夏日必备',
    strategy: '场景化痛点切入，通勤族共鸣感强烈，"居然"一词制造惊喜反转，提升种草效果。',
    views: 2120000,
    likes: 178000,
    sales: 11200,
    conversionRate: 5.28,
    sellingPointMatch: 94,
    duration: '0:31',
  },
  {
    id: 'video-10',
    title: '评论区选出的5款控油好物，第3个封神',
    hashtags: '#评论区种草 #控油好物 #粉丝推荐',
    strategy: 'UGC驱动内容策略，评论区互动反哺创作，"第3个封神"激发好奇心和完播率。',
    views: 3450000,
    likes: 289000,
    sales: 19800,
    conversionRate: 5.74,
    sellingPointMatch: 86,
    duration: '0:42',
  },
  {
    id: 'video-11',
    title: '妈妈说这个粉饼比她年轻时用的还好用',
    hashtags: '#母女同款 #跨代好物 #家庭分享',
    strategy: '跨代际情感连接，母女场景增强信任感，暗示产品适合各年龄段，扩大受众覆盖。',
    views: 1980000,
    likes: 167000,
    sales: 9200,
    conversionRate: 4.65,
    sellingPointMatch: 72,
    duration: '0:26',
  },
  {
    id: 'video-12',
    title: '直播间没抢到？教你官网隐藏折扣码',
    hashtags: '#省钱技巧 #折扣码 #薅羊毛',
    strategy: '稀缺性+实用价值双重驱动，利用"隐藏"制造独家感，收藏转发率极高。',
    views: 4120000,
    likes: 345000,
    sales: 28700,
    conversionRate: 6.97,
    sellingPointMatch: 68,
    duration: '0:35',
  },
  {
    id: 'video-13',
    title: '空瓶记：这个控油散粉我回购了8次',
    hashtags: '#空瓶记 #真实回购 #长期使用',
    strategy: '空瓶记形式强化真实性，"8次回购"数据佐证产品品质，长期主义建立深度信任。',
    views: 2670000,
    likes: 223000,
    sales: 14500,
    conversionRate: 5.43,
    sellingPointMatch: 90,
    duration: '0:33',
  },
  {
    id: 'video-14',
    title: '皮肤科医生看了都说好的成分表',
    hashtags: '#成分党 #专业认证 #安全护肤',
    strategy: '专业权威背书，成分党精准狙击，医生推荐降低用户决策顾虑，转化率显著。',
    views: 3890000,
    likes: 312000,
    sales: 21600,
    conversionRate: 5.55,
    sellingPointMatch: 85,
    duration: '0:29',
  },
  {
    id: 'video-15',
    title: '上班前vs下班后对比，老板以为我开了滤镜',
    hashtags: '#职场妆容 #持妆对比 #打工人',
    strategy: '职场场景共情，before/after对比直观有力，"老板误以为"幽默感增强记忆点。',
    views: 5670000,
    likes: 478000,
    sales: 35400,
    conversionRate: 6.24,
    sellingPointMatch: 93,
    duration: '0:24',
  },
  {
    id: 'video-16',
    title: '过敏肌放心入！我用了3个月的真实反馈',
    hashtags: '#敏感肌友好 #真实测评 #温和护肤',
    strategy: '敏感肌细分市场精准定位，3个月长期使用增强可信度，解决过敏用户核心顾虑。',
    views: 2340000,
    likes: 198000,
    sales: 13200,
    conversionRate: 5.64,
    sellingPointMatch: 81,
    duration: '0:37',
  },
  {
    id: 'video-17',
    title: '行李箱必带的3个mini好物，第一个最常用',
    hashtags: '#旅行必备 #便携好物 #出差攻略',
    strategy: '旅行场景切入突出便携性，mini形态满足出行需求，listicle形式提升内容消费体验。',
    views: 1890000,
    likes: 156000,
    sales: 8900,
    conversionRate: 4.71,
    sellingPointMatch: 88,
    duration: '0:27',
  },
  {
    id: 'video-18',
    title: '男朋友都夸的伪素颜妆，只需要这一步',
    hashtags: '#伪素颜 #自然妆容 #男友视角',
    strategy: '异性认可心理驱动，"只需一步"极简主义吸引化妆小白，伪素颜趋势精准卡位。',
    views: 4230000,
    likes: 356000,
    sales: 26800,
    conversionRate: 6.34,
    sellingPointMatch: 79,
    duration: '0:21',
  },
  {
    id: 'video-19',
    title: '被骂最惨的一期测评…但我说的都是实话',
    hashtags: '#真实测评 #争议内容 #客观分析',
    strategy: '争议性标题激发点击欲，"被骂"反向营销引发好奇，真实客观人设增强粉丝粘性。',
    views: 7890000,
    likes: 654000,
    sales: 48900,
    conversionRate: 6.20,
    sellingPointMatch: 77,
    duration: '0:58',
  },
  {
    id: 'video-20',
    title: '日本药妆店员工推荐的隐藏款，国内很少人知道',
    hashtags: '#日本药妆 #小众好物 #海淘攻略',
    strategy: '海外背书+稀缺性双重刺激，"员工推荐"内部人视角增强独家感，引发FOMO心理。',
    views: 3560000,
    likes: 298000,
    sales: 19200,
    conversionRate: 5.39,
    sellingPointMatch: 74,
    duration: '0:34',
  },
];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

interface VideoCardProps {
  video: typeof mockVideos[0];
  onReplicate: (video: typeof mockVideos[0]) => void;
}

function VideoCard({ video, onReplicate }: VideoCardProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
      {/* Video Player Placeholder */}
      <div className="relative aspect-[9/16] bg-black flex items-center justify-center group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        
        {/* Play button */}
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play className="w-8 h-8 text-white fill-white" />
        </div>
        
        {/* Duration */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white text-sm">
          <Play className="w-3 h-3" />
          <span>{video.duration}</span>
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
          <div className="h-full w-0 bg-white" />
        </div>
        
        {/* Volume icon */}
        <div className="absolute bottom-3 right-3">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        {/* Title and Like count */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
            {video.title}
          </h3>
          <Badge variant="outline" className="shrink-0 text-primary border-primary/30 bg-primary/5">
            {t('tiktokReport.likes')}: {formatNumber(video.likes)}
          </Badge>
        </div>
        
        {/* Hashtags and Strategy */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          <span className="text-primary">{t('tiktokReport.keywords')}: </span>
          {video.hashtags}. {t('tiktokReport.strategy')}: {video.strategy}
        </p>
        
        {/* Stats Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(video.views)}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <Heart className="w-3 h-3" />
            {formatNumber(video.likes)}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <ShoppingCart className="w-3 h-3" />
            {formatNumber(video.sales)}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <TrendingUp className="w-3 h-3" />
            {video.conversionRate.toFixed(1)}%
          </Badge>
        </div>
        
        {/* Selling Point Match Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('tiktokReport.sellingPointMatch')}</span>
            <span className="font-medium text-primary">{video.sellingPointMatch}%</span>
          </div>
          <Progress value={video.sellingPointMatch} className="h-1.5" />
        </div>
        
        {/* Replicate Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 mt-2 border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => onReplicate(video)}
        >
          <Copy className="w-3.5 h-3.5" />
          {t('tiktokReport.replicateVideo')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TikTokReport({ taskId, onBack, onNavigateToReplication }: TikTokReportProps) {
  const { t } = useTranslation();
  const { setPendingVideoReference } = usePendingAssets();
  
  // Mock task info
  const taskInfo = {
    category: '美妆',
    sellingPoints: '长效控油、便携式设计',
    createdAt: new Date(),
    videoCount: 20,
    avgViews: '125.6K',
    avgLikes: '45.2K',
    avgConversion: '2.8%',
  };

  const handleReplicate = (video: typeof mockVideos[0]) => {
    // Store the video reference in context
    setPendingVideoReference({
      id: video.id,
      title: video.title,
      hashtags: video.hashtags,
      strategy: video.strategy,
    });
    
    // Show toast notification
    toast.success(t('tiktokReport.replicateToast'));
    
    // Navigate to video replication
    if (onNavigateToReplication) {
      onNavigateToReplication();
    }
  };

  return (
    <div className="min-h-full bg-muted/30 p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('tiktokReport.title')}</h1>
            <p className="text-muted-foreground mt-0.5">
              {taskInfo.category} · {taskInfo.sellingPoints}
            </p>
          </div>
        </div>


        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockVideos.map((video) => (
            <VideoCard key={video.id} video={video} onReplicate={handleReplicate} />
          ))}
        </div>
      </div>
    </div>
  );
}
