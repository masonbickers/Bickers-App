import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('the standalone API package loads shared identity guards without files outside its deployment root',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'bickers-server-identity-'));
  try {
    for(const entry of await readdir(new URL('../server/',import.meta.url),{withFileTypes:true})) {
      if(entry.isFile()&&(entry.name.endsWith('.js')||entry.name==='package.json')) await copyFile(new URL('../server/'+entry.name,import.meta.url),path.join(directory,entry.name));
    }
    const result=spawnSync(process.execPath,['--input-type=module','--eval',`
      import assert from 'node:assert/strict';
      const [gate]=await Promise.all(['./appPasswordSetup.js','./workingTermsIdentity.js','./workshopSubmission.js','./employeeAuthSession.js'].map(file=>import(file)));
      assert.equal(gate.mobilePasswordAccessAllowed({uid:'staff',auth_time:100,firebase:{sign_in_provider:'password'}},{uid:'staff',isEnabled:true,companyId:'company',employeeId:'emp',mobileAccessStatus:'active'}),true);
    `],{cwd:directory,encoding:'utf8',env:{PATH:process.env.PATH}});
    assert.equal(result.status,0,result.stderr);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
