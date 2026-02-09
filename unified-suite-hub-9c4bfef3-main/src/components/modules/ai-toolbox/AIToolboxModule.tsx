import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TextToImage } from './TextToImage';
import { AppPlaza } from './AppPlaza';
import { BrandHealth } from './BrandHealth';
import { VideoReplication } from './VideoReplication';
import { SocialMediaPublishing } from './SocialMediaPublishing';
import { TikTokInsights } from './TikTokInsights';
import { TikTokReport } from './TikTokReport';
import { DigitalHumanGeneration, CanvasTaskData } from './DigitalHumanGeneration';
import { VideoCanvas } from './VideoCanvas';

interface AIToolboxModuleProps {
  activeItem: string;
  onNavigate: (itemId: string) => void;
  externalReportTaskId?: string;
  externalCanvasTaskId?: string;
}

const PlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-20 animate-fade-in">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export function AIToolboxModule({ activeItem, onNavigate, externalReportTaskId, externalCanvasTaskId }: AIToolboxModuleProps) {
  const [reportTaskId, setReportTaskId] = useState<string | undefined>(externalReportTaskId);
  const [canvasTaskId, setCanvasTaskId] = useState<string | undefined>(externalCanvasTaskId);
  const [canvasTaskData, setCanvasTaskData] = useState<CanvasTaskData | undefined>();
  
  // Sync with external report task ID from task center
  useEffect(() => {
    if (externalReportTaskId) {
      setReportTaskId(externalReportTaskId);
    }
  }, [externalReportTaskId]);

  // Sync with external canvas task ID from task center
  useEffect(() => {
    if (externalCanvasTaskId) {
      setCanvasTaskId(externalCanvasTaskId);
    }
  }, [externalCanvasTaskId]);

  const handleTikTokNavigate = (itemId: string, taskId?: string) => {
    if (itemId === 'tiktok-report' && taskId) {
      setReportTaskId(taskId);
    }
    onNavigate(itemId);
  };

  const handleBackFromReport = () => {
    setReportTaskId(undefined);
    onNavigate('tiktok-insights');
  };

  const handleNavigateToReplication = () => {
    onNavigate('reference-to-video');
  };

  const handleEnterCanvas = (taskId: string, taskData: CanvasTaskData) => {
    setCanvasTaskId(taskId);
    setCanvasTaskData(taskData);
    onNavigate('video-canvas');
  };

  const handleBackFromCanvas = () => {
    setCanvasTaskId(undefined);
    setCanvasTaskData(undefined);
    onNavigate('digital-human');
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const renderContent = () => {
    switch (activeItem) {
      // Home
      case 'app-plaza':
        return <AppPlaza onNavigate={onNavigate} />;
      
      // Market Insights
      case 'brand-health':
        return <BrandHealth onNavigate={onNavigate} />;
      case 'tiktok-insights':
        return <TikTokInsights onNavigate={handleTikTokNavigate} />;
      case 'tiktok-report':
        return <TikTokReport taskId={reportTaskId} onBack={handleBackFromReport} onNavigateToReplication={handleNavigateToReplication} />;
      case 'trend-analysis':
        return <PlaceholderPage title="Trend Analysis" description="Analyze market trends and discover emerging opportunities." />;
      case 'competitor-monitor':
        return <PlaceholderPage title="Competitor Monitor" description="Track and monitor competitor activities and strategies." />;
      
      // Marketing Planning
      case 'campaign-planner':
        return <PlaceholderPage title="Campaign Planner" description="Plan and organize your marketing campaigns." />;
      case 'copywriting-assistant':
        return <PlaceholderPage title="Copywriting Assistant" description="AI-powered copywriting for your marketing materials." />;
      
      // Image Generation
      case 'text-to-image':
        return <TextToImage onNavigate={onNavigate} />;
      case 'ecommerce-assets':
        return <PlaceholderPage title="E-commerce Assets 电商素材图" description="Generate product images and e-commerce visual assets." />;
      case 'reference-to-image':
        return <PlaceholderPage title="Reference-to-Image 素材库对标生图" description="Generate images based on reference materials from your library." />;
      
      // Video Generation
      case 'text-to-video':
        return <PlaceholderPage title="Text-to-Video 文生视频" description="Generate videos from text descriptions." />;
      case 'reference-to-video':
        return <VideoReplication onNavigate={onNavigate} />;
      
      // Digital Human
      case 'digital-human':
        return <DigitalHumanGeneration onNavigate={onNavigate} onEnterCanvas={handleEnterCanvas} />;
      case 'video-canvas':
        return canvasTaskId && canvasTaskData ? (
          <VideoCanvas taskId={canvasTaskId} taskData={canvasTaskData} onBack={handleBackFromCanvas} />
        ) : (
          <DigitalHumanGeneration onNavigate={onNavigate} onEnterCanvas={handleEnterCanvas} />
        );
      
      // Social Media Publishing
      case 'social-media-publishing':
        return <SocialMediaPublishing />;
      
      default:
        return <AppPlaza onNavigate={onNavigate} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeItem}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full"
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  );
}