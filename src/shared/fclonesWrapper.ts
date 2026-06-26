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
}

/**
 * 调用系统 FClones 进行快速扫描（可选）
 */
export async function scanWithFClones(directory: string): Promise<FClonesResult> {
  try {
    // 通过 Tauri 调用系统命令执行 fclones
    const result = await invoke<FClonesResult>('run_fclones', { directory });
    return result;
  } catch (error) {
    throw new Error(`FClones 扫描失败: ${error}`);
  }
}
