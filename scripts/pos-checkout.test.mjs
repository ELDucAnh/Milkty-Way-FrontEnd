import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundled = await build({ stdin: { contents: `export * as catalogue from './src/data/sales/products'; export * as auth from './src/utils/auth'; export * as sales from './src/pages/shared/sales-orders-store'; export * as pricing from './src/pages/shared/sales-pricing'; export * as shifts from './src/pages/shared/cash-shifts-store'; export * as drafts from './src/pages/shared/pos-drafts-store';`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm' });
const {catalogue,auth,sales,pricing,shifts,drafts} = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear()}};
globalThis.localStorage=storage(); globalThis.sessionStorage=storage();
function reset(){localStorage.clear();sessionStorage.clear();auth.loginByEmail('anh.lqt@milktyway.vn','123456',false)}
reset();
const context={staffId:auth.currentStaff().staffId,branchId:'CN01',counterId:'Q1',shiftId:'CA-001'};
const item={id:'line-1',productId:'TS01',name:'untrusted',size:'M',sugar:'50%',ice:'Vừa đá',toppings:[],note:'',quantity:1,unitPrice:39000};
const input={...context,checkoutId:'checkout-1',items:[item],paymentMethod:'cash',paidAmount:50000,discountRate:10,taxRate:10};
assert.deepEqual(pricing.calculatePosTotals([item],10,10),{subtotal:39000,discount:3900,tax:3510,total:38610});
for(const patch of [{quantity:0},{quantity:1.5},{unitPrice:1},{productId:'unknown'},{toppings:['unknown']},{quantity:NaN}]) assert.throws(()=>sales.createPosOrder({...input,items:[{...item,...patch}]}));
assert.throws(()=>sales.createPosOrder({...input,paidAmount:0}));assert.throws(()=>sales.createPosOrder({...input,discountRate:101}));assert.throws(()=>sales.createPosOrder({...input,items:[]}));
assert.equal(localStorage.getItem(sales.STORAGE_ORDERS),null);
const result=sales.createPosOrder(input);assert.equal(result.order.total,38610);assert.equal(result.order.items[0].productId,'TS01');assert.notEqual(result.order.items[0].name,'untrusted');assert.equal(result.order.shiftId,'CA-001');
const count=sales.loadOrders().length;assert.equal(sales.createPosOrder(input).order.id,result.order.id);assert.equal(sales.loadOrders().length,count);assert.throws(()=>sales.createPosOrder({...input,paidAmount:60000}));
result.order.items[0].toppings.push('changed');assert.equal(result.invoice.items[0].toppings.length,0);
reset(); localStorage.setItem(shifts.STORAGE_SHIFTS,JSON.stringify(shifts.initialShifts.map(s=>({...s,status:'closing-requested'}))));assert.throws(()=>sales.createPosOrder(input));
reset();assert.throws(()=>sales.createPosOrder({...input,shiftId:'new-shift'}));auth.loginByEmail('pos.cn02@milktyway.vn','123456',false);assert.throws(()=>sales.createPosOrder(input));
reset();localStorage.setItem(sales.STORAGE_ORDERS,'[]');assert.deepEqual(sales.loadOrders(),[]);localStorage.setItem(sales.STORAGE_ORDERS,'{');assert.throws(()=>sales.createPosOrder(input));assert.equal(localStorage.getItem(sales.STORAGE_ORDERS),'{');
reset();const set=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k===sales.STORAGE_INVOICES)throw Error('full');set(k,v)};assert.throws(()=>sales.createPosOrder(input));assert.equal(localStorage.getItem(sales.STORAGE_ORDERS),null);assert.equal(localStorage.getItem(sales.CHECKOUT_PENDING_KEY),null);localStorage.setItem=set;assert(sales.createPosOrder(input));
reset();const remove=localStorage.removeItem;localStorage.setItem=(k,v)=>{if(k===sales.STORAGE_INVOICES)throw Error('full');set(k,v)};localStorage.removeItem=k=>{if(k===sales.STORAGE_ORDERS)throw Error('blocked');remove(k)};assert.throws(()=>sales.createPosOrder(input));assert(localStorage.getItem(sales.CHECKOUT_PENDING_KEY));localStorage.setItem=set;localStorage.removeItem=remove;assert.throws(()=>sales.createPosOrder({...input,checkoutId:'different'}));
reset();const draft={...context,version:1,id:'draft-1',checkoutId:'draft-checkout',createdAt:new Date().toISOString(),items:[item],phone:'0900000000',memberName:'Customer',memberInfo:null,voucher:'GIAM10',discountInput:'10',taxInput:'10',paidInput:'50000',paymentMethod:'cash'};drafts.savePosDraft(draft);assert.equal(drafts.restorePosDraft(draft.id,context).phone,draft.phone);assert.throws(()=>drafts.restorePosDraft(draft.id,{...context,shiftId:'wrong'}));localStorage.setItem(drafts.POS_DRAFTS_KEY,'{');assert.throws(()=>drafts.savePosDraft(draft));assert.equal(localStorage.getItem(drafts.POS_DRAFTS_KEY),'{');
console.log('PASS: real pricing, checkout context, snapshots, retry, storage rollback/pending journal and drafts');

