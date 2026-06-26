// 轮询 Hook
// 使用 setInterval 实现定时轮询，组件卸载时自动清理

import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions {
  interval: number;        // 轮询间隔（毫秒）
  callback: () => void | Promise<void>;  // 轮询回调
  enabled?: boolean;       // 是否启用（默认 true）
}

interface UsePollingReturn {
  start: () => void;
  stop: () => void;
  isPolling: boolean;
}

/**
 * 轮询 Hook
 * @param options.interval 轮询间隔（毫秒）
 * @param options.callback 每次轮询的回调函数
 * @param options.enabled 是否自动启动轮询
 */
export function usePolling({ interval, callback, enabled = true }: UsePollingOptions): UsePollingReturn {
  const [isPolling, setIsPolling] = useState(enabled);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  const enabledRef = useRef(enabled);

  // 保持回调引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 保持 enabled 引用最新
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsPolling(true);
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);
  }, [interval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // 自动管理轮询生命周期
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, start, stop]);

  return { start, stop, isPolling };
}
