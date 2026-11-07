import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../js/features/project/app.project-ui.js', import.meta.url), 'utf8');
const handlers = {};
const popupHandlers = {};
let timer, delay;
let popupCount = 0;
const popup = {hidden: true, style: {}, offsetWidth: 300, offsetHeight: 250, setAttribute(){}, addEventListener(name, handler){popupHandlers[name]=handler;}, contains:()=>false};
const container = {dataset:{},addEventListener:(name,handler)=>{handlers[name]=handler;},contains:()=>true};
const bar = {getBoundingClientRect:()=>({left:100,right:200,top:50,bottom:68,width:100}),closest:()=>button,contains:()=>false};
const button = {dataset:{closureRow:'0',closureStatus:'pending'},setAttribute(){},querySelector:()=>bar,matches:()=>false};
const context = vm.createContext({
  setTimeout:(fn,ms)=>{timer=fn;delay=ms;return 1;}, clearTimeout(){timer=null;},
  renderProjectClosureDetails:()=>'<header>Details</header><div>Items</div>',
  document:{createElement:()=>popup,body:{appendChild(){popupCount++;}},addEventListener(){}},
  window:{innerWidth:1000,innerHeight:800,addEventListener(){}}
});
vm.runInContext(source.slice(source.indexOf('function bindProjectClosureDetails('),source.indexOf('function matchesProjectTrackingFilters(')),context);
context.bindProjectClosureDetails(container,[{}],'orgGroup');
const event = (x,y,onBar=true) => ({target:{closest:selector=>selector === '.project-closure-chart-bar' ? (onBar ? bar : null) : button},clientX:x,clientY:y,detail:1});
handlers.mouseover(event(250,60,false));
assert.equal(popupCount,0,'Empty part of the row must not open details');
handlers.mouseover(event(215,60));
assert.equal(popupCount,0,'Value label beyond the bar must not open details');
handlers.focusin(event(250,60,false));
assert.equal(popupCount,0,'Pointer focus on the full row must not open details');
handlers.mouseover(event(150,60));
assert.equal(popupCount,1);
assert.equal(popup.hidden,false);
popup.innerHTML='preserve scrolled content';
handlers.mouseover(event(160,60));
assert.equal(popup.innerHTML,'preserve scrolled content','Hover within the same bar must not reset its list');
handlers.scroll();
assert.equal(popup.hidden,true);
console.log('Closure hover passed: bar bounds, empty track, value label, pointer focus, stable content and scroll dismissal.');
handlers.mouseover(event(150,60));
handlers.mouseout?.(event(150,60));
handlers.mouseleave?.();
handlers.focusout?.({relatedTarget: null});
assert.equal(popup.hidden,false,'Details stay open during the grace period');
assert.equal(delay,750);
popupHandlers.mouseenter();
assert.equal(timer,null,'Entering the popup cancels dismissal');
popupHandlers.mouseleave();
assert.equal(delay,750);
timer();
assert.equal(popup.hidden,true,'Details close 0.75 seconds after leaving');
handlers.mouseover(event(150,60));
assert.equal(popup.hidden,false);
popupHandlers.focusin();
assert.equal(timer,null);
const hiddenStatuses = new Set();
let dismissCount = 0;
const legendContainer = {
  classList: {toggle(key) { if (hiddenStatuses.has(key)) { hiddenStatuses.delete(key); return false; } hiddenStatuses.add(key); return true; }},
  hideClosureDetails(){dismissCount++;}
};
const toggles = ['pending','closed'].map(status => ({
  dataset: {closureToggle: status}, attributes: {},
  addEventListener(type,handler){this[type]=handler;},
  setAttribute(key,value){this.attributes[key]=value;}
}));
context.document.querySelectorAll=()=>toggles;
context.syncProjectClosureSeries=()=>{};
vm.runInContext(source.slice(source.indexOf('function bindProjectClosureLegend('),source.indexOf('function bindProjectClosureDetails(')),context);
context.bindProjectClosureLegend(legendContainer);
toggles[0].click();
assert.equal(toggles[0].attributes['aria-pressed'],'false');
assert.ok(hiddenStatuses.has('hide-pending'));
assert.ok(!hiddenStatuses.has('hide-closed'));
toggles[1].click();
assert.ok(hiddenStatuses.has('hide-closed'));
toggles[0].click();
assert.equal(toggles[0].attributes['aria-pressed'],'true');
assert.ok(!hiddenStatuses.has('hide-pending'));
assert.equal(dismissCount,3);
console.log('750 ms hover grace period, popup interaction and independent legend toggles passed.');
