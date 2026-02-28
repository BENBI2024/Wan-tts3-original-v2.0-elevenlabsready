/**
 * 数字人生成 API 服务
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export type TaskStatus =
  | 'pending'
  | 'uploading'
  | 'generating_script'
  | 'generating_image'
  | 'generating_audio'
  | 'audio_ready'
  | 'generating_video'
  | 'completed'
  | 'failed';

export type Language = 'zh' | 'en';
export type Platform = 'tiktok' | 'instagram';
export type TTSEngine = 'mega_tts3';
export type DurationMode = 'follow_audio' | 'fixed';
export type AudioSource = 'auto' | 'existing_generated';
export type ScriptMode = 'llm' | 'manual';

export interface MaterialUploadResponse {
  task_id: string;
  scene_images: string[];
  portrait_image: string | null;
  message: string;
}

export interface ScriptGenerationResponse {
  task_id: string;
  voice_text: string;
  person_prompt: string;
  action_text: string;
  message: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  progress: number;
  current_step: string;
  result: {
    video_url?: string;
    audio_url?: string;
    model_image_url?: string;
    final_audio_url?: string;
    audio_duration_sec?: number;
    tts_engine_used?: TTSEngine;
    audio_source?: AudioSource;
    video_provider?: string;
    aspect_ratio_applied?: string;
    runninghub_audio_task_id?: string;
    runninghub_video_task_id?: string;
  } | null;
  error: string | null;
  error_code?: string | null;
}

export interface DigitalHumanResult {
  task_id: string;
  video_url: string | null;
  audio_url: string | null;
  model_image_url: string | null;
  final_audio_url?: string | null;
  audio_duration_sec?: number | null;
  tts_engine_used?: TTSEngine | null;
  audio_source?: AudioSource | null;
  video_provider?: string | null;
  status: TaskStatus;
  message: string;
}

export interface AudioGenerationResponse {
  task_id: string;
  audio_url: string;
  audio_duration_sec: number;
  tts_engine_used: TTSEngine;
  fallback_used: boolean;
  message: string;
}

class DigitalHumanAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  private async parseError(response: Response, fallbackMessage: string): Promise<Error> {
    let detailMessage = fallbackMessage;
    try {
      const body = await response.json();
      const detail = body?.detail;
      if (typeof detail === 'string') {
        detailMessage = detail;
      } else if (detail && typeof detail === 'object') {
        const code = detail.code ? `[${detail.code}] ` : '';
        detailMessage = `${code}${detail.message || fallbackMessage}`;
      } else if (body?.message) {
        detailMessage = body.message;
      }
    } catch {
      // ignore parse failure and keep fallback message
    }
    return new Error(detailMessage);
  }

  async uploadMaterials(
    sceneImages: File[],
    portraitImage?: File,
    taskId?: string,
  ): Promise<MaterialUploadResponse> {
    const formData = new FormData();

    sceneImages.slice(0, 2).forEach((file) => {
      formData.append('scene_images', file);
    });

    if (portraitImage) {
      formData.append('portrait_image', portraitImage);
    }

    if (taskId) {
      formData.append('task_id', taskId);
    }

    const response = await fetch(`${this.baseUrl}/api/digital-human/upload-materials`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw await this.parseError(response, '素材上传失败');
    }

    return response.json();
  }

  async generateScript(
    taskId: string,
    productName: string = '',
    sellingPoints: string = '',
    language: Language = 'zh',
  ): Promise<ScriptGenerationResponse> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('product_name', productName);
    formData.append('core_selling_points', sellingPoints);
    formData.append('language', language);

    const response = await fetch(`${this.baseUrl}/api/digital-human/generate-script`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw await this.parseError(response, '脚本生成失败');
    }

    return response.json();
  }

  async generateAudio(params: {
    taskId: string;
    language?: Language;
    referenceAudio: File;
    voiceText?: string;
  }): Promise<AudioGenerationResponse> {
    const formData = new FormData();
    formData.append('task_id', params.taskId);
    if (params.language) {
      formData.append('language', params.language);
    }
    if (params.voiceText?.trim()) {
      formData.append('voice_text', params.voiceText.trim());
    }
    formData.append('reference_audio', params.referenceAudio);

    const response = await fetch(`${this.baseUrl}/api/digital-human/generate-audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw await this.parseError(response, '音频生成失败');
    }

    return response.json();
  }

  async startGeneration(
    taskId: string,
    platform: Platform = 'tiktok',
    options?: {
      durationMode?: DurationMode;
      fixedDurationSec?: number;
    },
  ): Promise<{ task_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('platform', platform);
    formData.append('duration_mode', options?.durationMode || 'follow_audio');
    if (options?.durationMode === 'fixed' && options.fixedDurationSec) {
      formData.append('fixed_duration_sec', String(options.fixedDurationSec));
    }

    const response = await fetch(`${this.baseUrl}/api/digital-human/start-generation`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw await this.parseError(response, '启动生成失败');
    }

    return response.json();
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/status/${taskId}`);

    if (!response.ok) {
      throw await this.parseError(response, '查询状态失败');
    }

    return response.json();
  }

  async getTaskResult(taskId: string): Promise<DigitalHumanResult> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/result/${taskId}`);

    if (!response.ok) {
      throw await this.parseError(response, '获取结果失败');
    }

    return response.json();
  }

  async deleteTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/task/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw await this.parseError(response, '删除任务失败');
    }

    return response.json();
  }

  async waitForCompletion(
    taskId: string,
    onProgress?: (status: TaskStatusResponse) => void,
    interval: number = 3000,
    timeout: number = 0,
  ): Promise<DigitalHumanResult> {
    const startTime = Date.now();

    while (timeout <= 0 || Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus(taskId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed') {
        return this.getTaskResult(taskId);
      }

      if (status.status === 'failed') {
        throw new Error(status.error || '任务失败');
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('任务超时');
  }
}

export const digitalHumanAPI = new DigitalHumanAPI();
export default DigitalHumanAPI;
