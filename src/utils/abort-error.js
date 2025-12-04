export const abortError = (reason) =>
  new Error('Operation aborted' + (reason ? `: ${reason}` : ''));
