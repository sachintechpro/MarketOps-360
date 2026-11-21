/* Dependency-free static build gate for MarketOps 360. Run: npm run build */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const jsFiles=['app.js','enhancements.js','experiences.js','uat-bench.js','communications.js'];
const cssFiles=['styles.css','uat-bench.css','communications.css'];
const html=read('index.html');
for(const file of jsFiles.concat(cssFiles))assert.ok(fs.existsSync(path.join(root,file)),'Missing static asset: '+file);
for(const file of jsFiles){
 assert.ok(html.includes(file),'index.html does not load '+file);
 new vm.Script(read(file),{filename:file});
}
for(let i=1;i<jsFiles.length;i++)assert.ok(html.indexOf(jsFiles[i])>html.indexOf(jsFiles[i-1]),'Incorrect script order: '+jsFiles[i]);
for(const file of cssFiles)assert.ok(html.includes(file),'index.html does not load stylesheet '+file);
const scripts=jsFiles.map(read).join('\n');
const listeners=[],session={},view={innerHTML:''};
let form=null,inputs={};
const stub=()=>({textContent:'',setAttribute(){},remove(){},addEventListener(){},click(){},querySelector:stub,querySelectorAll:()=>[],classList:{toggle(){},remove(){}}});
const document={
 querySelector:q=>q==='#app'?view:null,
 querySelectorAll:()=>[],
 addEventListener:(name,listener)=>listeners.push({name,listener}),
 createElement:()=>{
  form={onsubmit:null,reportValidity:()=>true};
  return {className:'',innerHTML:'',style:{},remove(){},click(){},setAttribute(){},
   querySelector:q=>q==='form'?form:stub(),querySelectorAll:()=>[]};
 },
 body:{appendChild(){}}
};
class MockFormData{*[Symbol.iterator](){yield* Object.entries(inputs);}}
const sessionStorage={getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v;},removeItem:k=>delete session[k]};
const data=new Function('document','window','sessionStorage','location','FormData',
 scripts+'\nreturn {S,roles,groups,renderers,shop,myOrders,render,qa:window.MarketOpsUAT,comms:window.MarketOpsComms,workflows:window.marketOpsWorkflows};')
 (document,{},sessionStorage,{reload(){}},MockFormData);
const {S,roles,groups,renderers,qa}=data;
assert.equal(roles.length,15,'15 demo roles must exist');
assert.ok(qa,'UAT suite must be exposed');
assert.equal(qa.cases.length,18,'Expected 18 UAT cases');
assert.equal(new Set(qa.cases.map(c=>c.id)).size,18,'UAT case IDs must be unique');
for(let n=1;n<=18;n++)assert.ok(qa.cases.find(c=>c.id==='UAT-'+String(n).padStart(3,'0')),'Missing UAT case '+n);
for(const [severity,count] of [['Critical',2],['High',9],['Medium',7]])
 assert.equal(qa.cases.filter(c=>c.severity===severity).length,count,'Incorrect severity totals');
