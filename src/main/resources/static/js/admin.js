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
      timestamps: [],
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
    timeRange: 15, // minutes
    users: {
      statsIntervalId: null
    },
    // Store raw data for the max time range (6 hours)
    rawData: {
      timestamps: [],
      rps: [],
      cpu: [],
      heap: []
    }
  };

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

      const hours = Math.floor(upVal / 3600);
      const minutes = Math.floor((upVal % 3600) / 60);
      const seconds = Math.floor(upVal % 60);
      
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const uptimeElement = document.getElementById('uptime');
      if (uptimeElement) {
        uptimeElement.textContent = formattedTime;
      } else {
        console.error('Element with id "uptime" not found');
      }
    } catch(e) {
      console.error('Error processing uptime:', e);
    }

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

  function getMaxPoints() {
    // Calculate max points based on time range and polling interval
    const points = Math.ceil((state.timeRange * 60 * 1000) / state.poll.ms);
    return Math.min(points, 1000); // Cap at 1000 points for performance
  }

  function filterDataForTimeRange() {
    const now = Date.now();
    const timeAgo = now - (state.timeRange * 60 * 1000);
    
    // Ensure we have data to process
    if (state.rawData.timestamps.length === 0) return;
    
    // Find the index of the first point within the time range
    const firstIndex = state.rawData.timestamps.findIndex(ts => ts >= timeAgo);
    
    // If no points in range, use empty arrays
    if (firstIndex === -1) {
      state.series = {
        timestamps: [],
        labels: [],
        rps: [],
        cpu: [],
        heap: []
      };
      return;
    }
    
    // Slice the data to only include points within the time range
    state.series.timestamps = state.rawData.timestamps.slice(firstIndex);
    state.series.labels = state.rawData.timestamps
      .slice(firstIndex)
      .map(ts => new Date(ts).toLocaleTimeString());
    state.series.rps = state.rawData.rps.slice(firstIndex);
    state.series.cpu = state.rawData.cpu.slice(firstIndex);
    state.series.heap = state.rawData.heap.slice(firstIndex);
    
    // If we have too many points, downsample for better performance
    const maxPoints = getMaxPoints();
    if (state.series.timestamps.length > maxPoints) {
      const step = Math.ceil(state.series.timestamps.length / maxPoints);
      
      const downsample = (arr) => {
        const result = [];
        for (let i = 0; i < arr.length; i += step) {
          result.push(arr[i]);
        }
        return result;
      };
      
      state.series.timestamps = downsample(state.series.timestamps);
      state.series.labels = state.series.timestamps.map(ts => new Date(ts).toLocaleTimeString());
      state.series.rps = downsample(state.series.rps);
      state.series.cpu = downsample(state.series.cpu);
      state.series.heap = downsample(state.series.heap);
    }
  }

  function pushPoint(value, key) {
    const now = Date.now();
    const timeLabel = new Date(now).toLocaleTimeString();
    
    // Add to raw data (keeps all points for up to 6 hours)
    state.rawData.timestamps.push(now);
    if (key === 'rps') state.rawData.rps.push(value);
    if (key === 'cpu') state.rawData.cpu.push(value);
    if (key === 'heap') state.rawData.heap.push(value);
    
    // Clean up old data (older than 6 hours)
    const sixHoursAgo = now - (360 * 60 * 1000);
    const firstValidIndex = state.rawData.timestamps.findIndex(ts => ts >= sixHoursAgo);
    
    if (firstValidIndex > 0) {
      state.rawData.timestamps = state.rawData.timestamps.slice(firstValidIndex);
      state.rawData.rps = state.rawData.rps.slice(firstValidIndex);
      state.rawData.cpu = state.rawData.cpu.slice(firstValidIndex);
      state.rawData.heap = state.rawData.heap.slice(firstValidIndex);
    }
    
    // Filter data for current time range
    filterDataForTimeRange();
    
    // Only update the chart if it's the last point being added
    if (key === 'heap') {
      // Update all charts
      updateChart('rps');
      updateChart('cpu');
      updateChart('heap');
    }
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
          x: { 
            display: true,
            grid: { display: false }
          },
          y: { 
            beginAtZero: true,
            min: 0,
            ticks: {
              precision: 0
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        animation: {
          duration: 200
        },
        elements: {
          line: {
            tension: 0.3 // Smooth the line a bit
          },
          point: {
            radius: 2,
            hoverRadius: 4
          }
        }
      }
    });

    // Re-apply i18n to chart labels when language changes
    window.addEventListener('i18n:changed', ()=>{
      refreshChartI18nLabels();
      loadUsers();
      loadUserStats();
    });
  }

  function updateChart(key) {
    const chart = state.charts[key];
    if(!chart) return;
    
    // Validate data before updating
    const seriesData = state.series[key];
    const labels = state.series.labels;

    // Ensure data and labels are in sync
    if (seriesData.length !== labels.length) {
      // Truncate to the smallest array to maintain sync
      const minLength = Math.min(seriesData.length, labels.length, state.series.timestamps.length);
      seriesData.length = minLength;
      labels.length = minLength;
      state.series.timestamps.length = minLength;
    }
    
    // Update chart data
    const data = chart.data.datasets[0].data;
    data.length = 0;
    data.push(...seriesData);
    
    // Update chart labels
    chart.data.labels = labels;
    // Update chart with new data
    chart.update('none');
  }

  function i18nLabel(key, fallback){
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, fallback);
    }
    return fallback || key;
  }

  function initCharts(){
    state.charts.rps = createChart(
      document.getElementById('rpsChart'),
      i18nLabel('admin.monitoring.legend.rps', 'RPS'),
      '#0d6efd'
    );
    state.charts.cpu = createChart(
      document.getElementById('cpuChart'),
      i18nLabel('admin.monitoring.legend.cpu', 'CPU %'),
      '#20c997'
    );
    state.charts.heap = createChart(
      document.getElementById('heapChart'),
      i18nLabel('admin.monitoring.legend.heap', 'Heap MB'),
      '#6f42c1'
    );
  }

  function refreshChartI18nLabels(){
    if(state.charts.rps){
      state.charts.rps.data.datasets[0].label = i18nLabel('admin.monitoring.legend.rps', 'RPS');
      state.charts.rps.update('none');
    }
    if(state.charts.cpu){
      state.charts.cpu.data.datasets[0].label = i18nLabel('admin.monitoring.legend.cpu', 'CPU %');
      state.charts.cpu.update('none');
    }
    if(state.charts.heap){
      state.charts.heap.data.datasets[0].label = i18nLabel('admin.monitoring.legend.heap', 'Heap MB');
      state.charts.heap.update('none');
    }
  }

  function startSampling(ms){
    if(state.poll.id) clearInterval(state.poll.id);
    state.poll.ms = ms;
    
    // Clear existing data when changing intervals
    state.rawData = { timestamps: [], rps: [], cpu: [], heap: [] };
    state.series = { timestamps: [], labels: [], rps: [], cpu: [], heap: [] };
    
    sampleMetrics(); // immediate first sample
    state.poll.id = setInterval(sampleMetrics, ms);
    
    // Also refresh user stats every 30s
    if(state.users.statsIntervalId) clearInterval(state.users.statsIntervalId);
    state.users.statsIntervalId = setInterval(loadUserStats, 30000);
  }

  function row(u){
    const fullName = [u.firstName||'', u.lastName||''].join(' ').trim();
    const badgeText = u.enabled ? i18n.t('admin.users.badge.active', 'Active') : i18n.t('admin.users.badge.disabled', 'Disabled');
    const enabledBadge = `<span class="badge ${u.enabled?'bg-success':'bg-secondary'}">${badgeText}</span>`;
    const toggleText = u.enabled ? i18n.t('admin.users.btn.disable', 'Disable') : i18n.t('admin.users.btn.enable', 'Enable');
    const resetText = i18n.t('admin.users.btn.resetPass', 'Reset password');
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
          <button class="btn btn-sm btn-outline-secondary toggle-enabled">${toggleText}</button>
          <button class="btn btn-sm btn-outline-danger reset-pass">${resetText}</button>
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

  function attachHandlers() {
    // Handle time range change
    document.getElementById('timeRangeSelect').addEventListener('change', (e) => {
      state.timeRange = parseInt(e.target.value);
      filterDataForTimeRange();
      // Update all charts
      updateChart('rps');
      updateChart('cpu');
      updateChart('heap');
    });
    
    // Handle polling interval change
    document.getElementById('metricsIntervalSelect').addEventListener('change', (e) => {
      startSampling(parseInt(e.target.value));
    });
    
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
    initCharts();
    loadUsers();
    loadUserStats();
    attachHandlers();
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
