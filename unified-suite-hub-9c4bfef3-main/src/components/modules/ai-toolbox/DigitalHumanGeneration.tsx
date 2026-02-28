import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, Play, Sparkles, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskCenter } from '@/contexts/TaskCenterContext';
import { toast } from 'sonner';
import {
  digitalHumanAPI,
  type AudioSource,
  type DurationMode,
  type Language,
  type Platform,
  type ScriptMode,
  type TTSEngine,
} from '@/services/digitalHumanAPI';

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
  sceneImages?: string[];
  portraitImage?: string;
  backendTaskId?: string;
  finalAudioUrl?: string;
  audioDurationSec?: number;
  ttsEngineUsed?: TTSEngine;
  audioSource?: AudioSource;
}

interface ImageData {
  file: File;
  preview: string;
}

export function DigitalHumanGeneration({ onNavigate: _onNavigate, onEnterCanvas }: DigitalHumanGenerationProps) {
  const { t } = useTranslation();
  const { addTask } = useTaskCenter();

  const maxSceneImages = 2;
  const allowedImageTypes = new Set(['image/jpeg', 'image/png']);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sceneImages, setSceneImages] = useState<ImageData[]>([]);
  const [portraitImage, setPortraitImage] = useState<ImageData | null>(null);
  const [isSceneDragActive, setIsSceneDragActive] = useState(false);
  const [isPortraitDragActive, setIsPortraitDragActive] = useState(false);

  const [productName, setProductName] = useState('');
  const [language, setLanguage] = useState<Language>('zh');
  const [sellingPoints, setSellingPoints] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [scriptMode, setScriptMode] = useState<ScriptMode>('llm');
  const [platform, setPlatform] = useState<Platform>('tiktok');

  const [durationMode, setDurationMode] = useState<DurationMode>('follow_audio');
  const [fixedDurationSec, setFixedDurationSec] = useState<number>(12);

  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [ttsEngineUsed, setTtsEngineUsed] = useState<TTSEngine | null>(null);
  const [audioSource, setAudioSource] = useState<AudioSource>('auto');
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);

  const [uploadedSceneUrls, setUploadedSceneUrls] = useState<string[]>([]);
  const [uploadedPortraitUrl, setUploadedPortraitUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const sceneInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const referenceAudioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      sceneImages.forEach((image) => URL.revokeObjectURL(image.preview));
      if (portraitImage) URL.revokeObjectURL(portraitImage.preview);
    };
  }, [sceneImages, portraitImage]);

  const isAcceptedImage = (file: File) => {
    if (allowedImageTypes.has(file.type)) return true;
    const lowered = file.name.toLowerCase();
    return lowered.endsWith('.jpg') || lowered.endsWith('.jpeg') || lowered.endsWith('.png');
  };

  const normalizeImageFiles = (files: File[]) => {
    const valid = files.filter(isAcceptedImage);
    if (valid.length !== files.length) {
      toast.error('仅支持 JPG、PNG 格式');
    }
    return valid;
  };

  const setSceneFiles = (files: File[]) => {
    const valid = normalizeImageFiles(files);
    if (!valid.length) return;
    if (valid.length > maxSceneImages) {
      toast.error('场景图片最多上传2张');
    }
    const selected = valid.slice(0, maxSceneImages).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSceneImages(selected);
  };

  const setPortraitFile = (files: File[]) => {
    const valid = normalizeImageFiles(files);
    if (!valid.length) return;
    if (valid.length > 1) {
      toast.error('人物正面照仅支持1张');
    }
    const file = valid[0];
    setPortraitImage({ file, preview: URL.createObjectURL(file) });
  };

  const uploadMaterialsToBackend = async () => {
    setIsUploading(true);
    try {
      const response = await digitalHumanAPI.uploadMaterials(
        sceneImages.map((x) => x.file),
        portraitImage?.file,
        taskId || undefined,
      );
      setTaskId(response.task_id);
      setUploadedSceneUrls(response.scene_images);
      setUploadedPortraitUrl(response.portrait_image);
      toast.success('素材上传成功');
      return response.task_id;
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (scriptMode !== 'llm') {
      return;
    }
    if (!productName.trim() && !sellingPoints.trim()) {
      toast.error(t('digitalHuman.promptError'));
      return;
    }
    setIsGeneratingScript(true);
    try {
      let currentTaskId = taskId;
      if (!currentTaskId) currentTaskId = await uploadMaterialsToBackend();
      const res = await digitalHumanAPI.generateScript(currentTaskId!, productName, sellingPoints, language);
      setGeneratedPrompt(res.voice_text);
      toast.success(t('digitalHuman.promptGenerated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '脚本生成失败');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!taskId) return toast.error('请先生成脚本');
    if (!referenceAudio) return toast.error('请先上传参考音频');
    setIsGeneratingAudio(true);
    try {
      const res = await digitalHumanAPI.generateAudio({
        taskId,
        language,
        referenceAudio,
        voiceText: generatedPrompt,
      });
      setFinalAudioUrl(res.audio_url);
      setAudioDurationSec(res.audio_duration_sec);
      setTtsEngineUsed(res.tts_engine_used);
      setAudioSource('existing_generated');
      toast.success('音频生成成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '音频生成失败');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!taskId) return toast.error('请先完成前两步');
    if (!finalAudioUrl) return toast.error('请先生成音频后再开始生成');
    setIsStarting(true);
    try {
      await digitalHumanAPI.startGeneration(taskId, platform, {
        durationMode,
        fixedDurationSec: durationMode === 'fixed' ? fixedDurationSec : undefined,
      });
      const taskCenterId = addTask({
        type: 'digital-human',
        name: `${t('digitalHuman.taskPrefix')}: ${productName || t('digitalHuman.untitled')}`,
        description: generatedPrompt.slice(0, 100) + '...',
        resultRoute: 'video-canvas',
      });
      onEnterCanvas(taskCenterId, {
        productName,
        language,
        sellingPoints,
        generatedPrompt,
        platform,
        sceneImages: uploadedSceneUrls,
        portraitImage: uploadedPortraitUrl || undefined,
        backendTaskId: taskId,
        finalAudioUrl: finalAudioUrl || undefined,
        audioDurationSec: audioDurationSec || undefined,
        ttsEngineUsed: ttsEngineUsed || undefined,
        audioSource,
      });
      toast.success(t('digitalHuman.taskSubmitted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '启动失败');
    } finally {
      setIsStarting(false);
    }
  };

  const stepHeader = (
    <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {[
        { key: 1, label: '素材上传' },
        { key: 2, label: '脚本' },
        { key: 3, label: '音频与生成' },
      ].map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
              step === item.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
            }`}
          >
            {item.key}
          </span>
          <span className={step === item.key ? 'text-foreground font-medium' : undefined}>{item.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div className="p-6 h-full overflow-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold">{t('digitalHuman.title')}</h1>
      <p className="text-muted-foreground mt-1 mb-6">{t('digitalHuman.subtitle')}</p>
      {stepHeader}

      <Card>
        <CardContent className="p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-3">
                    <Label className="text-base">场景图片</Label>
                    <p className="text-sm text-muted-foreground mt-1">上传 1-2 张场景背景图</p>
                  </div>
                  <div
                    className={`group flex h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-6 transition-colors ${
                      isSceneDragActive ? 'border-primary/60 bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                    }`}
                    onClick={() => sceneInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        sceneInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSceneDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSceneDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSceneDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSceneDragActive(false);
                      const files = Array.from(e.dataTransfer.files || []);
                      setSceneFiles(files);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {sceneImages.length ? (
                      <div className={`grid h-full w-full gap-3 ${sceneImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {sceneImages.map((image, idx) => (
                          <div key={image.preview} className="flex h-full min-h-0 flex-col rounded-lg border bg-background/70 p-2">
                            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                              <img
                                src={image.preview}
                                alt={`场景图 ${idx + 1}`}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <p className="mt-2 truncate text-xs text-muted-foreground">{image.file.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">点击或拖拽上传</p>
                          <p className="text-xs text-muted-foreground">支持 JPG、PNG 格式，最多 2 张</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={sceneInputRef}
                    className="hidden"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSceneFiles(files);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
                <div>
                  <div className="mb-3">
                    <Label className="text-base">人物正面照</Label>
                    <p className="text-sm text-muted-foreground mt-1">上传 1 张清晰的人物正面照</p>
                  </div>
                  <div
                    className={`group flex h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-6 transition-colors ${
                      isPortraitDragActive ? 'border-primary/60 bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                    }`}
                    onClick={() => portraitInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        portraitInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPortraitDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPortraitDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPortraitDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPortraitDragActive(false);
                      const files = Array.from(e.dataTransfer.files || []);
                      setPortraitFile(files);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {portraitImage ? (
                      <div className="flex h-full w-full min-h-0 flex-col rounded-lg border bg-background/70 p-2">
                        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                          <img
                            src={portraitImage.preview}
                            alt="人物正面照"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <p className="mt-2 truncate text-xs text-muted-foreground">{portraitImage.file.name}</p>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">点击或拖拽上传</p>
                          <p className="text-xs text-muted-foreground">支持 JPG、PNG 格式，最多 1 张</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={portraitInputRef}
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setPortraitFile(files);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>{t('digitalHuman.scriptMode')}</Label>
                <Select value={scriptMode} onValueChange={(v) => setScriptMode(v as ScriptMode)}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llm">{t('digitalHuman.scriptModeLlm')}</SelectItem>
                    <SelectItem value="manual">{t('digitalHuman.scriptModeManual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('digitalHuman.language')}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">普通话</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scriptMode === 'llm' && (
                <>
                  <div>
                    <Label>{t('digitalHuman.productName')}</Label>
                    <Input className="mt-2" value={productName} onChange={(e) => setProductName(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('digitalHuman.sellingPoints')}</Label>
                    <Textarea className="mt-2 min-h-[100px]" value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} />
                  </div>
                  <Button onClick={handleGenerateScript} disabled={isGeneratingScript}>
                    {isGeneratingScript ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t('digitalHuman.generatePrompt')}
                  </Button>
                </>
              )}
              <div>
                <Label>{t('digitalHuman.generatedScript')}</Label>
                <Textarea
                  className="mt-2 min-h-[120px]"
                  placeholder={t('digitalHuman.generatedScriptPlaceholder')}
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('digitalHuman.imagePromptIndependentHint')}
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <Label>参考音频（必填）</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => referenceAudioInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> 选择参考音频
                  </Button>
                  {referenceAudio && <Badge>{referenceAudio.name}</Badge>}
                  {referenceAudio && (
                    <Button variant="ghost" onClick={() => setReferenceAudio(null)}>
                      清除
                    </Button>
                  )}
                </div>
                <input
                  ref={referenceAudioInputRef}
                  className="hidden"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setReferenceAudio(file || null);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  未上传参考音频将无法生成音频。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleGenerateAudio} disabled={isGeneratingAudio || !referenceAudio}>
                  {isGeneratingAudio && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 生成音频
                </Button>
              </div>

              {finalAudioUrl && (
                <div className="p-3 border rounded">
                  <audio controls src={finalAudioUrl} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-2">
                    时长: {audioDurationSec?.toFixed(2) || '-'} 秒，引擎: {ttsEngineUsed || '-'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>平台</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>时长策略</Label>
                  <Select value={durationMode} onValueChange={(v) => setDurationMode(v as DurationMode)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_audio">跟随MP3</SelectItem>
                      <SelectItem value="fixed">固定时长</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {durationMode === 'fixed' && (
                  <div className="md:col-span-2">
                    <Label>固定时长（秒）</Label>
                    <Input
                      className="mt-2"
                      type="number"
                      min={1}
                      step={1}
                      value={fixedDurationSec}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setFixedDurationSec(Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('digitalHuman.prevStep')}
            </Button>
            <Button
              onClick={async () => {
                if (step === 1) {
                  if (!portraitImage) return toast.error('请上传人物正面照');
                  if (!sceneImages.length) return toast.error('请至少上传1张场景图');
                  try {
                    await uploadMaterialsToBackend();
                    setStep(2);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : '上传失败');
                  }
                } else if (step === 2) {
                  if (!generatedPrompt.trim()) return toast.error('请先输入脚本');
                  setStep(3);
                } else if (step === 3) {
                  await handleStartGeneration();
                }
              }}
              disabled={
                (step !== 3 && isUploading) ||
                (step === 3 && (isStarting || isGeneratingAudio || !finalAudioUrl))
              }
            >
              {step === 1 && isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {step === 3 && isStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {step === 3 ? t('digitalHuman.startGeneration') : t('digitalHuman.nextStep')}
              {step === 3 ? <Play className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
