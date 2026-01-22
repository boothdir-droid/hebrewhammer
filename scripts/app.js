// Lightweight client-side app: loads /data/athlete.json and /data/tournaments.json
// Expects the scraper job to keep these files updated in /data/

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.json();
}

function renderProfile(profile) {
  const bio = document.getElementById('bio-text');
  bio.innerHTML = `
    <strong>${profile.name || 'Scott Weissman'}</strong><br/>
    ${profile.nickname ? `<em>${profile.nickname}</em> â€¢ ` : ''} ${profile.weight_class ? profile.weight_class + ' lb' : ''}
    <br/>${profile.school || ''} â€” ${profile.club || ''}
  `;

  const links = document.getElementById('external-links');
  links.innerHTML = '';
  if (profile.external_links) {
    for (const [key, url] of Object.entries(profile.external_links)) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = key === 'flow' ? 'Flowrestling' : key === 'track' ? 'TrackWrestling' : key;
      a.style.marginRight = '12px';
      links.appendChild(a);
    }
  }
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat"><div class="big">${profile.record||'â€”'}</div><div class="label">Record</div></div>
    <div class="stat"><div class="big">${profile.pins ?? 'â€”'}</div><div class="label">Pins</div></div>
    <div class="stat"><div class="big">${profile.takedowns ?? 'â€”'}</div><div class="label">Takedowns</div></div>
    <div class="stat"><div class="big">${profile.notes||'â€”'}</div><div class="label">Notes</div></div>
  `;
}

function sortableDateVal(d) {
  const t = Date.parse(d || '');
  return isNaN(t) ? 0 : t;
}

function renderResults(rows) {
  const wrap = document.getElementById('table-wrap');
  const filterInput = document.getElementById('filter');
  const sortSelect = document.getElementById('sort');

  function buildTable(items) {
    if (!items.length) {
      wrap.innerHTML = '<p>No results available yet.</p>';
      return;
    }
    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Date</th><th>Tournament</th><th>Result</th><th>Source</th><th>Profile</th>
      </tr></thead>
    `;
    const tbody = document.createElement('tbody');
    items.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.date || 'â€”'}</td>
        <td>${r.title || 'â€”'}</td>
        <td>${r.result || 'â€”'}</td>
        <td>${r.source || 'â€”'}</td>
        <td>${r.link ? `<a href="${r.link}" target="_blank" rel="noreferrer">Source</a>` : ''}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.innerHTML = '';
    wrap.appendChild(table);
  }

  function updateView() {
    const q = (filterInput.value || '').toLowerCase().trim();
    let filtered = rows.filter(r => {
      if (!q) return true;
      return (r.title||'').toLowerCase().includes(q) ||
             (r.result||'').toLowerCase().includes(q) ||
             (r.source||'').toLowerCase().includes(q);
    });
    const sortBy = sortSelect.value;
    filtered.sort((a,b) => {
      if (sortBy === 'date') return sortableDateVal(b.date) - sortableDateVal(a.date);
      if (sortBy === 'title') return (a.title||'').localeCompare(b.title||'');
      return 0;
    });
    buildTable(filtered);
  }

  filterInput.addEventListener('input', updateView);
  sortSelect.addEventListener('change', updateView);
  updateView();
}

async function init() {
  try {
    const [profile, tournaments] = await Promise.all([
      loadJSON('/data/athlete.json').catch(() => ({})),
      loadJSON('/data/tournaments.json').catch(() => ([]))
    ]);
    renderProfile(profile);
    renderResults(Array.isArray(tournaments) ? tournaments : []);
  } catch (err) {
    console.error(err);
    document.getElementById('table-wrap').textContent = 'Failed to load data.';
  }
}

document.addEventListener('DOMContentLoaded', init);
