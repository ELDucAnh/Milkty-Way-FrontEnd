import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const read=p=>readFileSync(p,'utf8');
const imp=async s=>import('data:text/javascript;base64,'+Buffer.from(transformSync(s,{loader:'ts',format:'esm'}).code).toString('base64'));
const counters=read('src/utils/counters.ts');
const c=await imp(counters);
assert.equal(c.normalizeCounterId('POS01'),'Q1'); assert(c.sameCounter('POS02','Q2')); assert(!c.sameCounter(null,'Q1'));
const source=read('src/pages/shared/cash-shifts-store.ts');
const seed=source.slice(source.indexOf('export const initialShifts'),source.indexOf('function isCashAmount'));
const loader=source.slice(source.indexOf('function isCashAmount'),source.length);
let raw=null; globalThis.localStorage={getItem:()=>raw};
const m=await imp(counters+'\n'+read('src/pages/shared/cash-shift-rules.ts')+'\n'+seed+'\n'+loader);
assert.equal(m.loadCashShifts()[0].counterId,'Q1'); raw='[]'; assert.deepEqual(m.loadCashShifts(),[]);
for(const value of ['{','{}','[{}]']) {raw=value; assert.throws(()=>m.loadCashShifts());}
const saved=m.initialShifts.map(x=>({...x,counterId:'POS01'}));raw=JSON.stringify(saved);assert.equal(m.loadCashShifts()[0].counterId,'Q1');raw=JSON.stringify([saved[0],saved[0]]);assert.throws(()=>m.loadCashShifts());
const status=await imp(read('src/pages/shared/product-branch-status.ts'));
const product={status:'branch-locked',lockedStoreIds:['store01']};assert.equal(status.productStatusAtStore(product,'store01'),'branch-locked');assert.equal(status.productStatusAtStore(product,'store05'),'active');assert.equal(status.productStatusAtStore({...product,status:'inactive'},'store05'),'inactive');
console.log('0B: counter migration, empty/corrupt/duplicate shifts and branch product status passed.');
