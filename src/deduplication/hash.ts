// 文件哈希计算工具
// 使用 hash-wasm 库实现 SHA-256 和 MD5 哈希计算

import { createSHA256, createMD5 } from 'hash-wasm';

const CHUNK_SIZE = 1024 * 1024; // 1MB 分片大小

/**
 * 计算文件内容的 SHA-256 哈希值
 * 支持大文件分片计算，避免内存溢出
 */
export async function calculateSHA256(input: string | ArrayBuffer | File): Promise<string> {
  // 使用 hash-wasm 库创建 SHA-256 哈希器
  const hasher = await createSHA256();
  
  if (typeof input === 'string') {
    // 字符串输入：直接计算
    hasher.update(input);
  } else if (input instanceof File) {
    // 文件输入：分片读取并计算
    const fileSize = input.size;
    let offset = 0;

    while (offset < fileSize) {
      const chunk = await readFileChunk(input, offset, CHUNK_SIZE);
      const uint8 = new Uint8Array(chunk);
      hasher.update(uint8);
      offset += CHUNK_SIZE;
    }
  } else {
    // ArrayBuffer 输入
    const uint8 = new Uint8Array(input);
    hasher.update(uint8);
  }

  return hasher.digest('hex');
}

/**
 * 计算文件内容的 MD5 哈希值
 * 用于快速指纹比对
 */
export async function calculateMD5(input: string | ArrayBuffer): Promise<string> {
  // 使用 hash-wasm 库创建 MD5 哈希器
  const hasher = await createMD5();

  if (typeof input === 'string') {
    hasher.update(input);
  } else {
    const uint8 = new Uint8Array(input);
    hasher.update(uint8);
  }

  return hasher.digest('hex');
}

/**
 * 读取文件分片
 */
function readFileChunk(file: File, start: number, length: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const blob = file.slice(start, start + length);
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('读取文件失败'));
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 哈希缓存
 * 用于避免重复计算相同文件的哈希值
 */
export class HashCache {
  private cache = new Map<string, string>();
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, hash: string): void {
    if (this.cache.size >= this.maxSize) {
      // 删除最早的一半缓存
      const keysToDelete = Math.floor(this.maxSize / 2);
      const keys = Array.from(this.cache.keys()).slice(0, keysToDelete);
      keys.forEach(k => this.cache.delete(k));
    }
    this.cache.set(key, hash);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 【Sprint 4 新增】持久化哈希缓存类
 * 使用SQLite存储哈希值，避免重启后丢失
 */
export class PersistentHashCache {
  private memoryCache = new Map<string, string>();

  constructor(private maxMemorySize = 1000) {}

  /**
   * 生成缓存键：文件路径 + 修改时间 + 文件大小
   */
  private getCacheKey(filePath: string, modified: number, size: number): string {
    return `${filePath}|${modified}|${size}`;
  }

  /**
   * 从缓存获取哈希值（先内存，后数据库）
   */
  async get(filePath: string, modified: number, size: number): Promise<string | null> {
    const key = this.getCacheKey(filePath, modified, size);
    
    // 1. 先查内存缓存
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      return memCached;
    }

    // 2. 查询SQLite数据库
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        const { databaseService } = await import('../shared/database');
        await databaseService.initialize();
        
        const cached = await databaseService.getFileHash(filePath, modified, size);
        if (cached) {
          // 写入内存缓存
          this.memoryCache.set(key, cached);
          return cached;
        }
      }
    } catch (err) {
      console.warn('[PersistentHashCache] 数据库查询失败:', err);
    }

    return null;
  }

  /**
   * 存储哈希值（同时写入内存和数据库）
   */
  async set(filePath: string, modified: number, size: number, hash: string): Promise<void> {
    const key = this.getCacheKey(filePath, modified, size);
    
    // 1. 写入内存缓存
    if (this.memoryCache.size >= this.maxMemorySize) {
      // LRU淘汰：删除最早的一半
      const keysToDelete = Math.floor(this.maxMemorySize / 2);
      const keys = Array.from(this.memoryCache.keys()).slice(0, keysToDelete);
      keys.forEach(k => this.memoryCache.delete(k));
    }
    this.memoryCache.set(key, hash);

    // 2. 写入SQLite数据库
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
        const { databaseService } = await import('../shared/database');
        await databaseService.initialize();
        await databaseService.saveFileHash(filePath, modified, size, hash);
      }
    } catch (err) {
      console.warn('[PersistentHashCache] 数据库写入失败:', err);
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * 获取内存缓存大小
   */
  size(): number {
    return this.memoryCache.size;
  }
}

// 全局持久化缓存实例
export const globalHashCache = new PersistentHashCache(1000);

