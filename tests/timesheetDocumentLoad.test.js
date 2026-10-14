import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadTimesheetDocument } from '../lib/timesheetDocumentLoad.js';

test('a missing company-query row hydrates legacy days and notes from its exact document', async () => {
 const data={employeeCode:'staff',weekStart:'2026-09-28',days:{Monday:{dayNotes:'Keep this'}},notes:'Existing notes'};
 let requested;
 const row=await loadTimesheetDocument(null,'staff_2026-09-28',async(id)=>{
  requested=id; return {exists:()=>true,data:()=>data};
 });
 assert.equal(requested,'staff_2026-09-28');
 assert.deepEqual(row,{id:requested,...data});
});
test('a denied or offline direct read must reject rather than initialize a blank draft',async()=>{
 for(const code of ['permission-denied','unavailable']) {
  await assert.rejects(loadTimesheetDocument(null,'staff_2026-09-28',async()=>{throw Object.assign(new Error(code),{code});}),{code});
 }
});
test('confirmed nonexistence allows a new draft and a loaded row needs no extra network read',async()=>{
 assert.equal(await loadTimesheetDocument(null,'staff_2026-09-28',async()=>({exists:()=>false})),null);
 const row={id:'existing',notes:'saved'};
 assert.equal(await loadTimesheetDocument(row,'existing',async()=>{throw new Error('unexpected read');}),row);
});
test('the week editor waits for hydration and locks writes after failed document reads',()=>{
 const source=readFileSync(new URL('../app/(protected)/week/[id]/index.js',import.meta.url),'utf8');
 assert.match(source,/getDocFromServer\(doc\(db, "timesheets", documentId\)\)/);
 assert.match(source,/const isLocked = isApproved \|\| !timesheetDocumentReady/);
 assert.match(source,/setHydratedDocumentKey\(null\);\s*setDocumentLoadError\(err\)/);
 assert.match(source,/!timesheetDocumentReady \? \(/);
});
test('switching weeks cannot reuse the previous weeks dirty state or draft fields',()=>{
 const source=readFileSync(new URL('../app/(protected)/week/[id]/index.js',import.meta.url),'utf8');
 assert.match(source,/const hasUnsavedChanges = timesheetDocumentReady && baselineSignature !== null/);
 const load=source.slice(source.indexOf('const data = await loadTimesheetDocument('),source.indexOf('setHydratedDocumentKey(timesheetDocumentKey);'));
 assert.doesNotMatch(load,/if \(prev\.employeeCode\)/);
 assert.match(load,/weekStart: id,\s*days: defaults,\s*notes: "",\s*submitted: false,\s*status: null,/);
 assert.doesNotMatch(load,/const next = \{\s*\.\.\.prev,/);
});
