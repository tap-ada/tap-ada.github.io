// ============================================================
// TAPSY – TapTap Vienna | Live Pool Stats via Koios API
// ============================================================

const POOL_BECH32 = 'pool16tcjctesjnks0p8sfrlf8f3d3vrp2fdn2msy80sgg3cdjtayu3z';
const KOIOS = 'https://api.koios.rest/api/v1';

// ── Hilfsfunktionen ──────────────────────────────────────────

// Lovelace → ADA lesbar formatieren
function fmtAda(lovelace) {
  const ada = Number(lovelace) / 1e6;
  if (ada >= 1e6) return (ada / 1e6).toFixed(2) + 'M';
  if (ada >= 1000) return (ada / 1000).toFixed(1) + 'K';
  return ada.toFixed(0);
}

// Timestamp → lesbares Datum (de-AT)
function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('de-AT', {
    day: '2-digit', month: 'short', year: '2-digit'
  });
}

// DOM-Element setzen und Ladeanimation entfernen
function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.classList.remove('loading-pulse');
}

// ── Hamburger Menü ───────────────────────────────────────────

document.getElementById('menuBtn').addEventListener('click', function () {
  this.classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
});

function closeMenu() {
  document.getElementById('menuBtn').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
}

// Copy Pool ID Button
document.getElementById('copyBtn').addEventListener('click', function () {
  const pid = document.getElementById('pid').textContent;
  navigator.clipboard.writeText(pid).then(() => {
    this.textContent = 'Copied! ✓';
    setTimeout(() => { this.textContent = 'Copy'; }, 2000);
  });
});

// ── Epoche laden ─────────────────────────────────────────────

async function loadEpoch() {
  try {
    const res = await fetch(`${KOIOS}/epoch_info?limit=1&order=epoch_no.desc`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const [ep] = await res.json();

    setVal('epochNum', ep.epoch_no);
    setVal('liveEpoch', ep.epoch_no);

    // Fortschrittsbalken berechnen
    const start = ep.start_time * 1000;
    const end   = ep.end_time   * 1000;
    const now   = Date.now();
    const pct   = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

    const bar = document.getElementById('epochBar');
    if (bar) bar.style.width = pct.toFixed(1) + '%';

    setVal('epochStart', fmtDate(ep.start_time));
    setVal('epochEnd',   fmtDate(ep.end_time));

  } catch (e) {
    console.error('Epoch-Fehler:', e);
  }
}

// ── Pool History laden (Stats + Charts) ──────────────────────

let stakeChart = null;
let blockChart = null;
let rosChart   = null;

async function loadPoolData() {
  try {
    const res = await fetch(
      `${KOIOS}/pool_history?_pool_bech32=${POOL_BECH32}&order=epoch_no.desc&limit=10`
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || data.length === 0) throw new Error('Keine Daten');

    // Neueste Epoche → Live-Cards befüllen
    const latest = data[0];
    setVal('liveStake',      fmtAda(latest.active_stake) + ' ADA');
    setVal('liveStakeSub',   'Epoche ' + latest.epoch_no);
    setVal('liveDelegators', latest.delegator_cnt);
    setVal('liveBlocks',     latest.block_cnt);
    setVal('liveSat',        parseFloat(latest.saturation_pct).toFixed(2) + '%');
    setVal('liveROS',        (parseFloat(latest.epoch_ros) * 100).toFixed(3) + '%');

    // Saturation-Balken
    const satBar = document.getElementById('satBar');
    if (satBar) satBar.style.width = Math.min(100, parseFloat(latest.saturation_pct)) + '%';

    // Status-Badge aktualisieren
    const badge = document.getElementById('statusBadge');
    const text  = document.getElementById('statusText');
    if (badge) badge.className = 'status-live';
    if (text)  text.textContent = 'Live · Aktualisiert: ' + new Date().toLocaleTimeString('de-AT');

    // Charts zeichnen (älteste zuerst)
    const rev       = [...data].reverse();
    const labels    = rev.map(d => 'E' + d.epoch_no);
    const stakeVals = rev.map(d => (Number(d.active_stake) / 1e12).toFixed(2));
    const blockVals = rev.map(d => d.block_cnt);
    const rosVals   = rev.map(d => (parseFloat(d.epoch_ros) * 100).toFixed(3));

    drawCharts(labels, stakeVals, blockVals, rosVals);

  } catch (e) {
    console.error('Pool-Daten-Fehler:', e);
    const badge = document.getElementById('statusBadge');
    const text  = document.getElementById('statusText');
    if (badge) badge.className = 'status-live status-error';
    if (text)  text.textContent = 'API nicht erreichbar – bitte später versuchen';
  }
}

// ── Charts zeichnen ──────────────────────────────────────────

function drawCharts(labels, stakeVals, blockVals, rosVals) {
  // Gemeinsame Chart-Optionen
  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161b22',
        borderColor: 'rgba(0,212,170,.3)',
        borderWidth: 1,
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: '#8b949e', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: '#8b949e', font: { size: 11 } }
      }
    }
  };

  // Stake-Chart (Linie)
  const stakeCtx = document.getElementById('stakeChart');
  if (stakeCtx) {
    if (stakeChart) stakeChart.destroy();
    stakeChart = new Chart(stakeCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: stakeVals,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0,212,170,.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00d4aa',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }]
      },
      options: { ...baseOpts }
    });
  }

  // Block-Chart (Balken)
  const blockCtx = document.getElementById('blockChart');
  if (blockCtx) {
    if (blockChart) blockChart.destroy();
    blockChart = new Chart(blockCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: blockVals,
          backgroundColor: 'rgba(0,212,170,.5)',
          borderColor: '#00d4aa',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(0,212,170,.8)'
        }]
      },
      options: { ...baseOpts }
    });
  }

  // ROS-Chart (Linie)
  const rosCtx = document.getElementById('rosChart');
  if (rosCtx) {
    if (rosChart) rosChart.destroy();
    rosChart = new Chart(rosCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: rosVals,
          borderColor: '#00a8ff',
          backgroundColor: 'rgba(0,168,255,.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00a8ff',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }]
      },
      options: { ...baseOpts }
    });
  }
}

// ── Start ────────────────────────────────────────────────────

loadEpoch();
loadPoolData();

// Auto-Refresh alle 5 Minuten
setInterval(() => {
  loadEpoch();
  loadPoolData();
}, 5 * 60 * 1000);
