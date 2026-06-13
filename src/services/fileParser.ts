// 文件解析服务
// 调用 Tauri 后端命令进行文档解析

import { invoke } from '@tauri-apps/api/tauri';

export interface ParseResult {
  success: boolean;
  content?: string;
  metadata?: {
    file_path: string;
    file_name: string;
    file_size: number;
    file_extension: string;
    page_count?: number;
  };
  page_count?: number;
  parse_duration_ms?: number;
  error?: string;
}

export interface FileManifest {
  scan_time: string;
  folder_path: string;
  files: ManifestFile[];
}

export interface ManifestFile {
  path: string;
  size_bytes: number;
  modified_time: string;
  hash: string;
}

/**
 * 文件解析服务类
 * 封装 Tauri 后端的文档解析功能
 */
export class FileParserService {
  /**
   * 读取文件清单
   * 从指定文件夹读取 file_manifest.json
   */
  async getManifest(folderPath: string): Promise<FileManifest> {
    try {
      // 使用 Tauri 命令读取清单
      const manifest = await invoke<FileManifest>('get_manifest', {
        folderPath,
      });
      return manifest;
    } catch (error) {
      throw new Error(`读取清单失败: ${error}`);
    }
  }

  /**
   * 解析单个文件
   * 调用 Python Kreuzberg 脚本提取文本内容
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    try {
      // 使用 Tauri 命令调用 Python 解析脚本
      const result = await invoke<ParseResult>('parse_file', {
        filePath,
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: `解析失败: ${error}`,
      };
    }
  }

  /**
   * 批量解析文件
   * 按顺序解析文件列表，支持进度回调
   */
  async parseFiles(
    files: ManifestFile[],
    onProgress?: (current: number, total: number, filePath: string) => void
  ): Promise<Map<string, ParseResult>> {
    const results = new Map<string, ParseResult>();
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      onProgress?.(i + 1, total, file.path);

      const result = await this.parseFile(file.path);
      results.set(file.path, result);
    }

    return results;
  }

  /**
   * 检查文件是否已解析（缓存检查）
   * 通过文件路径和修改时间判断
   */
  isFileCached(filePath: string, modifiedTime: string, cache: Map<string, { modifiedTime: string }>): boolean {
    const cached = cache.get(filePath);
    if (!cached) return false;
    return cached.modifiedTime === modifiedTime;
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return [
      '.pdf', '.docx', '.doc', '.odt', '.rtf', '.txt',
      '.xlsx', '.xls', '.csv', '.ods',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
      '.html', '.htm', '.xml', '.json', '.md',
    ];
  }

  /**
   * 检查文件格式是否支持
   */
  isFormatSupported(filePath: string): boolean {
    const ext = filePath.toLowerCase().split('.').pop();
    return this.getSupportedFormats().includes(`.${ext}`);
  }
}

// 创建单例实例
export const fileParserService = new FileParserService();
