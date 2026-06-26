// 文件解析服务
// 调用 Tauri 后端的 parse_file 命令进行文档解析

import { invoke } from '@tauri-apps/api/tauri';

export interface ManifestFile {
  path: string;
  size_bytes: number;
  modified_time: string;
  hash: string;
}

export interface FileManifest {
  scan_time: string;
  folder_path: string;
  files: ManifestFile[];
}

export interface ParseResult {
  file_path: string;
  content: string;
  metadata: Record<string, unknown>;
  duration_ms: number;
}

/**
 * 文件解析服务类
 */
class FileParserService {
  /**
   * 从指定目录加载文件清单
   */
  async loadManifest(folderPath: string): Promise<FileManifest> {
    try {
      // 调用 Tauri 后端命令获取清单
      const manifest = await invoke<FileManifest>('get_manifest', { path: folderPath });
      return manifest;
    } catch (error) {
      throw new Error(`加载文件清单失败: ${error}`);
    }
  }

  /**
   * 解析单个文件
   */
  async parseDocument(filePath: string): Promise<ParseResult> {
    try {
      // 调用 Tauri 后端解析文件
      const result = await invoke<ParseResult>('parse_file', { path: filePath });
      return result;
    } catch (error) {
      throw new Error(`文件解析失败: ${error}`);
    }
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
