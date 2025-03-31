export interface ContractAutoMethods {
  /**
   * Dynamically generated contract method calls.
   * E.g., `balanceOf(...)`, `name()`, etc.
   * OR
   * Dynamically generated call object getters.
   * E.g., `getBalanceOfCall`, `getNameCall`, etc.
   *
   * @param args - Arguments for the contract method + options/callData.
   * @returns ContractCall OR Promise of the method result.
   */
  [method: string]: <T = unknown>(...args: any[]) => T;
}
