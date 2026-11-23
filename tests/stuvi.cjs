/* Focused StuVi checks: preserve dashboards and keep responses grounded in demo state. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),app=read('app.js'),source=read('stuvi.js');
new vm.Script(source,{filename:'stuvi.js'});
assert.ok(fs.existsSync(path.join(root,'stuvi-avatar.webp')),'Optimized StuVi portrait asset missing');
assert.ok(source.includes('class="chat-launch stuvi-avatar-launch"'),'StuVi launcher must retain the chat button');
assert.ok(source.includes('<img src="stuvi-avatar.webp" alt=""'),'StuVi launcher must use the approved illustration, not the question mark');
assert.ok(source.includes('aria-label="Open StuVI — Your Virtual Intelligence"'),'Avatar control must remain accessible');
assert.ok(!source.includes('input.focus('),'StuVi must not automatically focus the iPhone text input');
assert.ok(source.includes('if(document.activeElement===input)input.blur();'),'Suggestion tap must dismiss an already active mobile keyboard');
assert.ok(source.includes('const question=input.value;input.blur();send(question);'),'Sending typed questions must dismiss mobile keyboard');
assert.ok(source.includes('quick?addMessage'),'Local suggestion answers must render directly in the chat');
assert.ok(html.includes('stuvi.js')&&html.includes('stuvi.css'),'StuVI assets must load');
assert.ok(html.includes('marketops-brand.css'),'MarketOps editorial brand stylesheet must load');
assert.ok(html.indexOf('marketops-brand.css')<html.indexOf('stuvi.css'),'StuVI styles must follow MarketOps theme');
assert.ok(source.includes('Your Virtual Intelligence'),'StuVI must use its new identity');
assert.ok(!source.includes('Demo assistant'),'Remove old Demo assistant label');
assert.ok(source.includes('class="stuvi-portrait"'),'Portrait must appear in the StuVI chat header');
assert.ok(html.indexOf('app.js')<html.indexOf('stuvi.js'),'StuVi must load after MarketOps state');
assert.ok(!app.includes('? Demo guide'),'Duplicated Demo guide button must be removed');
assert.ok(!app.includes('data-action="help"'),'Redundant static Help buttons must be removed');
const S={
 role:'Regional Manager',page:'overview',
 stores:[{name:'Downtown Market',health:'Watch',manager:'M. Patel'},{name:'Westside Market',health:'On track'}],
 products:[{name:'Oat Beverage',stock:0,par:18,supplier:'Pacific Plant Foods'}],
 risks:[{title:'Pasadena permit delay',severity:'Critical',owner:'Development lead',status:'Escalated',due:'Nov 25',area:'Permits'}],
 initiatives:[{name:'Unified inventory',health:'Amber',progress:65,owner:'Retail systems'}],
 expansions:[{name:'Pasadena',health:'At risk',completion:46,owner:'West Development'}],
 tasks:[{title:'Review receiving variance',priority:'High',owner:'DC West',status:'Open',due:'Today'}],
 shipments:[{id:'ASN-7302',status:'Arriving',eta:'Today'}],suppliers:[{name:'Valley Fresh Farms',score:96,status:'Approved'}]
};
const scope={S,titles:{overview:['Enterprise command center','Retail performance'], 'it-portfolio':['IT portfolio delivery','Technology initiatives'],expansion:['Expansion command center','New stores']},pageHelp:{overview:'Compare operating health across stores.', 'it-portfolio':'Connect initiative delivery to readiness.',expansion:'Check new-store launch gates.'},window:{}};
vm.runInNewContext(source,scope,{filename:'stuvi.js'});
const bot=scope.window.marketOpsStuVi;
assert.ok(bot&&typeof bot.localAnswer==='function','StuVi assistant not registered');
assert.match(bot.localAnswer('Which store needs attention?'),/Downtown Market/);
assert.match(bot.localAnswer('What is the biggest risk?'),/Pasadena permit delay/);
assert.match(bot.localAnswer('What stock is low?'),/Oat Beverage/);
assert.match(bot.localAnswer('Who owns the next task?'),/DC West/);
S.role='IT Program Manager';S.page='it-portfolio';
assert.match(bot.localAnswer('What needs attention?'),/Unified inventory/);
S.role='Expansion Director';S.page='expansion';
assert.match(bot.localAnswer('What should I do next?'),/Pasadena/);
assert.match(bot.localAnswer('Is this Trader Joe’s production data?'),/simulation/);
assert.equal(bot.localAnswer('Why should we change supplier lead times?'),null,'Open-ended questions should take the AI or fallback path');
console.log('StuVi PASS — removed redundant Help; role-aware store, risk, inventory, task, IT, expansion, demo-disclosure responses.');
