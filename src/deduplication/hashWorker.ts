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
      
      const totalSize = file.byteLength;
      let processedSize = 0;

      // 分片处理
      while (processedSize < totalSize) {
        const end = Math.min(processedSize + chunkSize, totalSize);
        const chunk = file.slice(processedSize, end);
        hasher.update(new Uint8Array(chunk));
        processedSize = end;

        // 发送进度
        const progress = Math.round((processedSize / totalSize) * 100);
        self.postMessage({
          type: 'progress',
          id,
          progress,
        } as WorkerResponse);
      }

      // 获取最终哈希值
      const hash = hasher.digest('hex');

      // 发送结果
      self.postMessage({
        type: 'result',
        id,
        hash,
      } as WorkerResponse);
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: `哈希计算失败: ${error}`,
      } as WorkerResponse);
    }
  }
};
