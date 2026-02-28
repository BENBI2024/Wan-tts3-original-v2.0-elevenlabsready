import { useRef, useState } from 'react';
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sceneImages, setSceneImages] = useState<ImageData[]>([]);
  const [portraitImage, setPortraitImage] = useState<ImageData | null>(null);

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
    <div className="mb-4 flex gap-2 text-sm">
      <Badge variant={step === 1 ? 'default' : 'secondary'}>1 素材</Badge>
      <Badge variant={step === 2 ? 'default' : 'secondary'}>2 脚本</Badge>
      <Badge variant={step === 3 ? 'default' : 'secondary'}>3 音频与生成</Badge>
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
              <div>
                <Label>场景图片（最多2张）</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => sceneInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> 选择图片
                  </Button>
                  {sceneImages.map((x, idx) => <Badge key={idx}>{x.file.name}</Badge>)}
                </div>
                <input
                  ref={sceneInputRef}
                  className="hidden"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 2);
                    setSceneImages(files.map((file) => ({ file, preview: URL.createObjectURL(file) })));
                  }}
                />
              </div>
              <div>
                <Label>人物照片（1张）</Label>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={() => portraitInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> 选择照片
                  </Button>
                  {portraitImage && <Badge>{portraitImage.file.name}</Badge>}
                </div>
                <input
                  ref={portraitInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPortraitImage({ file, preview: URL.createObjectURL(file) });
                  }}
                />
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
                  if (!portraitImage) return toast.error('请上传老板正面照');
                  if (!sceneImages.length) return toast.error('请至少上传1张工厂场景图');
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
