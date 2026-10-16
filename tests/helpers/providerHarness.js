import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');
export function providerHarness(filename, name, mocks) {
  let index = 0; const slots = [], pending = [];
  const depsEqual = (a,b) => a && b && a.length === b.length && a.every((x,i)=>Object.is(x,b[i]));
  const hooks = {...React,
    useState(initial) {const i=index++;slots[i] ||= {value:typeof initial==='function'?initial():initial};return[slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},
    useRef(initial){const i=index++;return slots[i] ||= {current:initial};},
    useMemo(fn,deps){const i=index++;if(!slots[i]||!depsEqual(slots[i].deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=index++;if(!slots[i]||!depsEqual(slots[i].deps,deps)){const old=slots[i];slots[i]={deps};pending.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const {code}=transformSync(readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,plugins:[['@babel/plugin-transform-typescript',{isTSX:true}],'@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,Date,Map,Set,Promise,setTimeout,clearTimeout,process:{env:{}},require:key=>key==='react'?{...hooks,default:hooks,__esModule:true}:mocks[key]||{}},{filename});
  return {render:()=>{index=0;return module.exports[name]({children:null}).props.value;},effects:()=>{pending.splice(0).forEach(fn=>fn());},dispose:()=>slots.forEach(x=>x?.cleanup?.())};
}
