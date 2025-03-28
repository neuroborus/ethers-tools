import { describe, expect, test } from 'vitest';
import { MulticallUnit } from '../../src';
import { CometContract, JSON_PROVIDER, RegistryContract } from '../stub.js';

// Instantiate contracts with a JSON RPC provider
export const registry = new RegistryContract(JSON_PROVIDER);
export const comet = new CometContract(JSON_PROVIDER);

describe('MulticallUnit E2E Tests', () => {
  let cachedOwner;
  let cachedList;

  test('executes multiple calls and retrieves results using tags', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER);

    const listCall = registry.getAddressesProvidersListCall();
    const listTag = unit.add(listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerTag = unit.add(ownerCall);

    const result = await unit.run();

    const list = unit.getSingle(listTag);
    const owner = unit.getSingle(ownerTag);

    cachedList = list;
    cachedOwner = owner;

    expect(list[0]).to.be.equal('0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e');
    expect(owner).to.be.equal('0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A');
    expect(result).to.be.true;
  });

  test('supports custom tags (object and array) when adding calls', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER);

    const tagTemplateObj = {
      protocol: 'aave',
      contract: 'registry',
      nonce: 0,
      limit: 1000n,
      call: '',
    };
    const tagTemplateArr = ['aave', 'registry', 0, 1000n];

    const listCall = registry.getAddressesProvidersListCall();
    const listTagKey = 'listCall';

    const listTagObj = { ...tagTemplateObj, call: listTagKey };
    const listTagArr = [...tagTemplateArr, listTagKey];

    unit.add(listCall, listTagObj);
    unit.add(listCall, listTagArr);

    const ownerCall = registry.getOwnerCall();
    const ownerTagKey = 'ownerCall';

    const ownerTagObj = { ...tagTemplateObj, call: ownerTagKey };
    const ownerTagArr = [...tagTemplateArr, ownerTagKey];

    unit.add(ownerCall, ownerTagObj);
    unit.add(ownerCall, ownerTagArr);

    const result = await unit.run();

    const listObjResult = unit.getSingle(listTagObj);
    const listArrResult = unit.getSingle(listTagArr);

    const ownerObjResult = unit.getSingle(ownerTagObj);
    const ownerArrResult = unit.getSingle(ownerTagArr);

    expect(result).to.be.true;
    expect(JSON.stringify(cachedList))
      .to.be.equal(JSON.stringify(listObjResult))
      .to.be.equal(JSON.stringify(listArrResult));
    expect(cachedOwner).to.be.equal(ownerObjResult).to.be.equal(ownerArrResult);
  });

  test('honors maxStaticCallsStack limit', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER, {
      maxStaticCallsStack: 3,
    });

    const listCall = registry.getAddressesProvidersListCall();
    const ownerCall = registry.getOwnerCall();

    const listTag1 = unit.add(listCall);
    const ownerTag1 = unit.add(ownerCall);
    const listTag2 = unit.add(listCall);
    const ownerTag2 = unit.add(ownerCall);

    const result = await unit.run();

    const list1 = unit.getSingle(listTag1);
    const owner1 = unit.getSingle(ownerTag1);
    const list2 = unit.getSingle(listTag2);
    const owner2 = unit.getSingle(ownerTag2);

    expect(list1[0]).to.be.equal(list2[0]);
    expect(owner1).to.be.equal(owner2);
    expect(result).to.be.true;
  });

  test('supports get, getArray, getSingle, and getAll interfaces', async () => {
    const unit = new MulticallUnit(JSON_PROVIDER);

    const [listTag, ownerTag, basicTag] = unit.addBatch([
      { call: registry.getAddressesProvidersListCall() },
      { call: registry.getOwnerCall() },
      { call: comet.getUserBasicCall() },
    ]);

    const result = await unit.run();

    const list = unit.get(listTag);
    const owner = unit.get(ownerTag);
    const basic = unit.get(basicTag);

    const [listAlt, ownerAlt, basicAlt] = unit.getAll();

    const listArray = unit.getArray(listTag);
    const listSingle = unit.getSingle(listTag);
    const basicArray = unit.getArray(basicTag);

    expect(listArray[0][0]).to.be.equal(listSingle[0]);
    expect(list[0]).to.be.equal(listAlt[0]);
    expect(owner).to.be.equal(ownerAlt);
    expect(basic['principal']).to.be.equal(basicAlt['principal']);
    expect(basicArray[0]).to.be.equal(basic['principal']);
    expect(result).to.be.true;
  });
});
