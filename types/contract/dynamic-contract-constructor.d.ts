import { DynamicContract } from './dynamic-contract';
import { DynamicContractConstructorArgs } from './dynamic-contract-constructor-args';

export type DynamicContractConstructor = new (
  args?: DynamicContractConstructorArgs
) => DynamicContract;
