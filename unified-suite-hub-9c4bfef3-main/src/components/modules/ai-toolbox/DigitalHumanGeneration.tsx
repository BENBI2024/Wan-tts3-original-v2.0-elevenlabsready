import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Factory, User, Sparkles, Play, Instagram, ChevronRight, ChevronLeft, Check, X, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskCenter } from '@/contexts/TaskCenterContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { digitalHumanAPI, type Language, type Platform, type TaskStatusResponse } from '@/services/digitalHumanAPI';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface DigitalHumanGenerationProps {
  onNavigate: (itemId: string, taskId?: string) => void;
  onEnterCanvas: (taskId: string, taskData: CanvasTaskData) => void;
}

export interface CanvasTaskData {
  productName: string;
  language: string;
  sellingPoints: string;
  generatedPrompt: string;
  platform: 'tiktok' | 'instagram';
  sceneImages?: string[];  // 支持多张场景图片
  portraitImage?: string;
  backendTaskId?: string;  // 后端任务ID，用于状态轮询
}

// 图片数据类型
interface ImageData {
  file: File;
  preview: string;
}

export function DigitalHumanGeneration({ onNavigate, onEnterCanvas }: DigitalHumanGenerationProps) {
  const { t } = useTranslation();
  const { addTask, updateTask } = useTaskCenter();

  // Step state (1, 2, or 3)
  const [currentStep, setCurrentStep] = useState(1);

  // 任务ID
  const [taskId, setTaskId] = useState<string | null>(null);

  // 素材状态 - 支持2张场景图片和1张人物照片
  const [sceneImages, setSceneImages] = useState<ImageData[]>([]);
  const [portraitImage, setPortraitImage] = useState<ImageData | null>(null);

  // 表单状态
  const [productName, setProductName] = useState('');
  const [language, setLanguage] = useState<Language>('zh');
  const [sellingPoints, setSellingPoints] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [platform, setPlatform] = useState<Platform>('tiktok');

  // 语言选项配置
  const languageOptions = [
    { value: 'zh', label: '普通话' },
    { value: 'zh-shaanxi', label: '陕西话' },
    { value: 'zh-sichuan', label: '四川话' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'id', label: 'Bahasa Indonesia' },
  ];

  // 加载状态
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);

  // 上传的URL
  const [uploadedSceneUrls, setUploadedSceneUrls] = useState<string[]>([]);
  const [uploadedPortraitUrl, setUploadedPortraitUrl] = useState<string | null>(null);

  // 文件输入引用
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  // 处理场景图片上传
  const handleSceneImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageData[] = [];
    const remainingSlots = 2 - sceneImages.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      newImages.push({
        file,
        preview: URL.createObjectURL(file)
      });
    }

    setSceneImages(prev => [...prev, ...newImages]);

    if (files.length > remainingSlots) {
      toast.warning(t('digitalHuman.maxSceneImages') || '最多上传2张场景图片');
    }

    // 重置input
    if (sceneInputRef.current) {
      sceneInputRef.current.value = '';
    }
  };

  // 删除场景图片
  const removeSceneImage = (index: number) => {
    setSceneImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // 处理人物照片上传
  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清理之前的预览URL
    if (portraitImage) {
      URL.revokeObjectURL(portraitImage.preview);
    }

    setPortraitImage({
      file,
      preview: URL.createObjectURL(file)
    });

    // 重置input
    if (portraitInputRef.current) {
      portraitInputRef.current.value = '';
    }
  };

  // 删除人物照片
  const removePortraitImage = () => {
    if (portraitImage) {
      URL.revokeObjectURL(portraitImage.preview);
      setPortraitImage(null);
    }
  };

  // 上传素材到后端
  const uploadMaterialsToBackend = async () => {
    setIsUploading(true);

    try {
      const sceneFiles = sceneImages.map(img => img.file);
      const portraitFile = portraitImage?.file;

      const response = await digitalHumanAPI.uploadMaterials(
        sceneFiles,
        portraitFile,
        taskId || undefined
      );

      setTaskId(response.task_id);
      setUploadedSceneUrls(response.scene_images);
      setUploadedPortraitUrl(response.portrait_image);

      toast.success(t('digitalHuman.uploadSuccess') || '素材上传成功');
      return response.task_id;
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : '上传失败');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // 生成脚本
  const handleGeneratePrompt = async () => {
    if (!productName || !sellingPoints) {
      toast.error(t('digitalHuman.promptError'));
      return;
    }

    setIsGeneratingScript(true);

    try {
      // 确保素材已上传
      let currentTaskId = taskId;
      if (!currentTaskId) {
        currentTaskId = await uploadMaterialsToBackend();
      }

      // 调用后端生成脚本
      const response = await digitalHumanAPI.generateScript(
        currentTaskId!,
        productName,
        sellingPoints,
        language
      );

      setGeneratedPrompt(response.voice_text);
      toast.success(t('digitalHuman.promptGenerated'));
    } catch (error) {
      console.error('Script generation failed:', error);
      toast.error(error instanceof Error ? error.message : '脚本生成失败');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 开始生成
  const handleStartGeneration = async () => {
    if (!generatedPrompt) {
      toast.error(t('digitalHuman.noPromptError'));
      return;
    }

    if (!taskId) {
      toast.error('请先上传素材');
      return;
    }

    setIsStartingGeneration(true);

    try {
      // 调用后端开始生成
      await digitalHumanAPI.startGeneration(taskId, platform);

      // 创建任务中心任务
      const taskCenterId = addTask({
        type: 'digital-human',
        name: `${t('digitalHuman.taskPrefix')}: ${productName || t('digitalHuman.untitled')}`,
        description: generatedPrompt.slice(0, 100) + '...',
        resultRoute: 'video-canvas',
      });

      toast.success(t('digitalHuman.taskSubmitted'));

      // 跳转到画布模式
      onEnterCanvas(taskCenterId, {
        productName,
        language,
        sellingPoints,
        generatedPrompt,
        platform,
        sceneImages: uploadedSceneUrls,
        portraitImage: uploadedPortraitUrl || undefined,
        backendTaskId: taskId,  // 传递后端任务ID用于状态轮询
      });
    } catch (error) {
      console.error('Start generation failed:', error);
      toast.error(error instanceof Error ? error.message : '启动生成失败');
    } finally {
      setIsStartingGeneration(false);
    }
  };

  const canProceedToStep2 = sceneImages.length > 0 || portraitImage !== null;

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!canProceedToStep2) {
        toast.error(t('digitalHuman.uploadAtLeastOne'));
        return;
      }

      // 上传素材
      try {
        await uploadMaterialsToBackend();
        setCurrentStep(2);
      } catch (error) {
        // 错误已在uploadMaterialsToBackend中处理
      }
      return;
    }

    if (currentStep === 2) {
      toast.error(t('digitalHuman.generatePromptFirst'));
      return;
    }

    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const steps = [
    { num: 1, label: t('digitalHuman.materialUpload') },
    { num: 2, label: t('digitalHuman.scriptGeneration') },
  ];

  return (
    <motion.div
      className="p-6 h-full overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('digitalHuman.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('digitalHuman.subtitle')}</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {steps.map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-full transition-all cursor-pointer",
                  currentStep === step.num
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.num
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
                onClick={() => {
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                  currentStep > step.num ? "bg-primary text-primary-foreground" : "bg-background/50"
                )}>
                  {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
                </div>
                <span className="font-medium text-sm">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className={cn(
                  "w-5 h-5 mx-2",
                  currentStep > step.num ? "text-primary" : "text-muted-foreground/50"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Material Upload */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{t('digitalHuman.materialUpload')}</h3>
                      <p className="text-sm text-muted-foreground">{t('digitalHuman.uploadDescription')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Scene Upload - 支持2张 */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        {t('digitalHuman.sceneEnvironment')} <span className="text-xs">(最多2张)</span>
                      </Label>

                      {/* 已上传的场景图片 */}
                      {sceneImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {sceneImages.map((img, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={img.preview}
                                alt={`Scene ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <button
                                onClick={() => removeSceneImage(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <Badge className="absolute bottom-1 left-1 bg-primary text-[10px] px-1">
                                {index + 1}
                              </Badge>
                            </div>
                          ))}

                          {/* 添加按钮 */}
                          {sceneImages.length < 2 && (
                            <label className="cursor-pointer">
                              <div className={cn(
                                "h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors",
                                "hover:border-primary/50 hover:bg-muted/30 border-border"
                              )}>
                                <Plus className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground mt-1">添加</span>
                              </div>
                              <input
                                ref={sceneInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleSceneImageUpload}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {/* 空状态 - 直接显示上传按钮 */}
                      {sceneImages.length === 0 && (
                        <label className="cursor-pointer block">
                          <div className={cn(
                            "border-2 border-dashed rounded-xl p-8 transition-colors h-40 flex items-center justify-center",
                            "hover:border-primary/50 hover:bg-muted/30 border-border"
                          )}>
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <Factory className="w-12 h-12" />
                              <span className="text-sm text-center">{t('digitalHuman.uploadScene')}</span>
                              <span className="text-xs text-center opacity-60">支持上传1-2张图片</span>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleSceneImageUpload}
                          />
                        </label>
                      )}
                    </div>

                    {/* Portrait Upload - 1张 */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        {t('digitalHuman.portraitPhoto')} <span className="text-xs">(1张)</span>
                      </Label>

                      {portraitImage ? (
                        <div className="relative group">
                          <img
                            src={portraitImage.preview}
                            alt="Portrait"
                            className="w-full h-40 object-cover rounded-lg border-2 border-primary"
                          />
                          <button
                            onClick={removePortraitImage}
                            className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <Badge className="absolute top-2 left-2 bg-primary">{t('common.uploaded')}</Badge>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <div className={cn(
                            "border-2 border-dashed rounded-xl p-8 transition-colors h-40 flex items-center justify-center",
                            "hover:border-primary/50 hover:bg-muted/30 border-border"
                          )}>
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <User className="w-12 h-12" />
                              <span className="text-sm text-center">{t('digitalHuman.uploadPortrait')}</span>
                            </div>
                          </div>
                          <input
                            ref={portraitInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePortraitUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={handleNextStep}
                      size="lg"
                      disabled={!canProceedToStep2 || isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          {t('digitalHuman.nextStep')}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Script Generation */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{t('digitalHuman.scriptGeneration')}</h3>
                      <p className="text-sm text-muted-foreground">{t('digitalHuman.scriptDescription')}</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="productName">{t('digitalHuman.productName')}</Label>
                      <Input
                        id="productName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={t('digitalHuman.productNamePlaceholder')}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="language">{t('digitalHuman.language')}</Label>
                      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sellingPoints">{t('digitalHuman.sellingPoints')}</Label>
                      <Textarea
                        id="sellingPoints"
                        value={sellingPoints}
                        onChange={(e) => setSellingPoints(e.target.value)}
                        placeholder={t('digitalHuman.sellingPointsPlaceholder')}
                        className="mt-1.5 min-h-[120px]"
                      />
                    </div>

                    <Button
                      onClick={handleGeneratePrompt}
                      className="w-full"
                      disabled={isGeneratingScript || !productName || !sellingPoints}
                    >
                      {isGeneratingScript ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('digitalHuman.generatingPrompt')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {t('digitalHuman.generatePrompt')}
                        </>
                      )}
                    </Button>

                    {generatedPrompt && (
                      <div className="p-4 bg-muted/50 rounded-xl border border-border">
                        <Label className="text-xs text-muted-foreground">{t('digitalHuman.generatedScript')}</Label>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{generatedPrompt}</p>
                      </div>
                    )}

                    <div>
                      <Label>{t('digitalHuman.targetPlatform')}</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                          onClick={() => setPlatform('tiktok')}
                          className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                            platform === 'tiktok'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <TikTokIcon className="w-5 h-5" />
                          <span className="font-medium">TikTok</span>
                        </button>
                        <button
                          onClick={() => setPlatform('instagram')}
                          className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                            platform === 'instagram'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Instagram className="w-5 h-5" />
                          <span className="font-medium">Instagram</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-4">
                    <Button
                      onClick={handleStartGeneration}
                      size="lg"
                      className="w-full"
                      disabled={isStartingGeneration || !generatedPrompt}
                    >
                      {isStartingGeneration ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          启动中...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          {t('digitalHuman.startGeneration')}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handlePrevStep}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t('digitalHuman.prevStep')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
