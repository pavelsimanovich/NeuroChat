(function(){
  function fetchJSON(url, opts){
    return fetch(url, Object.assign({headers: {'Content-Type': 'application/json'}}, opts)).then(r=>r.json());
  }

  // Simple rolling buffer
  const MAX_POINTS = 60; // last 60 samples (~3 minutes if 3s interval)
  const state = {
    charts: {
      rps: null,
      cpu: null,
      heap: null,
    },
    series: {
      labels: [],
      rps: [],
      cpu: [],
      heap: []
    },
    prev: {
      httpCount: null,
      ts: null
    },
    poll: {
      id: null,
      ms: 5000
    },
    users: {
      statsIntervalId: null
    }
  };

  function loadHealth(){
    fetch('/actuator/health')
      .then(r=>r.json())
      .then(d=>{
        document.getElementById('healthStatus').textContent = d.status || 'UNKNOWN';
      }).catch(()=>{
        document.getElementById('healthStatus').textContent = 'ERROR';
      });
  }

  async function loadUserStats(){
    try {
      const data = await fetchJSON('/api/admin/users/stats');
      const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = (v ?? '—'); };
      set('userStatTotal', data.total);
      set('userStatNew24h', data.new24h);
      set('userStatNew7d', data.new7d);
    } catch(e){ /* ignore */ }
  }

  function getMeasurementByStat(measurements, stat){
    if(!Array.isArray(measurements)) return null;
    const m = measurements.find(x => (x.statistic||'').toUpperCase() === stat.toUpperCase());
    return m ? m.value : null;
  }

  async function fetchMetric(name, query){
    const url = query ? `/actuator/metrics/${name}?${query}` : `/actuator/metrics/${name}`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('metric fetch failed');
    return r.json();
  }

  async function sampleMetrics(){
    const now = Date.now();

    // Uptime
    try {
      const up = await fetchMetric('process.uptime');
      const upVal = up.measurements?.[0]?.value ?? 0;
      document.getElementById('uptime').textContent = Math.floor(upVal);
    } catch(e){}

    // HTTP Requests per second (derived from COUNT delta / deltaTime)
    try {
      const http = await fetchMetric('http.server.requests');
      const count = getMeasurementByStat(http.measurements, 'COUNT') ?? null;
      if(count != null){
        if(state.prev.httpCount != null && state.prev.ts != null){
          const dt = (now - state.prev.ts) / 1000.0;
          const dc = Math.max(0, count - state.prev.httpCount);
          const rps = dt > 0 ? dc / dt : 0;
          document.getElementById('httpRps').textContent = rps.toFixed(2);
          pushPoint(rps, 'rps');
        }
        state.prev.httpCount = count;
        state.prev.ts = now;
      }
    } catch(e){}

    // CPU: process.cpu.usage -> 0..1
    try {
      const cpu = await fetchMetric('process.cpu.usage');
      const val = cpu.measurements?.[0]?.value ?? 0;
      pushPoint((val || 0) * 100, 'cpu');
    } catch(e){}

    // Heap: jvm.memory.used?tag=area:heap -> bytes
    try {
      const heap = await fetchMetric('jvm.memory.used', 'tag=area:heap');
      const bytes = heap.measurements?.[0]?.value ?? 0;
      pushPoint(bytes / (1024*1024), 'heap');
    } catch(e){}
  }

  function pushPoint(value, key){
    const timeLabel = new Date().toLocaleTimeString();
    // Only push one label per sampling cycle; ensure same length
    if(key === 'rps'){
      state.series.labels.push(timeLabel);
      if(state.series.labels.length > MAX_POINTS) state.series.labels.shift();
    }
    const arr = state.series[key];
    arr.push(value);
    if(arr.length > MAX_POINTS) arr.shift();
    updateChart(key);
    if(key === 'heap'){
      // last key in cycle -> also update labels for other series lengths to match
      ['cpu','rps','heap'].forEach(k=>{
        while(state.series[k].length < state.series.labels.length){ state.series[k].unshift(null); }
        while(state.series[k].length > state.series.labels.length){ state.series[k].shift(); }
      });
      ['rps','cpu','heap'].forEach(updateChart);
    }
  }

  function createChart(ctx, label, color){
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: state.series.labels,
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color + '33',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: true },
          y: { beginAtZero: true }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateChart(key){
    const chart = state.charts[key];
    if(!chart) return;
    chart.data.labels = state.series.labels;
    if(key === 'rps') chart.data.datasets[0].data = state.series.rps;
    if(key === 'cpu') chart.data.datasets[0].data = state.series.cpu;
    if(key === 'heap') chart.data.datasets[0].data = state.series.heap;
    chart.update('none');
  }

  function initCharts(){
    state.charts.rps = createChart(document.getElementById('rpsChart'), 'RPS', '#0d6efd');
    state.charts.cpu = createChart(document.getElementById('cpuChart'), 'CPU %', '#20c997');
    state.charts.heap = createChart(document.getElementById('heapChart'), 'Heap MB', '#6f42c1');
  }

  function startSampling(ms){
    if(state.poll.id){
      clearInterval(state.poll.id);
      state.poll.id = null;
    }
    state.poll.ms = ms;
    // immediate sample on change
    sampleMetrics();
    state.poll.id = setInterval(sampleMetrics, state.poll.ms);
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
    initCharts();
    loadUsers();
    loadUserStats();
    attachHandlers();
    setInterval(loadHealth, 10000);
    // refresh user stats every 10s
    state.users.statsIntervalId = setInterval(loadUserStats, 10000);
    // setup polling interval select
    const select = document.getElementById('metricsIntervalSelect');
    const initialMs = parseInt(select?.value || '5000', 10);
    startSampling(isNaN(initialMs) ? 5000 : initialMs);
    if(select){
      select.addEventListener('change', ()=>{
        const ms = parseInt(select.value, 10);
        startSampling(isNaN(ms) ? state.poll.ms : ms);
      });
    }
  });
})();
