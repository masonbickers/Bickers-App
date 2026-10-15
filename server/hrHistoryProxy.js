// Business session gates run before this fixed-route proxy. The office repeats
// verification against canonical records inside the history read snapshot.
export function createHrHistoryProxy({origin=process.env.HR_WEB_ORIGIN || process.env.APP_PASSWORD_WEB_ORIGIN || process.env.RECEIPTS_WEB_ORIGIN,fetchImpl=globalThis.fetch,production=process.env.NODE_ENV==='production'}={}) {
 return async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  const authorization=req.headers?.authorization;if(!/^Bearer \S+$/.test(authorization || ''))return res.status(401).json({error:'Sign in again.'});
  const history=req.method==='GET' && req.path==='/history';
  const cancel=req.method==='POST' && req.path==='/records';
  if(!history && !cancel)return res.status(404).json({error:'Private history route not found.'});
  if(history && (!['timesheets','holidays'].includes(req.query?.collection) || Object.keys(req.query || {}).some(k=>k!=='collection')))return res.status(400).json({error:'Invalid private history request.'});
  if(cancel && (req.body?.action!=='cancelPendingHoliday' || req.body?.collection!=='holidays' || !/^[\w-]{1,160}$/.test(req.body?.id || '') || typeof req.body?.expectedUpdateTime!=='string' || !req.body.expectedUpdateTime))return res.status(400).json({error:'Invalid pending holiday cancellation.'});
  let url;
  try{url=new URL(String(origin || ''));if(url.username || url.password || url.search || url.hash || !['https:','http:'].includes(url.protocol) || (production && url.protocol!=='https:'))throw Error();url.pathname=history?'/api/hr/history':'/api/hr/records';if(history)url.searchParams.set('collection',req.query.collection);}catch{return res.status(503).json({error:'Private history service is not configured.'});}
  try {
   const body=cancel?{collection:'holidays',id:req.body.id,action:'cancelPendingHoliday',expectedUpdateTime:req.body.expectedUpdateTime}:null;
   const response=await fetchImpl(url,{method:req.method,redirect:'error',headers:{Authorization:authorization,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),...(body?{body:JSON.stringify(body)}:{})});
   return res.status(response.status).json(await response.json());
  }catch{return res.status(503).json({error:'Private history could not be verified. Reconnect and retry.'});}
 };
}
