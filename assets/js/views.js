'use strict';

function timerElapsed(){if(!runningTimer)return 0;return (runningTimer.elapsedBeforePause||0)+(runningTimer.pausedAt?0:Math.max(0,(Date.now()-new Date(runningTimer.segmentStartedAt).getTime())/1000))}
async function persistTimer(){await put('settings',{key:'activeTimer',value:runningTimer})}
async function readTimer(){const v=await get('settings','activeTimer');runningTimer=v?.value||null}
async function startTimer(taskId){if(!taskId)throw new Error('Choose a task before starting the timer.');if(runningTimer)throw new Error('A timer is already active. Stop it before starting another.');const task=await getTask(taskId);if(!task||task.deletedAt)throw new Error('The selected task is not available.');if(task.status==='Completed')throw new Error('Reopen the task before tracking additional time.');runningTimer={id:uid(),taskId,workType:'Development',note:'Timer session',startedAt:now(),segmentStartedAt:now(),elapsedBeforePause:0,pausedAt:null,recoveredGapSeconds:0};await persistTimer();await logActivity(taskId,'timer','Timer started','Started at '+dateLabel(runningTimer.startedAt));await render();showToast('Timer started for '+task.ticketId)}
async function pauseTimer(){if(!runningTimer||runningTimer.pausedAt)return;runningTimer.elapsedBeforePause=timerElapsed();runningTimer.pausedAt=now();runningTimer.segmentStartedAt=null;await persistTimer();await logActivity(runningTimer.taskId,'timer','Timer paused','Elapsed '+minsLabel(runningTimer.elapsedBeforePause));await render();showToast('Timer paused')}
async function resumeTimer(){if(!runningTimer||!runningTimer.pausedAt)return;runningTimer.segmentStartedAt=now();runningTimer.pausedAt=null;await persistTimer();await logActivity(runningTimer.taskId,'timer','Timer resumed','Resumed at '+dateLabel(now()));await render();showToast('Timer resumed')}
async function stopTimer(){if(!runningTimer)throw new Error('No active timer to stop.');const r=runningTimer;const secs=Math.round(timerElapsed());if(secs<1)throw new Error('Timer duration must be at least one second.');const gap=r.recoveredGapSeconds||0;if(gap>8*60*60&&!confirm('This timer includes a long elapsed gap of '+minsLabel(gap)+'. If the laptop slept or the browser was closed, this may overcount work. Save the full elapsed duration anyway?'))return;const log={id:uid(),taskId:r.taskId,workType:r.workType||'Development',note:r.note||'Timer session',method:'timer',workDate:localDateKey(r.startedAt),startedAt:r.startedAt,endedAt:now(),durationSeconds:secs,createdAt:now(),deletedAt:null};const t=db.transaction(['timeLogs','activities','settings'],'readwrite');t.objectStore('timeLogs').put(log);t.objectStore('activities').put({id:uid(),taskId:r.taskId,type:'time',title:'Time logged',details:minsLabel(secs)+' · '+(r.workType||'Development')+' · Timer session',meta:{timeLogId:log.id,durationSeconds:secs},occurredAt:now()});t.objectStore('settings').put({key:'activeTimer',value:null});await txDone(t);runningTimer=null;await render();showToast('Saved '+minsLabel(secs))}
function downloadText(filename,text,type='application/json'){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(value){const s=String(value??'');return '"'+s.replace(/"/g,'""')+'"'}
async function downloadTaskReport(){const d=await loadAll();const q=norm($('#taskSearch')?.value||''),st=$('#statusFilter')?.value||'',priority=$('#priorityFilter')?.value||'',project=$('#projectFilter')?.value||'',recordMode=$('#recordFilter')?.value||'active',sort=$('#taskSort')?.value||'updated-desc';let list=d.tasks.filter(t=>recordMode==='deleted'?!!t.deletedAt:recordMode==='all'?true:!t.deletedAt);list=list.filter(t=>(!q||[t.id,t.taskNo,t.ticketId,t.externalTicketId,t.title,t.description,t.workProgress,t.assignedBy,t.notes,t.type,t.status,t.codeStatus,t.instanceStatus,t.releaseStage,d.projects.find(p=>p.id===t.projectId)?.name,d.assignees.find(a=>a.id===t.assigneeId)?.name].some(v=>norm(v).includes(q)))&&(!st||t.status===st)&&(!priority||t.priority===priority)&&(!project||t.projectId===project));list.sort((a,b)=>sort==='date-desc'?String(b.taskDate||'').localeCompare(String(a.taskDate||'')):sort==='date-asc'?String(a.taskDate||'').localeCompare(String(b.taskDate||'')):sort==='created-desc'?String(b.createdAt||'').localeCompare(String(a.createdAt||'')):sort==='taskno-asc'?String(a.taskNo||'').localeCompare(String(b.taskNo||''),undefined,{numeric:true}):sort==='taskno-desc'?String(b.taskNo||'').localeCompare(String(a.taskNo||''),undefined,{numeric:true}):String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));const headers=['Task Record ID','Internal Task No.','External Ticket ID','Task Date','Task Title','Description / Requirement','Task Type','Project','Project ID','Priority','Assignee','Assignee ID','Assigned By','Work Status','Code Status','Release Stage','Instance Status','Work Progress / Testing Notes','Notes','Created At','Updated At','Completed At','Record Status','Deleted At'];const rows=[headers,...list.map(t=>[t.id||'',t.taskNo||'',t.externalTicketId??t.ticketId??'',t.taskDate||'',t.title||'',t.description||'',t.type||'',d.projects.find(p=>p.id===t.projectId)?.name||'',t.projectId||'',t.priority||'',d.assignees.find(a=>a.id===t.assigneeId)?.name||'',t.assigneeId||'',t.assignedBy||'',t.status||'',t.codeStatus||'',t.releaseStage||'',t.instanceStatus||'',t.workProgress||'',t.notes||'',t.createdAt||'',t.updatedAt||'',t.completedAt||'',t.deletedAt?'Deleted':'Active',t.deletedAt||''])];const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');const date=new Date().toISOString().slice(0,10);downloadText('shinka-task-register-'+date+'.csv',csv,'text/csv;charset=utf-8');showToast('Exported '+list.length+' task(s) with all task fields.')}

function pdfSafe(v){return String(v??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapPdf(v,max=92){const words=String(v??'').replace(/\s+/g,' ').trim().split(' ');const lines=[];let line='';for(const word of words){if(!word)continue;const chunks=word.length>max?word.match(new RegExp('.{1,'+max+'}','g')):[word];for(const chunk of chunks){if((line+' '+chunk).trim().length>max){if(line)lines.push(line);line=chunk}else line=(line+' '+chunk).trim()}}if(line)lines.push(line);return lines.length?lines:['']}
async function downloadTaskReportPdf(){
 const d=await loadAll(),q=norm($('#taskSearch')?.value||''),st=$('#statusFilter')?.value||'',priority=$('#priorityFilter')?.value||'',project=$('#projectFilter')?.value||'',recordMode=$('#recordFilter')?.value||'active';
 let list=d.tasks.filter(t=>recordMode==='deleted'?!!t.deletedAt:recordMode==='all'?true:!t.deletedAt);
 list=list.filter(t=>(!q||[t.ticketId,t.title,t.description,t.workProgress,t.assignedBy,t.notes,t.type].some(v=>norm(v).includes(q)))&&(!st||t.status===st)&&(!priority||t.priority===priority)&&(!project||t.projectId===project)).sort((a,b)=>String(a.taskDate||a.createdAt||'').localeCompare(String(b.taskDate||b.createdAt||'')));
 const W=842,H=595,margin=24,tableTop=386,headerH=27,footerY=22,tableW=W-margin*2;
 const cols=[['Date',58,'center'],['Internal No.',68,'center'],['External ID',68,'center'],['Task Description',240,'left'],['Work Status',76,'center'],['Code Status',76,'center'],['Instance',65,'center'],['Priority',58,'center'],['Assignee',133,'left']];
 const profile=d.settings.profile||{},projectName=d.projects.find(p=>p.id===project)?.name||'All projects';
 const filterParts=[];if(q)filterParts.push('Search: '+q);if(st)filterParts.push('Status: '+st);if(priority)filterParts.push('Priority: '+priority);if(project)filterParts.push('Project: '+projectName);if(recordMode!=='active')filterParts.push('Records: '+recordMode);
 const filterLabel=filterParts.length?filterParts.join('  |  '):'Filters: All active tasks';
 const dateLabel=v=>{if(!v)return '—';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v)};
 const wrap=(value,maxChars)=>{const words=String(value??'').replace(/\s+/g,' ').trim().split(' '),out=[];let line='';for(const word of words){if(!word)continue;let next=(line+' '+word).trim();while(next.length>maxChars){if(line){out.push(line);line='';next=word}else{out.push(next.slice(0,maxChars));next=next.slice(maxChars)}}line=next}if(line)out.push(line);return out.length?out:['—']};
 const profileName=profile.name||'Workspace profile not configured';
 const profileRoleTeam=[profile.role?'Role: '+profile.role:'',profile.team?'Team: '+profile.team:''].filter(Boolean).join('   |   ');
 const profileContact=profile.email?'Email: '+profile.email:'';
 const rowInfo=list.map(t=>{const values=[dateLabel(t.taskDate||(t.createdAt||'').slice(0,10)),t.taskNo||'—',t.externalTicketId??t.ticketId??'—',t.description||t.title||'—',t.status||'—',t.codeStatus||'—',t.instanceStatus||'—',t.priority||'—',d.assignees.find(a=>a.id===t.assigneeId)?.name||t.assignedBy||'—'];const descLines=wrap(values[2],Math.floor((cols[2][1]-18)/4.2));const shownDesc=descLines.slice(0,5);return {t,values,descLines:shownDesc,height:Math.max(34,shownDesc.length*9+12)}});
 const available=tableTop-headerH-(footerY+24),pages=[];let pageRows=[],used=0;
 for(const row of rowInfo){if(pageRows.length&&used+row.height>available){pages.push(pageRows);pageRows=[];used=0}pageRows.push(row);used+=row.height}
 if(pageRows.length||!pages.length)pages.push(pageRows);
 const rgb=c=>c.map(v=>(v/255).toFixed(3)).join(' ');
 const text=(x,y,value,size=7,color=[40,45,60],bold=false)=>'BT /'+(bold?'F2':'F1')+' '+size+' Tf '+rgb(color)+' rg 1 0 0 1 '+x+' '+y+' Tm ('+pdfSafe(value)+') Tj ET\n';
 const rect=(x,y,w,h,fill,stroke=null)=>'q '+rgb(fill)+' rg '+x+' '+y+' '+w+' '+h+' re f '+(stroke?' '+rgb(stroke)+' RG 0.45 w '+x+' '+y+' '+w+' '+h+' re S':'')+' Q\n';
 const line=(x1,y1,x2,y2,color=[224,226,236])=>'q '+rgb(color)+' RG 0.45 w '+x1+' '+y1+' m '+x2+' '+y2+' l S Q\n';
 const objects=[];const add=o=>(objects.push(o),objects.length);const catalogId=add(''),pagesId=add(''),fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),boldId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');const pageIds=[];
 pages.forEach((rows,pageIndex)=>{
  let stream='';stream+=rect(0,0,W,H,[249,249,252]);stream+=rect(0,H-184,W,184,[34,29,53]);stream+=rect(margin,H-39,4,19,[177,143,255]);
  stream+=text(margin+14,H-31,'SHINKA',12,[226,216,255],true);stream+=text(margin+14,H-50,'A Work Management Hub',8,[190,184,211]);
  stream+=text(margin,H-83,'TASK REPORT',21,[255,255,255],true);stream+=text(margin,H-101,'Workspace task overview',8,[205,199,222]);
  stream+=text(margin,H-122,profileName,8.2,[255,255,255],true);
  if(profileRoleTeam)stream+=text(margin,H-137,profileRoleTeam,6.8,[216,211,230]);
  if(profileContact)stream+=text(margin,H-151,profileContact,6.8,[216,211,230]);
  stream+=text(W-margin-155,H-37,'GENERATED',7,[181,171,209],true);stream+=text(W-margin-155,H-53,new Date().toLocaleDateString(),9,[255,255,255],true);
  stream+=line(W-margin-155,H-64,W-margin,H-64,[81,72,108]);stream+=text(W-margin-155,H-82,'TOTAL RECORDS',7,[181,171,209],true);stream+=text(W-margin-155,H-101,String(list.length),12,[255,255,255],true);
  stream+=text(margin,H-168,'FILTERS  '+filterLabel,6.4,[190,184,211]);
  stream+=rect(margin,tableTop,tableW,headerH,[83,65,132]);let x=margin;
  cols.forEach(([name,width,align])=>{const tx=align==='center'?x+(width-name.length*3.4)/2:x+7;stream+=text(tx,tableTop+10,name,7.1,[255,255,255],true);x+=width});
  let y=tableTop-headerH;
  rows.forEach((row,idx)=>{
   const rowY=y-row.height,bg=idx%2===0?[255,255,255]:[242,243,249];stream+=rect(margin,rowY,tableW,row.height,bg,[224,226,236]);
   let cx=margin;
   row.values.forEach((value,j)=>{
    const [label,width,align]=cols[j],maxChars=Math.max(7,Math.floor((width-14)/(j===2?4.0:4.2)));
    let lines=j===2?row.descLines:wrap(value,maxChars).slice(0,2);
    const fontSize=j===2?6.8:6.7,lineGap=9,blockHeight=lines.length*lineGap,startY=rowY+(row.height+blockHeight)/2-6;
    lines.forEach((ln,k)=>{const centered=align==='center',approx=ln.length*fontSize*0.48,tx=centered?cx+Math.max(4,(width-approx)/2):cx+7;const color=j===3&&value==='Blocked'?[166,66,66]:j===3&&value==='Completed'?[30,115,82]:j===6&&value==='High'?[151,71,43]:[42,47,64];stream+=text(tx,startY-k*lineGap,ln,fontSize,color,j===3||j===6)});
    cx+=width;
   });
   y=rowY;
  });
  stream+=line(margin,footerY+12,W-margin,footerY+12,[220,222,232]);stream+=text(margin,footerY,'SHINKA  |  A Work Management Hub',7,[104,106,123],true);stream+=text(W-margin-150,footerY,'Page '+(pageIndex+1)+' of '+pages.length+'  |  '+list.length+' records',7,[104,106,123]);
  const contentId=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');const pageId=add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+fontId+' 0 R /F2 '+boldId+' 0 R >> >> /Contents '+contentId+' 0 R >>');pageIds.push(pageId);
 });
 objects[catalogId-1]='<< /Type /Catalog /Pages '+pagesId+' 0 R >>';objects[pagesId-1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 downloadText('shinka-task-report-'+new Date().toISOString().slice(0,10)+'.pdf',pdf,'application/pdf');showToast('Exported filtered task report with '+list.length+' task(s).')
}
