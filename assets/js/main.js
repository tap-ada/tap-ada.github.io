const POOL_BECH32 = 'pool16tcjctesjnks0p8sfrlf8f3d3vrp2fdn2msy80sgg3cdjtayu3z';
const KOIOS_API = 'https://api.koios.rest/api/v1';

// Format Lovelace to ADA
function fmtAda(lov) {
  const a = Number(lov) / 1e6;
  return a.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ADA';
}

// Format Percent
function fmtPct(p) {
  return Number(p).toFixed(2) + '%';
}

// Fetch Pool Stats from Koios
async function fetchPoolStats() {
  const statusEl = document.getElementById('stats-status');
  const lastUpdateEl = document.getElementById('lastUpdate');
  
  try {
    // 1. Get Pool Info
    const poolResponse = await fetch(`${KOIOS_API}/pool_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _pool_bech32_ids: [POOL_BECH32] })
    });
    const poolData = await poolResponse.json();
    const p = poolData[0];

    // 2. Get Tip (for Epoch)
    const tipResponse = await fetch(`${KOIOS_API}/tip`);
    const tipData = await tipResponse.json();
    const currentEpoch = tipData[0].epoch_no;

    if (p) {
      document.getElementById('val-stake').textContent = fmtAda(p.live_stake);
      document.getElementById('val-delegators').textContent = p.live_delegators;
      document.getElementById('val-saturation').textContent = fmtPct(p.live_saturation);
      document.getElementById('val-pledge').textContent = fmtAda(p.pledge);
      document.getElementById('val-blocks').textContent = p.block_count || 0;
      document.getElementById('val-epoch').textContent = currentEpoch;
      
      statusEl.textContent = 'Live data synced.';
      lastUpdateEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
    }
  } catch (err) {
    console.error('Fetch error:', err);
    statusEl.textContent = 'Error loading live stats. Please try again.';
  }
}

// Mobile Menu Logic
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('active');
});

function closeMenu() {
  mainNav.classList.remove('active');
}

// Copy Logic
function copyPoolId() {
  const txt = document.getElementById('poolIdText').innerText;
  navigator.clipboard.writeText(txt);
  alert('Pool ID copied!');
}

function copyBech32() {
  navigator.clipboard.writeText(POOL_BECH32);
  alert('Bech32 Pool ID copied!');
}

// Init
window.onload = () => {
  fetchPoolStats();
  // Refresh every 60s
  setInterval(fetchPoolStats, 60000);
};
