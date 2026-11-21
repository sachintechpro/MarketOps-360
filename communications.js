/* MarketOps 360 · surgical RACI action receipts and demo messaging.
 * In-app messages live only in this browser tab. SMS uses the user's device composer.
 * Neither channel claims delivery to a real employee or external service.
 */
(function(){
'use strict';
const W=window.marketOpsWorkflows;
if(!W)return;
const E=W.E;
const now=()=>new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const unique=arr=>[...new Set(arr.filter(Boolean))].filter(r=>roles.includes(r));
const parseRole=owner=>roles.includes(owner)?owner:null;
const productNext={1:'Buyer / Merchandising',2:'Buyer / Merchandising',3:'Buyer / Merchandising',4:'Quality Manager',5:'Buyer / Merchandising',6:'Buyer / Merchandising',7:'Buyer / Merchandising',8:'Buyer / Merchandising',9:'Procurement Manager',10:'Store Captain',11:'Buyer / Merchandising',12:'Buyer / Merchandising'};
const expansionNext={1:'Expansion Director',2:'Expansion Director',3:'Executive',4:'Expansion Director',5:'Expansion Director',6:'Expansion Director',7:'IT Program Manager',8:'Procurement Manager',9:'People Manager',10:'Store Captain',11:'Executive',12:'Expansion Director'};
S.actionReceipts=S.actionReceipts||[];
S.handoffs=S.handoffs||[];
S.messages=S.messages||[];
S.commsTab=S.commsTab||'Inbox';
S.commsDismissed=S.commsDismissed||'';
S.commsPending=S.commsPending||'';

function config(type,record,detail,actor){
 const c={r:null,a:actor,c:[],i:[],next:'No follow-up required',due:'No due date',updated:[],closed:false};
 const set=(r,a,next,due,consulted,informed,updated)=>Object.assign(c,{
   r:r||null,a:a||actor,next:next||'No follow-up required',due:due||'No due date',
   c:consulted||[],i:informed||[],updated:updated||[]});
 const po=S.pos.find(x=>x.id===record);
 const shipment=S.shipments.find(x=>x.id===record);
 const task=S.tasks.find(x=>x.id===record);
 const xfr=(S.transferLog||[]).find(x=>x.id===record);
 const project=S.expansions.find(x=>x.id===record);
 const product=S.pipeline.find(x=>x.id===record);
 const risk=S.risks.find(x=>x.id===record);
 const customer=S.customerCases.find(x=>x.id===record);
 const release=S.releases.find(x=>x.id===record);
 const initiative=S.initiatives.find(x=>x.id===record);
 const promo=S.promotions.find(x=>x.id===record);
 const newAssignment=(r,next)=>set(r,'Store Captain',next,'Before the assigned due time',['Mate'],['Regional Manager'],['Tasks','Store Operations']);
 switch(type){
  case 'Customer order placed':
    set('Crew','Store Captain','Pick, check and stage the customer order','Before pickup window',['Mate'],['Customer'],['Customer Orders','Store Inventory','Crew Tasks']);break;
  case 'Customer pickup confirmed':
    set(null,'Store Captain',null,null,[],['Finance Manager'],['Orders','Store Sales']);break;
  case 'Customer order cancelled':
    set(null,'Store Captain',null,null,[],['Crew'],['Orders','Inventory','Assigned Tasks']);break;
  case 'Task created':
    newAssignment(parseRole(task?.assigneeRole)||parseRole(task?.owner)||'Mate','Complete the assigned task and record evidence');break;
  case 'Task added':
    newAssignment(parseRole(task?.assigneeRole)||parseRole(task?.owner)||'Mate','Complete the assigned task and record evidence');break;
  case 'Task updated':
    if(task?.status==='Complete'&&task?.orderId)
      set('Customer','Store Captain','Confirm pickup of the staged customer order','At the agreed pickup window',['Mate'],['Crew'],['Customer Orders','Store Tasks','Pickup Readiness']);
    else if(task?.status==='Complete'||task?.status==='Cancelled')
      set(null,'Store Captain',null,null,[],['Regional Manager'],['Tasks','Work Queue']);
    else if(task?.status==='Blocked')set('Store Captain','Regional Manager','Resolve the blocked work or reassign it','Immediate',[],[actor],['Tasks','Escalations']);
    else newAssignment(parseRole(task?.assigneeRole)||parseRole(task?.owner)||'Mate','Continue assigned work and record the next status');break;
  case 'Draft purchase order':
    if(po?.status==='Pending financial approval')set('Finance Manager','Finance Manager','Review and authorize the purchase order','Before supplier confirmation',['Procurement Manager'],[],['Purchase Orders','Finance Approvals']);
    else set('Procurement Manager','Procurement Manager','Confirm PO and supplier delivery commitment','Before order release',['Buyer / Merchandising'],[],['Purchase Orders','Buying Workbench']);break;
  case 'PO status updated':
    if(po?.status==='Confirmed')return null; // handled once by Supplier confirmed PO
    if(po?.status==='Draft')set('Procurement Manager','Procurement Manager','Confirm the supplier commitment','Before order release',['Finance Manager'],[],['Purchase Orders','Finance Approvals']);
    else if(po?.status==='Cancelled')set(null,'Procurement Manager',null,null,[],['Distribution Manager','Finance Manager'],['Purchase Orders','Inbound Shipments']);
    else set('Finance Manager','Finance Manager','Review the PO decision','Before order release',['Procurement Manager'],[],['Purchase Orders']);break;
  case 'Supplier confirmed PO':
    set('Distribution Manager','Procurement Manager','Inspect and reconcile the linked inbound shipment',
      S.shipments.find(x=>x.po===record&&x.status!=='Received')?.eta||'Upon scheduled delivery',
      ['Quality Manager'],['Store Captain'],['Purchase Orders','Inbound Shipments']);break;
  case 'Receipt inspected':
    if(shipment?.status==='Partial')set('Procurement Manager','Distribution Manager','Reconcile shortage and arrange balance delivery','Next supplier update',['Quality Manager'],['Finance Manager'],['Receiving','Purchase Orders','Inventory']);
    else set('Store Captain','Distribution Manager','Review released stock and replenish store demand','Next replenishment run',['Quality Manager'],['Procurement Manager'],['Receiving','Inventory']);break;
  case 'Supplier review':
    set('Procurement Manager','Procurement Manager',S.suppliers.find(x=>x.id===record)?.status==='Approved'?'Confirm supplier readiness for buying':'Complete compliance review and corrective actions','Before next PO',['Quality Manager'],['Buyer / Merchandising'],['Supplier Network']);break;
  case 'Supplier profile created':
    set('Procurement Manager','Procurement Manager','Review compliance and authorize supplier','Before first purchase',['Quality Manager'],['Buyer / Merchandising'],['Supplier Network']);break;
  case 'Transfer requested':
    set('Regional Manager','Regional Manager','Approve stock transfer and source availability','Before dispatch',['Distribution Manager','Store Captain'],[],['Transfers','Location Inventory']);break;
  case 'Transfer Approved':
    set(xfr?.from?.startsWith('DC')?'Distribution Manager':'Store Captain','Regional Manager','Dispatch approved transfer and record evidence','Before shipment',['Store Captain'],[],['Transfers']);break;
  case 'Transfer In transit':
    set('Store Captain','Distribution Manager','Verify destination receipt and close transfer','On arrival',['Regional Manager'],[],['Transfers','Location Inventory']);break;
  case 'Transfer Completed':
    set(null,'Regional Manager',null,null,[],['Procurement Manager'],['Transfers','Source & Destination Inventory']);break;
  case 'Inventory count':
    set(null,'Store Captain',null,null,['Regional Manager'],['Procurement Manager'],['Inventory','Cycle Count Adjustments']);break;
  case 'Quality check':
    if(S.qaChecks.find(x=>x.id===record)?.status==='Fail'||S.qaChecks.find(x=>x.id===record)?.status==='Action required')
      set('Quality Manager','Quality Manager','Resolve inspection exception and record disposition','Immediate',['Store Captain'],['Regional Manager'],['Quality Checks','RAID']);
    else set(null,'Quality Manager',null,null,[],['Store Captain'],['Quality Checks']);break;
  case 'Quality hold':
    set('Store Captain','Quality Manager','Quarantine held product and prevent sale or transfer','Immediate',['Distribution Manager'],['Procurement Manager','Regional Manager'],['Quality Holds','Saleable Inventory']);break;
  case 'Quality hold released':
    set('Store Captain','Quality Manager','Verify release and restore local shelf availability','Before next sale',['Mate'],['Procurement Manager'],['Quality Holds','Saleable Inventory']);break;
  case 'Product idea created':
    set('Buyer / Merchandising','Buyer / Merchandising','Advance product proposal through required approval gates','Next product review',['Quality Manager'],['Procurement Manager'],['Product Pipeline']);break;
  case 'Product gate decision':
    if(product?.risk?.toLowerCase().includes('hold'))
      set(actor,'Buyer / Merchandising','Resolve gate exception and resubmit evidence','Next gate review',['Quality Manager'],['Procurement Manager'],['Product Pipeline']);
    else if(product?.stage>=12)set(null,'Buyer / Merchandising',null,null,[],['Store Captain'],['Product Pipeline','Catalog']);
    else set(productNext[product?.stage]||'Buyer / Merchandising','Buyer / Merchandising','Review and approve the next product gate','Next gate review',['Quality Manager','Procurement Manager'],['Store Captain'],['Product Pipeline','Catalog']);break;
  case 'Expansion project created':
    set('Expansion Director','Expansion Director','Conduct market assessment and record business case','Next steering review',['Finance Manager'],['Executive','IT Program Manager'],['Expansion']);break;
  case 'Expansion stage decision':
    if(project?.health==='At risk')set('Expansion Director','Expansion Director','Resolve readiness hold and resubmit stage evidence','Before next steering review',['People Manager','IT Program Manager'],['Executive'],['Expansion','Risks']);
    else if(project?.stage>=12)set(null,'Expansion Director',null,null,[],['Executive','Regional Manager'],['Expansion','Store Network']);
    else set(expansionNext[project?.stage]||'Expansion Director','Expansion Director','Complete evidence and approve the next opening gate','Before next stage milestone',['Finance Manager','IT Program Manager','People Manager'],['Executive'],['Expansion Readiness']);break;
  case 'Capital forecast updated':
    if(project&&project.forecast>project.budget)
      set('Expansion Director','Finance Manager','Submit recovery plan for over-budget expansion','Next steering review',['Executive'],['IT Program Manager'],['Finance','Expansion Forecast','RAID']);
    else set(null,'Finance Manager',null,null,['Expansion Director'],['Executive'],['Finance','Expansion Forecast']);break;
  case 'Workforce plan':
    set('Store Captain','People Manager','Confirm shift coverage and close staffing gaps','Before next shift',['Regional Manager'],['Expansion Director'],['Workforce Plans']);break;
  case 'Customer case created':
    set('Store Captain','Regional Manager','Investigate customer issue and record resolution','Next service review',customer?.type==='Product quality'?['Quality Manager']:['Mate'],['Customer'],['Customer Cases','Store Tasks']);break;
  case 'Customer case updated':
    if(customer?.status==='Resolved')set(null,'Store Captain',null,null,[],['Customer'],['Customer Cases']);
    else set('Store Captain','Regional Manager','Follow up with customer and resolve open case','Next service review',['Mate'],['Customer'],['Customer Cases']);break;
  case 'Store reviewed':
    if(S.stores.find(x=>x.id===record)?.health==='At risk')
      set('Store Captain','Regional Manager','Address operating risk and update store status','Next operating review',['People Manager'],['Executive'],['Store Network']);
    else set(null,'Regional Manager',null,null,['Store Captain'],[],['Store Network']);break;
  case 'IT initiative created':
    set('IT Program Manager','IT Program Manager','Plan delivery milestones and validate dependencies','Next planning session',['Quality Manager'],['Executive'],['IT Portfolio']);break;
  case 'IT delivery update':
    if(initiative?.phase==='Released')
      set('Store Captain','IT Program Manager','Validate store impact and hypercare','Post-release review',['Quality Manager'],['Regional Manager'],['IT Portfolio','Release Readiness']);
    else set('IT Program Manager','IT Program Manager','Advance delivery and collect gate evidence','Next milestone',['Quality Manager'],['Executive'],['IT Portfolio']);break;
  case 'Release gate':
    if(release?.status==='Deployed')set('Store Captain','IT Program Manager','Confirm post-deployment store readiness','During hypercare',['Quality Manager'],['Regional Manager'],['Release Readiness']);
    else if(release?.status==='Approved')set('IT Program Manager','IT Program Manager','Schedule rollout and verify deployment checklist','Before release',['Quality Manager'],['Regional Manager'],['Release Readiness']);
    else set('IT Program Manager','IT Program Manager','Resolve validation findings before release','Before next release decision',['Quality Manager'],['Executive'],['Release Readiness']);break;
  case 'Promotion proposed':
    if(promo?.status==='Finance review required')
      set('Finance Manager','Finance Manager','Review proposed price below margin floor','Before campaign launch',['Buyer / Merchandising'],[],['Promotions','Margin Review']);
    else set('Buyer / Merchandising','Finance Manager','Verify proposed promotion and funding','Before campaign launch',['Finance Manager'],['Store Captain'],['Promotions']);break;
  case 'Promotion decision':
    if(promo?.status==='Approved')
      set('Store Captain','Buyer / Merchandising','Validate effective promotion price in stores','Before campaign starts',['Finance Manager'],['Regional Manager'],['Promotions']);
    else if(promo?.status==='Rejected')set(null,'Buyer / Merchandising',null,null,[],['Finance Manager'],['Promotions']);
    else set('Buyer / Merchandising','Finance Manager','Resolve promotion review and resubmit','Before campaign starts',['Store Captain'],[],['Promotions']);break;
  case 'RAID item logged':
    set(parseRole(risk?.owner)||'IT Program Manager','IT Program Manager','Assess severity, mitigate and update RAID','Next risk review',['Quality Manager'],['Executive'],['RAID Register']);break;
  case 'RAID disposition':
    if(risk?.status==='Closed')set(null,'IT Program Manager',null,null,[],['Executive'],['RAID Register']);
    else set(parseRole(risk?.owner)||'IT Program Manager','IT Program Manager','Continue mitigation and record decision','Next risk review',['Quality Manager'],['Executive'],['RAID Register']);break;
  case 'UAT retest recorded':
    if(S.uatReviews?.[record]?.outcome==='Pass')
      set(null,'Quality Manager',null,null,[],['IT Program Manager'],['QA & UAT Bench']);
    else set('IT Program Manager','Quality Manager','Investigate failing or blocked UAT scenario','Next defect triage',['System Administrator'],['Executive'],['QA & UAT Bench']);break;
  case 'Handoff completed':
    set(null,'Store Captain',null,null,[],[],['Follow-up Work Queue','Handoff History']);break;
  case 'Admin configuration':
    set(null,'System Administrator',null,null,['IT Program Manager'],[],['System Rules']);break;
  case 'Report exported':
    set(null,actor,null,null,[],[],['Reports']);break;
  default:
    set(null,actor,null,null,[],[],[type.includes('stock')?'Inventory':'Operating Records']);break;
 }
 const normalized={
  r:parseRole(c.r),a:parseRole(c.a)||actor,
  c:unique(c.c),i:unique(c.i),next:c.next,due:c.due,updated:[...new Set(c.updated)],
  closed:!c.r || c.next==='No follow-up required'
 };
 return normalized;
}
function onAudit(action,record,detail,actor){
 if(!action||!record)return null;
 const route=config(action,record,detail,actor);
 if(!route)return null;
 const task=S.tasks.find(x=>x.id===record);
 const shipment=S.shipments.find(x=>x.id===record);
 const related=[String(record),task?.orderId,task?.caseId,shipment?.po].filter(Boolean).map(String);
 const primary=task?.orderId||task?.caseId||String(record);
 const previous=S.actionReceipts[0];
 if(previous&&previous.action===action&&previous.sourceRecord===String(record)&&previous.detail===String(detail||''))return previous;
 const receipt={
  id:'RCPT-'+String(Date.now()).slice(-8)+'-'+(S.actionReceipts.length+1),
  action,record:primary,sourceRecord:String(record),relatedRecords:related,
  detail:String(detail||''),actor,at:now(),...route
 };
 // When the same workflow advances, the earlier open assignment must not remain
 // outstanding. Superseded is not the same as completed; keep the audit trail.
 S.handoffs.filter(x=>x.status==='Open'&&related.includes(String(x.record)))
   .forEach(x=>{x.status='Superseded by '+action;x.updated=receipt.at;});
 S.actionReceipts.unshift(receipt);
 S.actionReceipts.length=Math.min(S.actionReceipts.length,120);
 if(route.r){
  S.handoffs.unshift({
   id:'HO-'+(1000+S.handoffs.length),receiptId:receipt.id,record:receipt.record,
   sourceRecord:receipt.sourceRecord,owner:route.r,accountable:route.a,
   action:route.next,due:route.due,at:receipt.at,status:'Open',createdBy:actor
  });
 }
 S.commsPending=receipt.id;
 S.commsDismissed='';
 return receipt;
}
const raciEntries=receipt=>{
 const rows=[['R','Responsible',receipt.r],['A','Accountable',receipt.a]];
 for(const r of receipt.c)rows.push(['C','Consulted',r]);
 for(const r of receipt.i)rows.push(['I','Informed',r]);
 const dedup=new Map();
 for(const [code,label,role] of rows){
  if(!role||role===receipt.actor)continue;
  if(dedup.has(role)){
   const item=dedup.get(role);item[0]+='/'+code;item[1]+=' / '+label;
  }else dedup.set(role,[code,label,role]);
 }
 return [...dedup.values()];
};
function receiptMarkup(receipt){
 const row=(letter,title,value)=>'<div class="comms-raci-row"><span class="comms-raci-letter">'+E(letter)+'</span><span class="comms-raci-name">'+E(title)+'</span><strong>'+E(value||'None assigned')+'</strong></div>';
 return '<div class="comms-receipt-head"><div><div class="comms-eyebrow">SELF-SERVICE ACTION RECEIPT</div><h3>✓ '+E(receipt.action)+' completed</h3><p>'+E(receipt.record)+' · '+E(receipt.at)+'</p></div>'+
 '<button class="comms-icon-btn" aria-label="Close confirmation" data-comms-action="dismiss">×</button></div>'+
 '<div class="comms-receipt-body"><p class="comms-detail">'+E(receipt.detail||'Business action recorded successfully.')+'</p>'+
 '<p class="comms-updated"><strong>Records updated:</strong> '+receipt.updated.map(E).join(', ')+'</p>'+
 '<div class="comms-raci-grid">'+row('R','Next responsible',receipt.r||'None · workflow complete')+
 row('A','Accountable',receipt.a)+
 (receipt.c.length?row('C','Consulted',receipt.c.join(', ')):'')+
 (receipt.i.length?row('I','Informed',receipt.i.join(', ')):'')+'</div>'+
 '<div class="comms-next"><strong>Next action</strong><p>'+E(receipt.next)+'</p><small>'+E(receipt.due)+'</small></div>'+
 '<p class="comms-honesty">In-app messages go to demo role inboxes. Text opens your device SMS composer; no automatic SMS is sent.</p>'+
 '<div class="comms-actions"><button class="btn primary" data-comms-action="message" data-receipt="'+E(receipt.id)+'">Send message</button>'+
 '<button class="btn" data-comms-action="text" data-receipt="'+E(receipt.id)+'">Send text…</button>'+
 '<button class="btn" data-comms-action="open-messages">View handoffs</button></div></div>';
}
function showReceipt(){
 const receipt=S.actionReceipts.find(r=>r.id===S.commsPending);
 const old=document.querySelector?.('#marketops-action-receipt');
 if(!receipt||S.commsDismissed===receipt.id||S.role!==receipt.actor){
  old?.remove?.();return;
 }
 if(!document.body?.appendChild)return;
 const box=old||document.createElement('aside');
 box.id='marketops-action-receipt';box.className='comms-receipt';box.setAttribute?.('aria-label','Action confirmation and RACI communication options');
 box.innerHTML=receiptMarkup(receipt);
 if(!old)document.body.appendChild(box);
}
const previousRender=render;
render=function(){previousRender();showReceipt();};
const messagesNav=groups.find(g=>g[0]==='COMMUNICATION');
if(messagesNav) {
 if(!messagesNav[1].some(x=>x[0]==='messages'))messagesNav[1].push(['messages','✉','Messages & Handoffs',roles.slice()]);
}else groups.push(['COMMUNICATION',[['messages','✉','Messages & Handoffs',roles.slice()]]]);
titles.messages=['Messages & Handoffs','Action receipts, RACI follow-up ownership and demo role-to-role messaging.'];
pageHelp.messages='This is a browser-only demo inbox. RACI ownership is recorded automatically after a successful action. To notify a role, send an in-app message, or prepare a text for explicit sending in your own SMS application.';

function roleMessages(tab){
 if(tab==='Sent')return S.messages.filter(x=>x.sender===S.role);
 if(tab==='Handoffs')return S.handoffs.filter(x=>x.owner===S.role||x.accountable===S.role||x.createdBy===S.role);
 return S.messages.filter(x=>x.recipient===S.role);
}
function commsPage(){
 const inbox=S.messages.filter(x=>x.recipient===S.role),unread=inbox.filter(x=>!x.read).length;
 const owned=S.handoffs.filter(x=>x.owner===S.role&&x.status==='Open');
 const sent=S.messages.filter(x=>x.sender===S.role);
 const tab=S.commsTab||'Inbox';
 const tabs=['Inbox','Sent','Handoffs'].map(x=>'<button class="comms-tab '+(x===tab?'active':'')+'" data-comms-action="tab" data-tab="'+x+'">'+x+'</button>').join('');
 let content='';
 if(tab==='Handoffs'){
  const rows=roleMessages(tab).slice(0,60);
  content=rows.map(x=>
   '<article class="comms-item"><div><strong>'+E(x.record)+' · '+E(x.action)+'</strong><small>Responsible: '+E(x.owner)+' · Accountable: '+E(x.accountable)+' · Due: '+E(x.due)+'</small>'+
   '<small>'+E(x.status)+' · '+E(x.at)+'</small></div><div class="comms-item-actions">'+
   (x.status==='Open'&&x.owner===S.role?'<button class="btn" data-comms-action="handoff-done" data-handoff="'+E(x.id)+'">Complete handoff</button>':'')+
   '<button class="btn" data-comms-action="message" data-receipt="'+E(x.receiptId)+'">Message RACI</button>'+
   '<button class="btn" data-comms-action="text" data-receipt="'+E(x.receiptId)+'">Text draft</button></div></article>').join('');
 }else{
  content=roleMessages(tab).slice(0,70).map(m=>
   '<article class="comms-item '+(!m.read&&tab==='Inbox'?'comms-unread':'')+'"><div><strong>'+E(m.subject)+'</strong>'+
   '<small>'+E(tab==='Inbox'?'From '+m.sender:'To '+m.recipient)+' · '+E(m.raci)+' · '+E(m.at)+'</small>'+
   '<p>'+E(m.body)+'</p><small>Demo in-app message · '+E(m.record)+'</small></div>'+
   (tab==='Inbox'&&!m.read?'<button class="btn" data-comms-action="read" data-message="'+E(m.id)+'">Mark read</button>':'')+'</article>').join('');
 }
 return '<div class="comms-page">'+
 '<div class="grid kpis">'+kpi('Inbox',inbox.length,'Role-addressed messages')+
 kpi('Unread',unread,'Not opened yet')+kpi('My open handoffs',owned.length,'Action ownership')+
 kpi('Messages sent',sent.length,'Demo inbox delivery')+'</div>'+
 '<div class="comms-notice">Role-specific inbox for <strong>'+E(S.role)+'</strong>. Only demo roles receive in-app messages. SMS is an external draft—not a delivered text. Message and handoff history stays in the current browser tab.</div>'+
 '<div class="comms-tabbar">'+tabs+'</div>'+
 '<section class="comms-list">'+(content||'<div class="comms-empty">Nothing in '+E(tab.toLowerCase())+' yet. Complete a self-service action to generate a RACI handoff and messaging options.</div>')+'</section>'+
 '<section class="comms-help"><h3>Who receives what?</h3><p><strong>R — Responsible:</strong> Owns and acts on the next step. <strong>A — Accountable:</strong> Ensures completion. <strong>C — Consulted:</strong> Included when input is needed. <strong>I — Informed:</strong> Receives a status update only when selected.</p><p>Send message defaults to Responsible and Accountable; Consulted and Informed are optional. Completed workflows explicitly say no follow-up is required.</p></section></div>';
}
renderers.messages=commsPage;
function findReceipt(id){return S.actionReceipts.find(r=>r.id===id);}
function composeMessage(receipt){
 if(!receipt)return notify('Action receipt unavailable.');
 const recipients=raciEntries(receipt);
 if(!recipients.length)return notify('No other RACI role needs a message for this completed action.');
 const actionable=recipients.some(([code])=>code.includes('R')||code.includes('A'));
 const rows=recipients.map(([code,label,role],idx)=>
  '<label class="comms-recipient"><input type="checkbox" name="to_'+idx+'" '+((code.includes('R')||code.includes('A')||(!actionable&&idx===0))?'checked':'')+'><span class="comms-raci-letter">'+E(code)+'</span>'+
  '<span><strong>'+E(role)+'</strong><small>'+E(label)+'</small></span></label>').join('');
 const body='MarketOps 360 · '+receipt.record+' — '+receipt.action+'. '+receipt.detail+
  ' Next: '+receipt.next+'. Owner: '+(receipt.r||'No follow-up')+'. Due: '+receipt.due+'.';
 const editor='<p class="card-sub">Select demo RACI role recipients. In-app messages appear only when the recipient switches to that role.</p>'+
 '<div class="comms-recipient-list">'+rows+'</div>'+
 W.el('Subject','subject',receipt.record+' · '+receipt.action)+
 '<div class="field"><label>Message</label><textarea name="body" rows="5" required>'+E(body)+'</textarea></div>';
 W.dialog('Send RACI message · '+receipt.record,editor,'Send in-app message',d=>{
  const selected=recipients.filter((r,i)=>d['to_'+i]==='on'||d['to_'+i]==='true');
  if(!selected.length)return notify('Select at least one RACI recipient.'),false;
  if(!d.body?.trim())return notify('Enter a message.'),false;
  for(const [raci,,role] of selected){
   const id='MSG-'+(1000+S.messages.length);
   S.messages.unshift({id,sender:S.role,recipient:role,raci,subject:d.subject,body:d.body,record:receipt.record,
    receiptId:receipt.id,at:now(),read:false,channel:'Demo in-app'});
  }
  render();notify('Message added to '+selected.length+' demo role inbox'+(selected.length===1?'':'es')+'.');
 });
}
function textDraft(receipt){
 if(!receipt)return notify('Action receipt unavailable.');
 const audience=unique([receipt.r,receipt.a,...receipt.c,...receipt.i].filter(r=>r!==receipt.actor));
 const draft='MarketOps 360 | '+receipt.record+': '+receipt.action+
 '. Next: '+receipt.next+'. Responsible: '+(receipt.r||'None')+'. Due: '+receipt.due+
 '. Review the record in MarketOps 360. [Demo notification]';
 const fields='<p class="card-sub">Intended RACI roles: '+E(audience.join(', ')||'No follow-up roles')+
 '. Enter the number of an authorized recipient. Phone numbers are not saved by the demo.</p>'+
 '<div class="field"><label>Recipient phone (international format, optional for copy)</label><input type="tel" name="phone" inputmode="tel" placeholder="+1XXXXXXXXXX"></div>'+
 '<div class="field"><label>Proposed text message</label><textarea name="draft" rows="5" required>'+E(draft)+'</textarea></div>'+
 '<p class="comms-honesty">Opening the SMS application prepares a message only. You must verify the recipient and explicitly send it. No SMS is sent automatically.</p>'+
 '<button type="button" class="btn" data-comms-action="copy-text">Copy text</button>';
 W.dialog('Prepare RACI text · '+receipt.record,fields,'Open SMS app',d=>{
  const phone=String(d.phone||'').trim();
  if(!/^\+[1-9]\d{7,14}$/.test(phone))return notify('Enter a valid international number (+ followed by 8–15 digits), or use Copy text.'),false;
  const sms='sms:'+phone+'?body='+encodeURIComponent(d.draft||draft);
  // User-initiated click opens the device composer; there is no external SMS API.
  const a=document.createElement('a');a.href=sms;a.rel='noopener';a.click();
  S.textDraftEvents=S.textDraftEvents||[];
  S.textDraftEvents.unshift({record:receipt.record,role:S.role,at:now(),status:'Opened device SMS composer — delivery unverified'});
  notify('SMS composer opened. No delivery confirmation is available.');
 });
}
function markHandoffDone(id){
 const h=S.handoffs.find(x=>x.id===id);
 if(!h||h.owner!==S.role||h.status!=='Open')return notify('Only the responsible role may complete this open handoff.');
 const fields=W.el('Completion evidence','evidence','Required follow-up completed and reviewed');
 W.dialog('Complete follow-up · '+h.record,fields,'Complete handoff',d=>{
  if(!d.evidence.trim())return notify('Completion evidence is required.'),false;
  h.status='Completed';h.evidence=d.evidence;h.updated=now();
  // Handoff completion itself is a successful self-service action, with a closed receipt.
  W.audit('Handoff completed',h.record,h.action+' · '+d.evidence);
  render();notify('Handoff completed. No further step is assigned by this handoff.');
 });
}
document.addEventListener('click',function(e){
 const b=e.target.closest?.('[data-comms-action]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const a=b.dataset.commsAction;
 if(a==='dismiss'){S.commsDismissed=S.commsPending;document.querySelector?.('#marketops-action-receipt')?.remove?.();return;}
 if(a==='open-messages'){S.commsDismissed=S.commsPending;S.page='messages';render();return;}
 if(a==='message')return composeMessage(findReceipt(b.dataset.receipt));
 if(a==='text')return textDraft(findReceipt(b.dataset.receipt));
 if(a==='tab'){S.commsTab=b.dataset.tab;render();return;}
 if(a==='read'){const msg=S.messages.find(x=>x.id===b.dataset.message);if(msg&&msg.recipient===S.role)msg.read=true;render();return;}
 if(a==='handoff-done')return markHandoffDone(b.dataset.handoff);
 if(a==='copy-text'){
  const field=b.closest('.modal')?.querySelector('textarea[name="draft"]');
  if(!field)return notify('Draft text is unavailable.');
  if(navigator?.clipboard?.writeText)navigator.clipboard.writeText(field.value).then(()=>notify('SMS draft copied. No message has been sent.')).catch(()=>notify('Copy unavailable; select the text manually.'));
  else{field.focus();field.select();notify('Select and copy the SMS draft. No message has been sent.');}
 }
},true);
window.MarketOpsComms={onAudit,config,findReceipt,roleMessages,showReceipt,composeMessage,textDraft,markHandoffDone};
})();
