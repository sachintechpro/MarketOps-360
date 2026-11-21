/* MarketOps 360 · surgical self-service workflow layer */
(function(){
'use strict';
const E=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const today=()=>new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const show=(msg)=>notify(msg);
const clean=d=>{Object.keys(d).forEach(k=>{if(typeof d[k]==='string')d[k]=d[k].replace(/[<>]/g,'').trim();});return d;};
const el=(label,name,value='',type='text',extra='')=>'<div class="field"><label>'+E(label)+'</label><input name="'+name+'" type="'+type+'" value="'+E(value)+'" '+extra+' required></div>';
const select=(label,name,choices,selected)=>'<div class="field"><label>'+E(label)+'</label><select name="'+name+'">'+choices.map(v=>{const id=Array.isArray(v)?v[0]:v,txt=Array.isArray(v)?v[1]:v;return '<option value="'+E(id)+'" '+(id===selected?'selected':'')+'>'+E(txt)+'</option>'}).join('')+'</select></div>';
const areaNames=['Store operations','Procurement','Distribution','Expansion','Quality','Technology','Finance','People','Buying','Customer service'];
const storeOpts=()=>S.stores.filter(x=>x.sales>0).map(x=>[x.id,x.name]);
const locations=()=>storeOpts().concat([['DC-W','DC West'],['DC-S','DC South']]);
const productOpts=()=>S.products.map(p=>[p.sku,p.name+' · '+p.sku]);
const findProduct=sku=>S.products.find(p=>p.sku===sku);
const findStore=id=>S.stores.find(x=>x.id===id);
S.settings=S.settings||{reorderBuffer:2,approvalLimit:5000,alertsEnabled:true};
S.audit=S.audit||[];
S.promotions=S.promotions||[{id:'PROM-101',name:'Winter citrus feature',sku:'PRD-1102',price:3.59,status:'Approved',owner:'Buyer team'}];
S.holds=S.holds||[];
S.releases=S.releases||[{id:'REL-2.8',name:'Inventory visibility',status:'In validation',tests:'Pending',owner:'Retail Systems'}];
S.stockLocations=S.stockLocations||{};
S.products.forEach(p=>{
 if(S.stockLocations[p.sku])return;
 const a=Math.ceil(p.stock*.5),b=Math.floor(p.stock*.25),c=p.stock-a-b;
 S.stockLocations[p.sku]={'ST-101':a,'ST-102':b,'ST-103':c,'DC-W':0,'DC-S':0};
});
const positions=sku=>(S.stockLocations[sku]||(S.stockLocations[sku]={'ST-101':0,'ST-102':0,'ST-103':0,'DC-W':0,'DC-S':0}));
const at=(sku,loc)=>Number(positions(sku)[loc]||0);
const held=(sku,loc)=>S.holds.filter(h=>h.sku===sku&&h.location===loc&&h.status==='Held').reduce((a,h)=>a+h.units,0);
const available=(sku,loc)=>Math.max(0,at(sku,loc)-held(sku,loc));
const sync=sku=>{const p=findProduct(sku);if(p)p.stock=Object.values(positions(sku)).reduce((a,b)=>a+Number(b||0),0);};
const move=(sku,loc,delta)=>{positions(sku)[loc]=at(sku,loc)+delta;sync(sku);};
const audit=(action,record,detail)=>S.audit.unshift({when:today(),role:S.role,action,record,detail});
const roleMap={
 'new-task':['Crew','Mate','Store Captain','Regional Manager','Quality Manager','People Manager','System Administrator','IT Program Manager','Procurement Manager','Expansion Director'],
 'new-product':['Buyer / Merchandising','System Administrator'],
 'new-supplier':['Procurement Manager','Buyer / Merchandising','System Administrator'],
 'new-expansion':['Expansion Director','Executive','System Administrator'],
 'new-initiative':['IT Program Manager','System Administrator'],
 'new-risk':['Executive','IT Program Manager','Expansion Director','Regional Manager','Quality Manager','System Administrator'],
 'new-transfer':['Regional Manager','Store Captain','Distribution Manager','System Administrator'],
 'transfer-action':['Regional Manager','Store Captain','Distribution Manager','System Administrator'],
 'create-po':['Procurement Manager','System Administrator'],
 'create-po-specific':['Procurement Manager','System Administrator'],
 'po-detail':['Procurement Manager','Distribution Manager','Finance Manager','Executive','System Administrator'],
 'receive-specific':['Distribution Manager','Quality Manager','Store Captain','System Administrator'],
 'receive-shipment':['Distribution Manager','Quality Manager','Store Captain','System Administrator'],
 'adjust-stock':['Store Captain','Mate','Regional Manager','Distribution Manager','System Administrator'],
 'advance-specific-product':['Buyer / Merchandising','Quality Manager','Procurement Manager','Store Captain','System Administrator'],
 'advance-product':['Buyer / Merchandising','Quality Manager','Procurement Manager','Store Captain','System Administrator'],
 'advance-specific-expansion':['Expansion Director','Executive','IT Program Manager','People Manager','Procurement Manager','Store Captain','Quality Manager','System Administrator'],
 'advance-expansion':['Expansion Director','Executive','IT Program Manager','People Manager','Procurement Manager','Store Captain','Quality Manager','System Administrator'],
 'resolve-specific-risk':['Executive','IT Program Manager','Expansion Director','Quality Manager','System Administrator'],
 'resolve-risk':['Executive','IT Program Manager','Expansion Director','Quality Manager','System Administrator'],
 'supplier-review':['Procurement Manager','Buyer / Merchandising','Quality Manager','System Administrator'],
 'quality-detail':['Quality Manager','Store Captain','Mate','System Administrator'],
 'customer-case':['Store Captain','Mate','Crew','System Administrator'],
 'new-case':['Customer','Store Captain','Mate','Crew','System Administrator'],
 'workforce-detail':['People Manager','Store Captain','Regional Manager','System Administrator'],
 'new-promotion':['Buyer / Merchandising','Finance Manager','System Administrator'],
 'initiative-detail':['IT Program Manager','System Administrator'],
 'store-detail':['Regional Manager','Store Captain','System Administrator'],
 'finance-review':['Finance Manager','Executive','System Administrator'],
 'task-detail':['Crew','Mate','Store Captain','Regional Manager','Quality Manager','People Manager','IT Program Manager','Procurement Manager','Expansion Director','Finance Manager','Buyer / Merchandising','Distribution Manager','Executive','System Administrator'],
 'quality-hold':['Quality Manager','System Administrator'],
 'quality-release':['Quality Manager','System Administrator'],
 'release-detail':['IT Program Manager','System Administrator'],
 'admin-config':['System Administrator'],
 'report-action':['Executive','Finance Manager','Regional Manager','IT Program Manager','System Administrator']
};
window.marketOpsAuthorized=(a)=>{
 if(a.startsWith('adjust-stock:'))a='adjust-stock';
 return !roleMap[a]||roleMap[a].includes(S.role);
};
function dialog(title,content,save,onSave){
 const x=document.createElement('div');x.className='modal-shade';
 x.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-label="'+E(title)+'"><div class="card-head"><h2>'+E(title)+'</h2><button class="btn" type="button" data-close>✕</button></div><form>'+content+'<div class="modal-actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">'+E(save)+'</button></div></form></div>';
 document.body.appendChild(x);
 enhanceTooltips();
 x.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>x.remove());
 x.onclick=e=>{if(e.target===x)x.remove()};
 x.querySelector('form').onsubmit=e=>{e.preventDefault();if(!e.target.reportValidity())return;const d=clean(Object.fromEntries(new FormData(e.target)));if(onSave(d)!==false)x.remove();};
 return x;
}
function taskDetail(id){
 const t=S.tasks.find(x=>x.id===id);if(!t)return show('Task record unavailable.');
 dialog('Update task · '+t.id,el('Task', 'title',t.title)+select('Status','status',['Open','In progress','Blocked','Complete'],t.status)+el('Accountable owner','owner',t.owner)+el('Evidence / handover note','note',t.note||'Work verified against operating checklist'), 'Save task',d=>{
  if(d.status==='Complete'&&!d.note.trim())return show('Completion evidence is required.'),false;
  Object.assign(t,{title:d.title,status:d.status,owner:d.owner,note:d.note});if(d.status==='Complete'&&t.orderId){const order=S.orders.find(o=>o.id===t.orderId);if(order&&order.status==='Placed')order.status='Ready for pickup';}audit('Task updated',id,d.status);render();show('Task status updated across role work queues.');
 });
}
const roleArea={'Crew':['Store operations','Customer service','Quality'],'Mate':['Store operations','Customer service','Quality','Distribution'],'Store Captain':['Store operations','Customer service','Quality','Distribution'],'Procurement Manager':['Procurement','Buying'],'Buyer / Merchandising':['Buying','Procurement'],'Distribution Manager':['Distribution'],'Quality Manager':['Quality'],'People Manager':['People'],'Finance Manager':['Finance'],'IT Program Manager':['Technology'],'Expansion Director':['Expansion'],'Regional Manager':['Store operations','People','Customer service','Expansion'],'Executive':['Finance','Expansion','Technology']};
const roleTasks=()=>S.tasks.filter(t=>(roleArea[S.role]||[]).includes(t.area)||t.assigneeRole===S.role||t.owner===S.role).filter(t=>t.status!=='Complete');
function createTask(){
 dialog('Create / assign operating task',el('Task title','title','Verify receiving variance')+select('Work area','area',areaNames,'Store operations')+select('Assigned role','assigneeRole',roles.filter(r=>r!=='Customer'),'Mate')+select('Store / location','storeId',[['','Network / support office']].concat(storeOpts()),'')+el('Owner','owner','Shift lead')+el('Due','due','Today · 4:00 PM')+select('Priority','priority',['High','Medium','Low'],'Medium')+el('Instructions','note','Capture completion evidence'), 'Create task',d=>{
  const id='T-'+(300+S.tasks.length);S.tasks.unshift(Object.assign({id,status:'Open'},d));
  audit('Task created',id,d.title);render();show(id+' assigned to '+d.assigneeRole);
 });
}
function createPo(sku){
 const p=findProduct(sku);if(!p)return show('Product not found.');
 const supplier=S.suppliers.find(x=>x.name===p.supplier);
 if(!supplier||supplier.status!=='Approved')return show('Supplier approval required before creating this PO.');
 const outstanding=S.pos.filter(x=>x.sku===sku&&!['Received','Cancelled'].includes(x.status)).reduce((a,x)=>a+(x.qty||0),0);
 const suggested=Math.max(0,p.par*S.settings.reorderBuffer-p.stock-outstanding);
 if(!suggested)return show('Existing open orders already cover the replenishment target.');
 dialog('Purchase order · '+p.sku,'<p class="card-sub">'+E(p.name)+' · '+E(supplier.name)+' · '+outstanding+' units on open POs</p>'+el('Quantity','qty',suggested,'number','min="1" step="1"')+el('Unit cost','unitCost',p.cost,'number','min="0.01" step="0.01"')+select('Destination DC','dc',[['DC-W','DC West'],['DC-S','DC South']],'DC-W')+el('Buying justification','reason','Stock below par; demand validated'), 'Create draft PO',d=>{
  const qty=Number(d.qty),unitCost=Number(d.unitCost);
  if(!Number.isInteger(qty)||qty<1||unitCost<=0)return show('Enter a valid positive quantity and unit cost.'),false;
  const id='PO-'+(49000+S.pos.length),amount=Math.round(qty*unitCost*100)/100;
  S.pos.unshift({id,sku,qty,unitCost,dc:d.dc,supplier:p.supplier,date:today(),amount,status:amount>S.settings.approvalLimit?'Pending financial approval':'Draft',lines:1,reason:d.reason});
  audit('Draft purchase order',id,sku+' × '+qty);render();show(id+' created. '+(amount>S.settings.approvalLimit?'Financial approval required.':'Confirm it from the PO register.'));
 });
}
function poDetail(id){
 const po=S.pos.find(x=>x.id===id);if(!po)return show('PO unavailable.');
 if(!po.sku)return dialog('Existing sample PO · '+id,'<p>This imported example has no SKU-level line data. Create a new purchase order for an end-to-end traceable demonstration.</p>','Close',()=>{});
 const choices=po.status==='Pending financial approval'?['Pending financial approval','Draft','Cancelled']:po.status==='Draft'?['Draft','Confirmed','Cancelled']:po.status==='Confirmed'?['Confirmed','Cancelled']:[''+po.status];
 dialog('Purchase order · '+id,'<p class="card-sub">'+E(po.supplier)+' · '+E(po.sku)+' · '+po.qty+' units · '+money(po.amount)+'</p>'+select('Order status','status',choices,po.status)+el('Supplier acknowledgment / reason','evidence',po.evidence||'Supplier confirmed quantity and delivery'), 'Save PO',d=>{
   if(po.status==='Pending financial approval'&&d.status==='Draft'&&!['Finance Manager','Executive','System Administrator'].includes(S.role))return show('Finance or Executive approval required.'),false;
   if(po.status==='Draft'&&d.status==='Confirmed'&&!['Procurement Manager','System Administrator'].includes(S.role))return show('Only Procurement can confirm supplier commitments.'),false;
   if(po.status==='Draft'&&d.status==='Confirmed'){
     if(!d.evidence.trim())return show('Supplier confirmation evidence is required.'),false;
     const asn='ASN-'+(7400+S.shipments.length);
     S.shipments.unshift({id:asn,po:id,supplier:po.supplier,sku:po.sku,qty:po.qty,dc:po.dc||'DC-W',eta:'Tomorrow · scheduled',cases:po.qty,status:'Scheduled'});
     audit('Supplier confirmed PO',id,'Created inbound '+asn);
   }
   if(d.status==='Cancelled')S.shipments.filter(sh=>sh.po===id&&!['Received','Partial'].includes(sh.status)).forEach(sh=>sh.status='Cancelled');
   po.status=d.status;po.evidence=d.evidence;audit('PO status updated',id,d.status);render();show(id+' updated to '+d.status);
 });
}
function receive(id){
 const s=S.shipments.find(x=>x.id===id);if(!s||['Received','Cancelled'].includes(s.status))return show('Shipment not available for receiving.');
 const po=S.pos.find(p=>p.id===s.po);
 if(po&&['Draft','Cancelled','Pending financial approval'].includes(po.status))return show('Confirm and approve the PO before recording delivery.');
 const plausible=S.products.filter(p=>p.supplier===s.supplier);
 const sku=s.sku||(plausible[0]&&plausible[0].sku);
 if(!sku)return show('Shipment has no matching SKU. Reconcile supplier master first.');
 const expected=s.remaining||s.qty||Math.max(1,Math.round(s.cases/8));
 dialog('Inspect and receive · '+id,'<p class="card-sub">Reconcile shipment '+E(s.id)+' against '+E(s.po)+' at '+E(s.dc)+'. Initial sample shipments use converted illustrative unit counts.</p>'+
 select('Inspected SKU','sku',plausible.map(p=>[p.sku,p.name+' · '+p.sku]),sku)+
 el('Expected units','expected',expected,'number','min="1" step="1"')+
 el('Accepted units','accepted',expected,'number','min="0" step="1"')+
 el('Rejected / damaged units','rejected',0,'number','min="0" step="1"')+
 select('Quality disposition','disposition',['Release accepted units','Hold accepted units'], 'Release accepted units')+
 el('Inspection record','evidence','Count, packaging and temperature verified'),
 'Record receipt',d=>{
  const exp=+d.expected,accepted=+d.accepted,rejected=+d.rejected,short=exp-accepted-rejected;
  if(![exp,accepted,rejected].every(Number.isInteger)||exp<1||accepted<0||rejected<0||short<0)return show('Accepted + rejected must not exceed expected units.'),false;
  if(!d.evidence.trim())return show('Inspection evidence is required.'),false;
  const dc=s.dc.includes('South')?'DC-S':'DC-W';
  if(accepted)move(d.sku,dc,accepted);
  if(accepted&&d.disposition==='Hold accepted units')S.holds.unshift({id:'H-'+(200+S.holds.length),sku:d.sku,location:dc,units:accepted,status:'Held',reason:'Receiving inspection hold',evidence:d.evidence});
  Object.assign(s,{sku:d.sku,expected:exp,accepted:(s.accepted||0)+accepted,rejected:(s.rejected||0)+rejected,short,remaining:short,status:short?'Partial':'Received',evidence:d.evidence});
  if(po)po.status=short?'Partially received':'Received';
  audit('Receipt inspected',id,'Accepted '+accepted+' · rejected '+rejected+' · short '+short);render();show('Receipt recorded. Inventory and PO updated.');
 });
}
function advanceProduct(id){
 const p=S.pipeline.find(x=>x.id===id);if(!p)return show('Product introduction unavailable.');
 if(p.stage>=12)return show('This introduction is already at its final review.');
 const ownerByStage={4:'Quality Manager',5:'Buyer / Merchandising',9:'Procurement Manager',10:'Store Captain'};
 const role=ownerByStage[p.stage]||'Buyer / Merchandising';
 if(S.role!==role&&S.role!=='System Administrator')return show('Gate '+p.stage+' requires '+role+' review.');
 dialog('Product gate · '+p.id,'<p class="card-sub">Current: '+E(S.productStages[p.stage-1])+' · Accountable: '+E(role)+'</p>'+
 select('Decision','decision',['Approve and advance','Hold for correction'],'Approve and advance')+
 el('Reviewer','reviewer',S.role)+el('Required evidence / rationale','evidence','Review evidence confirmed and documented'),
 'Record gate decision',d=>{
  if(!d.evidence.trim())return show('Record evidence before approval.'),false;
  p.gates=p.gates||[];p.gates.push({stage:p.stage,decision:d.decision,reviewer:d.reviewer,evidence:d.evidence});
  if(d.decision==='Approve and advance'){p.stage++;p.risk='None';if(p.stage>=10){
    let prod=S.products.find(x=>x.name===p.name);
    if(!prod&&p.price&&p.cost){prod={sku:'NEW-'+(500+S.products.length),name:p.name,dept:p.dept||'Produce',supplier:p.supplier,price:p.price,cost:p.cost,stock:0,par:p.par||24,emoji:'🛍',status:'Active',margin:Math.round((1-p.cost/p.price)*100)};S.products.push(prod);positions(prod.sku);}
  }}else p.risk='On hold — evidence review';
  audit('Product gate decision',p.id,d.decision+' · stage '+p.stage);render();show(p.id+' · '+d.decision);
 });
}
function advanceExpansion(id){
 const x=S.expansions.find(v=>v.id===id);if(!x)return show('Project unavailable.');
 if(x.stage>=12)return show('All readiness gates are complete.');
 const ownerByStage={3:'Executive',7:'IT Program Manager',8:'Procurement Manager',9:'People Manager',10:'Store Captain',11:'Executive'};
 const responsible=ownerByStage[x.stage]||'Expansion Director';
 if(![responsible,'System Administrator'].includes(S.role))return show('Stage '+x.stage+' requires '+responsible+' approval.');
 dialog('Expansion readiness · '+x.id,'<p class="card-sub">'+E(x.name)+' · '+E(S.stages[x.stage-1])+' · owner '+E(responsible)+'</p>'+
 select('Decision','decision',['Approve stage','Hold stage'],'Approve stage')+
 el('Functional readiness evidence','evidence','Evidence reviewed with accountable team')+
 el('Approver','approver',S.role), 'Record stage decision',d=>{
  if(!d.evidence.trim())return show('Readiness evidence is required.'),false;
  x.gates=x.gates||[];x.gates.push({stage:x.stage,decision:d.decision,evidence:d.evidence,approver:d.approver});
  if(d.decision==='Approve stage'){x.stage++;x.completion=Math.round(x.stage/12*100);if(x.stage>=12){x.health='Stabilizing';const st=S.stores.find(v=>v.name===x.name);if(st)st.health='Opening / hypercare';else S.stores.push({id:'ST-'+(110+S.stores.length),name:x.name,city:x.city,region:'West',sales:0,traffic:0,health:'Opening / hypercare',manager:'Opening team'});}}else x.health='At risk';
  audit('Expansion stage decision',x.id,d.decision+' · stage '+x.stage);render();show(x.id+' · '+d.decision);
 });
}
function resolveRisk(id){
 const r=S.risks.find(x=>x.id===id);if(!r||r.status==='Closed')return show('Risk is not open.');
 dialog('Resolve RAID item · '+r.id,'<p>'+E(r.title)+'</p>'+el('Mitigation evidence','evidence','Issue resolved and verified with accountable owner')+el('Closure owner','owner',r.owner)+select('Disposition','decision',['Closed','Mitigating','Escalated'],'Closed'),'Record decision',d=>{
  if(!d.evidence.trim())return show('Closure evidence is required.'),false;
  r.status=d.decision;r.owner=d.owner;r.evidence=d.evidence;
  audit('RAID disposition',id,d.decision);render();show(id+' · '+d.decision);
 });
}
function transferCreate(){
 dialog('Request store / DC transfer',select('Source location','from',locations(),'ST-101')+select('Destination location','to',locations(),'ST-102')+
 select('SKU','sku',productOpts(),S.products[0].sku)+el('Units','units',2,'number','min="1" step="1"')+
 el('Business reason','reason','Balance shelf availability'), 'Create transfer request',d=>{
  const units=+d.units;
  if(d.from===d.to)return show('Source and destination must differ.'),false;
  if(!Number.isInteger(units)||units<1||units>available(d.sku,d.from))return show('Transfer exceeds saleable stock at source.'),false;
  const id='TR-'+(2300+(S.transferLog||[]).length);S.transferLog=S.transferLog||[];
  S.transferLog.unshift({id,from:d.from,to:d.to,sku:d.sku,units,reason:d.reason,status:'Awaiting approval'});
  audit('Transfer requested',id,d.reason);render();show('Transfer '+id+' awaiting approval.');
 });
}
function transferStep(id){
 const x=(S.transferLog||[]).find(t=>t.id===id);if(!x)return show('Select a new editable transfer from the register.');
 const next={'Awaiting approval':'Approved','Approved':'In transit','In transit':'Completed'}[x.status];
 if(!next)return show('Transfer is already complete.');
 if(next==='In transit'&&x.units>available(x.sku,x.from))return show('Insufficient source stock: resolve before dispatch.');
 dialog('Transfer · '+x.id,'<p class="card-sub">'+E(x.sku)+' · '+E(x.from)+' → '+E(x.to)+' · '+x.units+' units</p>'+
 el('Dispatch / receiving evidence','evidence',next==='Completed'?'Destination receipt and count confirmed':'Source count and movement reference verified'),
 'Confirm '+next,d=>{
   if(!d.evidence.trim())return show('Evidence required.'),false;
   if(next==='In transit')move(x.sku,x.from,-x.units);
   if(next==='Completed')move(x.sku,x.to,x.units);
   x.status=next;x.evidence=d.evidence;audit('Transfer '+next,id,x.sku+' × '+x.units);render();show(x.id+' moved to '+next);
 });
}
function adjust(sku){
 const p=findProduct(sku);if(!p)return show('Unknown SKU.');
 dialog('Cycle count adjustment · '+p.sku,'<p class="card-sub">'+E(p.name)+' · location-specific inventory</p>'+
 select('Location','location',locations(),'ST-101')+
 el('Verified location units','verified',at(sku,'ST-101'),'number','min="0" step="1"')+
 select('Reason','reason',['Cycle count correction','Damage / shrink','Receiving discrepancy','Other correction'])+
 el('Reference','reference','COUNT-2026-001')+
 el('Count evidence','evidence','Physical shelf count verified'), 'Save adjustment',d=>{
  const n=+d.verified;
  if(!Number.isInteger(n)||n<held(sku,d.location))return show('Count cannot be below held units; release or correct the hold first.'),false;
  const before=at(sku,d.location);positions(sku)[d.location]=n;sync(sku);
  S.inventoryAdjustments=S.inventoryAdjustments||[];
  S.inventoryAdjustments.unshift({sku,product:p.name,location:d.location,before,after:n,reason:d.reason,reference:d.reference,notes:d.evidence,role:S.role});
  audit('Inventory count',sku,d.location+' '+before+' → '+n);render();show('Verified inventory saved.');
 });
}
function checkout(d){
 if(!S.cart.length)return show('Basket is empty.'),false;
 const loc=(d.fulfillment||'Pickup · Westside').includes('North Park')?'ST-102':(d.fulfillment||'').includes('Downtown')?'ST-103':'ST-101';
 for(const c of S.cart)if(!findProduct(c.sku)||!Number.isInteger(c.qty)||c.qty>available(c.sku,loc))return show('Insufficient stock for '+(findProduct(c.sku)?.name||c.sku)+' at selected pickup store.'),false;
 const lines=S.cart.map(c=>({sku:c.sku,qty:c.qty,price:findProduct(c.sku).price}));
 const total=lines.reduce((a,x)=>a+x.qty*x.price,0);
 lines.forEach(x=>move(x.sku,loc,-x.qty));
 const id='ORD-'+(7100+S.orders.length);
 S.orders.unshift({id,date:today(),lines:lines.reduce((a,x)=>a+x.qty,0),items:lines,total,fulfillment:d.fulfillment||'Pickup · Westside',storeId:loc,status:'Placed'});
 S.tasks.unshift({id:'T-'+(340+S.tasks.length),title:'Pick customer order '+id,area:'Store operations',owner:'Crew',assigneeRole:'Crew',storeId:loc,due:'Today · pickup window',status:'Open',priority:'High',orderId:id});
 S.cart=[];audit('Customer order placed',id,'Pickup '+loc);render();show(id+' created; store picking task assigned.');return true;
}
function cancelOrder(id){
 const o=S.orders.find(x=>x.id===id);if(!o||o.status!=='Placed')return show('Only unfulfilled orders may be cancelled.');
 (o.items||[]).forEach(x=>move(x.sku,o.storeId||'ST-101',x.qty));
 o.status='Cancelled';S.tasks.filter(x=>x.orderId===id).forEach(t=>t.status='Cancelled');
 audit('Customer order cancelled',id,'Reserved stock returned');render();show('Order cancelled; inventory released.');
}
function newProduct(d){
 const price=+d.price,cost=+d.cost,par=+d.par;
 if(price<=0||cost<0||price<=cost||!Number.isInteger(par)||par<1)return show('Price must exceed nonnegative cost; par must be a positive integer.'),false;
 if(S.products.some(p=>p.name.toLowerCase()===d.name.toLowerCase())||S.pipeline.some(p=>p.name.toLowerCase()===d.name.toLowerCase()))return show('A product or introduction already uses this name.'),false;
 const id='NPI-'+(100+S.pipeline.length);
 S.pipeline.unshift({id,name:d.name,dept:d.dept,supplier:d.supplier,price,cost,par,stage:1,owner:S.role,target:'TBD',risk:'Evidence required'});
 audit('Product idea created',id,d.name);render();show(id+' added to product introduction, pending stage approvals.');return true;
}
const baseCommit=commit;
commit=function(a,d){
 d=clean(d);
 if(!window.marketOpsAuthorized(a))return show('Selected role cannot perform this action.'),false;
 if(a==='checkout')return checkout(d);
 if(a==='product')return newProduct(d);
 const old=baseCommit(a,d);
 if(a==='product'&&S.products[0])positions(S.products[0].sku);
 return old;
};
const baseAct=act;
act=function(a){
 if(!window.marketOpsAuthorized(a))return show('Selected role cannot perform this action.');
 if(a==='new-task')return createTask();
 if(a==='new-transfer')return transferCreate();
 if(a.startsWith('adjust-stock:'))return adjust(a.slice('adjust-stock:'.length));
 if(a==='receive-shipment')return receive(S.shipments.find(x=>x.status!=='Received')?.id);
 if(a==='resolve-risk')return resolveRisk(S.risks.find(x=>x.status!=='Closed')?.id);
 if(a==='advance-product')return advanceProduct(S.pipeline[0]?.id);
 if(a==='advance-expansion')return advanceExpansion(S.expansions[0]?.id);
 if(a==='create-po')return createPo(S.products.find(p=>p.stock<p.par)?.sku);
 if(a==='transfer-action')return transferStep(S.transferLog?.find(x=>x.status!=='Completed')?.id);
 return baseAct(a);
};
window.marketOpsWorkflows={E,today,dialog,el,select,storeOpts,locations,productOpts,positions,at,available,move,sync,audit,roleTasks,taskDetail,createTask,createPo,poDetail,receive,advanceProduct,advanceExpansion,resolveRisk,transferCreate,transferStep,adjust,checkout,cancelOrder};
})();
