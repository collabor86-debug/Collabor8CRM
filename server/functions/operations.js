import {googleJson,response,fail} from './_google.js';
import {readSession, isOwner} from './_session.js';

const SHEETS=new Set(['maintenance','inventory','vendors','expenses','automation','integrations']);
const ADMIN_ONLY=new Set(['expenses','automation','integrations']);
function auth(e){return readSession(e.headers?.cookie||e.headers?.Cookie)}
function body(e){try{return JSON.parse(e.body||'{}')}catch{return null}}
async function read(name){
 const id=process.env.GOOGLE_SHEET_ID;
 const range=encodeURIComponent(`${name}!A:ZZ`);
 const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`);
 const rows=x.values||[]; if(!rows.length)return [];
 return rows.slice(1).map(r=>Object.fromEntries(rows[0].map((h,i)=>[h,r[i]??''])));
}
async function write(name,rows){
 const id=process.env.GOOGLE_SHEET_ID,range=encodeURIComponent(`${name}!A:ZZ`);
 const headers=[...new Set(rows.flatMap(r=>Object.keys(r||{})))];
 const values=headers.length?[headers,...rows.map(r=>headers.map(h=>typeof r[h]==='object'?JSON.stringify(r[h]):r[h]??''))]:[];
 await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}:clear`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(values.length)await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})});
}
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
function nextId(rows,prefix){return `${prefix}-${String(rows.length+1).padStart(5,'0')}`}
export async function handler(event){
 const user=auth(event);if(!user)return fail(401,'UNAUTHENTICATED','Sign in required.');
 try{
  const b=body(event)||{}; const sheet=event.queryStringParameters?.sheet||b.sheet;
  if(!sheet||!SHEETS.has(sheet))return fail(400,'VALIDATION_ERROR','Invalid operations sheet.');
  if(ADMIN_ONLY.has(sheet)&&user.role!=='admin')return fail(403,'FORBIDDEN','Admin access required.');
  if(event.httpMethod==='GET')return response(200,{success:true,data:await read(sheet)},{'Cache-Control':'no-store'});
  if(event.httpMethod!=='POST'&&event.httpMethod!=='PATCH'&&event.httpMethod!=='DELETE')return fail(405,'METHOD_NOT_ALLOWED','Unsupported method.');
  if(isOwner(user))return fail(403,'FORBIDDEN','Owner accounts are read-only.');
  let rows=await read(sheet);
  if(event.httpMethod==='DELETE'){
   const id=clean(b.id); rows=rows.filter(x=>String(x.id)!==id); await write(sheet,rows); return response(200,{success:true,data:rows});
  }
  if(!b.record||typeof b.record!=='object')return fail(400,'VALIDATION_ERROR','record is required.');
  const rec={...b.record,updatedAt:new Date().toISOString(),updatedBy:user.username};
  if(event.httpMethod==='POST' || !b.id){
   const prefix={maintenance:'MNT',inventory:'AST',vendors:'VND',expenses:'EXP',automation:'AUT',integrations:'INT'}[sheet];
   rec.id=clean(rec.id)||nextId(rows,prefix);rec.createdAt=rec.createdAt||new Date().toISOString();rec.createdBy=rec.createdBy||user.username;rows.push(rec);
  }else{
   const idx=rows.findIndex(x=>String(x.id)===String(b.id));if(idx<0)return fail(404,'NOT_FOUND','Record not found.');rows[idx]={...rows[idx],...rec,id:rows[idx].id};
  }
  await write(sheet,rows);return response(200,{success:true,data:rows});
 }catch(e){console.error(e);return fail(500,'OPERATIONS_ERROR','Unable to save operations data.');}
}
