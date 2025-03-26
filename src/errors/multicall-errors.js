export const MULTICALL_ERRORS = {
  SIMULTANEOUS_INVOCATIONS: new Error(
    'Another execution was triggered during processing.'
  ),
  RESULT_NOT_FOUND: new Error(
    'Multicall result not found.'
  )
};
