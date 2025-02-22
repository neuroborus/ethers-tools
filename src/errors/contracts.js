export const CONTRACTS_ERRORS = {
  TRY_TO_CALL_NON_CALLABLE: new Error(
      'The contract was created as non-callable, but an attempt was made to call it!'
  ),
  TRY_TO_CALL_READ_ONLY: new Error(
      'The contract was created as read-only, but an attempt was made to call it!'
  ),
  ADDRESS_IS_NOT_PROVIDED: new Error('A contract address was not provided!'),
  METHOD_NOT_FOUND: (methodName) =>
      new Error(`Method "${methodName}" was not found on the contract!`),
  FRAGMENT_NOT_FOUND: (methodName) =>
      new Error(`Fragment for method "${methodName}" was not found on the contract!`),
};
