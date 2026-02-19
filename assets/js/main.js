const POOL_BECH32 = 'pool16tcjctesjnks0p8sfrlf8f3d3vrp2fdn2msy80sgg3cdjtayu3z';
const KOIOS = 'https://api.koios.rest/api/v1';

// Hamburger Menu
document.getElementById('menuBtn').addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
});
function closeMenu() {
  document.getElementById('menuBtn').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
}

// Format ADA from lovelace
function fmt(lovelace) {
  const ada = lovelace / 1e6;
  if (ada >= 1e6) return (ada/1e6).toFixed(2) + 'M';
  if (ada >= 1000) return (ada/1000).toFixed(1) + 'K';
  return ada.toFixed(0);
}

// Epoch info + progress bar
async function loadEpoch() {
  try {
    const r = await fetch(`${KOIOS}/epoch_info?limit=1&order=epoch_no.desc`);
    const [ep] = await r.json();
    document.getElementById('epochNum').textContent = ep.epoch_no;
    document.getElementById('liveEpoch').textContent = ep.epoch_no;
    document.getElementById('liveEpoch').classList.remove('loading-pulse');
    const start = ep.start_time * 1000;
    const end = ep.end_time * 1000;
    const now = Date.now();
    const pct = Math.min(100, ((now - start) / (end - start)) * 100);
    document.getElementById('epochBar').style.width = pct.toFixed(1) + '%';
    document.getElementById('epochStart').textContent = new Date(start).toLocaleDateString('de-AT', {day:'2-digit',month:'short'});
    document.getElementById('epochEnd').textContent = new Date(end).toLocaleDateString('de-AT', {day:'2-digit',month:'short'});
  } catch(e) { console.log('epoch err', e); }
}

// Pool history for charts + live stats
let stakeChart, blockChart, rosChart;
async function loadPoolData() {
  try {
    const r = await fetch(`${KOIOS}/pool_history?_pool_bech32=${POOL_BECH32}&order=epoch_no.desc&limit=10`);
    const data = await r.json();
    if (!data || !data.length) throw new Error('no data');

    // Latest epoch stats
    const latest = data[0];
    document.getElementById('liveStake').textContent = fmt(latest.active_stake) + ' ADA';
    document.getElementById('liveStake').classList.remove('loading-pulse');
    document.getElementById('liveStakeSub').textContent = 'Epoche ' + latest.epoch_no;
    document.getElementById('liveDelegators').textContent = latest.delegator_cnt;
    document.getElementById('liveDelegators').classList.remove('loading-pulse');
    document.getElementById('liveBlocks').textContent = latest.block_cnt;
    document.getElementById('liveBlocks').classList.remove('loading-pulse');
    const ros = (parseFloat(latest.epoch_ros) * 100).toFixed(3);
    document.getElementById('liveROS').textContent = ros + '%';
    document.getElementById('liveROS').classList.remove('loading-pulse');

    // Saturation from pool_list
    loadSaturation();

    // Status
    document.getElementById('statusText').textContent = 'Live • Zuletzt aktualisiert: ' + new Date().toLocaleTimeString('de-AT');

    // Charts (reversed = oldest first)
    const rev = [...data].reverse();
    const labels = rev.map(d => 'E' + d.epoch_no);
    const stakeVals = rev.map(d => (d.active_stake / 1e12).toFixed(3)); // in millions ADA
    const blockVals = rev.map(d => d.block_cnt);
    const rosVals = rev.map(d => (parseFloat(d.epoch_ros) * 100).toFixed(3));

    const chartDefaults = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: 'rgba(0,212,170,.3)', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#8b949e', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#8b949e', font: { size: 11 } } }
      }
    };

    if (stakeChart) stakeChart.destroy();
    stakeChart = new Chart(document.getElementById('stakeChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: stakeVals, borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,.08)', fill: true, tension: 0.4, pointBackgroundColor: '#00d4aa', pointRadius: 4, borderWidth: 2 }]
      },
      options: { ...chartDefaults }
    });

    if (blockChart) blockChart.destroy();
    blockChart = new Chart(document.getElementById('blockChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: blockVals, backgroundColor: 'rgba(0,212,170,.6)', borderColor: '#00d4aa', borderWidth: 1, borderRadius: 4 }]
      },
      options: { ...chartDefaults }
    });

    if (rosChart) rosChart.destroy();
    rosChart = new Chart(document.getElementById('rosChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: rosVals, borderColor: '#00a8ff', backgroundColor: 'rgba(0,168,255,.08)', fill: true, tension: 0.4, pointBackgroundColor: '#00a8ff', pointRadius: 4, borderWidth: 2 }]
      },
      options: { ...chartDefaults }
    });

  } catch(e) {
    console.log('pool err', e);
    document.getElementById('statusText').textContent = 'API-Fehler – Daten können nicht geladen werden';
    document.getElementById('statusBadge').className = 'status-live status-error';
  }
}

async function loadSaturation() {
  try {
    const r = await fetch(`${KOIOS}/pool_list?ticker=eq.TAPSY`);
    const [p] = await r.json();
    // active_stake vs saturation: approx from active_stake_pct
    const poolR = await fetch(`${KOIOS}/pool_history?_pool_bech32=${POOL_BECH32}&order=epoch_no.desc&limit=1`);
    const [h] = await poolR.json();
    const sat = (parseFloat(h.saturation_pct)).toFixed(2);
    document.getElementById('liveSat').textContent = sat + '%';
    document.getElementById('liveSat').classList.remove('loading-pulse');
    document.getElementById('satBar').style.width = Math.min(100, sat) + '%';
  } catch(e) { console.log('sat err', e); }
}

// Init
loadEpoch();
loadPoolData();
// Auto-refresh every 5 min
setInterval(() => { loadEpoch(); loadPoolData(); }, 300000);
