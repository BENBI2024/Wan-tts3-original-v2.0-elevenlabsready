/**
 * 数字人生成API服务
 * 连接Python后端
 */

// 后端API地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

// 任务状态枚举
export type TaskStatus = 
  | 'pending' 
  | 'uploading' 
  | 'generating_script' 
  | 'generating_image' 
  | 'generating_audio' 
  | 'generating_video' 
  | 'completed' 
  | 'failed';

// 语言枚举 - 包含方言和多种语言
export type Language = 'zh' | 'zh-shaanxi' | 'zh-sichuan' | 'en' | 'ja' | 'ko' | 'es' | 'id';

// 平台枚举
export type Platform = 'tiktok' | 'instagram';

// 素材上传响应
export interface MaterialUploadResponse {
  task_id: string;
  scene_images: string[];
  portrait_image: string | null;
  message: string;
}

// 脚本生成响应
export interface ScriptGenerationResponse {
  task_id: string;
  voice_text: string;
  person_prompt: string;
  action_text: string;
  message: string;
}

// 任务状态响应
export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  progress: number;
  current_step: string;
  result: {
    video_url?: string;
    audio_url?: string;
    model_image_url?: string;
  } | null;
  error: string | null;
}

// 数字人结果响应
export interface DigitalHumanResult {
  task_id: string;
  video_url: string | null;
  audio_url: string | null;
  model_image_url: string | null;
  status: TaskStatus;
  message: string;
}

/**
 * 数字人生成API服务类
 */
class DigitalHumanAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 步骤1: 上传素材
   * @param sceneImages 场景图片(最多2张)
   * @param portraitImage 人物照片(1张)
   * @param taskId 可选的任务ID
   */
  async uploadMaterials(
    sceneImages: File[],
    portraitImage?: File,
    taskId?: string
  ): Promise<MaterialUploadResponse> {
    const formData = new FormData();
    
    // 添加场景图片 (最多2张)
    sceneImages.slice(0, 2).forEach((file) => {
      formData.append('scene_images', file);
    });
    
    // 添加人物照片
    if (portraitImage) {
      formData.append('portrait_image', portraitImage);
    }
    
    // 添加任务ID
    if (taskId) {
      formData.append('task_id', taskId);
    }

    const response = await fetch(`${this.baseUrl}/api/digital-human/upload-materials`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '素材上传失败');
    }

    return response.json();
  }

  /**
   * 步骤2: 生成脚本
   * @param taskId 任务ID
   * @param productName 产品名称
   * @param sellingPoints 核心卖点
   * @param language 输出语言
   */
  async generateScript(
    taskId: string,
    productName: string,
    sellingPoints: string,
    language: Language = 'zh'
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
      const error = await response.json();
      throw new Error(error.detail || '脚本生成失败');
    }

    return response.json();
  }

  /**
   * 步骤3: 开始生成视频
   * @param taskId 任务ID
   * @param platform 目标平台
   */
  async startGeneration(
    taskId: string,
    platform: Platform = 'tiktok'
  ): Promise<{ task_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('platform', platform);

    const response = await fetch(`${this.baseUrl}/api/digital-human/start-generation`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '启动生成失败');
    }

    return response.json();
  }

  /**
   * 查询任务状态
   * @param taskId 任务ID
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/status/${taskId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '查询状态失败');
    }

    return response.json();
  }

  /**
   * 获取任务结果
   * @param taskId 任务ID
   */
  async getTaskResult(taskId: string): Promise<DigitalHumanResult> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/result/${taskId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '获取结果失败');
    }

    return response.json();
  }

  /**
   * 删除任务
   * @param taskId 任务ID
   */
  async deleteTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/digital-human/task/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '删除任务失败');
    }

    return response.json();
  }

  /**
   * 轮询任务状态直到完成或失败
   * @param taskId 任务ID
   * @param onProgress 进度回调
   * @param interval 轮询间隔(毫秒)
   * @param timeout 超时时间(毫秒)
   */
  async waitForCompletion(
    taskId: string,
    onProgress?: (status: TaskStatusResponse) => void,
    interval: number = 3000,
    timeout: number = 600000
  ): Promise<DigitalHumanResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
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

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('任务超时');
  }
}

// 导出单例
export const digitalHumanAPI = new DigitalHumanAPI();

// 也导出类，便于自定义配置
export default DigitalHumanAPI;
