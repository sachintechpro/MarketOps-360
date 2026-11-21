/* MarketOps 360 — UAT regression register; additive QA page extension.
 * Historical observations come from the 2026-11-21 simulated-source UAT.
 * A previously observed defect is never automatically treated as fixed.
 */
(function(){
'use strict';

const cases=[
 {id:'UAT-001',severity:'Critical',role:'Distribution Manager',area:'Receiving',title:'Receipt must match approved PO SKU',
  pre:'Confirmed PO for PRD-1042; PRD-1077 also belongs to its supplier.',
  steps:['Create and confirm a PO for PRD-1042.','Open the related ASN; try selecting PRD-1077 instead.','Accept units and inspect both SKU balances.'],
  expected:'Reject a non-PO SKU and leave all inventory and PO balances unchanged.',
  observed:'Receipt accepted PRD-1077 for a PRD-1042 PO and increased the wrong SKU.'},
 {id:'UAT-002',severity:'Critical',role:'Distribution Manager',area:'Receiving',title:'Cannot receive more than authorized PO quantity',
  pre:'Confirmed purchase order for 8 units and its inbound shipment.',
  steps:['Open the 8-unit shipment for receiving.','Change the expected and accepted unit values to 80.','Submit; inspect inventory, PO and cumulative receipts.'],
  expected:'Block quantities above approved remaining PO units, including across partial receipts.',
  observed:'80 units were accepted for an 8-unit PO; 80 were added to stock.'},
 {id:'UAT-003',severity:'High',role:'System Administrator',area:'Roles & permissions',title:'Hide unavailable role actions',
  pre:'Use all 15 persona selections and all menus available to each persona.',
  steps:['Switch roles and inspect action buttons on each accessible page.','Click controls the role should not use, such as Buyer > Create PO and Executive > Create Action.','Check the visible action state against the role permission rules.'],
  expected:'Only permitted actionable controls appear; restricted options are hidden or clearly disabled with a reason.',
  observed:'49 role/page combinations showed at least one action denied by the runtime permission check.'},
 {id:'UAT-004',severity:'High',role:'Executive',area:'Dashboard metrics',title:'All operating KPIs reflect live records',
  pre:'Sample labor plans, initiatives, ASN, and QA inspection records are loaded.',
  steps:['Change store open shifts from 2 to 99 and check the People KPI.','Set all IT initiatives to Green and check the red/amber KPI.','Add an inbound ASN; fail a quality inspection; check Distribution and Quality KPIs.'],
  expected:'Every affected KPI recalculates from live records or is explicitly labeled a static sample.',
  observed:'Open shifts stayed 14; IT risk stayed 2; inbound stayed 340 cases; QA stayed 98.6%.'},
 {id:'UAT-005',severity:'High',role:'People Manager',area:'Expansion',title:'Opening gate enforces staffing readiness',
  pre:'Irvine opening at stage 9; 490 of 720 planned hours staffed (68%).',
  steps:['Sign in as People Manager in the demo role selector.','Open Irvine stage 9 readiness approval.','Provide generic evidence and approve without closing the staffing shortfall.'],
  expected:'Block approval until staffing threshold is met, or require an explicit authorized exception.',
  observed:'Expansion advanced from stage 9 to 10 despite only 68% staffing coverage.'},
 {id:'UAT-006',severity:'High',role:'Quality Manager',area:'Record identity',title:'Quality Open action selects the clicked inspection',
  pre:'The Quality table displays at least two inspection types.',
  steps:['Open Quality controls.','Click Open for the Supplier documentation row.','Compare the modal check ID, title and location to the clicked row.'],
  expected:'The modal opens the exact quality check selected; no fallback to another inspection.',
  observed:'Supplier documentation opened QA-302, the Cooler temperature log.'},
 {id:'UAT-007',severity:'High',role:'People Manager',area:'Workforce',title:'Team schedule buttons open their own records',
  pre:'Workforce shows Store Leadership and Crew & Customer team entries.',
  steps:['Click View Schedule for Store Leadership.','Close it and click View Schedule for Crew & Customer.','Compare the team, site, hours and work assignment shown.'],
  expected:'Each action opens the correct team schedule or a clearly identified team view.',
  observed:'Both buttons opened the Westside Market labor plan.'},
 {id:'UAT-008',severity:'High',role:'Buyer / Merchandising',area:'Promotions',title:'Approved promotion price reaches checkout',
  pre:'An active SKU with a proposed discounted promotion.',
  steps:['Create a promotion with a lower effective retail price.','Obtain required Buyer/Finance approval.','Compare storefront displayed price, cart total and checkout total.'],
  expected:'Approved, effective promotions update the right SKU price consistently without changing historical base-price records.',
  observed:'Promotion became Approved but storefront still showed the unchanged product price.'},
 {id:'UAT-009',severity:'High',role:'Customer',area:'Customer service',title:'Customer can track submitted service requests',
  pre:'Customer profile and customer-service workbench are available.',
  steps:['As Customer, submit a new service request.','Switch to store service to verify its creation.','Return to My Orders & Account and look for its status/history.'],
  expected:'The submitting customer sees their own case reference, status and resolution information.',
  observed:'Case existed in shared workbench but not in the customer account.'},
 {id:'UAT-010',severity:'High',role:'Expansion Director',area:'Master data',title:'Operating stores do not duplicate unfinished openings',
  pre:'Store network and expansion projects are loaded.',
  steps:['Find Pasadena and Ventura in the Stores & regions view.','Find identically named sites in the Expansion Command Center.','Compare operating sales and readiness stages.'],
  expected:'Separate an existing operating location from a new site, or reconcile the store/project state.',
  observed:'Both locations had positive sales yet were incomplete openings at stages 6/12 and 3/12.'},
 {id:'UAT-011',severity:'Medium',role:'Buyer / Merchandising',area:'Product lifecycle',title:'Prelaunch product cannot appear Active early',
  pre:'Heirloom Tomato Medley has a product-introduction record.',
  steps:['Open its NPI status and current gate.','Find the product in the active master catalog.','Compare stage completion with Active/sellable status.'],
  expected:'Active listing occurs only after mandatory approval and launch gates or a documented exception.',
  observed:'Product was Active in the catalog while its NPI had reached only stage 8/12.'},
 {id:'UAT-012',severity:'High',role:'Regional Manager',area:'Inventory',title:'Replenishment is evaluated per SKU and location',
  pre:'PRD-1077 network stock 42, Westside stock 21, par 30.',
  steps:['Open Inventory control and its SKU-level health signal.','Open the location stock ledger for PRD-1077.','Compare Westside availability to local par and the network status.'],
  expected:'Flag Westside below-par even when total network stock is above the SKU par.',
  observed:'Product appeared healthy globally despite Westside being under par.'},
 {id:'UAT-013',severity:'Medium',role:'Distribution Manager',area:'Receiving',title:'Unscheduled delivery opens controlled intake',
  pre:'Distribution Receiving workbench with unmatched delivery action.',
  steps:['Click Record unscheduled delivery.','Attempt to capture supplier, SKU, arrival, quantity and exception.','Verify the delivery appears as an unmatched/held record.'],
  expected:'A functional, non-saleable intake and reconciliation flow, or a non-actionable explanation.',
  observed:'The action only showed guidance; no receiving intake form or record was created.'},
 {id:'UAT-014',severity:'Medium',role:'Buyer / Merchandising',area:'Catalog & storefront',title:'Every product department is available in filters',
  pre:'Product master includes two Household SKUs.',
  steps:['Open Buyer > Product catalog and inspect category filters.','Switch to Customer storefront and inspect department pills.','Try filtering for Household products.'],
  expected:'Both views derive filters from the product master, including Household.',
  observed:'Household products existed but Household was absent from both category controls.'},
 {id:'UAT-015',severity:'Medium',role:'Finance Manager',area:'Finance reporting',title:'Forecast narrative matches current variance',
  pre:'Finance capital forecasts and portfolio narrative are visible.',
  steps:['Increase an opening-project forecast so aggregate overrun is $1.1M.','Save and reopen Finance.','Compare the financial variance totals with the explanatory callout.'],
  expected:'The narrative reflects the latest aggregate variance and its correct sign.',
  observed:'The narrative still claimed $100K above budget when actual overrun was $1.1M.'},
 {id:'UAT-016',severity:'Medium',role:'Executive',area:'Reports',title:'Each report exports its stated dataset',
  pre:'Multiple report options available on Reports & governance.',
  steps:['Generate two differently named operational reports.','Inspect each CSV header, row selection and scope.','Compare to each report title and selected filters.'],
  expected:'Report-specific columns, records and appropriate role scope; downloads identified by report.',
  observed:'Different report buttons produced the same generic CSV snapshot.'},
 {id:'UAT-017',severity:'Medium',role:'Customer',area:'Storefront',title:'Pickup availability uses selected store',
  pre:'SKU available at North Park but zero at Westside.',
  steps:['Set Westside stock to zero while keeping North Park stock positive.','As Customer select or intend North Park pickup.','Inspect Add to Basket and attempt the purchase.'],
  expected:'Availability and basket controls use the selected pickup location throughout.',
  observed:'Westside stock controlled the initial basket button before the pickup location was selected.'},
 {id:'UAT-018',severity:'Medium',role:'Quality Manager',area:'Traceability',title:'Quality recall identifies lot and store acknowledgments',
  pre:'Multiple batches of a product are distributed to stores.',
  steps:['Create a quality hold for a particular supplier lot/batch.','Identify affected stores, units and expiry/best-by dates.','Record store recall acknowledgments and disposition/release evidence.'],
  expected:'Lot-specific hold, scoped store recall, traceable acknowledgments and controlled disposition.',
  observed:'Quality holds captured SKU and location but did not capture lot or affected-store acknowledgment.'}
];

const E=window.marketOpsWorkflows.E;
const badge=severity=>'<span class="uat-severity uat-severity-'+severity.toLowerCase()+'">'+E(severity)+'</span>';
const outcomes=['Not retested','Pass','Fail','Blocked'];
const states=['Open','In progress','Ready for retest','Verified / Closed','Accepted risk'];
const roles=['Executive','Buyer / Merchandising','Procurement Manager','Distribution Manager','Regional Manager','Store Captain','Mate','Crew','Finance Manager','Quality Manager','IT Program Manager','Expansion Director','People Manager','System Administrator','Customer'];
function getReview(id){
 const found=(S.uatReviews||{})[id]||{};
 return {outcome:found.outcome||'Not retested',state:found.state||'Open',tester:found.tester||'',evidence:found.evidence||'',date:found.date||''};
}
function initialize(){
 if(!S.uatReviews||typeof S.uatReviews!=='object')S.uatReviews={};
 if(!S.uatFilter||typeof S.uatFilter!=='object')S.uatFilter={severity:'All',outcome:'All',role:'All',query:''};
}
initialize();
const previous=renderers['scenario-lab'];
const navEntry=groups.flatMap(g=>g[1]).find(x=>x[0]==='scenario-lab');
if(navEntry){navEntry[2]='QA & UAT Bench';for(const role of ['Quality Manager','Regional Manager'])if(!navEntry[3].includes(role))navEntry[3].push(role);}
titles['scenario-lab']=['QA & UAT Bench','Run data-integrity checks, review UAT defects, and document evidence-based cross-role retests.'];

function renderCase(c){
 const r=getReview(c.id);
 const latest=r.date?'Last executed '+E(r.date)+' · '+E(r.tester):'No retest recorded';
 const result=r.outcome==='Not retested'?'Pending retest':r.outcome;
 const list=items=>'<ol class="uat-steps">'+items.map(s=>'<li>'+E(s)+'</li>').join('')+'</ol>';
 return '<details class="uat-case" id="uat-'+c.id+'" data-uat-id="'+c.id+'" data-severity="'+E(c.severity)+'" data-outcome="'+E(r.outcome)+'" data-role="'+E(c.role)+'" data-search="'+E((c.id+' '+c.title+' '+c.area+' '+c.role+' '+c.observed+' '+c.expected).toLowerCase())+'">'+
 '<summary class="uat-case-head"><span class="uat-case-name"><strong>'+E(c.id)+' · '+E(c.title)+'</strong><span class="uat-meta">'+E(c.area)+' · '+E(c.role)+' · '+latest+'</span></span><span class="uat-case-flags">'+badge(c.severity)+'<span class="uat-outcome">'+E(result)+'</span></span></summary>'+
 '<div class="uat-case-body"><div class="uat-facts"><div><h4>Preconditions</h4><p>'+E(c.pre)+'</p></div><div><h4>Steps to execute</h4>'+list(c.steps)+'</div></div>'+
 '<div class="uat-facts"><div><h4>Expected result</h4><p>'+E(c.expected)+'</p></div><div><h4>Previous observed defect</h4><p>'+E(c.observed)+'</p></div></div>'+
 '<div class="uat-case-foot"><span><strong>Defect:</strong> '+E(r.state)+' · <strong>Retest:</strong> '+E(r.outcome)+'</span><button class="btn primary" data-uat-action="record" data-uat-id="'+c.id+'">Record retest</button></div>'+
 (r.evidence?'<p class="uat-evidence"><strong>Recorded evidence:</strong> '+E(r.evidence)+'</p>':'')+'</div></details>';
}
function renderSuite(){
 initialize();
 const review=cases.map(c=>({c,r:getReview(c.id)}));
 const counts={critical:cases.filter(x=>x.severity==='Critical').length,high:cases.filter(x=>x.severity==='High').length,
   open:review.filter(x=>!['Verified / Closed','Accepted risk'].includes(x.r.state)).length,
   verified:review.filter(x=>x.r.state==='Verified / Closed'&&x.r.outcome==='Pass').length,
   passed:review.filter(x=>x.r.outcome==='Pass').length};
 const selected=(name,value,options)=>'<label class="uat-filter-label">'+E(name)+'<select class="uat-filter" data-uat-filter="'+E(name.toLowerCase())+'">'+options.map(x=>'<option value="'+E(x)+'" '+(x===value?'selected':'')+'>'+E(x)+'</option>').join('')+'</select></label>';
 return '<section class="uat-section" id="uat-regression-suite" aria-label="UAT scenario register">'+
 '<div class="uat-section-head"><div><div class="eyebrow">RETEST & DEFECT TRACKING</div><h2>UAT regression scenarios</h2><p>18 source-tested defects from November 21, 2026. Historical failures remain open until a reviewer records retest evidence. Running the separate integrity checks above does not mark these scenarios passed.</p></div></div>'+
 '<div class="uat-stats">'+
 '<div class="uat-stat"><strong>18</strong><span>Scenario cases</span></div>'+
 '<div class="uat-stat"><strong>'+counts.critical+'</strong><span>Critical findings</span></div>'+
 '<div class="uat-stat"><strong>'+counts.high+'</strong><span>High findings</span></div>'+
 '<div class="uat-stat"><strong>'+counts.open+'</strong><span>Open / in review</span></div>'+
 '<div class="uat-stat"><strong>'+counts.verified+'</strong><span>Verified closed</span></div>'+
 '</div>'+
 '<div class="uat-toolbar">'+
 selected('Severity',S.uatFilter.severity,['All','Critical','High','Medium'])+
 selected('Outcome',S.uatFilter.outcome,['All'].concat(outcomes))+
 selected('Role',S.uatFilter.role,['All'].concat(roles))+
 '<label class="uat-filter-label uat-search-label">Find scenario<input class="uat-filter" type="search" data-uat-filter="query" value="'+E(S.uatFilter.query)+'" placeholder="ID, workflow or keyword"></label>'+
 '<div class="uat-toolbar-actions"><button class="btn" data-uat-action="export">Export UAT CSV</button><button class="btn" data-uat-action="reset">Clear retest records</button></div></div>'+
 '<p class="uat-small">Historical defect observations are from a simulated JavaScript test run, not verified live-browser UAT. <strong>UAT approval is blocked</strong> until critical findings are verified closed and full browser tests are complete.</p>'+
 '<div class="uat-cases">'+cases.map(renderCase).join('')+'</div>'+
 '<p class="uat-small uat-visible-count" aria-live="polite">Showing '+cases.length+' of '+cases.length+' scenarios</p>'+
 '</section>';
}
renderers['scenario-lab']=function(){return previous()+'<div class="uat-lab-extension">'+renderSuite()+'</div>';};
function saveResult(id){
 const c=cases.find(x=>x.id===id);if(!c)return;
 const current=getReview(id),W=window.marketOpsWorkflows;
 W.dialog('Retest · '+c.id,
  '<p class="card-sub"><strong>'+E(c.title)+'</strong> · '+E(c.severity)+' · '+E(c.role)+'</p>'+
  W.select('Retest outcome','outcome',outcomes,current.outcome)+
  W.select('Defect disposition','state',states,current.state)+
  W.el('Tester / reviewer','tester',current.tester||S.role)+
  '<div class="field"><label for="uat-evidence-input">Execution evidence, actual result or blocker</label>'+
  '<textarea id="uat-evidence-input" name="evidence" rows="4" required placeholder="Steps performed, observed outcome, screenshot/reference or blocker">'+E(current.evidence)+'</textarea></div>',
  'Save retest result', d=>{
    if(!d.tester.trim()||!d.evidence.trim())return notify('Tester and evidence are required.'),false;
    if(d.state==='Verified / Closed'&&d.outcome!=='Pass')return notify('A defect can be verified closed only after a passing retest.'),false;
    S.uatReviews[c.id]={outcome:d.outcome,state:d.state,tester:d.tester,evidence:d.evidence,date:new Date().toLocaleString()};
    W.audit('UAT retest recorded',c.id,d.outcome+' / '+d.state);
    render();notify(c.id+' retest saved for this browser tab.');
  });
}
function exportCsv(){
 const rows=[['ID','Severity','Area','Test role','Title','Preconditions','Steps','Expected','Prior observed','Defect state','Retest result','Tester','Evidence','Date']];
 cases.forEach(c=>{const r=getReview(c.id);rows.push([c.id,c.severity,c.area,c.role,c.title,c.pre,c.steps.map((v,i)=>(i+1)+'. '+v).join(' | '),c.expected,c.observed,r.state,r.outcome,r.tester,r.evidence,r.date]);});
 const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='marketops360-uat-18-scenarios.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
function resetReviews(){
 window.marketOpsWorkflows.dialog('Clear UAT retest history','<p>Clear all locally recorded UAT execution results? The 18 historical defect scenarios and their prior observations will remain listed.</p>','Clear results',()=>{
  S.uatReviews={};window.marketOpsWorkflows.audit('UAT retest records cleared','UAT suite','Historical cases retained');render();notify('Retest results cleared. All 18 cases remain open.');});
}
function applyFilters(){
 const el=document.querySelector('.uat-section');if(!el)return;
 const filter=S.uatFilter;let count=0;
 el.querySelectorAll('.uat-case').forEach(row=>{
  const match=(filter.severity==='All'||row.dataset.severity===filter.severity)&&
  (filter.outcome==='All'||row.dataset.outcome===filter.outcome)&&
  (filter.role==='All'||row.dataset.role===filter.role)&&
  (!filter.query||row.dataset.search.includes(filter.query.toLowerCase()));
  row.hidden=!match;if(match)count++;
 });
 const countLabel=el.querySelector('.uat-visible-count');
 if(countLabel)countLabel.textContent='Showing '+count+' of '+cases.length+' scenarios';
}
document.addEventListener('click',function(e){
 const btn=e.target.closest?.('[data-uat-action]');if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(btn.dataset.uatAction==='record')return saveResult(btn.dataset.uatId);
 if(btn.dataset.uatAction==='export')return exportCsv();
 if(btn.dataset.uatAction==='reset')return resetReviews();
},true);
function onFilter(e){
 const control=e.target.closest?.('[data-uat-filter]');if(!control)return;
 const key=control.dataset.uatFilter;if(!Object.prototype.hasOwnProperty.call(S.uatFilter,key))return;
 S.uatFilter[key]=control.value;applyFilters();
}
document.addEventListener('change',onFilter,true);
document.addEventListener('input',onFilter,true);
window.MarketOpsUAT={cases:cases.slice(),getReview,renderSuite};
})();
