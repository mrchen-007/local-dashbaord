// 环境检测工具

export function isTauri(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).__TAURI_IPC__ !== 'undefined';
}

export function getEnvironmentInfo(): string {
  if (isTauri()) {
    return 'Tauri 桌面环境';
  }
  return '浏览器环境 (部分功能不可用)';
}
