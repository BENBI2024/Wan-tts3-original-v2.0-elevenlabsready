import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskCenter } from '@/contexts/TaskCenterContext';
import { useToast } from '@/hooks/use-toast';

interface TikTokInsightsProps {
  onNavigate: (itemId: string, taskId?: string) => void;
}

export function TikTokInsights({ onNavigate }: TikTokInsightsProps) {
  const { t } = useTranslation();
  const { addTask, setDrawerOpen } = useTaskCenter();
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerateReport = async () => {
    if (!category.trim() || !sellingPoints.trim()) return;

    setIsSubmitting(true);

    // Add task to global task center
    addTask({
      type: 'tiktok-insights',
      name: category.trim(),
      description: sellingPoints.trim(),
      resultRoute: 'tiktok-report',
    });

    // Clear inputs
    setCategory('');
    setSellingPoints('');
    setIsSubmitting(false);

    // Show toast notification
    toast({
      title: t('tiktokInsights.taskSubmitted'),
      description: t('tiktokInsights.taskSubmittedDesc'),
    });
  };

  return (
    <div className="min-h-full bg-muted/30 p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('tiktokInsights.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('tiktokInsights.subtitle')}</p>
        </div>

        {/* Create Task Section */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {t('tiktokInsights.createTask')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('tiktokInsights.categoryLabel')}
                </label>
                <Input
                  placeholder={t('tiktokInsights.categoryPlaceholder')}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('tiktokInsights.sellingPointsLabel')}
                </label>
                <Input
                  placeholder={t('tiktokInsights.sellingPointsPlaceholder')}
                  value={sellingPoints}
                  onChange={(e) => setSellingPoints(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerateReport}
                disabled={!category.trim() || !sellingPoints.trim() || isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('tiktokInsights.submitting')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('tiktokInsights.generateReport')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDrawerOpen(true)}
              >
                {t('taskCenter.title')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hint Section */}
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            💡 {t('tiktokInsights.taskSubmittedDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
