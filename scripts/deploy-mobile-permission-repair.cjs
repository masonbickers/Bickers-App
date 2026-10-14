// Guarded deployment of the independently reviewed 2026-10-03 mobile repair.
// Refuses to replace rules that changed since the captured live baseline.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const base = '/usr/local/lib/node_modules/firebase-tools/lib/';
const { configstore } = require(base + 'configstore');
const rules = require(base + 'gcp/rules');
const project = 'bickers-booking';
const root = path.resolve(__dirname, '../firebase/mobile-compat');
const sha = content => createHash('sha256').update(content).digest('hex');
const targets = [
  { kind: 'firestore', release: 'cloud.firestore' },
  { kind: 'storage', release: 'firebase.storage/bickers-booking.firebasestorage.app' },
];
(async () => {
  await require(base + 'requireAuth').requireAuth({project,user:configstore.get('user'),tokens:configstore.get('tokens')});
  const releases = await rules.listAllReleases(project);
  for (const target of targets) {
    const live = releases.find(r => r.name === `projects/${project}/releases/${target.release}`);
    if (!live) throw Error(`Missing release: ${target.release}`);
    const files = await rules.getRulesetContent(live.rulesetName);
    const baseline = fs.readFileSync(path.join(root,'previous',`${target.kind}.rules`),'utf8');
    if (files.length !== 1 || files[0].content !== baseline) throw Error(`${target.kind} rules changed since baseline; refusing deployment`);
    target.previousRuleset = live.rulesetName;
    target.content = fs.readFileSync(path.join(root,`${target.kind}.rules`),'utf8');
    target.hash = sha(target.content);
    target.files = [{name:files[0].name,content:target.content}];
  }
  // Both candidates must compile successfully before either live release changes.
  for (const target of targets) target.newRuleset = await rules.createRuleset(project,target.files);
  const current = await rules.listAllReleases(project);
  for (const target of targets) {
    if (current.find(r => r.name === `projects/${project}/releases/${target.release}`)?.rulesetName !== target.previousRuleset)
      throw Error(`${target.kind} release changed during compilation; refusing deployment`);
  }
  const receipt = {project,startedAt:new Date().toISOString(),targets:targets.map(({kind,release,previousRuleset,newRuleset,hash})=>({kind,release,previousRuleset,newRuleset,hash})),verified:false};
  const receiptPath = path.join(root,'deployment.json');
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  for (const target of targets) {
    await rules.updateRelease(project,target.newRuleset,target.release);
    console.log(`${target.kind} released: ${target.newRuleset}`);
  }
  const published = await rules.listAllReleases(project);
  for (const target of targets) {
    const live = published.find(r => r.name === `projects/${project}/releases/${target.release}`);
    const files = await rules.getRulesetContent(live.rulesetName);
    if (live.rulesetName !== target.newRuleset || sha(files[0].content) !== target.hash) throw Error(`${target.kind} post-deploy verification failed`);
  }
  receipt.verified = true;
  receipt.verifiedAt = new Date().toISOString();
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  console.log('Verified both live releases match the tested candidate.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
