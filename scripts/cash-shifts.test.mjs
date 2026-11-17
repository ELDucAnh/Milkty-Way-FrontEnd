import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({stdin:{contents:`export * as auth from './src/utils/auth'; export * as shifts from './src/pages/shared/cash-shifts-store'; export * as workflow from './src/pages/shared/cash-shift-workflow'; export * as rules from './src/pages/shared/cash-shift-rules'; export * as sales from './src/pages/shared/sales-orders-store'; export * as demo from './src/pages/shared/business-demo';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {auth,shifts,workflow:w,rules,sales,demo}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
class Storage { map=new Map(); fail=false; getItem(k){return this.map.get(k)??null} setItem(k,v){if(this.fail)throw Error('write failed');this.map.set(k,String(v))} removeItem(k){this.map.delete(k)} clear(){this.map.clear();this.fail=false} }
globalThis.localStorage=new Storage();globalThis.sessionStorage=new Storage();
const manager={email:'ql.cn01@milktyway.vn',password:'123456'};
const login=(email='anh.lqt@milktyway.vn')=>{assert(auth.loginByEmail(email,'123456',false));return auth.currentStaff().staffId};
function reset(){localStorage.clear();sessionStorage.clear();localStorage.setItem(shifts.STORAGE_SHIFTS,'[]');localStorage.setItem(sales.STORAGE_ORDERS,'[]');return login()}
const sample={lotId:'lot',ingredientId:'i',ingredientName:'Trà',lotCode:'L1',unit:'g',theoretical:100,counted:98,recounted:null,reason:''};
assert.equal(rules.validateShiftInventory(sample).finalBand,'pass');
assert.equal(rules.validateShiftInventory({...sample,counted:95,reason:'Hao hụt'}).finalBand,'explain');
assert.throws(()=>rules.validateShiftInventory({...sample,counted:95}));
assert.throws(()=>rules.validateShiftInventory({...sample,counted:94,reason:'Hao hụt'}));
assert(rules.validateShiftInventory({...sample,counted:94,recounted:98,reason:'Đếm lại'}).recountRequired);
assert.equal(rules.validateShiftInventory({...sample,theoretical:0,counted:0}).variancePercent,0);
assert.throws(()=>rules.validateShiftInventory({...sample,theoretical:0,counted:1}));
assert.equal(rules.validateShiftInventory({...sample,theoretical:0,counted:1,recounted:1,reason:'Thừa'}).variancePercent,null);
for(const bad of [-1,NaN,Infinity])assert.throws(()=>rules.validateShiftInventory({...sample,counted:bad}));
const open=(actorStaffId,extra={})=>w.openApprovedCashShift({actorStaffId,branchId:'CN01',counterId:'Q1',openingCash:500000,...extra});
const latest=id=>shifts.loadCashShifts().find(s=>s.id===id);
const closeInput=(actorStaffId,snapshot,extra={})=>({actorStaffId,snapshot,countedCash:w.getShiftCashSummary(snapshot).expectedCash,recipientId:'NV-QL-CN01',note:'',handoverReason:'',inventoryReference:'',inventory:w.loadShiftInventoryManifest('CN01').map(l=>({...l,counted:l.theoretical,recounted:null,reason:''})),...extra});
const verifyInput=(actorStaffId,snapshot,extra={})=>({actorStaffId,snapshot,manager,confirmCash:true,confirmInventory:true,confirmRecount:false,...extra});
let actor=reset(), shift=open(actor);
assert.equal(shift.openedByStaffId,actor);assert.equal(shift.status,'open');
assert.throws(()=>open(actor));assert.throws(()=>open(actor,{counterId:'Q2'}));
const sameInput=closeInput(actor,shift);
const stockBefore=localStorage.getItem(demo.DEMO_STORAGE_KEY);
w.requestCashShiftClose(sameInput);let pending=latest(shift.id);
assert.equal(pending.status,'closing-requested');assert.equal(pending.closedAt,null);
assert.equal(pending.audit.handover.first.staffId,actor);
assert.throws(()=>w.requestCashShiftClose(sameInput));
assert.throws(()=>w.verifyCashShiftClose(verifyInput(actor,pending,{confirmCash:false})));
assert.throws(()=>w.verifyCashShiftClose(verifyInput(actor,pending,{manager:{...manager,password:'wrong'}})));
assert.throws(()=>w.verifyCashShiftClose(verifyInput(actor,pending,{manager:{email:'ha.tt@milktyway.vn',password:'123456'}})));
w.verifyCashShiftClose(verifyInput(actor,pending));let closed=latest(shift.id);
assert.equal(closed.status,'closed');assert.equal(closed.closedAt,closed.audit.handover.second.signedAt);
assert.notEqual(closed.audit.handover.first.staffId,closed.audit.handover.second.staffId);
assert.equal(auth.currentStaff().staffId,actor);assert.equal(localStorage.getItem(demo.DEMO_STORAGE_KEY),stockBefore);
assert.throws(()=>w.verifyCashShiftClose(verifyInput(actor,closed)));
// Render the same reconciliation link and destination as the React application.
const { createRequire } = await import('node:module');
const requireUi = createRequire(import.meta.url);
const React = requireUi('react');
const { renderToStaticMarkup } = requireUi('react-dom/server');
const { MemoryRouter } = requireUi('react-router-dom');
const ui = await build({
  stdin: {contents: `
    export {default as Inbox} from './src/pages/sales/CashShiftReconciliationInbox';
    export {default as Shifts} from './src/pages/sales/ShiftsPage';
    export {ToastContext as Toast} from './src/components/common/toast-context';
  `, resolveDir: process.cwd()},
  write:false, bundle:true, packages:'external', platform:'node', format:'cjs', jsx:'automatic',
});
const uiModule = {exports:{}};
new Function('module','exports','require',ui.outputFiles[0].text)(uiModule,uiModule.exports,requireUi);
const {Inbox, Shifts, Toast} = uiModule.exports;
const render = (component,url) => renderToStaticMarkup(React.createElement(MemoryRouter,
  {initialEntries:[url]}, React.createElement(Toast.Provider,{value:{}},React.createElement(component))));
login(manager.email);
const receiptUrl = render(Inbox,'/stores/shift-reconciliation').match(/href="([^"]*shiftId=[^"]+)"/)?.[1];
assert.equal(receiptUrl, '/sales/shifts?shiftId=' + shift.id);
assert(render(Shifts,receiptUrl).includes('ĐÃ CHỐT CA'));
login('ha.tt@milktyway.vn');
assert(!render(Inbox,'/stores/shift-reconciliation').includes(receiptUrl));
assert(render(Shifts,receiptUrl).includes('Không tìm thấy biên bản'));
// Different closer is an exception: needs a reason, handover note and manager authentication.
actor=reset();shift=open(actor);const other=login('pos.b.cn01@milktyway.vn');
assert.throws(()=>w.requestCashShiftClose(closeInput(other,shift)));
const changed=closeInput(other,shift,{handoverReason:'Điều chuyển ca theo phân công quản lý',note:'Bàn giao lúc 11:30, đã kiểm quỹ',handoverManager:manager});
assert.throws(()=>w.requestCashShiftClose({...changed,handoverManager:undefined}));
w.requestCashShiftClose(changed);assert(latest(shift.id).audit.handover.differentCloserApproval);
w.verifyCashShiftClose(verifyInput(other,latest(shift.id)));
// Owner/wrong branch/wrong counter cannot operate; managers may open another counter.
actor=reset();const owner=login('long.nh@milktyway.vn');assert.throws(()=>open(owner));
const cn05=login('ha.tt@milktyway.vn');assert.throws(()=>open(cn05));
actor=login();shift=open(actor);const mgr=login(manager.email);const q2=open(mgr,{counterId:'Q2'});assert.equal(q2.counterId,'Q2');
actor=login();assert.throws(()=>w.requestCashShiftClose(closeInput(actor,q2)));
// Cash is linked to exact shift/branch/counter. Unlinked history and card payments are excluded.
localStorage.setItem(sales.STORAGE_ORDERS,JSON.stringify([
 {...sales.INITIAL_ORDERS[1],id:'match',shiftId:shift.id,branchId:'CN01',counterId:'POS01',payment:'paid',paymentMethod:'cash',total:39000},
 {...sales.INITIAL_ORDERS[1],id:'legacy',branchId:'CN01',payment:'paid',paymentMethod:'cash',total:999999},
 {...sales.INITIAL_ORDERS[1],id:'card',shiftId:shift.id,branchId:'CN01',counterId:'Q1',payment:'paid',paymentMethod:'card',total:100000},
]));assert.deepEqual(w.getShiftCashSummary(shift),{cashSales:39000,expectedCash:539000});
// Cash >20k requires explicit second-party recount, even if all inventory counts match.
w.requestCashShiftClose(closeInput(actor,shift,{countedCash:560000,note:'Lệch két cần đồng kiểm'}));pending=latest(shift.id);
assert.throws(()=>w.verifyCashShiftClose(verifyInput(actor,pending)));
w.verifyCashShiftClose(verifyInput(actor,pending,{confirmRecount:true}));
// Same signer cannot countersign, including authenticated manager.
actor=reset();const m=login(manager.email);shift=open(m);
assert.throws(()=>w.requestCashShiftClose(closeInput(m,shift)));
const leadId = 'NV-POS-B-CN01';
w.requestCashShiftClose(closeInput(m,shift,{recipientId:leadId}));
w.verifyCashShiftClose(verifyInput(m,latest(shift.id),{manager:{email:'pos.b.cn01@milktyway.vn',password:'123456'}}));
assert.equal(latest(shift.id).audit.handover.second.staffId,leadId);
// Storage error, journal, stale inventory and legacy never silently succeed.
actor=reset();shift=open(actor);let input=closeInput(actor,shift);
localStorage.setItem(sales.CHECKOUT_PENDING_KEY,'pending');assert.throws(()=>w.requestCashShiftClose(input));localStorage.removeItem(sales.CHECKOUT_PENDING_KEY);
localStorage.fail=true;assert.throws(()=>w.requestCashShiftClose(input));localStorage.fail=false;assert.equal(latest(shift.id).status,'open');
const inventory=structuredClone(demo.INITIAL_DEMO_STATE);inventory.lots.find(l=>l.id===input.inventory[0].lotId).quantity+=1;localStorage.setItem(demo.DEMO_STORAGE_KEY,JSON.stringify(inventory));assert.throws(()=>w.requestCashShiftClose(input));
localStorage.removeItem(demo.DEMO_STORAGE_KEY);
const legacy={...shift,openedByStaffId:undefined,staffName:'Tên lịch sử'};localStorage.setItem(shifts.STORAGE_SHIFTS,JSON.stringify([legacy]));assert.throws(()=>w.requestCashShiftClose(closeInput(actor,legacy)));
w.confirmLegacyShiftOpener({actorStaffId:actor,snapshot:legacy,openerStaffId:actor,manager});assert.equal(latest(shift.id).staffName,'Tên lịch sử');assert(latest(shift.id).audit.legacyOpenerConfirmation);
localStorage.setItem(shifts.STORAGE_SHIFTS,'[]');assert.deepEqual(shifts.loadCashShifts(),[]);
localStorage.setItem(shifts.STORAGE_SHIFTS,'{bad');assert.throws(()=>shifts.loadCashShifts());assert.equal(localStorage.getItem(shifts.STORAGE_SHIFTS),'{bad');
console.log('PASS A3: original opener/closer rules, two signatures, counters, scope, cash, thresholds, legacy, stale snapshots and write failures');

