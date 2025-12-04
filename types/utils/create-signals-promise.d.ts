export declare const createSignalsPromise: (
  signals: AbortSignal[]
) => Promise<never> & { cleanup: () => void };
