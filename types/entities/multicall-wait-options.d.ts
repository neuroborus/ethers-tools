export interface MulticallWaitOptions {
  timeoutMs?: number;
  deep?: boolean;
  signals?: AbortSignal[];
}
