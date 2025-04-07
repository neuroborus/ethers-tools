export const MULTICALL_ERRORS = {
  SIMULTANEOUS_INVOCATIONS: new Error(
    'Multicall -> Another execution was triggered during processing.'
  ),
  RESULT_NOT_FOUND: new Error('Multicall result not found.'),
  RESPONSE_NOT_FOUND: new Error('Multicall response not found.'),
  RECEIPT_NOT_FOUND: new Error('Multicall receipt not received.'),
  MISSING_PROVIDER_INTERFACE: new Error(
    'MulticallProvider -> Missing contractInterface in customData.'
  ),
  MISSING_PROVIDER_CALL_DATA: new Error(
    'MulticallProvider -> Missing "to" or "data".'
  ),
};
