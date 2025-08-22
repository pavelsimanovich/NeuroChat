(function(){
  function fetchJSON(url, opts){
    return fetch(url, Object.assign({headers: {'Content-Type': 'application/json'}}, opts)).then(r=>r.json());
  }

  function loadHealth(){
    fetch('/actuator/health')
      .then(r=>r.json())
      .then(d=>{
        document.getElementById('healthStatus').textContent = d.status || 'UNKNOWN';
      }).catch(()=>{
        document.getElementById('healthStatus').textContent = 'ERROR';
      });
  }

  function loadMetrics(){
    fetch('/actuator/metrics/process.uptime')
      .then(r=>r.json())
      .then(d=>{
        const m = d.measurements && d.measurements[0] ? d.measurements[0].value : 0;
        document.getElementById('uptime').textContent = Math.floor(m);
      }).catch(()=>{});

    fetch('/actuator/metrics/http.server.requests')
      .then(r=>r.json())
      .then(d=>{
        const m = d.measurements && d.measurements[0] ? d.measurements[0].value : 0;
        document.getElementById('httpRps').textContent = m.toFixed(2);
      }).catch(()=>{});
  }

  function row(u){
    const fullName = [u.firstName||'', u.lastName||''].join(' ').trim();
    const enabledBadge = u.enabled ? '<span class="badge bg-success">Активен</span>' : '<span class="badge bg-secondary">Отключен</span>';
    return `
      <tr data-id="${u.id}">
        <td>${u.email}</td>
        <td>${fullName || '—'}</td>
        <td>
          <select class="form-select form-select-sm role-select" style="width:auto;">
            <option value="USER" ${u.role==='USER'?'selected':''}>USER</option>
            <option value="ADMIN" ${u.role==='ADMIN'?'selected':''}>ADMIN</option>
          </select>
        </td>
        <td>${enabledBadge}</td>
        <td>${(u.createdAt||'').toString().replace('T',' ')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary toggle-enabled">${u.enabled?'Отключить':'Включить'}</button>
          <button class="btn btn-sm btn-outline-danger reset-pass">Сброс пароля</button>
        </td>
      </tr>`;
  }

  function loadUsers(){
    const q = document.getElementById('userSearch').value.trim();
    const url = q? `/api/admin/users?q=${encodeURIComponent(q)}` : '/api/admin/users';
    fetchJSON(url).then(list=>{
      document.getElementById('usersTableBody').innerHTML = list.map(row).join('');
    });
  }

  function attachHandlers(){
    const tbody = document.getElementById('usersTableBody');
    tbody.addEventListener('change', (e)=>{
      if(e.target.classList.contains('role-select')){
        const tr = e.target.closest('tr');
        const id = tr.getAttribute('data-id');
        fetchJSON(`/api/admin/users/${id}/role`, {
          method: 'POST',
          body: JSON.stringify({role: e.target.value})
        }).then(()=>loadUsers());
      }
    });

    tbody.addEventListener('click', (e)=>{
      const tr = e.target.closest('tr');
      if(!tr) return;
      const id = tr.getAttribute('data-id');
      if(e.target.classList.contains('toggle-enabled')){
        const enabledNow = tr.querySelector('.badge').classList.contains('bg-success');
        fetchJSON(`/api/admin/users/${id}/enable`, {
          method: 'POST',
          body: JSON.stringify({enabled: !enabledNow})
        }).then(()=>loadUsers());
      }
      if(e.target.classList.contains('reset-pass')){
        if(confirm('Сгенерировать временный пароль и сбросить?')){
          fetchJSON(`/api/admin/users/${id}/reset-password`, {method: 'POST'})
            .then(res=>{
              alert('Новый пароль: ' + res.newPassword);
            });
        }
      }
    });

    document.getElementById('userSearch').addEventListener('input', ()=>{
      clearTimeout(window.__adm_t);
      window.__adm_t = setTimeout(loadUsers, 300);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    loadHealth();
    loadMetrics();
    loadUsers();
    attachHandlers();
    setInterval(loadHealth, 10000);
    setInterval(loadMetrics, 15000);
  });
})();
