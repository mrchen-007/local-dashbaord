/**
 * 通用格式化工具函数
 * 提供文件大小、时间戳、货币、百分比和日期的统一格式化
 */

/**
 * 格式化文件大小
 * 将字节数转换为人类可读的 B/KB/MB/GB 格式
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * 格式化 Unix 时间戳
 * 将秒级时间戳转换为中文本地化日期时间字符串
 * @param ts - Unix 时间戳（秒）
 * @returns 格式化后的日期时间字符串
 */
export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化货币金额
 * 将数值转换为以“万”为单位的字符串
 * @param amount - 金额数值
 * @returns 格式化后的货币字符串，例如 "500万"
 */
export function formatCurrency(amount: number): string {
  return `${(amount / 10000).toFixed(0)}万`;
}

/**
 * 格式化百分比
 * 将小数转换为百分比字符串，保留一位小数
 * @param rate - 比率小数（例如 0.15）
 * @returns 格式化后的百分比字符串，例如 "15.0%"
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * 格式化 ISO 日期字符串
 * 将 ISO 格式日期转换为中文本地化日期字符串
 * @param date - ISO 日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
