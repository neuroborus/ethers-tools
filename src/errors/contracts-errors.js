export const CONTRACTS_ERRORS = {
  NON_CALLABLE_CONTRACT_INVOCATION: new Error(
    'The contract was created as non-callable, but an attempt was made to call it!'
  ),
  READ_ONLY_CONTRACT_MUTATION: new Error(
    'The contract was created as read-only, but an attempt was made to call mutable method!'
  ),
  MISSING_CONTRACT_ADDRESS: new Error('A contract address was not provided!'),
  METHOD_NOT_DEFINED: (methodName) =>
    new Error(`Method "${methodName}" was not found on the contract!`),
  FRAGMENT_NOT_DEFINED: (methodName) =>
    new Error(
      `Fragment for method "${methodName}" was not found on the contract!`
    ),
};
