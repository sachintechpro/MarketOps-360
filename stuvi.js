/* StuVi — concise, role-aware MarketOps 360 executive assistant.
 * Keeps all activity inside this illustrated retail simulation.
 * Uses live AI only when the separately hosted StuVi demo API is configured;
 * otherwise relies on the current on-page demo state, never invented records.
 */
(function(){
'use strict';
const API='https://stuvi-ai-companion-api.onrender.com/api/marketops-chat';
const conversation=[];
let waiting=false;
const data=()=>Array.isArray(S.stores)?S.stores:[];
const list=(v)=>Array.isArray(v)?v:[];
const label=()=>titles[S.page]?.[0]||'this workspace';
const strip=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const brief=(x,max=320)=>{let s=strip(x);if(s.length<=max)return s;const end=s.lastIndexOf(' ',max);return s.slice(0,end>max*.65?end:max).replace(/[,. ;:]+$/,'')+'…';};
function context(){
 const stores=data();
 const low=list(S.products).filter(p=>Number(p.stock)<Number(p.par)*.6);
 const flagged=stores.filter(s=>/watch|risk|delay/i.test(String(s.health||'')));
 const risks=list(S.risks).filter(x=>!/(closed|resolved)/i.test(String(x.status||'')));
 const initiatives=list(S.initiatives);
 const expansions=list(S.expansions);
 const tasks=list(S.tasks).filter(x=>!/(closed|done|completed)/i.test(String(x.status||'')));
 return {
  role:S.role,page:S.page,pageTitle:label(),
  pagePurpose:pageHelp[S.page]||titles[S.page]?.[1]||'Connected retail execution',
  storeCount:stores.length,
  flaggedStores:flagged.slice(0,6).map(x=>({name:x.name,health:x.health,manager:x.manager,region:x.region,sales:x.sales})),
  lowStock:low.slice(0,7).map(x=>({name:x.name,stock:x.stock,par:x.par,supplier:x.supplier})),
  risks:risks.slice(0,6).map(x=>({title:x.title,severity:x.severity,owner:x.owner,status:x.status,due:x.due,area:x.area})),
  initiatives:initiatives.slice(0,7).map(x=>({name:x.name,health:x.health,progress:x.progress,owner:x.owner,phase:x.phase,budget:x.budget,spend:x.spend})),
  openings:expansions.slice(0,6).map(x=>({name:x.name,health:x.health,completion:x.completion,stage:x.stage,owner:x.owner,open:x.open})),
  tasks:tasks.slice(0,7).map(x=>({title:x.title,priority:x.priority,owner:x.owner,due:x.due,status:x.status,area:x.area})),
  shipments:list(S.shipments).filter(x=>x.status!=='Received').slice(0,5).map(x=>({id:x.id,status:x.status,eta:x.eta,dc:x.dc})),
  suppliers:list(S.suppliers).slice(0,5).map(x=>({name:x.name,score:x.score,status:x.status,leadDays:x.lead}))
 };
}
function flaggedSummary(c){
 const a=c.flaggedStores;
 if(!a.length)return 'There are no stores marked Watch or At risk in the current demo records.';
 return a.slice(0,3).map(x=>x.name+' ('+x.health+')').join(', ')+'. '+(a.length>3?'There are '+a.length+' flagged stores. ':'')+'Open Stores & regions to review their follow-up.';
}
function riskSummary(c){
 const rs=[...c.risks].sort((a,b)=>({critical:0,high:1,medium:2,low:3}[String(a.severity).toLowerCase()]??4)-({critical:0,high:1,medium:2,low:3}[String(b.severity).toLowerCase()]??4));
 if(!rs.length)return 'No active risks appear in the current demo list. Check RAID & decisions for new items.';
 const top=rs[0];
 return top.title+' is '+String(top.severity||'open').toLowerCase()+' ('+(top.status||'open')+'). '+(top.owner?'Owner: '+top.owner+'. ':'')+'I’d check the impact and next decision in RAID & decisions.';
}
function lowStockSummary(c){
 if(!c.lowStock.length)return 'No items are below 60% of par in this demo snapshot. Inventory control has the full list.';
 return c.lowStock.slice(0,3).map(p=>p.name+' ('+p.stock+' on hand / '+p.par+' par)').join('; ')+'. Check replenishment in Inventory control.';
}
function itSummary(c){
 const a=c.initiatives.filter(x=>!/(green|on track)/i.test(String(x.health||'')));
 if(!a.length)return 'The IT initiatives in this snapshot are marked green. I’d still check dependencies and release evidence in IT portfolio delivery.';
 return a.slice(0,2).map(x=>x.name+' is '+x.health+(Number.isFinite(Number(x.progress))?' at '+x.progress+'%':'')).join('; ')+'. I’d ask the owners for blockers and the next release gate.';
}
function expansionSummary(c){
 const a=c.openings.filter(x=>/risk|watch|delay/i.test(String(x.health||'')));
 if(!a.length)return 'No openings are flagged in this snapshot. Expansion command center shows the readiness gates.';
 return a.slice(0,2).map(x=>x.name+' ('+x.health+', '+x.completion+'% complete)').join('; ')+'. Review the open readiness gates before committing a date.';
}
function taskSummary(c){
 const a=c.tasks.filter(x=>/high|urgent|critical/i.test(String(x.priority||'')));
 const t=a[0]||c.tasks[0];
 if(!t)return 'There are no open tasks in this demo snapshot. You can create an action when a follow-up is needed.';
 return 'A good next follow-up is “'+t.title+'”'+(t.owner?' with '+t.owner:'')+(t.due?' ('+t.due+')':'')+'. Check the owner and any downstream handoff.';
}
function nextDecision(c){
 const p=c.page;
 if(p==='it-portfolio')return itSummary(c);
 if(p==='expansion')return expansionSummary(c);
 if(['stores','overview','analytics','store-ops'].includes(p) && c.flaggedStores.length)return flaggedSummary(c);
 if(['inventory','catalog','procurement','receiving','purchase-orders','distribution','transfers'].includes(p) && c.lowStock.length)return lowStockSummary(c);
 if(['risks','reports'].includes(p))return riskSummary(c);
 if(p==='workforce')return 'Start with the teams that have the lowest coverage, then confirm hiring or scheduling owners in People & workforce.';
 return taskSummary(c);
}
function localAnswer(question,c=context()){
 const q=strip(question).toLowerCase();
 if(!q)return null;
 if(/^(hi|hey|hello|good morning|good afternoon|good evening)[!. ]*$/.test(q))return 'Hi, I’m StuVi. You’re viewing '+label()+' as '+c.role+'. What are you trying to decide?';
 if(/^(help|what can you do|how can you help|who are you)\??$/.test(q))return 'I can spot issues in this demo, explain a number, or help you find the next decision. Try “What needs attention?”';
 // Leave nuanced reasoning and trade-off questions for StuVi's AI service.
 if(/^(why\b|how\b|what if\b|would it\b|should we\b|compare\b|evaluate\b|help me decide\b)/.test(q))return null;
 if(/^(summari[sz]e|quick read|brief me|give me a summary|what am i looking at|what is this page)/i.test(q))return brief(c.pagePurpose+' '+nextDecision(c),350);
 if(/(what needs attention|what should i do|next action|next decision|biggest priority|where should i start|what should we do first|what is urgent|prioriti[sz]e)/i.test(q))return nextDecision(c);
 if(/(risk|blocker|escalat|dependency|issue|raid)/i.test(q))return riskSummary(c);
 if(/(store on watch|which store|stores? (need|are|is|performance)|regional performance)/i.test(q))return flaggedSummary(c);
 if(/(inventory|replenish|stock|out of stock|low supply|par level)/i.test(q))return lowStockSummary(c);
 if(/(it portfolio|program|technology initiative|release read|tech delivery|project health|portfolio health)/i.test(q))return itSummary(c);
 if(/(opening|expansion|new store|readiness gate)/i.test(q))return expansionSummary(c);
 if(/(task|work queue|who owns|accountab|owner|follow.up)/i.test(q))return taskSummary(c);
 if(/(supplier|purchase order|procurement|shipment|receiving|distribution)/i.test(q)){
   const inbound=c.shipments[0];
   return inbound?'The next inbound record is '+inbound.id+' ('+inbound.status+', '+inbound.eta+'). Check Receiving & inspection for the handoff.':'There are no pending inbound shipments shown. Procurement workbench and Purchase orders show the buying flow.';
 }
 if(/(demo|real data|live data|trader joe|fictional|production)/i.test(q))return 'This is a retail operating simulation using fictional data, not Trader Joe’s internal system. Your actions affect the demo state only.';
 return null;
}
function gentleFallback(q,c){
 const known=localAnswer(q,c);
 if(known)return known;
 const p=brief(c.pagePurpose,160);
 return 'On '+c.pageTitle+', '+p+' Tell me the specific decision or record you want to look at, and I’ll narrow it down.';
}
async function aiAnswer(question,c){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),9500);
 try{
  const response=await fetch(API,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({page:c.page,role:c.role,state:c,history:conversation.slice(-6),message:question}),
   signal:controller.signal
  });
  if(!response.ok)throw Error('service_unavailable');
  const payload=await response.json();
  if(!payload.answer||typeof payload.answer!=='string')throw Error('empty_answer');
  return brief(payload.answer,440);
 } finally {clearTimeout(timeout);}
}
function addMessage(box,kind,message){
 const p=document.createElement('div');
 p.className='chat-msg '+kind;p.textContent=message;
 box.appendChild(p);box.scrollTop=box.scrollHeight;
 return p;
}
function mount(){
 let chat=document.querySelector('#contextChat');
 if(chat){
  const contextEl=chat.querySelector('.chat-context');
  if(contextEl)contextEl.textContent=S.role+' · '+label();
  return;
 }
 chat=document.createElement('div');chat.id='contextChat';
 chat.innerHTML='<button class="chat-launch" type="button" aria-label="Ask StuVi for help" aria-expanded="false" aria-controls="stuvi-panel">?</button>'+
  '<section id="stuvi-panel" class="chat-panel stuvi-panel" role="dialog" aria-label="StuVi executive assistant" aria-hidden="true">'+
   '<div class="chat-head"><div><b>StuVi <span class="stuvi-indicator">Demo assistant</span></b><small class="chat-context"></small></div><button type="button" class="chat-close" aria-label="Close StuVi">×</button></div>'+
   '<div class="chat-body" role="log" aria-live="polite" aria-relevant="additions text"></div>'+
   '<div class="stuvi-suggestions" aria-label="Suggested questions"><button type="button" data-ask="Give me a quick read">Quick read</button><button type="button" data-ask="What needs attention?">What needs attention?</button><button type="button" data-ask="What should I do next?">Next step</button></div>'+
   '<form class="chat-form"><input class="chat-input" autocomplete="off" maxlength="450" aria-label="Message StuVi" placeholder="What would you like to know?"><button class="chat-ask" type="submit">Send</button></form>'+
   '<p class="stuvi-disclaimer">Illustrative retail data · StuVi can advise, not perform actions.</p>'+
  '</section>';
 document.body.appendChild(chat);
 const launch=chat.querySelector('.chat-launch'),panel=chat.querySelector('.chat-panel'),close=chat.querySelector('.chat-close'),body=chat.querySelector('.chat-body'),input=chat.querySelector('.chat-input'),submit=chat.querySelector('.chat-ask'),form=chat.querySelector('form');
 const toggle=(open)=>{
  const show=typeof open==='boolean'?open:!chat.classList.contains('open');
  chat.classList.toggle('open',show);panel.setAttribute('aria-hidden',String(!show));launch.setAttribute('aria-expanded',String(show));
  if(show){if(!body.children.length)addMessage(body,'assistant','Hi! I’m StuVi. I can help with priorities, risks or the next decision on this page.');} // Never trigger a phone keyboard just by opening the chat.
  else launch.focus({preventScroll:true});
 };
 const send=async(q)=>{
  q=strip(q).slice(0,450);if(!q||waiting)return;
  input.value='';addMessage(body,'user',q);
  waiting=true;submit.disabled=true;
  const c=context(),quick=localAnswer(q,c);
  // Suggestions with a grounded local answer respond immediately in the chat.
  // Show a subtle in-chat pending message only if an AI request is actually needed.
  const bubble=quick?addMessage(body,'assistant',brief(quick,440)):addMessage(body,'assistant','One moment…');
  if(!quick){
   let answer;
   try {answer=await aiAnswer(q,c);}
   catch(_) {answer=gentleFallback(q,c);}
   bubble.textContent=brief(answer,440);
  }
  conversation.push({role:'user',text:q},{role:'assistant',text:bubble.textContent});
  if(conversation.length>16)conversation.splice(0,conversation.length-16);
  waiting=false;submit.disabled=false;body.scrollTop=body.scrollHeight; // Keep focus on selected suggestion; do not summon the mobile keyboard.
 };
 launch.addEventListener('click',()=>toggle());
 close.addEventListener('click',()=>toggle(false));
 form.addEventListener('submit',e=>{e.preventDefault();send(input.value);});
 chat.querySelectorAll('[data-ask]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.ask)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&chat.classList.contains('open'))toggle(false);});
 chat.querySelector('.chat-context').textContent=S.role+' · '+label();
}
window.marketOpsStuVi={mount,localAnswer,context};
})();