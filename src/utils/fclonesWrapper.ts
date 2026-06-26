// FClones 封装器
// 用于调用系统安装的 FClones 命令（仅作为高级扫描备选引擎）

import { invoke } from '@tauri-apps/api/tauri';

export interface FClonesResult {
  groups: FClonesGroup[];
  totalFiles: number;
  totalDuplicates: number;
  totalSize: number;
}

export interface FClonesGroup {
  hash: string;
  files: string[];
  size: number;
}

/**
 * FClones 封装器类
 * 提供调用系统 FClones 命令的能力
 * 注意：FClones 是纯二进制内容扫描，不支持工程文件解析
 */
export class FClonesWrapper {
  private isAvailable: boolean = false;
  private version: string = '';

  /**
   * 检查 FClones 是否已安装
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // 使用 Tauri 命令检查 fclones 是否可用
      const result = await invoke<{ success: boolean; version: string }>('check_fclones');
      this.isAvailable = result.success;
      this.version = result.version;
      return this.isAvailable;
    } catch (error) {
      console.error('检查 FClones 可用性失败:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * 获取 FClones 版本信息
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * 执行 FClones 扫描
   * 注意：这是纯二进制内容扫描，不解析文件内容
   */
  async scanDirectory(
    path: string,
    options: FClonesScanOptions = {}
  ): Promise<FClonesResult> {
    if (!this.isAvailable) {
      throw new Error('FClones 未安装或不可用。请先安装 FClones：https://github.com/pkolaczk/fclones');
    }

    try {
      // 使用 Tauri 命令调用 fclones
      const result = await invoke<FClonesResult>('run_fclones', {
        path,
        options: {
          minSize: options.minSize || 0,
          maxSize: options.maxSize || Infinity,
          includeHidden: options.includeHidden || false,
        },
      });

      return result;
    } catch (error) {
      console.error('FClones 扫描失败:', error);
      throw new Error(`FClones 扫描失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 格式化 FClones 结果
   * 转换为与主去重引擎相同的格式
   */
  formatResults(result: FClonesResult): FormattedFClonesResult {
    const groups: FormattedFClonesGroup[] = result.groups.map((group, index) => ({
      groupId: `fclones_${index}`,
      hash: group.hash,
      files: group.files.map(path => ({
        path,
        name: path.split('/').pop() || path.split('\\').pop() || '',
        size: group.size,
      })),
      duplicateCount: group.files.length,
      savedSpace: group.size * (group.files.length - 1),
    }));

    return {
      groups,
      totalFiles: result.totalFiles,
      totalDuplicates: result.totalDuplicates,
      totalSize: result.totalSize,
      savedSpace: groups.reduce((sum, g) => sum + g.savedSpace, 0),
    };
  }

  /**
   * 获取 FClones 安装说明
   */
  getInstallationGuide(): string {
    return `
# FClones 安装指南

FClones 是一个高性能的重复文件查找工具，使用 Rust 编写。

## Windows 安装

### 方法 1：使用 Cargo（推荐）
\`\`\`bash
cargo install fclones
\`\`\`

### 方法 2：使用 Scoop
\`\`\`bash
scoop install fclones
\`\`\`

### 方法 3：手动下载
访问 https://github.com/pkolaczk/fclones/releases 下载预编译版本

## macOS 安装

\`\`\`bash
brew install fclones
\`\`\`

## Linux 安装

### Ubuntu/Debian
\`\`\`bash
sudo apt install fclones
\`\`\`

### Arch Linux
\`\`\`bash
pacman -S fclones
\`\`\`

## 验证安装

\`\`\`bash
fclones --version
\`\`\`

## 注意事项

- FClones 仅进行纯二进制内容比较，不解析文件内容
- 对于 Excel/PDF 等工程文件，建议使用主去重引擎（基于 hash-wasm）
- FClones 适合快速扫描大量文件，但可能无法识别元数据不同的相同内容文件
    `;
  }
}

export interface FClonesScanOptions {
  minSize?: number;
  maxSize?: number;
  includeHidden?: boolean;
}

export interface FormattedFClonesGroup {
  groupId: string;
  hash: string;
  files: Array<{
    path: string;
    name: string;
    size: number;
  }>;
  duplicateCount: number;
  savedSpace: number;
}

export interface FormattedFClonesResult {
  groups: FormattedFClonesGroup[];
  totalFiles: number;
  totalDuplicates: number;
  totalSize: number;
  savedSpace: number;
}

// 创建单例实例
export const fclonesWrapper = new FClonesWrapper();
