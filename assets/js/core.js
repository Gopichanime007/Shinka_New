'use strict';

function historyGroupInfo(task){
 const raw=String(task.taskDate||task.createdAt||'').slice(0,10),match=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!match)return {key:'no-date',label:'No date',sortDate:'0000-00-00'};
 const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
 const nowDate=new Date();nowDate.setHours(0,0,0,0);
 const todayKey=[nowDate.getFullYear(),String(nowDate.getMonth()+1).padStart(2,'0'),String(nowDate.getDate()).padStart(2,'0')].join('-');
 const yesterday=new Date(nowDate);yesterday.setDate(yesterday.getDate()-1);
 const keyOf=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const monday=new Date(nowDate);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
 const lastMonday=new Date(monday);lastMonday.setDate(lastMonday.getDate()-7);
 const previousMonth=new Date(nowDate.getFullYear(),nowDate.getMonth()-1,1);
 const monthStart=new Date(nowDate.getFullYear(),nowDate.getMonth(),1);
 if(raw>todayKey)return {key:'upcoming',label:'Upcoming',sortDate:raw};
 if(raw===todayKey)return {key:'today',label:'Today',sortDate:raw};
 if(raw===keyOf(yesterday))return {key:'yesterday',label:'Yesterday',sortDate:raw};
 if(date>=monday&&date<nowDate)return {key:'this-week',label:'This Week',sortDate:raw};
 if(date>=lastMonday&&date<monday)return {key:'last-week',label:'Last Week',sortDate:raw};
 if(date>=previousMonth&&date<monthStart)return {key:'last-month',label:'Last Month',sortDate:raw};
 const year=date.getFullYear(),currentYear=nowDate.getFullYear();
 if(year<currentYear-1)return {key:'year:'+year,label:String(year),sortDate:raw};
 const monthName=date.toLocaleDateString(undefined,{month:'long'});
 return {key:'month:'+year+'-'+String(date.getMonth()+1).padStart(2,'0'),label:year===currentYear?monthName:monthName+' '+year,sortDate:raw};
}
function historyGroupsHtml(list,projects=[],timeLogs=[]){
 const groups=new Map();
 list.forEach(task=>{const info=historyGroupInfo(task);if(!groups.has(info.key))groups.set(info.key,{...info,tasks:[]});const group=groups.get(info.key);group.tasks.push(task);if(info.sortDate>group.sortDate)group.sortDate=info.sortDate;});
 const ordered=[...groups.values()].sort((a,b)=>b.sortDate.localeCompare(a.sortDate));
 return '<div class="history-groups">'+ordered.map((group,index)=>'<section class="history-date-group"><button type="button" class="history-group-toggle" data-action="toggle-history-group" aria-expanded="'+(index===0?'true':'false')+'"><span class="history-group-chevron">›</span><span>'+esc(group.label)+'</span><span class="history-group-count">'+group.tasks.length+'</span></button><div class="task-list history-group-cards '+(index===0?'':'hidden')+'">'+group.tasks.map(t=>taskCard(t,projects,timeLogs)).join('')+'</div></section>').join('')+'</div>';
}
function taskCard(t,projects,logs=[]){
 const p=projects.find(x=>x.id===t.projectId);
 const taskLogs=logs.filter(l=>l.taskId===t.id&&!l.deletedAt).sort((a,b)=>(b.workDate||b.createdAt||b.startedAt||'').localeCompare(a.workDate||a.createdAt||a.startedAt||'')||(b.createdAt||b.startedAt||'').localeCompare(a.createdAt||a.startedAt||''));
 const secs=taskLogs.reduce((a,l)=>a+(l.durationSeconds||0),0),removed=!!t.deletedAt;
 const progress=String(t.workProgress||'').trim();
 const logsHtml=taskLogs.length?'<div class="task-compact-log-list">'+taskLogs.map(l=>'<div class="task-compact-log"><div class="task-compact-log-top"><strong>'+esc(workDateLabel(l.workDate||localDateKey(l.startedAt)))+'</strong><span>'+esc(l.workType||'Work')+'</span><strong>'+minsLabel(l.durationSeconds)+'</strong></div><div class="task-compact-log-summary">'+esc(l.note||'No summary added.')+'</div><div class="muted tiny">Recorded '+esc(dateLabel(l.createdAt||l.startedAt))+'</div></div>').join('')+'</div>':'<div class="task-expand-empty">No time log entries.</div>';
 return '<article class="task-row history-task-card" aria-label="Task '+esc(t.taskNo||t.ticketId)+'">'+
 '<button type="button" class="task-summary-trigger" data-action="toggle-task-summary" aria-expanded="false"><div class="task-row-top"><div style="min-width:0;text-align:left"><div class="task-id">'+esc(t.taskNo||t.ticketId)+' · '+esc(t.type)+(t.ticketId?' · External '+esc(t.ticketId):'')+'</div><div class="task-title">'+esc(t.title)+'</div><div class="muted tiny task-card-subline">'+esc(p?.name||'No project')+' · '+esc(dateOnly(t.taskDate||t.createdAt))+' · Updated '+esc(dateLabel(t.updatedAt))+'</div></div><div>'+(removed?pill('Deleted','p-deleted'):pill(t.status))+'</div></div>'+
 '<div class="task-meta">'+pill(t.priority,'p-'+norm(t.priority))+' '+pill(t.codeStatus)+' '+pill(releaseStageFor(t))+'</div>'+
 '<div class="task-summary-footer"><span class="task-total-time">◷ '+minsLabel(secs)+' total time logged</span><span class="task-summary-hint">View activity <span class="task-expand-chevron">⌄</span></span></div></button>'+
 '<div class="task-expand-panel task-expand-compact hidden"><section class="task-compact-progress"><h4>Work Progress</h4><div class="task-expand-text">'+(progress?esc(progress):'<span class="task-expand-empty">No work progress recorded.</span>')+'</div></section><section class="task-compact-logs"><h4>Time Logs <span class="muted">('+taskLogs.length+')</span></h4>'+logsHtml+'</section></div>'+
 '<div class="actions task-row-actions hidden" style="margin-top:0"><button class="task-open-link" data-action="open-task" data-id="'+t.id+'">Open details ↗</button>'+(removed?'<button class="small" data-action="restore-task" data-id="'+t.id+'">↺ Restore</button>':'<button class="icon-button danger" data-action="delete-task" data-id="'+t.id+'" aria-label="Delete task" title="Delete task"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2m-9 0 1 14h10l1-14M10 10v6m4-6v6"/></svg></button>')+'</div></article>';
}
function metric(label,value,icon,sub){return '<div class="metric"><div class="metric-head"><span>'+label+'</span><span class="metric-icon">'+icon+'</span></div><strong>'+value+'</strong><small>'+sub+'</small></div>'}
function empty(title,desc,button=''){return '<div class="empty"><b>'+title+'</b>'+desc+(button?'<div style="margin-top:13px">'+button+'</div>':'')+'</div>'}
function assigneeSelect(label,name,assignees,current){return '<div class="field"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'"><option value="">Select assignee</option>'+assignees.filter(a=>a.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===current?'selected':'')+'>'+esc(a.name)+(a.role?' · '+esc(a.role):'')+'</option>').join('')+'</select>'+(assignees.filter(a=>a.active!==false).length?'':'<div class="muted tiny">Add people in the Assignees screen to populate this list.</div>')+'</div>'}
async function taskForm(task,projects,assignees){task=task||{ticketId:'',title:'',description:'',type:'Development',projectId:'',priority:'Medium',assignedBy:'',assigneeId:'',status:'Open',codeStatus:'Not Started',instanceStatus:'Not Deployed',workProgress:'',notes:''};if(!task.taskNo)task.taskNo=await nextTaskNo(task.id||null);const selectedAssignee=task.assigneeId||(assignees.find(a=>a.name===task.assignedBy)?.id||'');return '<form id="taskForm"><div class="form-grid">'+
field('Task Date *','taskDate',task.taskDate||(task.createdAt?task.createdAt.slice(0,10):new Date().toISOString().slice(0,10)),'date','required')+
'<div class="field"><label for="f-taskNo">Internal Task No.</label><input id="f-taskNo" value="'+esc(task.taskNo||'Generated on save')+'" readonly aria-readonly="true"><small class="muted tiny">Assigned automatically from Settings → No. Series.</small></div>'+field('External Ticket ID (optional)','externalTicketId',task.externalTicketId??task.ticketId,'text','maxlength="120" placeholder="Add company ticket ID now or later"')+
selectField('Task Type','type',TYPES,task.type)+
'<div class="field span2"><label for="f-title">Task title *</label><input id="f-title" name="title" required maxlength="180" value="'+esc(task.title)+'" placeholder="Summarize the work clearly"></div>'+
'<div class="field span2"><label for="f-description">Description / Requirement</label><textarea id="f-description" name="description" maxlength="10000" placeholder="What needs to be done?">'+esc(task.description)+'</textarea></div>'+
'<div class="field"><label>Project</label>'+projectSelect(projects,task.projectId)+'</div>'+
selectField('Priority','priority',PRIORITIES,task.priority)+
assigneeSelect('Assignee','assigneeId',assignees,selectedAssignee)+
'<div class="field span2 tracking-toggle"><details '+(task.id?'open':'')+'><summary>Tracking details <span>Status, progress and notes</span></summary><div class="form-grid tracking-grid">'+
selectField('Task Status','status',STATUSES,task.status)+
selectField('Code Status','codeStatus',CODE_STATUSES,task.codeStatus)+
selectField('Release Stage','releaseStage',RELEASE_STAGES,releaseStageFor(task))+
'<div class="field span2"><label for="f-workProgress">Work Progress</label><textarea id="f-workProgress" name="workProgress" maxlength="10000" placeholder="What has been completed, what is in progress, and what remains?">'+esc(task.workProgress||'')+'</textarea></div>'+
'<div class="field span2"><label for="f-notes">Notes / blockers</label><textarea id="f-notes" name="notes" maxlength="10000" placeholder="Investigation notes, dependencies, links, or blockers">'+esc(task.notes)+'</textarea></div></div></details></div></div><div class="actions"><button type="button" class="ghost" data-action="cancel-form">Cancel</button><button type="submit" class="primary">'+(task.id?'Save changes':'Create task')+'</button></div></form>'}
function setPageMeta(){const map={dashboard:['WORKSPACE OVERVIEW','Good work starts with clarity.','Your projects, priorities, and progress in one place.'],assignees:['PEOPLE DIRECTORY','Your assignees','Maintain the consultant and delivery roster used by tasks and timesheets.'],timesheets:['TIMESHEET TRACKER','Record every workday','Capture billable and non-billable work, by project and ticket.'],tasks:['TASK MANAGEMENT','Create a task','Capture the ticket, project, priority and assignee.'],history:['TASK HISTORY','Every task, accounted for','Search, filter, inspect history, and edit task records.'],tracker:['TIME TRACKER','Your time, connected to work','Track focus sessions or enter time manually.'],projects:['PROJECT MANAGEMENT','Projects and portfolios','Group tasks into projects and see where work is concentrated.'],settings:['PREFERENCES & DATA SAFETY','Your workspace settings','Manage local data, backup, restore, and task preferences.'],audit:['AUDIT & ACCOUNTABILITY','Workspace audit log','Review recorded task changes, deletions, restorations, and other activity.'],detail:['TASK DETAILS','One task, complete history','Current state, activity timeline, and linked time logs.'],newTask:['TASK MANAGEMENT','Create a task','Record the ticket once, then track its full lifecycle.'],editTask:['TASK MANAGEMENT','Edit task','Changes are captured in the activity history.'],projectForm:['PROJECT MANAGEMENT','Project details','Group related tasks and workstreams.']};const m=map[page]||map.dashboard;$('#pageEyebrow').textContent=m[0];$('#pageTitle').textContent=m[1];$('#pageSubtitle').textContent=m[2];document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page||(page==='detail'||page==='editTask'||page==='newTask'?b.dataset.page==='tasks':page==='projectForm'?b.dataset.page==='projects':false)))}
