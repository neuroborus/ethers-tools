export declare const raceWithSignals: <T>(
  racer: () => Promise<T>,
  signals?: AbortSignal[]
) => Promise<T>;
