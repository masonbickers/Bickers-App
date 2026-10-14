import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopPhotoUploader } from '../lib/workshopPhotoUpload.js';

test('retrying the same photo retains its URL so saved submissions stay idempotent',async()=>{
  let writes=0;
  const upload=createWorkshopPhotoUploader(async()=>`https://example.test/photo-${++writes}`);
  assert.equal(await upload('file://one','company/record'),'https://example.test/photo-1');
  assert.equal(await upload('file://one','company/record'),'https://example.test/photo-1');
  assert.equal(await upload('file://two','company/record'),'https://example.test/photo-2');
  assert.equal(await upload('file://one','company/other'),'https://example.test/photo-3');
});
test('failed upload can retry and concurrent requests share one upload',async()=>{
  let writes=0;
  const upload=createWorkshopPhotoUploader(async()=>{if(++writes===1)throw new Error('Offline');return 'https://example.test/photo';});
  await assert.rejects(upload('file://one','record'),/Offline/);
  const urls=await Promise.all([upload('file://one','record'),upload('file://one','record')]);
  assert.deepEqual(urls,['https://example.test/photo','https://example.test/photo']);assert.equal(writes,2);
});
test('different simultaneous photos always use different destination paths',async()=>{
  const clock=Date.now;Date.now=()=>123;
  try{
    const paths=[];const upload=createWorkshopPhotoUploader(async(uri,path)=>{paths.push(path);return `https://example.test/${path}`;});
    const urls=await Promise.all([upload('file://one','record'),upload('file://two','record')]);
    assert.notEqual(paths[0],paths[1]);assert.notEqual(urls[0],urls[1]);
  }finally{Date.now=clock;}
});
