// 文件解析服务
// 调用 Tauri 后端的 parse_file 命令进行文档解析

import {
  getManifest,
  parseFile,
  type ManifestFile,
  type FileManifest,
  type ParseResult,
} from '../api/tauriApi';

export type { ManifestFile, FileManifest, ParseResult } from '../api/tauriApi';

/**
 * 文件解析服务类
 */
class FileParserService {
  /**
   * 从指定目录加载文件清单
   */
  async loadManifest(folderPath: string): Promise<FileManifest> {
    return getManifest(folderPath);
  }

  /**
   * 解析单个文件
   */
  async parseDocument(filePath: string): Promise<ParseResult> {
    return parseFile(filePath);
  }

  /**
   * 批量解析文件
   */
  async batchParse(files: ManifestFile[], onProgress?: (current: number, total: number) => void): Promise<ParseResult[]> {
    const results: ParseResult[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      try {
        const result = await this.parseDocument(files[i].path);
        results.push(result);
      } catch (error) {
        console.warn(`解析失败: ${files[i].path}`, error);
        results.push({
          file_path: files[i].path,
          content: '',
          metadata: { error: String(error) },
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

export const fileParserService = new FileParserService();
