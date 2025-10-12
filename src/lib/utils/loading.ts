import { isLoading } from '$lib/stores/loading';

export async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
  isLoading.set(true);
  try {
    return await fn();
  } finally {
    isLoading.set(false);
  }
}