for(const c of qa.cases){
 for(const key of ['role','area','title','pre','expected','observed'])
  assert.ok(c[key],'Missing '+key+' on '+c.id);
 assert.ok(c.steps.length>=2,c.id+' needs reproducible steps');
 const r=qa.getReview(c.id);
 assert.equal(r.state,'Open','Historical defects must default to open');
 assert.equal(r.outcome,'Not retested','No test may be marked passed without retest evidence');
}
const nav=groups.flatMap(g=>g[1]).find(x=>x[0]==='scenario-lab');
assert.ok(nav&&nav[2]==='QA & UAT Bench','QA navigation label missing');
assert.ok(nav[3].includes('Quality Manager'),'Quality Manager must see QA Bench');
let views=0;
for(const role of roles){
 S.role=role;S.page=role==='Customer'?'shop':'overview';
 data.render();
 for(const [id,icon,label,allowed] of groups.flatMap(g=>g[1])){
  if(!(allowed.includes(role)||(role==='System Administrator'&&!['shop','my-orders'].includes(id))))continue;
  S.page=id;
  let body=id==='shop'?data.shop():id==='my-orders'?data.myOrders():renderers[id]();
  assert.equal(typeof body,'string','Missing renderer for '+role+' / '+id);
  assert.ok(body.length>0,'Empty render for '+role+' / '+id);
  views++;
 }
}
S.role='Quality Manager';S.page='scenario-lab';
const markup=renderers['scenario-lab']();
assert.ok(markup.includes('Run integrity checks'),'Existing integrity lab was removed');
for(const c of qa.cases)assert.ok(markup.includes(c.id),'UAT case missing from rendered UI: '+c.id);
assert.ok(markup.includes('Export UAT CSV'),'Export control missing');
const uatClick=listeners.find(x=>x.name==='click'&&String(x.listener).includes('[data-uat-action]'));
assert.ok(uatClick,'UAT interaction handlers not installed');
function recordCase(){
 const button={dataset:{uatAction:'record',uatId:'UAT-001'}};
 uatClick.listener({target:{closest:()=>button},preventDefault(){},stopImmediatePropagation(){}});
 assert.ok(form&&typeof form.onsubmit==='function','Retest form did not open');
}
recordCase();
inputs={outcome:'Blocked',state:'Verified / Closed',tester:'UAT Tester',evidence:'Blocked pending backend fix'};
form.onsubmit({preventDefault(){},target:form});
assert.equal(qa.getReview('UAT-001').state,'Open','Blocked case must not be verified closed');
recordCase();
inputs={outcome:'Pass',state:'Verified / Closed',tester:'UAT Tester',evidence:'Verified PO line and inventory reconciliation'};
form.onsubmit({preventDefault(){},target:form});
assert.equal(qa.getReview('UAT-001').state,'Verified / Closed');
assert.equal(qa.getReview('UAT-001').outcome,'Pass');
assert.ok(session['marketops360-session-v2'],'QA status not persisted in current-tab session');
// RACI receipts, role inbox, explicit SMS composer and customer navigation
assert.ok(data.comms,'RACI communication layer did not initialize');
assert.ok(groups.some(g=>g[1].some(x=>x[0]==='messages')),'RACI inbox navigation missing');
for(const role of roles){
 S.role=role;S.page='messages';data.render();
 assert.equal(S.page,'messages','Message inbox unavailable to '+role);
 assert.ok(renderers.messages().includes('Messages sent'),'Inbox failed for '+role);
}
S.role='Customer';
const receiptBefore=S.actionReceipts.length,handoffsBefore=S.handoffs.length;
data.workflows.audit('Customer order placed','ORD-UAT-001','Test customer order confirmed');
assert.equal(S.actionReceipts.length,receiptBefore+1,'Successful action did not produce receipt');
assert.equal(S.handoffs.length,handoffsBefore+1,'Successful action did not produce handoff');
const actionReceipt=S.actionReceipts[0],handoff=S.handoffs[0];
assert.equal(actionReceipt.r,'Crew','Incorrect next Responsible owner');
assert.equal(actionReceipt.a,'Store Captain','Incorrect Accountable owner');
assert.equal(handoff.owner,'Crew','Wrong assigned handoff owner');
assert.ok(data.comms.config('Customer pickup confirmed','ORD-UAT-001','', 'Customer').closed,
  'Completed workflow incorrectly requires follow-up');
assert.ok(data.comms.config('Customer order placed','ORD-UAT-001','', 'Customer').i.includes('Customer'),
  'RACI Informed role missing');
const commClick=listeners.find(x=>x.name==='click'&&String(x.listener).includes('[data-comms-action]'));
assert.ok(commClick,'Communication button handler not found');
commClick.listener({
 target:{closest:()=>({dataset:{commsAction:'message',receipt:actionReceipt.id}})},
 preventDefault(){},stopImmediatePropagation(){}
});
assert.ok(form&&typeof form.onsubmit==='function','Send message dialog did not open');
inputs={to_0:'on',to_1:'on',subject:'ORD-UAT-001 · Pickup follow-up',body:'Please pick and confirm the customer order.'};
form.onsubmit({preventDefault(){},target:form});
assert.equal(S.messages.filter(x=>x.record==='ORD-UAT-001').length,2,
 'Expected Responsible and Accountable in-app role messages');
assert.ok(S.messages.some(x=>x.recipient==='Crew'),'Responsible role did not receive message');
assert.ok(S.messages.some(x=>x.recipient==='Store Captain'),'Accountable role did not receive message');
assert.equal(S.messages.filter(x=>x.recipient==='Customer'&&x.record==='ORD-UAT-001').length,0,
 'Sender should not be sent its own RACI update');
S.role='Crew';S.page='messages';data.render();
assert.ok(renderers.messages().includes('ORD-UAT-001'),'Crew inbox did not show sent update');
S.role='Customer';data.comms.textDraft(actionReceipt);
assert.ok(form&&typeof form.onsubmit==='function','Text draft form did not open');
inputs={phone:'',draft:'MarketOps test reminder'};
form.onsubmit({preventDefault(){},target:form});
assert.equal((S.textDraftEvents||[]).length,0,'Empty phone opened SMS composer');
data.comms.textDraft(actionReceipt);
inputs={phone:'+15555550199',draft:'MarketOps test reminder'};
form.onsubmit({preventDefault(){},target:form});
assert.equal(S.textDraftEvents.length,1,'SMS composer was not invoked from explicit user submission');
assert.ok(!S.textDraftEvents[0].status.includes('delivered'),'SMS event falsely claims delivery');

console.log('CLEAN BUILD PASS — '+roles.length+' roles, '+views+' rendered role/page combinations, '+
 qa.cases.length+' UAT scenarios (2 Critical / 9 High / 7 Medium); '+
 'UAT, RACI handoff, inbox, SMS compose and session-persistence smoke tests passed.');
