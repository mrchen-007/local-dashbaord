// 轮询 Hook
// 使用 setInterval 实现定时轮询，组件卸载时自动清理

import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions {
  interval: number;       // 轮询间隔（毫秒）
  callback: () => void | Promise<void>;  // 轮询回调
  enabled?: boolean;      // 是否启用（默认 true）
}

/**
 * 轮询 Hook
 * @param options - 轮询配置
 * @returns { start, stop, isPolling }
 *
 * 使用示例：
 * const { start, stop, isPolling } = usePolling({
 *   interval: 30000,
 *   callback: checkForUpdates,
 * });
 */
export function usePolling({ interval, callback, enabled = true }: UsePollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  const enabledRef = useRef(enabled);

  // 保持回调引用最新
  callbackRef.current = callback;
  enabledRef.current = enabled;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const start = useCallback(() => {
    clearTimer();

    if (!enabledRef.current) return;

    // 立即执行一次回调
    callbackRef.current();

    // 设置定时轮询
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);

    setIsPolling(true);
  }, [interval, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  // 组件挂载时启动，卸载时清理
  useEffect(() => {
    if (enabled) {
      start();
    }

    return () => {
      clearTimer();
    };
  }, [enabled, interval, start, clearTimer]);

  return { start, stop, isPolling };
}

/**
 * 【Sprint 6 新增】智能轮询Hook - 自动触发ETL
 * 检测到新文件时自动运行ETL聚合并刷新数据
 */
export function useSmartPolling(options: UsePollingOptions & { 
  onNewData?: () => Promise<void>;
  autoETL?: boolean;
}) {
  const { onNewData, autoETL = true, ...pollingOptions } = options;
  
  const enhancedCallback = useCallback(async () => {
    // 执行原始回调
    await pollingOptions.callback();
    
    // 如果检测到新数据且启用自动ETL
    if (autoETL && onNewData) {
      console.log('[SmartPolling] 检测到新数据，触发ETL聚合...');
      try {
        // 动态导入ETL模块
        const { aggregateToProjects } = await import('../shared/etl');
        await aggregateToProjects();
        console.log('[SmartPolling] ETL聚合完成');
        
        // 触发数据刷新回调
        await onNewData();
      } catch (err) {
        console.error('[SmartPolling] ETL聚合失败:', err);
      }
    }
  }, [pollingOptions.callback, autoETL, onNewData]);
  
  return usePolling({
    ...pollingOptions,
    callback: enhancedCallback,
  });
}
