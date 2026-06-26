// 实体抽取服务
// 调用 Tauri 后端的 extract_fields 命令进行信息抽取

import { invoke } from '@tauri-apps/api/tauri';

export interface ExtractionSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'percentage';
  description: string;
  required: boolean;
}

export interface ExtractionResult {
  file_path: string;
  fields: Record<string, unknown>;
  confidence: number;
  duration_ms: number;
}

/**
 * 实体抽取服务类
 */
class EntityExtractorService {
  /**
   * 从文档文本中抽取字段
   */
  async extractFields(filePath: string, content: string): Promise<ExtractionResult> {
    try {
      // 调用 Tauri 后端进行信息抽取
      const result = await invoke<ExtractionResult>('extract_fields', {
        filePath,
        text: content,
      });
      return result;
    } catch (error) {
      throw new Error(`字段抽取失败: ${error}`);
    }
  }

  /**
   * 检查后端 UI 服务是否可用
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const result = await invoke<{ status: string }>('check_uie_service');
      return result.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * 批量抽取
   */
  async batchExtract(
    files: { filePath: string; content: string }[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      try {
        const result = await this.extractFields(files[i].filePath, files[i].content);
        results.push(result);
      } catch (error) {
        console.warn(`抽取失败: ${files[i].filePath}`, error);
        results.push({
          file_path: files[i].filePath,
          fields: {},
          confidence: 0,
          duration_ms: 0,
        });
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }
}

export const entityExtractorService = new EntityExtractorService();
