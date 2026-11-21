/* MarketOps 360 · role workflow experiences (preserve existing dashboards) */
(function(){
'use strict';
const W=window.marketOpsWorkflows;
if(!W)return;
const {E,dialog,el,select,storeOpts,locations,productOpts,available,at,audit,roleTasks}=W;
const find=(arr,id)=>arr.find(x=>x.id===id);
const pickId=b=>{const tr=b.closest('tr');return b.dataset.id||tr?.querySelector('strong')?.textContent?.trim()||'';};
const locName=id=>(S.stores.find(s=>s.id===id)?.name||S.dcs?.find(d=>d.id===id)?.name||id);
const actionBtn=(title,action,id,cls='')=>'<button class="btn '+cls+'" data-action="'+action+'" data-id="'+E(id)+'">'+E(title)+'</button>';
const totalSales=()=>S.stores.reduce((a,x)=>a+x.sales,0);
const storeTasks=()=>S.tasks.filter(t=>['Open','In progress','Blocked'].includes(t.status));
const localAudit=()=>card('Recent self-service activity',(S.audit.length?table(['Date','Role','Action','Record','Detail'],S.audit.slice(0,15).map(x=>'<tr><td>'+E(x.when)+'</td><td>'+E(x.role)+'</td><td>'+E(x.action)+'</td><td>'+E(x.record)+'</td><td>'+E(x.detail)+'</td></tr>')):'<div class="empty">Changes will appear here as roles complete work.</div>'),'Session-only demo change history');
function buttonGuard(a){
 if(!window.marketOpsAuthorized(a)){notify('The '+S.role+' role cannot perform this action.');return false}
 return true;
}
function storeDetail(b){
 const name=pickId(b),s=S.stores.find(x=>x.name===name||x.id===name);
 if(!s)return notify('Store not found.');
 dialog('Store self-service · '+s.name,el('Store lead','manager',s.manager)+select('Operating health','health',['On track','Watch','At risk','Pre-opening'],s.health)+el('Action / operating note','note',s.note||'Store readiness and customer experience reviewed'),'Save store review',d=>{
 Object.assign(s,{manager:d.manager,health:d.health,note:d.note});audit('Store reviewed',s.id,d.health);render();notify('Store and regional views updated.');
 });
}
function supplierReview(b){
 const name=pickId(b),s=S.suppliers.find(x=>x.name===name||x.id===name);
 if(!s)return notify('Supplier not found.');
 dialog('Supplier evaluation · '+s.id,el('Supplier','name',s.name)+el('Lead time in days','lead',s.lead,'number','min="1" step="1"')+el('Supplier score 0–100','score',s.score,'number','min="0" max="100" step="1"')+select('Compliance status','status',['Review','Approved','Suspended'],s.status)+el('Evidence / compliance reference','evidence',s.evidence||'Supplier documentation verified'),'Save supplier review',d=>{
 const score=+d.score,lead=+d.lead;
 if(!Number.isInteger(score)||score<0||score>100||!Number.isInteger(lead)||lead<1)return notify('Enter a score 0–100 and positive lead time.'),false;
 if(d.status==='Approved'&&score<75)return notify('Supplier score below 75 requires corrective action before approval.'),false;
 Object.assign(s,{name:d.name,lead,score,status:d.status,evidence:d.evidence});
 audit('Supplier review',s.id,d.status);render();notify(s.id+' updated for Procurement and Buying.');
 });
}
function financeReview(b){
 const id=pickId(b),x=S.expansions.find(y=>y.id===id);
 if(!x)return notify('Expansion record missing.');
 dialog('Capital review · '+x.name,el('Approved budget','budget',x.budget,'number','min="1" step="1"')+el('Actual spend','spent',x.spent,'number','min="0" step="1"')+el('Estimate at completion','forecast',x.forecast,'number','min="0" step="1"')+el('Decision evidence','evidence',x.financeEvidence||'Reforecast reviewed with functional owners'),'Save financial review',d=>{
 const budget=+d.budget,spent=+d.spent,forecast=+d.forecast;
 if(![budget,spent,forecast].every(Number.isFinite)||budget<=0||spent<0||forecast<spent)return notify('Forecast cannot be below actual spend.'),false;
 Object.assign(x,{budget,spent,forecast,financeEvidence:d.evidence});
 if(forecast>budget){x.health='At risk';if(!S.risks.some(r=>r.projectId===x.id&&r.status!=='Closed'))S.risks.unshift({id:'R-'+(150+S.risks.length),projectId:x.id,title:x.name+' forecast exceeds funding',area:'Finance',owner:'Finance Manager',severity:'High',due:'Next steering review',status:'Open'});}
 audit('Capital forecast updated',x.id,'Variance '+money(forecast-budget));render();notify('Finance forecast updated and exposure escalated where required.');
 });
}
function qualityDetail(b){
 const id=pickId(b);
 const q=S.qaChecks.find(x=>x.id===id)||S.qaChecks.find(x=>x.check===id)||S.qaChecks.find(x=>x.status!=='Pass')||S.qaChecks[0];
 if(!q)return notify('Quality check unavailable.');
 dialog('Quality inspection · '+q.id,'<p>'+E(q.check)+' · '+E(q.store)+'</p>'+select('Inspection outcome','status',['Pending','Action required','Pass','Fail'],q.status)+el('Inspection evidence','evidence',q.evidence||'Temperature, condition and label records inspected')+el('Accountable owner','owner',q.owner),'Record quality outcome',d=>{
 if(!d.evidence.trim())return notify('Inspection evidence required.'),false;
 Object.assign(q,{status:d.status,evidence:d.evidence,owner:d.owner});audit('Quality check',q.id,d.status);
 if(['Action required','Fail'].includes(d.status)&&!S.risks.some(r=>r.qaId===q.id&&r.status!=='Closed'))S.risks.unshift({id:'R-'+(160+S.risks.length),qaId:q.id,title:q.check+' inspection exception',area:'Quality',owner:d.owner,severity:'High',due:'Immediate',status:'Open'});
 render();notify('Quality inspection and exceptions updated.');
 });
}
function qualityHold(){
 dialog('Place quality hold',select('SKU','sku',productOpts(),S.products[0].sku)+select('Store / DC','location',locations(),'ST-101')+
 el('Held units','units',1,'number','min="1" step="1"')+el('Reason / lot reference','reason','Lot / temperature exception')+
 el('Inspection evidence','evidence','Physical goods identified and segregated'),'Apply hold',d=>{
 const n=+d.units;if(!Number.isInteger(n)||n<1||n>available(d.sku,d.location))return notify('Hold exceeds available units.'),false;
 const id='H-'+(200+S.holds.length);S.holds.unshift({id,sku:d.sku,location:d.location,units:n,reason:d.reason,evidence:d.evidence,status:'Held'});
 audit('Quality hold',id,d.sku+' '+n+' units');render();notify('Saleable availability reduced at '+locName(d.location)+'.');
 });
}
function qualityRelease(b){
 const h=find(S.holds,pickId(b));if(!h||h.status!=='Held')return notify('Hold unavailable.');
 dialog('Release held stock · '+h.id,'<p>'+E(h.sku)+' · '+h.units+' units · '+E(h.location)+'</p>'+el('Discharge / disposition evidence','evidence','Quality reviewer verified safe release'),'Release hold',d=>{
 h.status='Released';h.releaseEvidence=d.evidence;audit('Quality hold released',h.id,d.evidence);render();notify('Stock returned to saleable availability.');
 });
}
function customerCase(b){
 const id=pickId(b),c=find(S.customerCases,id);
 if(!c)return notify('Case missing.');
 dialog('Customer service case · '+id,'<p>'+E(c.type)+' · '+E(c.store)+'</p>'+select('Resolution status','status',['Open','In progress','Escalated','Resolved'],c.status)+el('Owner','owner',c.owner||'Store Captain')+el('Resolution / handoff note','evidence',c.evidence||'Customer contacted; follow-up recorded'),'Save case',d=>{
 Object.assign(c,{status:d.status,owner:d.owner,evidence:d.evidence});
 audit('Customer case updated',id,d.status);render();notify('Case updated for Store Captain and customer service.');
 });
}
function createCase(){
 const orderOptions=[['','General store issue']].concat(S.orders.map(o=>[o.id,o.id]));
 dialog('Report customer / store issue',select('Issue type','type',['Product quality','Missing item','Pickup delay','Refund request','Other service issue'],'Product quality')+
 select('Order reference','orderId',orderOptions,'')+
 select('Store','storeId',storeOpts(),'ST-101')+
 el('Customer / reporter','customer',S.role==='Customer'?S.customer.name:'Store visitor')+
 el('Issue details','detail','Describe what happened')+select('Priority','priority',['High','Medium','Low'],'Medium'), 'Submit service case',d=>{
 const id='CX-'+(8900+S.customerCases.length),st=S.stores.find(x=>x.id===d.storeId);
 S.customerCases.unshift({id,type:d.type,orderId:d.orderId,store:st?.name||d.storeId,status:'Open',priority:d.priority,owner:'Store Captain',customer:d.customer,detail:d.detail});
 S.tasks.unshift({id:'T-'+(390+S.tasks.length),title:'Investigate case '+id,area:'Customer service',owner:'Store Captain',assigneeRole:'Store Captain',storeId:d.storeId,due:'Today',status:'Open',priority:d.priority,caseId:id});
 audit('Customer case created',id,d.detail);render();notify(id+' submitted to store leadership.');
 });
}
function workforceDetail(b){
 const name=pickId(b),s=S.laborPlan.find(x=>x.store===name)||S.laborPlan[0];
 if(!s)return notify('Workforce plan not found.');
 dialog('Store workforce plan · '+s.store,el('Budget hours','budgetHours',s.budgetHours,'number','min="1" step="1"')+
 el('Scheduled hours','scheduledHours',s.scheduledHours,'number','min="0" step="1"')+
 el('Open shifts','openShifts',s.openShifts,'number','min="0" step="1"')+el('Coverage / hiring note','note',s.note||'Shift coverage reviewed with store leadership'),'Save workforce plan',d=>{
 const budget=+d.budgetHours,scheduled=+d.scheduledHours,open=+d.openShifts;
 if(![budget,scheduled,open].every(Number.isInteger)||budget<1||scheduled<0||open<0)return notify('Use nonnegative whole hours and shift counts.'),false;
 Object.assign(s,{budgetHours:budget,scheduledHours:scheduled,openShifts:open,note:d.note});
 audit('Workforce plan',s.store,scheduled+'/'+budget+' hours');render();notify('People, Regional and Expansion views can see revised coverage.');
 });
}
function initiativeDetail(b){
 const id=pickId(b),p=find(S.initiatives,id);if(!p)return notify('Initiative unavailable.');
 dialog('IT delivery · '+id,el('Business owner','owner',p.owner)+select('Delivery phase','phase',['Discovery','Design','Build & validate','Integration testing','UAT','Pilot rollout','Released','Hypercare'],p.phase)+
 el('Progress percent','progress',p.progress,'number','min="0" max="100" step="1"')+
 el('Actual spend','spend',p.spend,'number','min="0" step="1"')+
 select('Health','health',['Green','Amber','Red'],p.health)+
 el('Test / release evidence','evidence',p.evidence||'Business UAT and integration evidence reviewed'),
 'Update initiative',d=>{
 const n=+d.progress,spend=+d.spend;
 if(n<0||n>100||spend<0||!Number.isInteger(n))return notify('Progress must be 0–100%; spend nonnegative.'),false;
 if(d.phase==='Released'&&(!d.evidence.trim()||d.health==='Red'))return notify('Release requires test evidence and no red blocker.'),false;
 Object.assign(p,{owner:d.owner,phase:d.phase,progress:n,spend,health:d.health,evidence:d.evidence});
 audit('IT delivery update',id,d.phase+' '+n+'%');render();notify('IT portfolio progress updated.');
 });
}
function releaseDetail(b){
 const id=pickId(b),r=find(S.releases,id);if(!r)return notify('Release not found.');
 dialog('Release readiness · '+id,select('Test evidence','tests',['Pending','Passed','Failed'],r.tests)+select('Decision','status',['In validation','Approved','Hold','Deployed'],r.status)+el('Evidence / rollback plan','evidence',r.evidence||'UAT, integrations, rollback and store pilot reviewed'),'Record release gate',d=>{
 if(['Approved','Deployed'].includes(d.status)&&d.tests!=='Passed')return notify('A release requires passing test evidence.'),false;
 Object.assign(r,{tests:d.tests,status:d.status,evidence:d.evidence});audit('Release gate',id,d.status);render();notify('Release readiness updated.');
 });
}
function newPromotion(){
 dialog('Plan retail promotion',el('Campaign name','name','Winter weekend feature')+select('SKU','sku',productOpts(),S.products[0].sku)+el('Proposed retail price','price',3.99,'number','min="0.01" step="0.01"')+
 el('Minimum margin percent','floor',30,'number','min="0" max="95" step="1"')+el('Funding / justification','evidence','Supplier-funded trial; forecast approved'),'Submit promotion',d=>{
 const p=S.products.find(x=>x.sku===d.sku),price=+d.price,floor=+d.floor;
 if(!p||price<=0||floor<0||floor>95)return notify('Enter a valid price and margin floor.'),false;
 const margin=(price-p.cost)/price*100;
 const id='PROM-'+(110+S.promotions.length),status=margin<floor?'Finance review required':'Pending approval';
 S.promotions.unshift({id,name:d.name,sku:d.sku,price,floor,evidence:d.evidence,owner:S.role,status});
 audit('Promotion proposed',id,status);render();notify(id+' submitted: '+status+'.');
 });
}
function promotionReview(b){
 const id=pickId(b),p=find(S.promotions,id);if(!p)return notify('Promotion missing.');
 dialog('Promotion approval · '+id,'<p>'+E(p.name)+' · '+E(p.sku)+' · '+money(p.price)+'</p>'+select('Decision','status',['Pending approval','Finance review required','Approved','Rejected'],p.status)+el('Decision evidence','evidence',p.evidence||'Retail margin and supplier funding checked'),'Save decision',d=>{
 const product=S.products.find(x=>x.sku===p.sku);
 if(d.status==='Approved'&&product&&((p.price-product.cost)/p.price*100)<(p.floor||0)&&S.role!=='Finance Manager'&&S.role!=='System Administrator')return notify('Below-floor promotions require Finance approval.'),false;
 p.status=d.status;p.evidence=d.evidence;audit('Promotion decision',id,d.status);render();notify('Promotion status updated.');
 });
}
function adminConfig(){
 dialog('Demo operating rules',el('Reorder target multiple','reorderBuffer',S.settings.reorderBuffer,'number','min="1" max="5" step="1"')+
 el('Purchase approval threshold','approvalLimit',S.settings.approvalLimit,'number','min="1" step="1"')+
 select('Exception alerts','alertsEnabled',[['true','Enabled'],['false','Disabled']],String(S.settings.alertsEnabled)),
 'Save operating rules',d=>{
 S.settings.reorderBuffer=+d.reorderBuffer;S.settings.approvalLimit=+d.approvalLimit;S.settings.alertsEnabled=d.alertsEnabled==='true';
 audit('Admin configuration','Settings','Reorder ×'+d.reorderBuffer);render();notify('Demo operating rules updated.');
 });
}
function downloadCsv(filename,rows){
 const csv=rows.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function reportAction(b){
 const type=b.closest('.card')?.querySelector('.card-title')?.textContent.trim()||'Operating report';
 const rows=[['Record type','ID','Name / description','Status / value']];
 S.stores.forEach(x=>rows.push(['Store',x.id,x.name,x.health+' · sales '+x.sales]));
 S.pos.forEach(x=>rows.push(['Purchase order',x.id,x.supplier,x.status+' · '+x.amount]));
 S.risks.forEach(x=>rows.push(['RAID',x.id,x.title,x.status+' · '+x.severity]));
 S.expansions.forEach(x=>rows.push(['Expansion',x.id,x.name,'Forecast '+x.forecast+' · '+x.health]));
 S.initiatives.forEach(x=>rows.push(['IT initiative',x.id,x.name,x.health+' · '+x.progress+'%']));
 const x=dialog(type,'<p>Live session snapshot: '+S.stores.length+' stores, '+S.pos.length+' purchase orders, '+S.risks.length+' risks and '+S.expansions.length+' expansion projects.</p><p class="card-sub">CSV includes current shared records and business statuses. No external reporting service is contacted.</p>', 'Export CSV',()=>{downloadCsv('marketops-360-operating-snapshot.csv',rows);audit('Report exported','Session',type);return true;});
}
function resetDemo(){
 dialog('Reset demonstration','<p>This restores initial sample data and clears changes made in this tab. Existing repository and deployment are not changed.</p>', 'Reset and reload',()=>{
 try{sessionStorage.removeItem('marketops360-session-v2')}catch(e){}
 location.reload();return true;
 });
}
function roleTaskCard(){
 if(S.role==='Customer')return '';
 const tasks=roleTasks();
 const records=tasks.slice(0,10).map(t=>'<tr><td><strong>'+E(t.title)+'</strong><br><small>'+E(t.id)+'</small></td><td>'+E(t.owner)+'</td><td>'+E(t.due)+'</td><td>'+status(t.status)+'</td><td>'+actionBtn('Update','task-detail',t.id)+'</td></tr>');
 return card('My actionable work queue',tasks.length?table(['Assigned work','Owner','Due','Status','Action'],records):'<div class="empty">No outstanding work assigned to this role.</div>','Self-service: update work, capture completion evidence or escalate issues');
}
const originalHome=renderers.overview;
renderers.overview=function(){return originalHome()+'<div style="margin-top:14px">'+roleTaskCard()+'</div>';};
const originalStoreOps=renderers['store-ops'];
renderers['store-ops']=function(){return originalStoreOps()+'<div style="margin-top:14px">'+roleTaskCard()+'</div>';};
const originalInventory=renderers.inventory;
renderers.inventory=function(){
 const rows=S.products.map(p=>'<tr><td><strong>'+E(p.name)+'</strong><br><small>'+E(p.sku)+'</small></td><td>'+at(p.sku,'ST-101')+'</td><td>'+at(p.sku,'ST-102')+'</td><td>'+at(p.sku,'ST-103')+'</td><td>'+at(p.sku,'DC-W')+'</td><td>'+at(p.sku,'DC-S')+'</td><td>'+S.holds.filter(h=>h.sku===p.sku&&h.status==='Held').reduce((a,x)=>a+x.units,0)+'</td></tr>');
 return originalInventory()+'<div style="margin-top:14px">'+card('Location stock ledger',table(['SKU','Westside','North Park','Downtown','DC West','DC South','Held'],rows),'Inventory movements reconcile to SKU totals; quality holds reduce availability')+'</div>';
};
renderers.transfers=function(){
 const records=(S.transferLog||[]).map(x=>'<tr><td><strong>'+E(x.id)+'</strong></td><td>'+E(locName(x.from))+'</td><td>'+E(locName(x.to))+'</td><td>'+E(x.sku)+'</td><td>'+x.units+'</td><td>'+status(x.status)+'</td><td>'+(x.status==='Completed'?status('Complete'):actionBtn('Process','transfer-specific',x.id))+'</td></tr>');
 return card('Store and DC transfers',table(['Transfer','Source','Destination','SKU','Units','Status','Action'],records),'Approval → source dispatch → destination receipt; both stock balances update',btn('＋ Request transfer','new-transfer','primary'))+
 '<div style="margin-top:14px">'+card('Example transfer controls','<p class="card-sub">Create a transfer to test stock conservation and authorized handoffs. Seeded historical transfer examples remain in the documented business scenarios.</p>')+'</div>';
};
const originalProcurement=renderers.procurement;
renderers.procurement=function(){return originalProcurement().replace(/Draft → confirmed → inbound → received → reconciled/,'Confirm the PO to create an ASN; then Distribution records actual receipt.');};
const originalReceiving=renderers.receiving;
renderers.receiving=function(){return originalReceiving().replace(/Inspect (ASN-[^<]+)</g,'Inspect $1<').replace('Select the shipment being inspected. Real receiving should record accepted, rejected and short quantities separately.','Inspect a specific shipment to enter accepted, rejected and short units.');};
renderers.customer=function(){
 return '<div class="grid kpis">'+kpi('Open cases',S.customerCases.filter(x=>x.status!=='Resolved').length,'Store service work')+kpi('High priority',S.customerCases.filter(x=>x.priority==='High'&&x.status!=='Resolved').length,'Require prompt response','warn')+kpi('Resolved',S.customerCases.filter(x=>x.status==='Resolved').length,'Completed responses')+kpi('Orders',S.orders.length,'Customer activity')+'</div>'+
 card('Customer service workbench',table(['Case','Reason','Store','Customer','Status','Action'],S.customerCases.map(c=>'<tr><td><strong>'+E(c.id)+'</strong></td><td>'+E(c.type)+'</td><td>'+E(c.store)+'</td><td>'+E(c.customer||'Store visitor')+'</td><td>'+status(c.status)+'</td><td>'+actionBtn('Open case','customer-case',c.id)+'</td></tr>')),'Cases created by customers and store staff are shared',btn('＋ Create case','new-case','primary'));
};
const originalOrders=myOrders;
myOrders=function(){
 const rows=S.orders.map(o=>'<tr><td><strong>'+E(o.id)+'</strong></td><td>'+E(o.date)+'</td><td>'+o.lines+'</td><td>'+money(o.total)+'</td><td>'+E(o.fulfillment)+'</td><td>'+status(o.status)+'</td><td>'+(o.status==='Placed'?actionBtn('Cancel order','cancel-order',o.id):'—')+'</td></tr>');
 return card('My orders',rows.length?table(['Order','Placed','Units','Total','Pickup','Status','Action'],rows):'<div class="empty">No orders yet. Browse the storefront to create an order.</div>','Customer account · '+S.customer.name,btn('Shop now','go-shop','primary'))+
 '<div style="margin-top:14px">'+card('Request help','<p class="card-sub">Contact store leadership about a pickup, missing item or product quality issue.</p>'+btn('Submit a service request','new-case','primary'))+'</div>';
};
const oldFinance=renderers.finance;
renderers.finance=function(){
 let html=oldFinance();
 html=html.replace('$483,600',money(totalSales())).replace('$8,600,000',money(S.expansions.reduce((a,x)=>a+x.budget,0))).replace('$8,700,000',money(S.expansions.reduce((a,x)=>a+x.forecast,0))).replace('$6,200,000',money(S.expansions.reduce((a,x)=>a+x.spent,0)));
 const rows=S.expansions.map(x=>'<tr><td><strong>'+E(x.id)+'</strong><br><small>'+E(x.name)+'</small></td><td>'+money(x.budget)+'</td><td>'+money(x.spent)+'</td><td>'+money(x.forecast)+'</td><td>'+money(x.forecast-x.budget)+'</td><td>'+actionBtn('Review','finance-review',x.id)+'</td></tr>');
 return html+'<div style="margin-top:14px">'+card('Capital forecast self-service',table(['Project','Budget','Spend','Forecast','Variance','Action'],rows),'Changes update Expansion and executive exposure; over-budget projects create an open RAID item')+'</div>';
};
const originalWorkforce=renderers.workforce;
renderers.workforce=function(){
 const rows=S.laborPlan.map(x=>'<tr><td><strong>'+E(x.store)+'</strong></td><td>'+x.budgetHours+'</td><td>'+x.scheduledHours+'</td><td>'+Math.max(0,x.budgetHours-x.scheduledHours)+'</td><td>'+x.openShifts+'</td><td>'+actionBtn('Update plan','workforce-detail',x.store)+'</td></tr>');
 return originalWorkforce()+'<div style="margin-top:14px">'+card('Editable store workforce plans',table(['Store','Budget hours','Scheduled','Gap','Open shifts','Action'],rows),'Self-service coverage adjustments update workforce readiness')+'</div>';
};
const originalQuality=renderers.quality;
renderers.quality=function(){
 const q=S.qaChecks.map(x=>'<tr><td><strong>'+E(x.id)+'</strong><br><small>'+E(x.check)+'</small></td><td>'+E(x.store)+'</td><td>'+E(x.owner)+'</td><td>'+status(x.status)+'</td><td>'+actionBtn('Inspect','quality-detail',x.id)+'</td></tr>');
 const h=S.holds.map(x=>'<tr><td><strong>'+E(x.id)+'</strong></td><td>'+E(x.sku)+'</td><td>'+E(locName(x.location))+'</td><td>'+x.units+'</td><td>'+status(x.status)+'</td><td>'+(x.status==='Held'?actionBtn('Release','quality-release',x.id):'—')+'</td></tr>');
 return originalQuality()+'<div style="margin-top:14px">'+card('Quality inspection work queue',table(['Check','Location','Owner','Result','Action'],q),'Record evidence and create a quality exception when required')+'</div>'+
 '<div style="margin-top:14px">'+card('Product holds and disposition',h.length?table(['Hold','SKU','Location','Units','Status','Action'],h):'<div class="empty">No active quality holds. Create one to test blocked availability.</div>','Held quantities cannot be sold or transferred',btn('＋ Place hold','quality-hold','primary'))+'</div>';
};
const originalPipeline=renderers['product-pipeline'];
renderers['product-pipeline']=function(){return originalPipeline().replace('Portfolio prototype: gate progression is simulated. In a production workflow, the gate would require evidence, named approvers and a recorded approve / conditional / hold decision.','Stage approval now captures evidence and the accountable role. Switch roles to test functional handoffs.');};
const originalPromotion=renderers.promotions;
renderers.promotions=function(){
 const rows=S.promotions.map(x=>'<tr><td><strong>'+E(x.id)+'</strong><br><small>'+E(x.name)+'</small></td><td>'+E(x.sku)+'</td><td>'+money(x.price)+'</td><td>'+status(x.status)+'</td><td>'+actionBtn('Review','promotion-review',x.id)+'</td></tr>');
 return originalPromotion()+'<div style="margin-top:14px">'+card('Editable promotion decisions',table(['Campaign','SKU','Price','Status','Action'],rows),'Below-margin promotions require Finance approval')+'</div>';
};
const originalIT=renderers['it-portfolio'];
renderers['it-portfolio']=function(){
 let html=originalIT();
 const rows=S.releases.map(x=>'<tr><td><strong>'+E(x.id)+'</strong></td><td>'+E(x.name)+'</td><td>'+E(x.tests)+'</td><td>'+status(x.status)+'</td><td>'+actionBtn('Review','release-detail',x.id)+'</td></tr>');
 return html+'<div style="margin-top:14px">'+card('Actionable release gates',table(['Release','Capability','Test evidence','Status','Action'],rows),'Release approval requires passing test evidence')+'</div>';
};
const originalAdmin=renderers.admin;
renderers.admin=function(){return originalAdmin()+'<div class="grid two" style="margin-top:14px">'+card('Operating model configuration','<p>Replenishment target: '+S.settings.reorderBuffer+'× par</p><p>PO approval review threshold: '+money(S.settings.approvalLimit)+'</p>'+btn('Edit configuration','admin-config','primary')+' '+btn('Reset demo','reset-demo'))+
 card('Session control','<p class="card-sub">Records persist when refreshing this browser tab, not on any external server. Reset returns to the original sample state.</p><p>Role selection is a simulation of access, not real authentication.</p>')+'</div><div style="margin-top:14px">'+localAudit()+'</div>';};
function runIntegrity(){
 const tests=[
 ['Location totals match catalog',()=>S.products.every(p=>Object.values(S.stockLocations[p.sku]||{}).reduce((a,n)=>a+(+n||0),0)===p.stock)],
 ['No negative inventory',()=>Object.values(S.stockLocations).every(loc=>Object.values(loc).every(n=>n>=0))],
 ['Quality holds fit physical positions',()=>S.holds.filter(h=>h.status==='Held').every(h=>S.holds.filter(x=>x.status==='Held'&&x.sku===h.sku&&x.location===h.location).reduce((a,x)=>a+x.units,0)<=at(h.sku,h.location))],
 ['All new PO lines identify a SKU',()=>S.pos.every(p=>!p.qty||Boolean(p.sku&&p.supplier))],
 ['All ASNs link to purchase orders',()=>S.shipments.every(sh=>S.pos.some(po=>po.id===sh.po))],
 ['Transfer quantities remain positive',()=>!S.transferLog||S.transferLog.every(t=>Number.isInteger(+t.units)&&+t.units>0)],
 ['Customer orders contain valid totals',()=>S.orders.every(o=>o.total>=0&&o.lines>=1)],
 ['Customer fulfillment creates store tasks',()=>S.orders.filter(o=>o.status!=='Cancelled').every(o=>S.tasks.some(t=>t.orderId===o.id))],
 ['Risk records have accountable owners',()=>S.risks.every(r=>Boolean(r.owner))],
 ['Quality inspections have ownership',()=>S.qaChecks.every(q=>Boolean(q.owner))],
 ['15 role workspaces configured',()=>roles.length===15],
 ['Customer admin action is restricted',()=>{const r=S.role;S.role='Customer';const ok=!window.marketOpsAuthorized('admin-config');S.role=r;return ok;}]
 ];
 S.testRuns=tests.map(([name,fn])=>{let ok=false;try{ok=!!fn()}catch(e){}return{name,detail:'Live shared-state invariant',status:ok?'PASS':'FAIL',time:new Date().toLocaleTimeString()};});
 render();notify('Live integrity checks: '+S.testRuns.filter(x=>x.status==='PASS').length+'/'+tests.length+' passed.');
}
renderers['scenario-lab']=function(){
 const tests=S.testRuns||[],passed=tests.filter(t=>t.status==='PASS').length;
 return '<div class="grid kpis">'+kpi('Live integrity checks','12','State-based assertions')+kpi('Latest result',tests.length?passed+'/'+tests.length:'Not run','Current browser session')+kpi('Products',S.products.length,'Shared SKU records')+kpi('Locations',S.stores.length,'Store network')+'</div>'+
 card('Workflow data integrity','<p class="card-sub">Run checks against the current demo records: inventory conservation, holds, ASN links, task creation, permissions, risk ownership and role coverage. These are state checks—not a substitute for automated UI tests.</p>'+btn('Run integrity checks','run-live-tests','primary')+' '+btn('Clear results','clear-live-tests')+
 (tests.length?table(['Check','Result'],tests.map(t=>'<tr><td>'+E(t.name)+'</td><td>'+status(t.status)+'</td></tr>')):'<div class="empty">No integrity results yet.</div>'),'Quality assurance for connected business records')+
 '<div style="margin-top:14px">'+card('Manual end-to-end acceptance journey','<p>1. Customer places an order → Crew receives a picking task.</p><p>2. Procurement drafts a PO → confirms it → Distribution receives a linked ASN.</p><p>3. Quality holds stock → Customer availability decreases → Quality releases it.</p><p>4. Store transfer dispatches stock → receiving location gains it.</p><p>5. Expansion functional owners approve individual stage gates.</p><p>6. Finance updates capital forecast → critical exposure appears in RAID.</p>','Repeatable role-switching demonstration')+'</div>';
};
function cancelOrder(b){W.cancelOrder(pickId(b));}
const handlers={
 'store-detail':storeDetail,'supplier-review':supplierReview,'po-detail':b=>W.poDetail(pickId(b)),
 'quality-detail':qualityDetail,'quality-hold':qualityHold,'quality-release':qualityRelease,
 'customer-case':customerCase,'new-case':createCase,'workforce-detail':workforceDetail,
 'initiative-detail':initiativeDetail,'finance-review':financeReview,'release-detail':releaseDetail,
 'new-promotion':newPromotion,'promotion-review':promotionReview,'report-action':reportAction,
 'admin-config':adminConfig,'reset-demo':resetDemo,'task-detail':b=>W.taskDetail(pickId(b)),
 'transfer-specific':b=>W.transferStep(pickId(b)),'cancel-order':cancelOrder,
 'run-live-tests':runIntegrity,'clear-live-tests':()=>{S.testRuns=[];render();notify('Results cleared.');},
 'new-receipt':()=>notify('Use a confirmed purchase order to create a traceable inbound shipment.')
};
const extraPermission={'promotion-review':['Buyer / Merchandising','Finance Manager','System Administrator'],'transfer-specific':['Regional Manager','Distribution Manager','Store Captain','System Administrator'],'cancel-order':['Customer','System Administrator']};
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-action]');if(!b)return;
 const a=b.dataset.action,fn=handlers[a];if(!fn)return;
 e.preventDefault();e.stopImmediatePropagation();
 if((extraPermission[a]&&!extraPermission[a].includes(S.role))||!buttonGuard(a))return;
 fn(b);
},true);
const baseChat=chatAnswer;
chatAnswer=function(question){
 const q=question.toLowerCase();
 if(/my task|my work|assigned|complete task|shift/.test(q))return 'As '+S.role+', open My actionable work queue to update a task, add evidence, reassign or complete it. Work items follow the shared operating record.';
 if(/stock at|available at|which store|location stock/.test(q))return 'Current inventory is tracked per store and distribution center. Open Inventory control → Location stock ledger; quality-held units are not saleable.';
 if(/purchase order|create po|supplier confirmation/.test(q))return 'Procurement creates a draft purchase order against a specific SKU. Confirm it from the PO register to generate the inbound shipment; Distribution then records actual accepted, rejected and short units.';
 if(/quality hold|stop sale|product recall/.test(q))return 'Quality can hold a named SKU at a particular location, provide inspection evidence, and release it after disposition. Held stock cannot be sold or transferred.';
 if(/opening|expansion gate|readiness/.test(q))return 'An expansion owner submits readiness evidence. The accountable business role approves each stage before the project advances. Unapproved stages cannot pass.';
 if(/what can i do|my role|self.service/.test(q))return 'You are working as '+S.role+'. The current page provides the actions permitted for this demo persona. Your changes update shared records and cross-functional work queues.';
 return baseChat(question);
};
const prevRender=render;
try{const saved=sessionStorage.getItem('marketops360-session-v2');if(saved){Object.assign(S,JSON.parse(saved));}}catch(e){}
render=function(){
 prevRender();
 try{sessionStorage.setItem('marketops360-session-v2',JSON.stringify(S))}catch(e){}
};
document.addEventListener('DOMContentLoaded',()=>{
 const chat=document.querySelector('#contextChat');
 if(!chat)return;
 chat.querySelector('.chat-launch')?.setAttribute('aria-label','Ask Sofia for contextual help');
 const input=chat.querySelector('.chat-input'),send=chat.querySelector('.chat-ask');
 if(input&&send)input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send.click();}});
});
})();
