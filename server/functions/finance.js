import {googleJson, response, fail} from './_google.js';
import {readSession, isOwner, requestOriginAllowed} from './_session.js';

const GST_DEFAULT=18;
const PAYMENT_METHODS=['UPI','Bank Transfer','Cash','Cheque','Other'];
const INVOICE_STATUSES=['DRAFT','SENT','PARTIALLY PAID','PAID','CANCELLED'];
const money=v=>Number.isFinite(Number(v))?Math.round(Number(v)*100)/100:0;
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=d=>String(d||'').slice(0,7);

function auth(event){return readSession(event.headers?.cookie||event.headers?.Cookie);}
function body(event){try{return JSON.parse(event.body||'{}')}catch{return null}}
function id(prefix,rows){let max=0;for(const r of rows){const m=String(r?.id||'').match(new RegExp(`^${prefix}-(\\d+)$`));if(m)max=Math.max(max,+m[1])}return `${prefix}-${String(max+1).padStart(5,'0')}`}
async function sheet(name){
 const id=process.env.GOOGLE_SHEET_ID;const range=encodeURIComponent(`${name}!A:ZZ`);
 const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`);const rows=x.values||[];if(!rows.length)return [];
 return rows.slice(1).map(r=>Object.fromEntries(rows[0].map((h,i)=>[h,r[i]??''])));
}
async function put(name,rows){
 const id=process.env.GOOGLE_SHEET_ID, range=encodeURIComponent(`${name}!A:ZZ`);
 const headers=[...new Set(rows.flatMap(r=>Object.keys(r||{})))];const values=headers.length?[headers,...rows.map(r=>headers.map(h=>typeof r[h]==='object'?JSON.stringify(r[h]):r[h]??''))]:[];
 await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}:clear`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(values.length)await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})});
}
function calc({baseAmount=0,parkingAmount=0,otherCharges=0,gstRate=GST_DEFAULT}){const base=money(baseAmount),parking=money(parkingAmount),other=money(otherCharges),rate=Number(gstRate??GST_DEFAULT);const subtotal=money(base+parking+other),gst=money(subtotal*rate/100);return {baseAmount:base,parkingAmount:parking,otherCharges:other,subtotal,gstRate:rate,gstAmount:gst,totalAmount:money(subtotal+gst)}}
function status(inv,paid=0){if(inv.status==='CANCELLED')return 'CANCELLED';if(paid>=money(inv.totalAmount)&&money(inv.totalAmount)>0)return 'PAID';if(paid>0)return 'PARTIALLY PAID';return 'DRAFT'}
function invoiceNo(rows){let max=0;for(const r of rows){const m=String(r.invoiceNumber||'').match(/(\d+)$/);if(m)max=Math.max(max,+m[1])}return `INV-${new Date().getFullYear()}-${String(max+1).padStart(5,'0')}`}
async function audit(user,action,entity,details){const rows=await sheet('audit_logs');rows.push({id:id('AUD',rows),timestamp:new Date().toISOString(),userId:user.username||'',action,entity,details:JSON.stringify(details||{})});await put('audit_logs',rows)}

