(()=>{
  const TODAY=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dueDates=['2026-10-02','2026-09-30','2026-09-30','2026-10-01','2026-09-29',''];
  const nextActions=['Perskambinti','Suderinti pristatymo laiką','Išsiųsti pasiūlymą','Patikrinti pristatymą','Perskambinti',''];
  const historic=[
    {date:'2026-08-15',quantity:'1 800 l',price:3420,status:'Užbaigta',source:'Telefonu'},
    {date:'2026-07-22',quantity:'2 500 l',price:4250,status:'Užbaigta',source:'El. paštu'},
    {date:'2026-08-03',quantity:'1 000 l',price:1950,status:'Neįvyko',source:'Rekomendacija'}
  ];

  clients.forEach((c,i)=>{
    c.nextDate=c.nextDate??dueDates[i];
    c.nextAction=c.nextAction??nextActions[i];
    if(!Array.isArray(c.orders)){
      c.orders=[{id:`UZ-${String(1048+i).padStart(4,'0')}`,date:c.last,quantity:c.quantity,price:c.price,status:c.status,source:c.source,delivery:i===1?'2026-10-02':''}];
      if(i<3)c.orders.push({id:`UZ-${String(990+i).padStart(4,'0')}`,...historic[i]});
    }
  });
  save();

  const roleSwitch=document.getElementById('roleSwitch');
  const scopedClients=()=>clients;
  const taskClients=()=>roleSwitch.value==='manager'?clients.filter(c=>c.manager==='Rasa'):clients;
  function labelTable(id){
    const body=document.getElementById(id),table=body.closest('table');
    const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent);
    body.querySelectorAll('tr').forEach(row=>[...row.children].forEach((td,i)=>td.dataset.label=labels[i]||'Veiksmai'));
  }
  const statusClass=s=>s==='Neįvyko'?'status-lost':pillClass(s);
  const allOrders=(list=scopedClients())=>list.flatMap(c=>(c.orders||[]).map(o=>({...o,clientId:c.id,client:c.name,manager:c.manager}))).sort((a,b)=>b.date.localeCompare(a.date));
  const openOrders=list=>allOrders(list).filter(o=>!['Užbaigta','Neįvyko'].includes(o.status));
  const isOverdue=c=>c.nextDate&&c.nextDate<TODAY&&c.nextAction!=='Užsakymas neaktualus';
  const waiting=c=>c.status==='Pasiūlyta'||c.nextAction==='Laukti kliento atsakymo';

  function taskLabel(date){
    if(!date)return 'Data nenurodyta';
    if(date<TODAY)return `Vėluoja · ${shortDate(date)}`;
    if(date===TODAY)return 'Šiandien';
    return shortDate(date);
  }

  function renderTasks(){
    const scope=taskClients();
    const tasks=scope.filter(c=>c.nextAction&&c.nextAction!=='Užsakymas neaktualus').sort((a,b)=>(a.nextDate||'9999').localeCompare(b.nextDate||'9999'));
    const overdue=tasks.filter(isOverdue).length;
    const today=tasks.filter(c=>c.nextDate===TODAY).length;
    const awaiting=scope.filter(waiting).length;
    document.getElementById('taskCards').innerHTML=`
      <div class="metric ${overdue?'warn':''}"><div class="metric-icon">!</div><div><strong>${overdue}</strong><span>vėluojantys veiksmai</span></div></div>
      <div class="metric"><div class="metric-icon">◷</div><div><strong>${today}</strong><span>reikia atlikti šiandien</span></div></div>
      <div class="metric"><div class="metric-icon">✉</div><div><strong>${awaiting}</strong><span>laukiama kliento atsakymo</span></div></div>
      <div class="metric good"><div class="metric-icon">€</div><div><strong>${eur(openOrders(scope).reduce((a,o)=>a+o.price,0))}</strong><span>aktyvių užsakymų vertė</span></div></div>`;
    document.getElementById('taskScope').textContent=roleSwitch.value==='manager'?'Rodomi Rasos klientai':'Rodomi visų vadybininkų darbai';
    document.getElementById('taskList').innerHTML=tasks.length?tasks.map(c=>{
      const state=isOverdue(c)?'overdue':c.nextDate===TODAY?'today':'upcoming';
      const detail=c.next&&c.next.trim().toLowerCase()!==c.nextAction.trim().toLowerCase()?`<span class="sub">${c.next}</span>`:'';
      return `<div class="task-card ${state}"><div class="task-client"><button class="client-link" data-task-client="${c.id}">${c.name}</button><div class="stat-pair"><span>Vadybininkas: <strong>${c.manager}</strong></span><span>Būsena: <strong>${c.status}</strong></span></div></div><div class="task-work"><strong>${c.nextAction}</strong>${detail}</div><div class="task-date ${isOverdue(c)?'overdue-text':''}">${taskLabel(c.nextDate)}</div><div class="task-actions"><button class="btn primary compact-btn" data-task-activity="${c.id}">Registruoti veiklą</button></div></div>`;
    }).join(''):'<div class="panel empty">Šiuo metu suplanuotų veiksmų nėra.</div>';
    document.querySelectorAll('[data-task-client]').forEach(b=>b.onclick=()=>openClient(+b.dataset.taskClient));
    document.querySelectorAll('[data-task-activity]').forEach(b=>b.onclick=()=>openModal('activityModal',+b.dataset.taskActivity));
  }

  renderClients=function(){
    const q=document.getElementById('searchInput').value.toLowerCase();
    const st=document.getElementById('statusFilter').value;
    const mg=document.getElementById('managerFilter').value;
    const rows=scopedClients().filter(c=>(c.name+' '+c.city+' '+c.phone).toLowerCase().includes(q)&&(!st||c.status===st)&&(!mg||c.manager===mg));
    document.getElementById('clientRows').innerHTML=rows.map(c=>`<tr><td><button class="client-link" data-client="${c.id}">${c.name}</button><span class="sub">${c.city} · ${c.phone}</span></td><td>${shortDate(c.last)}<span class="sub">${c.history[0]?.type||''}</span></td><td class="price">${eur(c.price)}</td><td><span class="pill ${statusClass(c.status)}">${c.status}</span></td><td>${c.manager}</td><td><button class="row-menu" data-client="${c.id}">Atidaryti</button></td></tr>`).join('');
    document.getElementById('emptyState').hidden=rows.length>0;
    document.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>openClient(+b.dataset.client));
    const scope=scopedClients(), active=openOrders(scope);
    document.getElementById('clientsCount').textContent=scope.length;
    document.getElementById('ordersCount').textContent=active.length;
    document.getElementById('followCount').textContent=scope.filter(c=>c.nextAction).length;
    document.getElementById('valueCount').textContent=eur(active.reduce((a,o)=>a+o.price,0));
    labelTable('clientRows');
  };

  function renderOrders(){
    const q=document.getElementById('orderSearch').value.toLowerCase();
    const st=document.getElementById('orderStatusFilter').value;
    const orders=allOrders().filter(o=>(o.client+' '+o.id).toLowerCase().includes(q)&&(!st||o.status===st));
    document.getElementById('orderRows').innerHTML=orders.map(o=>`<tr><td><button class="client-link order-number" data-edit-client="${o.clientId}" data-edit-order="${o.id}">${o.id}</button><span class="sub">${o.source||'Įvesta ranka'}</span></td><td><button class="client-link" data-order-client="${o.clientId}">${o.client}</button></td><td>${shortDate(o.date)}${o.delivery?`<span class="sub">Pristatymas: ${shortDate(o.delivery)}</span>`:''}</td><td>${o.quantity||'–'}</td><td class="price">${eur(o.price)}</td><td><span class="pill ${statusClass(o.status)}">${o.status}</span></td><td>${o.manager}</td><td><div class="order-actions"><button class="btn compact-btn" data-edit-client="${o.clientId}" data-edit-order="${o.id}">Atverti</button><button class="btn compact-btn" data-status-client="${o.clientId}" data-status-order="${o.id}">Keisti būseną</button></div></td></tr>`).join('');
    document.getElementById('orderEmpty').hidden=orders.length>0;
    document.querySelectorAll('[data-order-client]').forEach(b=>b.onclick=()=>openClient(+b.dataset.orderClient));
    document.querySelectorAll('[data-status-order]').forEach(b=>b.onclick=()=>openStatusChange(+b.dataset.statusClient,b.dataset.statusOrder));
    document.querySelectorAll('[data-edit-order]').forEach(b=>b.onclick=()=>openOrderEdit(+b.dataset.editClient,b.dataset.editOrder));
    labelTable('orderRows');
  }

  openClient=function(id){
    selectedId=id;
    const c=clients.find(x=>x.id===id);
    const statusButton=document.getElementById('detailChangeStatus');
    statusButton.hidden=!c.orders?.length;
    statusButton.onclick=()=>openStatusChange(c.id,c.orders[0]?.id);
    document.getElementById('detailEditOrder').hidden=!c.orders?.length;
    document.getElementById('detailEditOrder').onclick=()=>openOrderEdit(c.id,c.orders[0]?.id);
    document.getElementById('detailName').textContent=c.name;
    document.getElementById('detailMeta').textContent=`${c.city} · Atsakingas vadybininkas: ${c.manager}`;
    document.getElementById('detailInfo').innerHTML=`<dt>Kontaktas</dt><dd>${c.contact}</dd><dt>Telefonas</dt><dd>${c.phone}</dd><dt>El. paštas</dt><dd>${c.email}</dd><dt>Miestas</dt><dd>${c.city}</dd><dt>Vadybininkas</dt><dd>${c.manager}</dd>`;
    document.getElementById('orderInfo').innerHTML=`<dt>Būsena</dt><dd><span class="pill ${statusClass(c.status)}">${c.status}</span></dd><dt>Kiekis</dt><dd>${c.quantity||'–'}</dd><dt>Kaina</dt><dd>${eur(c.price)}</dd><dt>Šaltinis</dt><dd>${c.source}</dd><dt>Kitas veiksmas</dt><dd>${c.nextAction||'Nenumatyta'}${c.nextDate?` iki ${shortDate(c.nextDate)}`:''}</dd>`;
    document.getElementById('detailTimeline').innerHTML=c.history.map(h=>`<div class="event"><strong>${h.type}</strong><small> · ${shortDate(h.date)}</small><p>${h.note}</p>${h.price?`<small>Siūlyta kaina: ${eur(h.price)}</small>`:''}</div>`).join('')||'<p class="muted">Bendravimo istorijos dar nėra.</p>';
    const prices=(c.orders||[]).filter(o=>o.price).sort((a,b)=>b.date.localeCompare(a.date));
    document.getElementById('priceHistory').innerHTML=prices.map(o=>`<tr><td>${shortDate(o.date)}</td><td>${o.quantity||'–'}</td><td class="price">${eur(o.price)}</td><td>${c.manager}</td><td><span class="pill ${statusClass(o.status)}">${o.status}</span></td></tr>`).join('');
    if(!prices.length)document.getElementById('priceHistory').innerHTML='<tr><td colspan="5" class="muted">Kainų pasiūlymų dar nėra.</td></tr>';
    showView('detail');
  };

  renderActivities=function(){
    const scope=scopedClients();
    const all=scope.flatMap(c=>c.history.map(h=>({...h,client:c.name,manager:c.manager}))).sort((a,b)=>b.date.localeCompare(a.date));
    document.getElementById('activityFeed').innerHTML=all.slice(0,10).map(a=>`<div class="activity"><div class="activity-ico">${a.type==='Skambutis'?'☎':a.type==='El. laiškas'?'✉':'●'}</div><div><strong>${a.client}</strong><p>${a.note}</p><small>${a.type} · ${a.manager}</small></div><small>${shortDate(a.date)}</small></div>`).join('');
    const f=scope.filter(c=>c.nextAction).sort((a,b)=>(a.nextDate||'9999').localeCompare(b.nextDate||'9999')).slice(0,7);
    document.getElementById('followUps').innerHTML=f.map(c=>`<div class="activity"><div class="activity-ico">◷</div><div><strong>${c.name}</strong><p>${c.nextAction}</p><small class="${isOverdue(c)?'danger':''}">${taskLabel(c.nextDate)} · ${c.manager}</small></div><button class="btn compact-btn" data-follow-activity="${c.id}">Įrašyti</button></div>`).join('');
    document.querySelectorAll('[data-follow-activity]').forEach(b=>b.onclick=()=>openModal('activityModal',+b.dataset.followActivity));
  };

  renderSummary=function(){
    const scope=scopedClients(),month=document.getElementById('summaryPeriod').value==='month';
    const orders=allOrders(scope).filter(o=>!month||(o.date>=TODAY.slice(0,7)+'-01'&&o.date<=TODAY));
    const active=orders.filter(o=>!['Užbaigta','Neįvyko'].includes(o.status));
    const confirmed=orders.filter(o=>['Patvirtinta','Vykdoma','Užbaigta'].includes(o.status));
    const offers=orders.filter(o=>o.status==='Pasiūlyta'),overdue=scope.filter(isOverdue);
    const value=os=>os.reduce((sum,o)=>sum+(Number(o.price)||0),0);
    const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const card=(label,number,note,tone='')=>`<div class="metric summary-kpi ${tone}"><span class="kpi-label">${label}</span><strong>${number}</strong><span class="kpi-note">${note}</span></div>`;
    document.getElementById('summaryCards').innerHTML=card('Aktyvių užsakymų vertė',eur(value(active)),`${active.length} atviri užsakymai`)+card('Patvirtintų užsakymų vertė',eur(value(confirmed)),`${confirmed.length} patvirtinti, vykdomi ar užbaigti`,'good')+card('Pasiūlymai be atsakymo',offers.length,`${eur(value(offers))} pasiūlyta vertė`,'warn')+card('Vėluojantys veiksmai',overdue.length,'Visų klientų dabartinės užduotys','alert');
    document.getElementById('summaryOrderCount').textContent=`${orders.length} užsakymai · ${eur(value(orders))}`;
    const stages=['Naujas','Ruošiama kaina','Pasiūlyta','Patvirtinta','Vykdoma','Užbaigta','Neįvyko'];
    const max=Math.max(1,...stages.map(s=>orders.filter(o=>o.status===s).length));
    document.getElementById('statusBars').innerHTML=orders.length?stages.map(s=>{const os=orders.filter(o=>o.status===s),tone=['Patvirtinta','Vykdoma','Užbaigta'].includes(s)?'good':s==='Pasiūlyta'?'warn':s==='Neįvyko'?'lost':'';return `<div class="flow-row ${tone}"><div class="flow-label"><span>${s}</span><strong>${os.length} · ${eur(value(os))}</strong></div><div class="flow-bar" aria-hidden="true"><span style="width:${os.length/max*100}%"></span></div></div>`}).join(''):'<p class="muted">Šiuo laikotarpiu užsakymų nėra.</p>';
    const attention=scope.filter(c=>isOverdue(c)||waiting(c)||(c.nextDate===TODAY&&c.nextAction&&c.nextAction!=='Užsakymas neaktualus')).sort((a,b)=>Number(!!isOverdue(b))-Number(!!isOverdue(a))||(a.nextDate||'9999').localeCompare(b.nextDate||'9999'));
    document.getElementById('summaryAttention').innerHTML=attention.length?attention.map(c=>`<div class="attention-row"><div><button class="client-link" data-summary-client="${c.id}">${safe(c.name)}</button><p>${safe(c.nextAction||'Laukiama kliento atsakymo')}</p><span class="sub ${isOverdue(c)?'danger':''}">${c.nextDate?taskLabel(c.nextDate):'Data nenumatyta'} · ${safe(c.manager)}</span></div><button class="btn compact-btn" data-summary-activity="${c.id}">Pridėti veiklą</button></div>`).join(''):'<div class="attention-empty">Vėluojančių veiksmų ir laukiančių pasiūlymų nėra.</div>';
    document.querySelectorAll('[data-summary-client]').forEach(b=>b.onclick=()=>openClient(+b.dataset.summaryClient));
    document.querySelectorAll('[data-summary-activity]').forEach(b=>b.onclick=()=>openModal('activityModal',+b.dataset.summaryActivity));
    const managers=[...new Set(scope.map(c=>c.manager))].sort((a,b)=>value(confirmed.filter(o=>o.manager===b))-value(confirmed.filter(o=>o.manager===a)));
    document.getElementById('managerSummary').innerHTML=managers.map(m=>{const os=active.filter(o=>o.manager===m),late=overdue.filter(c=>c.manager===m).length;return `<tr><td><div class="result-name"><span class="result-avatar" aria-hidden="true">${safe(m.slice(0,1))}</span><strong>${safe(m)}</strong></div></td><td class="price">${eur(value(confirmed.filter(o=>o.manager===m)))}</td><td class="price">${eur(value(os))}<span class="sub">${os.length} užsakymai</span></td><td>${offers.filter(o=>o.manager===m).length}</td><td class="${late?'danger':''}">${late}</td></tr>`}).join('')||'<tr><td colspan="5" class="muted">Vadybininkų dar nėra.</td></tr>';
  };
  document.getElementById('summaryPeriod').onchange=renderSummary;

  showView=function(name){
    if(name==='summary'&&roleSwitch.value==='manager')name='tasks';
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(name+'View').classList.add('active');
    document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    document.getElementById('nav').classList.remove('open');
    if(name==='tasks')renderTasks();
    if(name==='clients')renderClients();
    if(name==='orders')renderOrders();
    if(name==='activities')renderActivities();
    if(name==='summary')renderSummary();
    window.scrollTo({top:0,behavior:'smooth'});
  };

  openModal=function(id,clientId){
    fillSelects();
    if(clientId)document.querySelector(`#${id} select[name=client]`).value=clientId;
    if(id==='activityModal'){
      document.querySelector('#activityForm input[name=date]').value=TODAY;
      const due=new Date(TODAY+'T12:00:00');due.setDate(due.getDate()+2);
      document.querySelector('#activityForm input[name=nextDate]').value=due.toISOString().slice(0,10);
    }
    document.getElementById(id).showModal();
  };

  document.getElementById('orderForm').onsubmit=e=>{
    e.preventDefault();
    const f=new FormData(e.target),c=clients.find(x=>x.id===+f.get('client'));
    const date=TODAY,price=+f.get('price'),status=f.get('status');
    const count=clients.reduce((n,x)=>n+(x.orders?.length||0),0);
    const order={id:`UZ-${String(1054+count).padStart(4,'0')}`,date,quantity:f.get('quantity')||'Nenurodyta',price,status,source:f.get('source'),delivery:f.get('delivery'),note:f.get('note')||''};
    c.orders.unshift(order);c.source=order.source;c.quantity=order.quantity;c.price=price;c.status=status;c.last=date;
    c.history.unshift({date,type:'Užsakymas',note:f.get('note')||'Užregistruotas naujas užsakymas.',price});
    save();e.target.reset();document.getElementById('orderModal').close();renderClients();renderOrders();renderTasks();renderSummary();if(selectedId===c.id)openClient(c.id);toast('Užsakymas išsaugotas');
  };

  document.getElementById('activityForm').onsubmit=e=>{
    e.preventDefault();
    const f=new FormData(e.target),c=clients.find(x=>x.id===+f.get('client')),price=+f.get('price');
    c.last=f.get('date');c.nextAction=f.get('next');c.nextDate=f.get('nextDate');c.next=`${c.nextAction} iki ${shortDate(c.nextDate)}`;
    if(c.nextAction==='Užsakymas neaktualus'){c.next='';c.nextDate='';}
    if(price)c.price=price;
    c.history.unshift({date:c.last,type:f.get('type'),note:f.get('note'),price:price||undefined});
    save();e.target.reset();document.getElementById('activityModal').close();renderClients();renderActivities();renderTasks();renderSummary();if(document.getElementById('detailView').classList.contains('active')&&selectedId===c.id)openClient(c.id);toast('Veikla ir kitas veiksmas išsaugoti');
  };

  roleSwitch.onchange=()=>{
    const manager=roleSwitch.value==='manager';
    document.querySelector('.nav button[data-view="summary"]').hidden=manager;
    document.getElementById('resetDemo').hidden=manager;
    if(manager&&document.getElementById('summaryView').classList.contains('active'))showView('tasks');
    const mf=document.getElementById('managerFilter');
    mf.disabled=false;mf.value='';
    renderTasks();renderClients();renderOrders();renderActivities();renderSummary();
    toast(roleSwitch.value==='manager'?'Visi klientai matomi. „Mano darbai“ – Rasos užduotys.':'Rodomi visos komandos duomenys');
  };
  document.getElementById('taskActivityBtn').onclick=()=>openModal('activityModal');
  document.getElementById('ordersAddBtn').onclick=()=>openModal('orderModal');
  document.getElementById('orderSearch').oninput=renderOrders;
  document.getElementById('orderStatusFilter').onchange=renderOrders;
  document.getElementById('resetDemo').onclick=()=>{localStorage.removeItem('nd-crm-demo');location.reload()};

  const statuses=['Naujas','Ruošiama kaina','Pasiūlyta','Patvirtinta','Vykdoma','Užbaigta','Neįvyko'];
  const escapeOrderText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function changeOrderStatus(c,o,status,comment=''){
    if(o.status===status)return;
    const previous=o.status,changedAt=new Date().toISOString();
    o.status=status;o.statusHistory=o.statusHistory||[];
    o.statusHistory.push({from:previous,to:status,changedAt,comment});
    if(c.orders[0]===o)c.status=status;
    c.history.unshift({date:TODAY,type:'Būsenos pakeitimas',note:`Užsakymas ${o.id}: ${previous} → ${status}.${comment?' Komentaras: '+escapeOrderText(comment):''}`});
  }
  let editTarget=null;
  function openOrderEdit(clientId,orderId){
    const c=clients.find(x=>x.id===clientId),o=c?.orders.find(x=>x.id===orderId);
    if(!o){toast('Užsakymas nerastas');return;}
    editTarget={clientId,orderId};
    document.getElementById('editOrderTitle').textContent=`Užsakymas ${o.id}`;
    document.getElementById('editOrderContext').textContent=`${c.name} · ${shortDate(o.date)} · ${c.manager}`;
    for(const [field,key] of [['Quantity','quantity'],['Price','price'],['Source','source'],['Delivery','delivery'],['Note','note'],['Status','status']])document.getElementById('editOrder'+field).value=o[key]??'';
    document.getElementById('editOrderComment').value='';
    const history=[...(o.statusHistory||[]).map(h=>({...h,text:`${h.from} → ${h.to}`,kind:'Būsena'})),...(o.editHistory||[]).map(h=>({...h,text:h.changes.join('; '),kind:'Redagavimas'}))].sort((a,b)=>b.changedAt.localeCompare(a.changedAt));
    document.getElementById('editOrderHistory').innerHTML=history.map(h=>`<div class="event"><strong>${escapeOrderText(h.kind)}</strong><small> · ${new Date(h.changedAt).toLocaleString('lt-LT',{timeZone:'Europe/Vilnius'})}</small><p>${escapeOrderText(h.text)}</p>${h.comment?`<p>${escapeOrderText(h.comment)}</p>`:''}</div>`).join('')||'<p class="muted">Pakeitimų dar nėra.</p>';
    document.getElementById('editOrderModal').showModal();
  }
  document.getElementById('editOrderForm').onsubmit=e=>{
    e.preventDefault();
    const c=clients.find(x=>x.id===editTarget?.clientId),o=c?.orders.find(x=>x.id===editTarget?.orderId);
    if(!o){toast('Užsakymas nerastas');return;}
    const val=s=>document.getElementById('editOrder'+s).value;
    const price=Number(val('Price')),status=val('Status'),comment=val('Comment').trim();
    if(!Number.isFinite(price)||price<0||!statuses.includes(status)){toast('Patikrinkite kainą ir būseną');return;}
    if(comment&&status===o.status){toast('Komentarui pasirinkite naują būseną');return;}
    const updates={quantity:val('Quantity').trim()||'Nenurodyta',price,source:val('Source'),delivery:val('Delivery'),note:val('Note').trim()};
    const labels={quantity:'Kiekis',price:'Kaina',source:'Šaltinis',delivery:'Pristatymo data',note:'Pastaba'};
    const changes=Object.keys(updates).filter(k=>String(o[k]??'')!==String(updates[k])).map(k=>`${labels[k]}: ${k==='price'?eur(Number(o[k])||0):o[k]||'–'} → ${k==='price'?eur(updates[k]):updates[k]||'–'}`);
    if(!changes.length&&status===o.status){document.getElementById('editOrderModal').close();toast('Pakeitimų nėra');return;}
    if(changes.length){o.editHistory=o.editHistory||[];o.editHistory.push({changedAt:new Date().toISOString(),changes});c.history.unshift({date:TODAY,type:'Užsakymo redagavimas',note:`Užsakymas ${o.id}. ${escapeOrderText(changes.join('; '))}`});}
    Object.assign(o,updates);changeOrderStatus(c,o,status,comment);
    if(c.orders[0]===o){c.price=o.price;c.quantity=o.quantity;c.source=o.source;}
    save();document.getElementById('editOrderModal').close();renderClients();renderOrders();renderTasks();renderActivities();renderSummary();
    if(document.getElementById('detailView').classList.contains('active'))openClient(c.id);
    toast('Užsakymo pakeitimai išsaugoti');
  };
  let statusTarget=null;
  function openStatusChange(clientId,orderId){
    const c=scopedClients().find(x=>x.id===clientId),o=c?.orders.find(x=>x.id===orderId);
    if(!o){toast('Pasirinktas užsakymas nerastas');return;}
    statusTarget={clientId,orderId,inDetail:document.getElementById('detailView').classList.contains('active')};
    document.getElementById('statusOrderContext').textContent=`${o.id} · ${c.name}`;
    document.getElementById('statusCurrent').textContent=`Dabartinė būsena: ${o.status}`;
    document.getElementById('statusChoice').value=o.status;
    document.getElementById('statusComment').value='';
    document.getElementById('statusModal').showModal();
  }
  document.getElementById('statusForm').onsubmit=e=>{
    e.preventDefault();
    const c=scopedClients().find(x=>x.id===statusTarget?.clientId);
    const o=c?.orders.find(x=>x.id===statusTarget?.orderId);
    const status=document.getElementById('statusChoice').value;
    if(!o||!statuses.includes(status)){toast('Pasirinkite galiojančią užsakymo būseną');return;}
    if(o.status===status){document.getElementById('statusModal').close();toast('Būsena nepakeista');return;}
    changeOrderStatus(c,o,status,document.getElementById('statusComment').value.trim());
    save();document.getElementById('statusModal').close();
    renderClients();renderOrders();renderTasks();renderActivities();renderSummary();
    if(statusTarget.inDetail)openClient(c.id);
    toast('Užsakymo būsena išsaugota');
  };

  let returnToOrder=false;
  function startClientCreation(fromOrder=false){
    returnToOrder=fromOrder;
    document.getElementById('clientForm').reset();
    const manager=document.getElementById('clientManager');
    manager.value='Rasa';manager.disabled=false;
    if(fromOrder)document.getElementById('orderModal').close();
    document.getElementById('clientModal').showModal();
  }
  document.getElementById('addClientBtn').onclick=()=>startClientCreation();
  document.getElementById('orderCreateClient').onclick=()=>startClientCreation(true);
  document.getElementById('clientModal').addEventListener('close',()=>{
    if(returnToOrder){returnToOrder=false;document.getElementById('orderModal').showModal();}
  });
  document.getElementById('clientForm').onsubmit=e=>{
    e.preventDefault();
    const f=new FormData(e.target),name=String(f.get('name')||'').trim(),phone=String(f.get('phone')||'').trim();
    if(!name||!phone){toast('Įveskite kliento pavadinimą ir telefoną');return;}
    const c={id:Math.max(0,...clients.map(x=>x.id))+1,name,phone,
      contact:String(f.get('contact')||'').trim()||'–',email:String(f.get('email')||'').trim()||'–',
      city:String(f.get('city')||'').trim()||'–',manager:f.get('manager'),
      last:'',price:0,status:'Be užsakymo',quantity:'',source:'–',next:'',nextAction:'',nextDate:'',history:[],orders:[]};
    clients.push(c);save();
    fillSelects();document.getElementById('orderClient').value=String(c.id);document.getElementById('activityClient').value=String(c.id);
    document.getElementById('searchInput').value='';document.getElementById('statusFilter').value='';
    document.getElementById('managerFilter').value='';
    renderClients();renderTasks();renderOrders();renderSummary();
    const wasOrder=returnToOrder;
    document.getElementById('clientModal').close();
    if(!wasOrder)showView('clients');
    toast(wasOrder?'Klientas sukurtas ir parinktas užsakymui':'Naujas klientas išsaugotas');
  };

  renderTasks();renderClients();renderOrders();
})();
