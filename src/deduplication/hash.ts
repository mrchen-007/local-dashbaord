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
