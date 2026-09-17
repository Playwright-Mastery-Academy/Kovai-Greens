import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from './storefront';
import { dayKey } from './domain';
import { packCount, remainingStock } from '../../web/src/shopStock';
test('catalog excludes stock expiring before delivery and deducts committed stock', async () => {
 const tomorrow = dayKey(new Date(Date.now() + 86400000));
 const at = new Date(tomorrow + 'T16:00:00+05:30');
 const inventory = (id: string, bestBefore: Date | null, onHandGrams: number, reservedGrams = 0, packedGrams = 0) => ({ inventory: { id, bestBefore, onHandGrams, reservedGrams, packedGrams } });
 const db: any = { setting: { findMany: async () => [] }, product: { findMany: async () => [{ id:'basil', name:'Basil', variety:'Basil', formats:[{grams:100,pricePaise:10000}], harvests:[inventory('a',new Date(at.getTime()-1),500),inventory('b',at,200,50,50),inventory('c',null,75)] }] } };
 const result = await catalog(db);
 assert.deepEqual(result.products[0].stockByDate[tomorrow], [100,75]);
 assert.equal(result.products[0].availableGrams,175);
 assert.deepEqual(result.products[0].stockByDate[result.maxDate],[75]);
});
test('whole packs cannot be combined from small lot remainders', () => {
 assert.equal(packCount([60,60],100),0);
 assert.equal(remainingStock([60,60],[{productId:'basil',packGrams:100,quantity:1}]).valid,false);
 assert.equal(packCount([100,50],100),1);
});
test('mixed sizes reserve largest packs first regardless of cart insertion order', () => {
 const items=[{productId:'basil',packGrams:50,quantity:1},{productId:'basil',packGrams:100,quantity:1}];
 assert.equal(remainingStock([100,50],items).valid,true);
 assert.equal(remainingStock([100,50],items.toReversed()).valid,true);
 assert.equal(remainingStock([100,50],[...items,{productId:'basil',packGrams:25,quantity:1}]).valid,false);
});
