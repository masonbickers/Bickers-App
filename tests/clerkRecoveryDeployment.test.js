import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecoveryDeployment } from '../firebase/auth-page/recovery-deployment.mjs';
const pilot={defaultDeployment:'pilot',enabledDeployments:['pilot']};
test('the live pilot recovery page uses only its enabled backend for every URL hint',()=>{
 for(const search of ['','?deployment=pilot','?deployment=primary','?deployment=https://foreign.example'])assert.equal(selectRecoveryDeployment(search,pilot),'pilot');
});
test('primary recovery can be enabled deliberately after its matching backend is ready',()=>{
 const primary={defaultDeployment:'primary',enabledDeployments:['primary','pilot']};
 assert.equal(selectRecoveryDeployment('',primary),'primary');assert.equal(selectRecoveryDeployment('?deployment=pilot',primary),'pilot');
});
test('invalid deployment configuration fails before any recovery request',()=>{
 for(const config of [{},{defaultDeployment:'foreign',enabledDeployments:['pilot']},{defaultDeployment:'primary',enabledDeployments:['pilot']},{defaultDeployment:'pilot',enabledDeployments:['pilot','foreign']}])assert.throws(()=>selectRecoveryDeployment('',config));
});
