import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {parseHolidayCalendar} from '../lib/holidayCalendar.js';
const require=createRequire(import.meta.url);
const filename=new URL('../hooks/useHolidayCalendar.js',import.meta.url).pathname;
const {code}=require('@babel/core').transformSync(readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']});
function harness() {
  const state=[],effects=[],requests=[];let cursor=0,effectCursor=0;
  const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useCallback:fn=>fn,
    useEffect(fn,deps){const i=effectCursor++,old=effects[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){old?.cleanup?.();effects[i]={deps,cleanup:fn()};}}};
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,AbortController,Set,Date,fetch:(url,options)=>new Promise(resolve=>requests.push({url,options,resolve})),require:name=>name==='react'?react:{parseHolidayCalendar}},{filename});
  return {requests,render(year=2026){cursor=0;effectCursor=0;return module.exports.useHolidayCalendar(year);},unmount(){effects.forEach(e=>e.cleanup?.());}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const ok=date=>({ok:true,json:async()=>({'england-and-wales':{events:[{date}]}})});
test('calendar starts unavailable, loads real dates and retries a failed request',async()=>{
  const h=harness();assert.equal(h.render().ready,false);
  h.requests[0].resolve({ok:false});await flush();
  let calendar=h.render();assert.ok(calendar.error);assert.equal(calendar.ready,false);
  calendar.refresh();calendar=h.render();assert.equal(calendar.ready,false);assert.equal(calendar.error,null);
  h.requests[1].resolve(ok('2026-12-25'));await flush();calendar=h.render();
  assert.equal(calendar.ready,true);assert.equal(calendar.isBankHoliday(new Date(2026,11,25)),true);
  assert.equal(calendar.isBankHoliday(new Date(2026,11,24)),false);h.unmount();
});
test('late calendar responses cannot replace the year currently being calculated',async()=>{
  const h=harness();h.render(2026);h.render(2027);assert.equal(h.requests[0].options.signal.aborted,true);
  h.requests[0].resolve(ok('2026-12-25'));await flush();assert.equal(h.render(2027).ready,false);
  h.requests[1].resolve(ok('2027-01-01'));await flush();assert.equal(h.render(2027).ready,true);h.unmount();
});