reset();
for (const flatDiscount of [2000,5000]) {
 const expected=pricing.calculatePosTotals([item],0,10,flatDiscount);
 const result=sales.createPosOrder({...input,checkoutId:`flat-${flatDiscount}`,discountRate:0,flatDiscount});
 assert.equal(result.order.total,expected.total);assert.equal(result.invoice.total,expected.total);
 assert.equal(result.order.items[0].sku,'TS01');assert.equal(result.order.items[0].posProductId,1);
}
assert.equal(pricing.calculatePosTotals([item],0,10,2000).total,40700);
assert.equal(pricing.calculatePosTotals([item],0,10,5000).total,37400);
assert.equal(pricing.calculatePosTotals([item],0,10,999999).total,0);
assert.throws(()=>pricing.calculatePosTotals([item],0,10,-1));
reset(); drafts.savePosDraft({...draft,flatDiscount:5000});assert.equal(drafts.restorePosDraft(draft.id,context).flatDiscount,5000);
localStorage.setItem(sales.CHECKOUT_PENDING_KEY,'unresolved');
assert.throws(()=>sales.assertPosCheckoutEditable(context));assert.throws(()=>drafts.savePosDraft(draft));assert.throws(()=>drafts.restorePosDraft(draft.id,context));
console.log('PASS: fixed discounts 2000/5000, independent SKU/ID snapshot, draft discount and unresolved-journal edit guards');

reset();const takeaway=sales.createPosOrder({...input,checkoutId:'takeaway',channel:'takeaway',orderNote:'  Bring bag  '});assert.equal(takeaway.order.channel,'takeaway');assert.equal(takeaway.order.orderNote,'Bring bag');
assert.throws(()=>sales.createPosOrder({...input,checkoutId:'invalid-channel',channel:'online'}));

assert.equal(catalogue.products.filter(p=>p.isHotSale).length,5);
for(const p of catalogue.products){assert(p.recipeItems.length>0);assert(p.prepSteps.length>=3);assert.equal(p.recipeSource,'mock')}
reset();const first=catalogue.products[0];first.lockedBranches=['CN01'];assert(!catalogue.isPosProductAvailable(first,'CN01'));assert(catalogue.isPosProductAvailable(first,'CN02'));assert.throws(()=>sales.createPosOrder(input));first.lockedBranches=[];
drafts.savePosDraft({...draft,channel:'takeaway',orderNote:'extra bag'});const restored=drafts.restorePosDraft(draft.id,context);assert.equal(restored.channel,'takeaway');assert.equal(restored.orderNote,'extra bag');
console.log('PASS A1: Hot Sale metadata, 12 mock recipes, branch locks enforced at checkout, takeaway/note and draft roundtrip');
