// 哈希计算 Web Worker
// 在后台线程中执行哈希计算，避免阻塞 UI

import { createSHA256, createMD5 } from 'hash-wasm';

interface WorkerMessage {
  type: 'hash';
  id: string;
  file: ArrayBuffer;
  algorithm: 'sha256' | 'md5';
  chunkSize?: number;
}

interface WorkerResponse {
  type: 'result' | 'progress' | 'error';
  id: string;
  hash?: string;
  progress?: number;
  error?: string;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB

// 处理消息
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, id, file, algorithm, chunkSize = CHUNK_SIZE } = e.data;

  if (type === 'hash') {
    try {
      // 使用 hash-wasm 创建哈希器
      const hasher = algorithm === 'sha256' ? await createSHA256() : await createMD5();
      hasher.init();

      const data = new Uint8Array(file);
      const totalSize = data.length;
      let offset = 0;

      // 分片计算哈希
      while (offset < totalSize) {
        const end = Math.min(offset + chunkSize, totalSize);
        const chunk = data.slice(offset, end);
        hasher.update(chunk);
        offset = end;

        // 报告进度
        const progress = Math.min((offset / totalSize) * 100, 100);
        self.postMessage({
          type: 'progress',
          id,
          progress,
        } as WorkerResponse);
      }

      // 发送结果
      const hash = hasher.digest('hex');
      self.postMessage({
        type: 'result',
        id,
        hash,
      } as WorkerResponse);
    } catch (error) {
      // 发送错误
      self.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : '未知错误',
      } as WorkerResponse);
    }
  }
};
