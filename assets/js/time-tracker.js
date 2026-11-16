'use strict';

async function autosaveTimesheetRow(id,manual=false){
 const row=document.querySelector('[data-ts-row="'+CSS.escape(id)+'"]');if(!row)return false;
 const val=k=>row.querySelector('[data-ts-field="'+k+'"]')?.value?.trim()||'';
 const date=val('date'),personId=val('assigneeId'),projectId=val('projectId'),ticketId=val('ticketId'),description=val('description'),note=val('note'),externalEntryStatus=val('externalEntryStatus')||'Not Started',bill=Number(val('billableHours')||0),non=Number(val('nonBillableHours')||0);
 const state=row.querySelector('[data-ts-save-state]');
 const say=(v)=>{if(state)state.textContent=v};
 if(!date||!personId||!projectId||!description){say('Fill required fields');if(manual)showToast('Date, Assigne Name, Project and Ticket Subject are required.',true);return false}
 if(!Number.isFinite(bill)||!Number.isFinite(non)||bill<0||non<0||bill>1000||non>1000||bill+non<=0){say('Check hours');if(manual)showToast('Enter valid hours. Time Spent must be greater than zero.',true);return false}
 if(!['Not Started','Pending','Filled'].includes(externalEntryStatus)){say('Check status');if(manual)showToast('Choose a valid external timesheet status.',true);return false}
 const person=await get('assignees',personId);if(!person||person.active===false){say('Choose assignee');if(manual)showToast('Choose an active assignee.',true);return false}
 say('Saving…');
 const draft=row.classList.contains('draft-row'),persistedId=row.dataset.persistedId||(!id.startsWith('draft-')?id:null),existing=persistedId?await get('timesheets',persistedId):null;
 const record={id:existing?.id||uid(),date,consultantId:person.id,assigneeId:person.id,projectId,ticketId,description,billableHours:bill,nonBillableHours:non,totalHours:Math.round((bill+non)*100)/100,weekOfMonth:'Week '+Math.ceil(Number(date.slice(-2))/7),note,externalEntryStatus,createdAt:existing?.createdAt||now(),updatedAt:now(),deletedAt:null};
 await put('timesheets',record);
 if(draft){row.dataset.persistedId=record.id;row.classList.remove('draft-row');row.querySelectorAll('[data-id],[data-ts-field]').forEach(el=>{el.dataset.id=record.id});row.querySelector('[data-ts-row]');row.dataset.tsRow=record.id;row.querySelectorAll('[data-ts-total],[data-ts-week],[data-ts-save-state]').forEach(el=>{el.dataset.tsTotal=record.id;el.dataset.tsWeek=record.id;el.dataset.tsSaveState=record.id});const save=row.querySelector('[data-action="save-timesheet-row"]');if(save)save.remove();const cancel=row.querySelector('[data-action="cancel-timesheet-row"]');if(cancel)cancel.remove();const actions=row.querySelector('.sheet-actions');if(actions&&!actions.querySelector('[data-action="delete-timesheet"]'))actions.insertAdjacentHTML('beforeend','<button class="small danger" data-action="delete-timesheet" data-id="'+esc(record.id)+'">Delete</button>');timesheetDraftId=null}
 say('Auto-saved '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
 const total=row.querySelector('[data-ts-total]');if(total)total.textContent=record.totalHours.toFixed(2);
 const week=row.querySelector('[data-ts-week]');if(week)week.textContent=record.weekOfMonth;
 return true;
}
function queueTimesheetAutosave(id){if(timesheetAutosaveTimers.has(id))clearTimeout(timesheetAutosaveTimers.get(id));const row=document.querySelector('[data-ts-row="'+CSS.escape(id)+'"]');const state=row?.querySelector('[data-ts-save-state]');if(state)state.textContent='Unsaved changes';const timer=setTimeout(()=>{timesheetAutosaveTimers.delete(id);autosaveTimesheetRow(id,false).catch(()=>{const current=document.querySelector('[data-ts-row="'+CSS.escape(id)+'"]');const state=current?.querySelector('[data-ts-save-state]');if(state)state.textContent='Save failed'})},700);timesheetAutosaveTimers.set(id,timer)}
async function exportTimesheetsPdf(){
 const d=await loadAll();
 const list=d.timesheets.filter(t=>!t.deletedAt).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
 const profile=d.settings.profile||{};
 const assigneeName=t=>d.assignees.find(a=>a.id===(t.assigneeId||t.consultantId))?.name||'—';
 const projectName=t=>d.projects.find(p=>p.id===t.projectId)?.name||'—';
 const dateLabel=v=>{if(!v)return '—';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v)};
 const cols=[['Date',64,'center'],['Assignee Name',105,'left'],['Project',100,'left'],['Ticket No.',75,'center'],['Ticket Subject',210,'left'],['Billable',65,'center'],['Non-Billable',75,'center'],['Time Spent',70,'center'],['WeekOfMonth',75,'center'],['Note',150,'left'],['External Timesheet Entry',145,'left']];
 const W=1190,H=842,margin=28,tableW=cols.reduce((n,c)=>n+c[1],0),headerH=28,tableTop=H-190,footerY=24;
 const bill=list.reduce((n,t)=>n+Number(t.billableHours||0),0),non=list.reduce((n,t)=>n+Number(t.nonBillableHours||0),0);
 const wrap=(value,max)=>{const words=String(value??'').replace(/\s+/g,' ').trim().split(' '),out=[];let line='';for(const word of words){if(!word)continue;let next=(line+' '+word).trim();while(next.length>max){if(line){out.push(line);line='';next=word}else{out.push(next.slice(0,max));next=next.slice(max)}}line=next}if(line)out.push(line);return out.length?out:['—']};
 const rowInfo=list.map(t=>{const values=[dateLabel(t.date),assigneeName(t),projectName(t),t.ticketId||'—',t.description||t.ticketSubject||'',Number(t.billableHours||0).toFixed(2),Number(t.nonBillableHours||0).toFixed(2),Number(t.totalHours??(Number(t.billableHours||0)+Number(t.nonBillableHours||0))).toFixed(2),t.weekOfMonth??'—',t.note||'',t.externalEntryStatus||'Not Started'];const lines=values.map((v,i)=>wrap(v,Math.max(7,Math.floor((cols[i][1]-12)/(i===4||i===9||i===10?4.2:4.5)))));return {values,lines,height:Math.max(28,Math.max(...lines.map(a=>a.length))*9+10)}});
 const available=tableTop-headerH-(footerY+24),pages=[];let current=[],used=0;
 for(const row of rowInfo){if(current.length&&used+row.height>available){pages.push(current);current=[];used=0}current.push(row);used+=row.height}
 if(current.length||!pages.length)pages.push(current);
 const rgb=c=>c.map(v=>(v/255).toFixed(3)).join(' ');
 const tx=(x,y,v,size=7,color=[40,45,60],bold=false)=>'BT /'+(bold?'F2':'F1')+' '+size+' Tf '+rgb(color)+' rg 1 0 0 1 '+x+' '+y+' Tm ('+pdfSafe(v)+') Tj ET\n';
 const rect=(x,y,w,h,fill,stroke=null)=>'q '+rgb(fill)+' rg '+x+' '+y+' '+w+' '+h+' re f '+(stroke?' '+rgb(stroke)+' RG 0.45 w '+x+' '+y+' '+w+' '+h+' re S':'')+' Q\n';
 const line=(x1,y1,x2,y2,color=[220,222,232])=>'q '+rgb(color)+' RG 0.45 w '+x1+' '+y1+' m '+x2+' '+y2+' l S Q\n';
 const objects=[];const add=o=>(objects.push(o),objects.length);const catalogId=add(''),pagesId=add(''),fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),boldId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'),pageIds=[];
 pages.forEach((rows,pageIndex)=>{
  let stream='';stream+=rect(0,0,W,H,[249,249,252]);stream+=rect(0,H-148,W,148,[34,29,53]);stream+=rect(margin,H-40,4,20,[177,143,255]);
  stream+=tx(margin+14,H-31,'SHINKA',13,[226,216,255],true);stream+=tx(margin+14,H-49,'A Work Management Hub',8,[190,184,211]);
  stream+=tx(margin,H-82,'TIMESHEET REPORT',21,[255,255,255],true);stream+=tx(margin,H-101,'Complete timesheet export · All columns included',8,[205,199,222]);
  stream+=tx(margin,H-124,'Profile: '+(profile.name||'Workspace user')+(profile.role?'  |  '+profile.role:''),7,[216,211,230]);
  stream+=tx(W-margin-190,H-38,'GENERATED',7,[181,171,209],true);stream+=tx(W-margin-190,H-54,new Date().toLocaleDateString(),9,[255,255,255],true);
  stream+=tx(W-margin-190,H-79,'TOTAL ENTRIES',7,[181,171,209],true);stream+=tx(W-margin-190,H-95,String(list.length),11,[255,255,255],true);
  stream+=tx(margin,H-137,'Billable: '+bill.toFixed(2)+' h     Non-billable: '+non.toFixed(2)+' h     Total: '+(bill+non).toFixed(2)+' h',7,[190,184,211]);
  stream+=rect(margin,tableTop-headerH,tableW,headerH,[83,65,132]);let x=margin;
  cols.forEach(([name,width,align])=>{const size=6.8,approx=name.length*size*.48,xx=align==='center'?x+(width-approx)/2:x+5;stream+=tx(xx,tableTop-headerH+10,name,size,[255,255,255],true);x+=width});
  let y=tableTop-headerH;
  rows.forEach((row,idx)=>{const rowY=y-row.height;stream+=rect(margin,rowY,tableW,row.height,idx%2===0?[255,255,255]:[242,243,249],[224,226,236]);let cx=margin;
   row.values.forEach((value,j)=>{const width=cols[j][1],align=cols[j][2],lines=row.lines[j],fontSize=6.7,lineGap=9,blockHeight=lines.length*lineGap,startY=rowY+(row.height+blockHeight)/2-6;
    lines.forEach((ln,k)=>{const approx=ln.length*fontSize*.48,xx=align==='center'?cx+Math.max(3,(width-approx)/2):cx+5;stream+=tx(xx,startY-k*lineGap,ln,fontSize,[42,47,64],j===0||j===3)});cx+=width;
   });y=rowY;
  });
  stream+=line(margin,footerY+12,W-margin,footerY+12,[220,222,232]);stream+=tx(margin,footerY,'SHINKA  |  A Work Management Hub',7,[104,106,123],true);stream+=tx(W-margin-160,footerY,'Page '+(pageIndex+1)+' of '+pages.length+'  |  '+list.length+' entries',7,[104,106,123]);
  const contentId=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');const pageId=add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+fontId+' 0 R /F2 '+boldId+' 0 R >> >> /Contents '+contentId+' 0 R >>');pageIds.push(pageId);
 });
 objects[catalogId-1]='<< /Type /Catalog /Pages '+pagesId+' 0 R >>';objects[pagesId-1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 downloadText('shinka-timesheet-report-'+new Date().toISOString().slice(0,10)+'.pdf',pdf,'application/pdf');showToast('Exported '+list.length+' timesheet entries with all 11 data columns.');
}
async function exportTimesheetsCsv(){const d=await loadAll();const rows=[['Date','Assigne Name','Project','Ticket No.','Ticket Subject','Billable','Non-Billable','Time Spent','WeekOfMonth','Note','External Timesheet Entry'],...d.timesheets.filter(t=>!t.deletedAt).sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,d.assignees.find(a=>a.id===(t.assigneeId||t.consultantId))?.name||'',d.projects.find(p=>p.id===t.projectId)?.name||'',t.ticketId,t.description,t.billableHours,t.nonBillableHours,t.totalHours,t.weekOfMonth,t.note||'',t.externalEntryStatus||'Not Started'])];downloadText('shinka-timesheets-'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');showToast('Exported '+(rows.length-1)+' timesheet row(s).')}
async function exportAuditCsv(){const d=await loadAll();const taskById=new Map(d.tasks.map(t=>[t.id,t]));const rows=[['Date & time','Action','Task No. / Ticket','Task','Details'],...d.activities.slice().sort((a,b)=>(a.occurredAt||'').localeCompare(b.occurredAt||'')).map(a=>{const t=taskById.get(a.taskId);return [a.occurredAt||'',a.title||a.type||'Activity',t?.taskNo||t?.ticketId||'Unknown task',t?.title||'Task record unavailable',a.details||'']})];downloadText('shinka-audit-log-'+new Date().toISOString().slice(0,10)+'.csv','\\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\\r\\n'),'text/csv;charset=utf-8');showToast('Exported '+(rows.length-1)+' audit record(s).')}
