// 文件哈希计算工具
// 使用 hash-wasm 库实现 SHA-256 和 MD5 哈希计算

import { createSHA256, createMD5 } from 'hash-wasm';

const CHUNK_SIZE = 1024 * 1024; // 1MB 分片大小

/**
 * 计算文件内容的 SHA-256 哈希值
 * 支持大文件分片计算，避免内存溢出
 */
export async function calculateSHA256(
  file: File | ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 使用 hash-wasm 创建 SHA-256 实例
  const hasher = await createSHA256();
  hasher.init();

  if (file instanceof ArrayBuffer) {
    // 直接计算 ArrayBuffer
    const uint8Array = new Uint8Array(file);
    hasher.update(uint8Array);
    return hasher.digest('hex');
  }

  // 大文件分片计算
  const totalSize = file.size;
  let offset = 0;

  while (offset < totalSize) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    hasher.update(uint8Array);

    offset += CHUNK_SIZE;

    // 报告进度
    if (onProgress) {
      const progress = Math.min((offset / totalSize) * 100, 100);
      onProgress(progress);
    }
  }

  return hasher.digest('hex');
}

/**
 * 计算文件内容的 MD5 哈希值
 * 支持大文件分片计算
 */
export async function calculateMD5(
  file: File | ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 使用 hash-wasm 创建 MD5 实例
  const hasher = await createMD5();
  hasher.init();

  if (file instanceof ArrayBuffer) {
    const uint8Array = new Uint8Array(file);
    hasher.update(uint8Array);
    return hasher.digest('hex');
  }

  const totalSize = file.size;
  let offset = 0;

  while (offset < totalSize) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    hasher.update(uint8Array);

    offset += CHUNK_SIZE;

    if (onProgress) {
      const progress = Math.min((offset / totalSize) * 100, 100);
      onProgress(progress);
    }
  }

  return hasher.digest('hex');
}

/**
 * 计算文本内容的 SHA-256 哈希值
 */
export async function hashTextContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  // 使用 hash-wasm 计算文本哈希
  const hasher = await createSHA256();
  hasher.init();
  hasher.update(data);
  return hasher.digest('hex');
}

/**
 * 计算 ArrayBuffer 的 SHA-256 哈希值
 */
export async function hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  // 使用 hash-wasm 计算 ArrayBuffer 哈希
  const hasher = await createSHA256();
  hasher.init();
  hasher.update(uint8Array);
  return hasher.digest('hex');
}

/**
 * 批量计算文件哈希
 * 支持并发控制和进度回调
 */
export async function batchCalculateHashes(
  files: File[],
  concurrency: number = 4,
  onProgress?: (fileIndex: number, fileProgress: number, overallProgress: number) => void
): Promise<Map<string, string>> {
  const hashMap = new Map<string, string>();
  const totalFiles = files.length;
  let processedFiles = 0;

  // 分批处理文件
  for (let i = 0; i < totalFiles; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const promises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;
      const hash = await calculateSHA256(file, (fileProgress) => {
        if (onProgress) {
          const overallProgress = ((processedFiles + fileProgress / 100) / totalFiles) * 100;
          onProgress(fileIndex, fileProgress, overallProgress);
        }
      });

      hashMap.set(file.name, hash);
      processedFiles++;

      if (onProgress) {
        const overallProgress = (processedFiles / totalFiles) * 100;
        onProgress(fileIndex, 100, overallProgress);
      }
    });

    await Promise.all(promises);
  }

  return hashMap;
}

/**
 * 断点续算支持
 * 记录已计算的哈希，避免重复计算
 */
export class HashCache {
  private cache: Map<string, { hash: string; timestamp: number }>;
  private ttl: number; // 缓存过期时间（毫秒）

  constructor(ttl: number = 24 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * 获取缓存的哈希值
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.hash;
  }

  /**
   * 设置哈希缓存
   */
  set(key: string, hash: string): void {
    this.cache.set(key, {
      hash,
      timestamp: Date.now(),
    });
  }

  /**
   * 检查是否存在缓存
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 导出缓存数据
   */
  export(): Record<string, { hash: string; timestamp: number }> {
    const result: Record<string, { hash: string; timestamp: number }> = {};
    for (const [key, value] of this.cache.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * 导入缓存数据
   */
  import(data: Record<string, { hash: string; timestamp: number }>): void {
    for (const [key, value] of Object.entries(data)) {
      this.cache.set(key, value);
    }
  }
}
