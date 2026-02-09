import { Card, CardContent } from '@/components/ui/card';
import { Eye, Copy, TrendingUp, Megaphone, UserCircle, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import images
import digitalHumanBanner from '@/assets/digital-human-banner.png';
import videoGenBanner from '@/assets/video-gen-banner.png';
import textToImageImg from '@/assets/text-to-image.png';
import ecommerceAssetsImg from '@/assets/ecommerce-assets.png';
import textToVideoImg from '@/assets/text-to-video.png';
import referenceToVideoImg from '@/assets/reference-to-video.png';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  views: number;
  copies: number;
  onClick: () => void;
}

const ToolCard = ({ title, description, icon, views, copies, onClick }: ToolCardProps) => {
  const { t } = useTranslation();
  
  return (
    <Card 
      className="bg-card hover:shadow-md transition-all duration-200 cursor-pointer border border-border/50 hover:border-border"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {views}
              </span>
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" />
                {copies}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface VisualCardProps {
  title: string;
  description: string;
  views: number;
  copies: number;
  image: string;
  onClick: () => void;
}

const VisualCard = ({ title, description, views, copies, image, onClick }: VisualCardProps) => (
  <Card 
    className="bg-card hover:shadow-md transition-all duration-200 cursor-pointer border border-border/50 hover:border-border overflow-hidden"
    onClick={onClick}
  >
    <div className="h-32 overflow-hidden">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
    <CardContent className="p-3">
      <h3 className="font-medium text-sm text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {views}
        </span>
        <span className="flex items-center gap-1">
          <Copy className="w-3 h-3" />
          {copies}
        </span>
      </div>
    </CardContent>
  </Card>
);

interface AppPlazaProps {
  onNavigate: (itemId: string) => void;
}

export function AppPlaza({ onNavigate }: AppPlazaProps) {
  const { t } = useTranslation();

  const marketInsightTools = [
    { id: 'brand-health', titleKey: 'appPlaza.tools.brandHealth.title', descKey: 'appPlaza.tools.brandHealth.description', icon: <TrendingUp className="w-5 h-5 text-muted-foreground" />, views: 561, copies: 141 },
  ];

  const marketingPlanTools = [
    { id: 'campaign-planner', titleKey: 'appPlaza.tools.campaignPlanner.title', descKey: 'appPlaza.tools.campaignPlanner.description', icon: <Megaphone className="w-5 h-5 text-muted-foreground" />, views: 423, copies: 87 },
  ];

  const imageGenTools = [
    { id: 'text-to-image', titleKey: 'appPlaza.tools.textToImage.title', descKey: 'appPlaza.tools.textToImage.description', image: textToImageImg, views: 1203, copies: 456 },
    { id: 'ecommerce-assets', titleKey: 'appPlaza.tools.ecommerceAssets.title', descKey: 'appPlaza.tools.ecommerceAssets.description', image: ecommerceAssetsImg, views: 876, copies: 321 },
    { id: 'reference-to-image', titleKey: 'appPlaza.tools.referenceToImage.title', descKey: 'appPlaza.tools.referenceToImage.description', image: referenceToVideoImg, views: 532, copies: 128 },
  ];

  const videoGenTools = [
    { id: 'text-to-video', titleKey: 'appPlaza.tools.textToVideo.title', descKey: 'appPlaza.tools.textToVideo.description', image: textToVideoImg, views: 654, copies: 189 },
    { id: 'reference-to-video', titleKey: 'appPlaza.tools.referenceToVideo.title', descKey: 'appPlaza.tools.referenceToVideo.description', image: referenceToVideoImg, views: 432, copies: 98 },
  ];

  const digitalHumanTools = [
    { id: 'digital-human', titleKey: 'appPlaza.tools.digitalHumanGen.title', descKey: 'appPlaza.tools.digitalHumanGen.description', icon: <UserCircle className="w-5 h-5 text-muted-foreground" />, views: 789, copies: 234 },
  ];

  return (
    <div className="min-h-full bg-muted/30 p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('appPlaza.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('appPlaza.subtitle')}</p>
        </div>

        {/* Hero Banner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Digital Human Banner */}
          <Card 
            className="overflow-hidden cursor-pointer group"
            onClick={() => onNavigate('digital-human')}
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={digitalHumanBanner} 
                alt="Digital Human" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-900/80 to-transparent" />
              <div className="relative z-10 h-full p-6 flex items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="w-6 h-6 text-white/80" />
                    <span className="text-white/80 text-sm">{t('appPlaza.digitalHuman.tag')}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">{t('appPlaza.digitalHuman.title')}</h2>
                  <p className="text-white/70 text-sm">{t('appPlaza.digitalHuman.subtitle')}</p>
                  <p className="text-white/60 text-xs mt-2 max-w-[200px]">{t('appPlaza.digitalHuman.description')}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Video Generation Banner */}
          <Card 
            className="overflow-hidden cursor-pointer group"
            onClick={() => onNavigate('text-to-video')}
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={videoGenBanner} 
                alt="Video Generation" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-transparent" />
              <div className="relative z-10 h-full p-6 flex items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-6 h-6 text-white/80" />
                    <span className="text-white/80 text-sm">{t('appPlaza.videoGen.tag')}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">{t('appPlaza.videoGen.title')}</h2>
                  <p className="text-white/70 text-sm">{t('appPlaza.videoGen.subtitle')}</p>
                  <p className="text-white/60 text-xs mt-2 max-w-[200px]">{t('appPlaza.videoGen.description')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 市场洞察 Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('appPlaza.sections.marketInsights')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketInsightTools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={t(tool.titleKey)}
                description={t(tool.descKey)}
                icon={tool.icon}
                views={tool.views}
                copies={tool.copies}
                onClick={() => onNavigate(tool.id)}
              />
            ))}
          </div>
        </div>

        {/* 营销策划 Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('appPlaza.sections.marketingPlanning')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketingPlanTools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={t(tool.titleKey)}
                description={t(tool.descKey)}
                icon={tool.icon}
                views={tool.views}
                copies={tool.copies}
                onClick={() => onNavigate(tool.id)}
              />
            ))}
          </div>
        </div>

        {/* 素材生成 Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('appPlaza.sections.materialGeneration')}</h2>
          
          {/* 图片生成 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('appPlaza.sections.imageGeneration')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {imageGenTools.map((tool) => (
                <VisualCard
                  key={tool.id}
                  title={t(tool.titleKey)}
                  description={t(tool.descKey)}
                  image={tool.image}
                  views={tool.views}
                  copies={tool.copies}
                  onClick={() => onNavigate(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* 视频生成 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('appPlaza.sections.videoGeneration')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoGenTools.map((tool) => (
                <VisualCard
                  key={tool.id}
                  title={t(tool.titleKey)}
                  description={t(tool.descKey)}
                  image={tool.image}
                  views={tool.views}
                  copies={tool.copies}
                  onClick={() => onNavigate(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* 数字人 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('appPlaza.sections.digitalHuman')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digitalHumanTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={t(tool.titleKey)}
                  description={t(tool.descKey)}
                  icon={tool.icon}
                  views={tool.views}
                  copies={tool.copies}
                  onClick={() => onNavigate(tool.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
