import { describe, expect, test } from 'vitest';
import { MulticallUnit } from '../../src';
import { JSON_PROVIDER, RegistryContract } from '../stub.js';

export const registry = new RegistryContract(JSON_PROVIDER);

describe('E2E Test MulticallUnit', () => {
  let prevOwner;
  let prevList;
  test('Test of MulticallUnit', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER);
    const listCall = registry.getAddressesProvidersListCall();
    const listCallTag = unit.add(listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = unit.add(ownerCall);

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
    const unit = new MulticallUnit(JSON_PROVIDER);
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
    unit.add(listCall, listCallRecTags);
    unit.add(listCall, listCallArrTags);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = 'ownerCall';
    const ownerCallRecTags = { ...recTagsTemplate, call: ownerCallTag };
    const ownerCallArrTags = [...arrTagsTemplate, ownerCallTag];
    unit.add(ownerCall, ownerCallRecTags);
    unit.add(ownerCall, ownerCallArrTags);

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

  test('Test of maxCallsStack', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER, {
      maxStaticCallsStack: 3,
    });
    const listCall = registry.getAddressesProvidersListCall();
    const ownerCall = registry.getOwnerCall();

    const listCallTag1 = unit.add(listCall);
    const ownerCallTag1 = unit.add(ownerCall);
    const listCallTag2 = unit.add(listCall);

    const ownerCallTag2 = unit.add(ownerCall);

    const result = await unit.run();

    const list1 = unit.getArray(listCallTag1);
    const owner1 = unit.getSingle(ownerCallTag1);
    const list2 = unit.getArray(listCallTag2);
    const owner2 = unit.getSingle(ownerCallTag2);

    expect(list1[0]).to.be.equal(list2[0]);
    expect(owner1).to.be.equal(owner2);
    expect(result).to.be.true;
  });

  test('get - array and all', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER);
    const listCall = registry.getAddressesProvidersListCall();
    const listCallTag = unit.add(listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = unit.add(ownerCall);

    const result = await unit.run();

    const list = unit.get(listCallTag);
    const owner = unit.get(ownerCallTag);
    const [list2, owner2] = unit.getAll();

    expect(list[0]).to.be.equal(list2[0]);
    expect(owner).to.be.eq(owner2);
    expect(result).to.be.true;
  });
});
