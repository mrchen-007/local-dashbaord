/**
 * Concurrency utility for parallel task execution with a pool pattern.
 */

/**
 * Process an array of items in parallel with a configurable concurrency limit.
 *
 * @param items        Array of items to process
 * @param processor    Async function to process each item
 * @param concurrency  Max number of concurrent tasks (default: 5)
 * @param onProgress   Optional callback fired after each item completes
 * @returns            Per-item results in the same order as input.
 */
export type TaskResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<TaskResult<R>[]> {
  if (items.length === 0) {
    return [];
  }

  const total = items.length;
  const results: TaskResult<R>[] = new Array(total);
  let completed = 0;
  let nextIndex = 0;
  const effectiveConcurrency = Math.min(concurrency, total);

  async function worker(): Promise<void> {
    while (nextIndex < total) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = { ok: true, value: await processor(items[currentIndex]) };
      } catch (err) {
        console.warn(`并发处理失败 [index=${currentIndex}]:`, err);
        results[currentIndex] = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      completed++;
      onProgress?.(completed, total);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < effectiveConcurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}
