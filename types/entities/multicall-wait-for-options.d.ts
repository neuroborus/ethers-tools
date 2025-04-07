export interface MulticallWaitForOptions {
  timeoutMs?: number;
  deep?: boolean;
  signals?: AbortSignal[];
}