export async function handler(event){
 const user=auth(event);if(!user)return fail(401,'UNAUTHENTICATED','Sign in required.');if(event.httpMethod!=='GET'&&!requestOriginAllowed(event))return fail(403,'FORBIDDEN','Cross-origin request blocked.');
 try{
  if(event.httpMethod==='GET'){
   const [payments,invoices,occupants]=await Promise.all([sheet('payments'),sheet('invoices'),sheet('occupants')]);
   return response(200,{success:true,data:{payments,invoices,occupants}},{'Cache-Control':'no-store'});
  }
  if(event.httpMethod!=='POST')return fail(405,'METHOD_NOT_ALLOWED','POST required.');
  if(isOwner(user))return fail(403,'FORBIDDEN','Owner accounts are read-only.');
  const b=body(event)||{};const action=b.action;
  if(action==='createInvoice'){
   if(!b.occupantId||!b.invoicePeriod)return fail(400,'VALIDATION_ERROR','Occupant and invoice period are required.');
   const [occ,invoices]=await Promise.all([sheet('occupants'),sheet('invoices')]);const o=occ.find(x=>x.id===b.occupantId);if(!o)return fail(404,'NOT_FOUND','Occupant not found.');
   const c=calc(b),inv={id:id('INV',invoices),invoiceNumber:b.invoiceNumber||invoiceNo(invoices),invoiceDate:b.invoiceDate||today(),buyerName:o.name,buyerGSTIN:o.gstin||'',buyerState:b.buyerState||'',agreementReference:b.agreementReference||o.id,invoicePeriod:b.invoicePeriod,hsn:b.hsn||'997212',items:b.items||[],...c,paidAmount:0,paymentStatus:'DRAFT',status:'DRAFT',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   invoices.push(inv);await put('invoices',invoices);await audit(user,'CREATE_INVOICE',inv.id,{invoiceNumber:inv.invoiceNumber});return response(200,{success:true,data:inv});
  }
  if(action==='updateInvoice'){
   const invoices=await sheet('invoices'),inv=invoices.find(x=>x.id===b.id);
   if(!inv)return fail(404,'NOT_FOUND','Invoice not found.');
   if(inv.status==='CANCELLED')return fail(409,'CANCELLED','Cancelled invoice cannot be edited.');
   const allowed=['invoiceNumber','invoiceDate','invoicePeriod','buyerGSTIN','buyerState','agreementReference','hsn','items','baseAmount','parkingAmount','otherCharges','gstRate'];
   for(const key of allowed) if(Object.prototype.hasOwnProperty.call(b,key)) inv[key]=b[key];
   Object.assign(inv,calc(inv),{updatedAt:new Date().toISOString()});
   await put('invoices',invoices);await audit(user,'UPDATE_INVOICE',inv.id,{fields:allowed.filter(k=>Object.prototype.hasOwnProperty.call(b,k))});
   return response(200,{success:true,data:inv});
  }
  if(action==='setInvoiceStatus'){
   const invoices=await sheet('invoices'),inv=invoices.find(x=>x.id===b.id);if(!inv)return fail(404,'NOT_FOUND','Invoice not found.');if(!INVOICE_STATUSES.includes(b.status))return fail(400,'VALIDATION_ERROR','Invalid invoice status.');inv.status=b.status;inv.paymentStatus=b.status;inv.updatedAt=new Date().toISOString();await put('invoices',invoices);await audit(user,'SET_INVOICE_STATUS',inv.id,{status:b.status});return response(200,{success:true,data:inv});
  }
  if(action==='recordPayment'){
   const amount=money(b.amount);if(!b.invoiceId||amount<=0)return fail(400,'VALIDATION_ERROR','Invoice and positive payment amount are required.');if(b.paymentMethod&&!PAYMENT_METHODS.includes(b.paymentMethod))return fail(400,'VALIDATION_ERROR','Invalid payment method.');
   const [invoices,payments]=await Promise.all([sheet('invoices'),sheet('payments')]);const inv=invoices.find(x=>x.id===b.invoiceId);if(!inv)return fail(404,'NOT_FOUND','Invoice not found.');if(inv.status==='CANCELLED')return fail(409,'CANCELLED','Cancelled invoice cannot receive payment.');
   const already=money(inv.paidAmount);if(already+amount>money(inv.totalAmount)+.01)return fail(409,'OVERPAYMENT','Payment exceeds invoice balance.');
   const payment={id:id('PAY',payments),occupantId:inv.occupantId||b.occupantId||'',invoiceId:inv.id,billingMonth:inv.invoicePeriod,baseAmount:inv.baseAmount,parkingAmount:inv.parkingAmount,otherCharges:inv.otherCharges,gstRate:inv.gstRate,gstAmount:inv.gstAmount,totalAmount:amount,dueDate:inv.invoiceDate,paidDate:b.paidDate||today(),paymentMethod:b.paymentMethod||'Other',transactionReference:String(b.transactionReference||''),status:'PAID',notes:String(b.notes||''),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   payments.push(payment);inv.paidAmount=money(already+amount);inv.paymentStatus=status(inv,inv.paidAmount);inv.status=inv.paymentStatus;inv.updatedAt=new Date().toISOString();await put('payments',payments);await put('invoices',invoices);await audit(user,'RECORD_PAYMENT',payment.id,{invoiceId:inv.id,amount});return response(200,{success:true,data:{payment,invoice:inv}});
  }
  return fail(400,'INVALID_ACTION','Unsupported finance operation.');
 }catch(e){console.error(e);return fail(500,'FINANCE_ERROR','Unable to complete finance operation.');}
}
