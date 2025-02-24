import { describe, test, expect } from 'vitest';
import { MulticallUnit } from '../../src';
import { PROVIDER, RegistryContract } from '../stub.js';

export const registry = new RegistryContract();

describe('E2E Test MulticallUnit', () => {
  let prevOwner;
  let prevList;
  test('Test of MulticallUnit', async () => {
    const unit = new MulticallUnit(PROVIDER);
    const listCall = registry.getAddressesProvidersListCall();
    const listCallTag = 'listCall';
    unit.add(listCallTag, listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = 'ownerCall';
    unit.add(ownerCallTag, ownerCall);

    const result = await unit.run();

    const list = unit.getArray(listCallTag);
    const owner = unit.getSingle(ownerCallTag);

    prevOwner = owner;
    prevList = list;

    expect(list[0]).to.be.equal('0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e');
    expect(owner).to.be.eq('0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A');
    expect(result).to.be.true;
  });

  test('Test of MulticallTags', async () => {
    const unit = new MulticallUnit(PROVIDER);
    const recTagsTemplate = {
      protocol: 'aave',
      contract: 'registry',
      nonce: 0,
      limit: 1000n,
      call: '',
    };
    const arrTagsTemplate = ['aave', 'registry', 0, 1000n];

    const listCall = registry.getAddressesProvidersListCall();
    const listCallTag = 'listCall';
    const listCallRecTags = { ...recTagsTemplate, call: listCallTag };
    const listCallArrTags = [...arrTagsTemplate, listCallTag];
    unit.add(listCallRecTags, listCall);
    unit.add(listCallArrTags, listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = 'ownerCall';
    const ownerCallRecTags = { ...recTagsTemplate, call: ownerCallTag };
    const ownerCallArrTags = [...arrTagsTemplate, ownerCallTag];
    unit.add(ownerCallRecTags, ownerCall);
    unit.add(ownerCallArrTags, ownerCall);

    const result = await unit.run();

    const listRec = unit.getArray(listCallRecTags);
    const listArr = unit.getArray(listCallArrTags);

    const ownerRec = unit.getSingle(ownerCallRecTags);
    const ownerArr = unit.getSingle(ownerCallArrTags);

    expect(result).to.be.true;
    expect(JSON.stringify(prevList))
      .to.be.eq(JSON.stringify(listRec))
      .to.be.eq(JSON.stringify(listArr));
    expect(prevOwner).to.be.eq(ownerRec).to.be.eq(ownerArr);
  });
});
