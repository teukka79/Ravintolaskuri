/* =============================================================
   HYVINVOINTISOVELLUS — app.js
   ============================================================= */

// ─────────────────────────────────────────────────────────────
// appConfirm — replaces browser confirm() which is blocked in
// some HTTPS/iframe contexts (e.g. GitHub Pages)
// ─────────────────────────────────────────────────────────────
function appConfirm(msg) {
  return new Promise(resolve => {
    document.getElementById('confirmModalMsg').textContent = msg;
    document.getElementById('confirmModal').classList.add('active');

    function cleanup() {
      document.getElementById('confirmModal').classList.remove('active');
      document.getElementById('confirmModalYes').removeEventListener('click', onYes);
      document.getElementById('confirmModalNo').removeEventListener('click', onNo);
      document.getElementById('confirmModal').removeEventListener('click', onOverlay);
    }
    function onYes()     { cleanup(); resolve(true); }
    function onNo()      { cleanup(); resolve(false); }
    function onOverlay(e){ if (e.target === document.getElementById('confirmModal')) { cleanup(); resolve(false); } }

    document.getElementById('confirmModalYes').addEventListener('click', onYes);
    document.getElementById('confirmModalNo').addEventListener('click', onNo);
    document.getElementById('confirmModal').addEventListener('click', onOverlay);
  });
}


// ─────────────────────────────────────────────
// APP NAV
// ─────────────────────────────────────────────
// SVG icons for brand (inline, same path as in nav buttons)
const BRAND_ICONS_MS  = { ravinto: 'restaurant', treeni: 'exercise' };
const BRAND_TITLES = {
  ravinto: 'Ravinto<em>laskuri</em>',
  treeni:  'Treeni<em>päiväkirja</em>',
};

function updateBrand(app) {
  const icon = document.getElementById('app-brand-icon');
  const name = document.getElementById('app-brand-name');
  if (icon) {
    icon.textContent = BRAND_ICONS_MS[app] || 'restaurant';
    // exercise icon: no fill; restaurant icon: filled
    icon.style.fontVariationSettings = app === 'treeni'
      ? "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24"
      : "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24";
  }
  if (name) name.innerHTML = BRAND_TITLES[app] || BRAND_TITLES.ravinto;
}

document.querySelectorAll('.app-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.app-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('app-' + btn.dataset.app).classList.add('active');
    updateBrand(btn.dataset.app);
  });
});


/* =============================================================
   RAVINTOLASKURI
   ============================================================= */
(function () {

  // ── Kenttien normalisointi ──────────────────────────────────
  // Alkuperäinen server-versio käyttää energia_kcal, proteiini_g jne.
  // Tämä versio käyttää lyhyitä nimiä. Normalisoidaan molemmat formaatit.
  function normalizeFood(f) {
    return {
      id:            f.id ?? Date.now(),
      nimi:          f.nimi          ?? f.name ?? '',
      kategoria:     f.kategoria     ?? f.category ?? '',
      energia:       f.energia       ?? f.energia_kcal        ?? 0,
      proteiini:     f.proteiini     ?? f.proteiini_g          ?? 0,
      hiilihydraatti:f.hiilihydraatti?? f.hiilihydraatti_g     ?? 0,
      rasva:         f.rasva         ?? f.rasva_g              ?? 0,
      tyydyttynyt:   f.tyydyttynyt   ?? f.tyydyttynyt_rasva_g  ?? 0,
      kuitu:         f.kuitu         ?? f.kuitu_g              ?? 0,
      sokeri:        f.sokeri        ?? f.sokeri_g             ?? 0,
      suola:         f.suola         ?? f.suola_g              ?? 0,
      muistiinpano:  f.muistiinpano  ?? '',
      terveyshyodyt: f.terveyshyodyt ?? '',
    };
  }

  // ── State ───────────────────────────────────────────────────
  const FOODS_KEY     = 'rl-foods-v1';
  const LOG_KEY       = 'rl-log-v1';
  const GOAL_KEY      = 'rl-goal-v1';
  const TEMPLATES_KEY = 'rl-meal-templates-v1';

  let foods       = loadFoods();
  let allLogs     = loadLogs();
  let currentDate = todayStr();
  let calOpen     = false;
  let pendingFood = null;
  let editingFood = null;

  const now = new Date();
  let calYear  = now.getFullYear();
  let calMonth = now.getMonth();

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function loadFoods() {
    try {
      const raw = JSON.parse(localStorage.getItem(FOODS_KEY));
      if (Array.isArray(raw)) return raw.map(normalizeFood);
    } catch {}
    return [];
  }
  function saveFoods() { localStorage.setItem(FOODS_KEY, JSON.stringify(foods)); }
  function loadLogs()  { try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {}; } catch { return {}; } }
  function saveLogs()  { localStorage.setItem(LOG_KEY, JSON.stringify(allLogs)); }
  function getLog(ds)  { if (!allLogs[ds]) allLogs[ds] = { meals: [] }; return allLogs[ds]; }

  let mealTemplates = loadTemplates();
  function loadTemplates() { try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || []; } catch { return []; } }
  function saveTemplates() { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(mealTemplates)); }
  function round(n)    { return Math.round((n || 0) * 10) / 10; }

  // ── DOM refs ────────────────────────────────────────────────
  const foodListEl    = document.getElementById('foodList');
  const mealGroupsEl  = document.getElementById('mealGroups');
  const mealEmptyEl   = document.getElementById('mealEmpty');
  const macroGridEl   = document.getElementById('macroGrid');
  const energyTotalEl = document.getElementById('energyTotal');
  const energyFillEl  = document.getElementById('energyFill');
  const goalDisplayEl = document.getElementById('goalDisplay');
  const goalInputEl   = document.getElementById('goalInput');
  const chartCenterEl = document.getElementById('chartCenter');
  const chartSlicesEl = document.getElementById('chartSlices');
  const chartLegendEl = document.getElementById('chartLegend');
  const dayTitleEl    = document.getElementById('rl-day-title');

  const btnCalToggle  = document.getElementById('btnCalToggle');
  const rlCalendar    = document.getElementById('rlCalendar');
  const calGrid       = document.getElementById('calGrid');

  let goal = parseInt(localStorage.getItem(GOAL_KEY)) || 2000;
  goalInputEl.value = goal;
  goalDisplayEl.textContent = goal;

  // ── Calendar ────────────────────────────────────────────────
  const FI_MONTHS = ['tammikuu','helmikuu','maaliskuu','huhtikuu','toukokuu','kesäkuu',
                     'heinäkuu','elokuu','syyskuu','lokakuu','marraskuu','joulukuu'];
  const FI_DAYS   = ['Ma','Ti','Ke','To','Pe','La','Su'];

  function renderCalendar() {
    document.getElementById('calMonthLabel').textContent = FI_MONTHS[calMonth] + ' ' + calYear;
    calGrid.innerHTML = '';
    FI_DAYS.forEach(d => { const el = document.createElement('div'); el.className = 'rl-cal-dow'; el.textContent = d; calGrid.appendChild(el); });

    const firstDay    = new Date(calYear, calMonth, 1);
    const startDow    = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevDays    = new Date(calYear, calMonth, 0).getDate();
    const today       = todayStr();

    for (let i = startDow - 1; i >= 0; i--) {
      const el = document.createElement('div'); el.className = 'rl-cal-day other-month';
      el.textContent = prevDays - i; calGrid.appendChild(el);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      const el = document.createElement('div'); el.className = 'rl-cal-day'; el.textContent = d;
      if (ds === today) el.classList.add('today');
      if (ds === currentDate) el.classList.add('selected');
      if (allLogs[ds]?.meals?.length > 0) el.classList.add('has-data');
      el.addEventListener('click', () => { currentDate = ds; updateDayTitle(); renderCalendar(); renderMeals(); renderSummary(); });
      calGrid.appendChild(el);
    }
    const total = startDow + daysInMonth;
    const rem   = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= rem; d++) {
      const el = document.createElement('div'); el.className = 'rl-cal-day other-month'; el.textContent = d; calGrid.appendChild(el);
    }
  }

  function updateDayTitle() {
    if (currentDate === todayStr()) { dayTitleEl.textContent = 'Päivän ateriat'; return; }
    dayTitleEl.textContent = new Date(currentDate + 'T12:00:00').toLocaleDateString('fi-FI', { weekday:'long', day:'numeric', month:'long' });
  }

  btnCalToggle.addEventListener('click', () => {
    calOpen = !calOpen;
    rlCalendar.style.display = calOpen ? 'block' : 'none';
    btnCalToggle.classList.toggle('open', calOpen);
    if (calOpen) renderCalendar();
  });
  document.getElementById('calPrev').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

  // ── Food list ───────────────────────────────────────────────
  function renderFoods() {
    const q   = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value;
    const filtered = foods.filter(f => (!q || f.nimi.toLowerCase().includes(q)) && (!cat || f.kategoria === cat));

    foodListEl.innerHTML = '';
    if (!filtered.length) { foodListEl.innerHTML = '<li class="no-results">Ei tuloksia.</li>'; return; }

    filtered.forEach(f => {
      const li = document.createElement('li');
      li.className = 'food-item';
      li.innerHTML = `
        <div class="food-item-info">
          <div class="food-item-name">${f.nimi}</div>
          <div class="food-item-cat">${f.kategoria || '—'}</div>
          ${f.muistiinpano ? `<div class="food-item-note">${f.muistiinpano}</div>` : (f.terveyshyodyt ? `<div class="food-item-note" style="color:var(--accent2)">${f.terveyshyodyt.split('\n')[0].slice(0,60)}</div>` : '')}
        </div>
        <span class="food-item-kcal">${f.energia ?? 0} kcal</span>
        <button class="food-item-info-btn" title="Ravintoarvo-info">i</button>
        <button class="food-item-edit" title="Muokkaa">✎</button>
        <button class="food-item-add"  title="Lisää">+</button>
        <button class="food-item-del"  title="Poista">×</button>`;

      li.querySelector('.food-item-info-btn').addEventListener('click', e => { e.stopPropagation(); openFoodInfo(f); });
      li.querySelector('.food-item-edit').addEventListener('click', e => { e.stopPropagation(); openEditFood(f); });
      li.querySelector('.food-item-add').addEventListener('click',  e => { e.stopPropagation(); openPortion(f); });
      li.querySelector('.food-item-del').addEventListener('click', async e => {
        e.stopPropagation();
        if (await appConfirm(`Poistetaanko ${f.nimi}?`)) { foods = foods.filter(x => x.id !== f.id); saveFoods(); renderFoods(); updateCategoryFilter(); }
      });
      li.addEventListener('click', () => openPortion(f));
      foodListEl.appendChild(li);
    });
  }

  function updateCategoryFilter() {
    const sel = document.getElementById('categoryFilter');
    const cur = sel.value;
    const cats = [...new Set(foods.map(f => f.kategoria).filter(Boolean))].sort((a,b) => a.localeCompare(b,'fi'));
    sel.innerHTML = '<option value="">Kaikki kategoriat</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    if (cur) sel.value = cur;
    const dl = document.getElementById('kategoriaList'); dl.innerHTML = '';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; dl.appendChild(o); });
  }

  document.getElementById('searchInput').addEventListener('input', renderFoods);
  document.getElementById('categoryFilter').addEventListener('change', renderFoods);

  // ── Edit food modal ─────────────────────────────────────────
  function openEditFood(food) {
    editingFood = food;
    document.getElementById('ef_id').value             = food.id;
    document.getElementById('ef_nimi').value           = food.nimi;
    document.getElementById('ef_kategoria').value      = food.kategoria;
    document.getElementById('ef_energia').value        = food.energia;
    document.getElementById('ef_proteiini').value      = food.proteiini;
    document.getElementById('ef_hiilihydraatti').value = food.hiilihydraatti;
    document.getElementById('ef_rasva').value          = food.rasva;
    document.getElementById('ef_tyydyttynyt').value    = food.tyydyttynyt;
    document.getElementById('ef_kuitu').value          = food.kuitu;
    document.getElementById('ef_sokeri').value         = food.sokeri;
    document.getElementById('ef_suola').value          = food.suola;
    document.getElementById('ef_muistiinpano').value    = food.muistiinpano || '';
    document.getElementById('ef_terveyshyodyt').value   = food.terveyshyodyt || '';
    document.getElementById('editFoodOverlay').classList.add('active');
  }

  function closeEditFood() { document.getElementById('editFoodOverlay').classList.remove('active'); editingFood = null; }
  document.getElementById('closeEditFoodBtn').addEventListener('click',  closeEditFood);
  document.getElementById('cancelEditFoodBtn').addEventListener('click', closeEditFood);
  document.getElementById('editFoodOverlay').addEventListener('click', e => { if (e.target === document.getElementById('editFoodOverlay')) closeEditFood(); });

  document.getElementById('editFoodForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!editingFood) return;
    const g = id => parseFloat(document.getElementById(id).value) || 0;
    const updated = {
      id:             editingFood.id,
      nimi:           document.getElementById('ef_nimi').value.trim(),
      kategoria:      document.getElementById('ef_kategoria').value.trim(),
      energia:        g('ef_energia'),
      proteiini:      g('ef_proteiini'),
      hiilihydraatti: g('ef_hiilihydraatti'),
      rasva:          g('ef_rasva'),
      tyydyttynyt:    g('ef_tyydyttynyt'),
      kuitu:          g('ef_kuitu'),
      sokeri:         g('ef_sokeri'),
      suola:          g('ef_suola'),
      muistiinpano:   document.getElementById('ef_muistiinpano').value.trim(),
      terveyshyodyt:  document.getElementById('ef_terveyshyodyt').value.trim(),
    };
    if (!updated.nimi) return;
    const idx = foods.findIndex(f => f.id === editingFood.id);
    if (idx !== -1) foods[idx] = updated;
    saveFoods();
    renderFoods();
    updateCategoryFilter();
    closeEditFood();
    showToast(`${updated.nimi} päivitetty!`, 'success');
  });

  // ── Portion modal ───────────────────────────────────────────
  let portionMode = 'grams'; // 'grams' | 'pcs'

  function openPortion(food) {
    pendingFood = food;
    document.getElementById('portionTitle').textContent = food.nimi;
    // Reset to grams mode
    portionMode = 'grams';
    document.getElementById('portionModeGrams').classList.add('active');
    document.getElementById('portionModePcs').classList.remove('active');
    document.getElementById('portionGramsSection').style.display = 'block';
    document.getElementById('portionPcsSection').style.display = 'none';
    document.getElementById('portionAmount').value = 100;
    // Reset meal type buttons
    document.getElementById('mealTypeGrid').querySelectorAll('.meal-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.meal === selectedMeal);
    });
    updatePortionPreview();
    document.getElementById('portionOverlay').classList.add('active');
  }

  function getPortionGrams() {
    if (portionMode === 'pcs') {
      const w = parseFloat(document.getElementById('portionPcsWeight').value) || 0;
      const c = parseFloat(document.getElementById('portionPcsCount').value)  || 1;
      return w * c;
    }
    return parseFloat(document.getElementById('portionAmount').value) || 100;
  }

  function updatePortionPreview() {
    const f = pendingFood; if (!f) return;
    const g = getPortionGrams();
    const r = v => round((v || 0) * g / 100);

    // Update pcs total display
    if (portionMode === 'pcs') {
      const w = parseFloat(document.getElementById('portionPcsWeight').value) || 0;
      const c = parseFloat(document.getElementById('portionPcsCount').value)  || 1;
      document.getElementById('portionPcsTotal').textContent = `= ${w * c} g`;
    }

    document.getElementById('portionPreview').innerHTML =
      `<strong>${g} g — ${r(f.energia)} kcal</strong><br>
       P ${r(f.proteiini)}g · H ${r(f.hiilihydraatti)}g · R ${r(f.rasva)}g<br>
       Kuitu ${r(f.kuitu)}g · Sokeri ${r(f.sokeri)}g · Suola ${r(f.suola)}g`;
  }

  // Mode toggle
  document.getElementById('portionModeGrams').addEventListener('click', () => {
    portionMode = 'grams';
    document.getElementById('portionModeGrams').classList.add('active');
    document.getElementById('portionModePcs').classList.remove('active');
    document.getElementById('portionGramsSection').style.display = 'block';
    document.getElementById('portionPcsSection').style.display = 'none';
    updatePortionPreview();
  });
  document.getElementById('portionModePcs').addEventListener('click', () => {
    portionMode = 'pcs';
    document.getElementById('portionModePcs').classList.add('active');
    document.getElementById('portionModeGrams').classList.remove('active');
    document.getElementById('portionGramsSection').style.display = 'none';
    document.getElementById('portionPcsSection').style.display = 'block';
    updatePortionPreview();
  });

  document.getElementById('portionAmount').addEventListener('input', updatePortionPreview);
  document.getElementById('portionPcsWeight').addEventListener('input', updatePortionPreview);
  document.getElementById('portionPcsCount').addEventListener('input', updatePortionPreview);

  let selectedMeal = 'Aamupala';
  document.getElementById('mealTypeGrid').querySelectorAll('.meal-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('mealTypeGrid').querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMeal = btn.dataset.meal;
    });
  });

  document.getElementById('confirmPortionBtn').addEventListener('click', () => {
    if (!pendingFood) return;
    const g = getPortionGrams();
    if (!g || g <= 0) return;
    const r = v => round((v || 0) * g / 100);

    // Build display name: include pcs info if in pcs mode
    let displayName = pendingFood.nimi;
    if (portionMode === 'pcs') {
      const c = parseFloat(document.getElementById('portionPcsCount').value) || 1;
      const w = parseFloat(document.getElementById('portionPcsWeight').value) || 0;
      displayName = c > 1 ? `${pendingFood.nimi} (${c} kpl × ${w}g)` : `${pendingFood.nimi} (${w}g/kpl)`;
    }

    const entry = {
      id: Date.now(),
      foodId: pendingFood.id,
      name: displayName,
      meal: selectedMeal,
      grams: g,
      energia:        r(pendingFood.energia),
      proteiini:      r(pendingFood.proteiini),
      hiilihydraatti: r(pendingFood.hiilihydraatti),
      rasva:          r(pendingFood.rasva),
      tyydyttynyt:    r(pendingFood.tyydyttynyt),
      kuitu:          r(pendingFood.kuitu),
      sokeri:         r(pendingFood.sokeri),
      suola:          r(pendingFood.suola),
    };
    getLog(currentDate).meals.push(entry);
    saveLogs();
    renderMeals();
    renderSummary();
    if (calOpen) renderCalendar();
    document.getElementById('portionOverlay').classList.remove('active');
    showToast(`${pendingFood.nimi} lisätty!`, 'success');
    pendingFood = null;
  });

  document.getElementById('closePortionBtn').addEventListener('click', () => document.getElementById('portionOverlay').classList.remove('active'));
  document.getElementById('portionOverlay').addEventListener('click', e => { if (e.target === document.getElementById('portionOverlay')) document.getElementById('portionOverlay').classList.remove('active'); });

  // ── Meal rendering ──────────────────────────────────────────
  const MEAL_ORDER  = ['Aamupala','Lounas','Päivällinen','Iltapala','Välipala','Muu'];
  const MEAL_COLORS = { Aamupala:'#f59e0b', Lounas:'#3a7d5f', Päivällinen:'#c8522a', Iltapala:'#6366f1', Välipala:'#0ea5e9', Muu:'#7a746b' };

  function renderMeals() {
    const meals = getLog(currentDate).meals;
    mealEmptyEl.style.display = meals.length ? 'none' : 'block';
    mealGroupsEl.querySelectorAll('.meal-group').forEach(el => el.remove());

    const grouped = {};
    meals.forEach(m => { if (!grouped[m.meal]) grouped[m.meal] = []; grouped[m.meal].push(m); });

    MEAL_ORDER.forEach(mealName => {
      if (!grouped[mealName]) return;
      const items     = grouped[mealName];
      const totalKcal = items.reduce((s, i) => s + (i.energia || 0), 0);
      const totalProt = items.reduce((s, i) => s + (i.proteiini || 0), 0);
      const totalCarb = items.reduce((s, i) => s + (i.hiilihydraatti || 0), 0);
      const totalFat  = items.reduce((s, i) => s + (i.rasva || 0), 0);
      const color     = MEAL_COLORS[mealName] || '#7a746b';

      // Macro pill colors matching chart: carbs=amber, protein=green, fat=red
      const MPILL = [
        { label:'Prot', val:round(totalProt), color:'#3a7d5f', bg:'#e3f0ea' },
        { label:'Hiilih', val:round(totalCarb), color:'#92600a', bg:'#fef3c7' },
        { label:'Rasva', val:round(totalFat),  color:'#9b3522', bg:'#f5e8e2' },
      ];
      const pillsHTML = MPILL.map(p =>
        `<span class="meal-macro-pill" style="background:${p.bg};color:${p.color};">
           <span class="meal-macro-dot" style="background:${p.color};"></span>${p.val}g ${p.label}
         </span>`
      ).join('');

      const group = document.createElement('div');
      group.className = 'meal-group';
      group.innerHTML = `
        <div class="meal-group-header">
          <div class="meal-group-title">
            <span class="meal-group-dot" style="background:${color}"></span>
            <span class="meal-group-name">${mealName}</span>
            ${pillsHTML}
          </div>
          <span class="meal-group-kcal">${round(totalKcal)} kcal</span>
        </div>
        <ul class="meal-list"></ul>`;

      const ul = group.querySelector('.meal-list');
      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'meal-item';
        li.innerHTML = `
          <div class="meal-item-left">
            <div class="meal-item-name">${item.name}</div>
            <div class="meal-item-detail">${item.grams} g · P ${item.proteiini}g · H ${item.hiilihydraatti}g · R ${item.rasva}g</div>
          </div>
          <span class="meal-item-kcal">${round(item.energia)} kcal</span>
          <button class="meal-item-remove" title="Poista">×</button>`;
        li.querySelector('.meal-item-remove').addEventListener('click', () => {
          const log = getLog(currentDate);
          log.meals = log.meals.filter(m => m.id !== item.id);
          saveLogs(); renderMeals(); renderSummary();
          if (calOpen) renderCalendar();
        });
        ul.appendChild(li);
      });

      mealGroupsEl.insertBefore(group, mealEmptyEl);
    });
  }

  // ── Summary + chart ─────────────────────────────────────────
  function renderSummary() {
    const meals = getLog(currentDate).meals;
    const tot   = { energia:0, proteiini:0, hiilihydraatti:0, rasva:0, tyydyttynyt:0, kuitu:0, sokeri:0, suola:0 };
    meals.forEach(m => Object.keys(tot).forEach(k => tot[k] += m[k] || 0));
    Object.keys(tot).forEach(k => tot[k] = round(tot[k]));

    const labels = [
      { key:'energia',        label:'Energia',        unit:'kcal', hi:true },
      { key:'proteiini',      label:'Proteiini',       unit:'g' },
      { key:'hiilihydraatti', label:'Hiilihydraatti',  unit:'g' },
      { key:'rasva',          label:'Rasva',           unit:'g' },
      { key:'tyydyttynyt',    label:'Tyyd. rasva',     unit:'g' },
      { key:'kuitu',          label:'Kuitu',           unit:'g' },
      { key:'sokeri',         label:'Sokeri',          unit:'g' },
      { key:'suola',          label:'Suola',           unit:'g' },
    ];
    macroGridEl.innerHTML = '';
    labels.forEach(l => {
      const card = document.createElement('div');
      card.className = 'macro-card' + (l.hi ? ' highlight' : '');
      // Check if nutrient info exists for this key
      const infoKey = l.key === 'hiilihydraatti' ? 'hiilihydraatti' : l.key;
      const hasInfo = typeof NUTRIENT_INFO !== 'undefined' && NUTRIENT_INFO[infoKey];
      card.innerHTML = `
        <div class="macro-val">${tot[l.key]}</div>
        <div class="macro-lbl">${l.label}<br>${l.unit}</div>
        ${hasInfo ? `<button class="macro-info-btn" data-nutrient="${infoKey}" title="Lisätietoa">i</button>` : ''}
      `;
      if (hasInfo) {
        card.querySelector('.macro-info-btn').addEventListener('click', e => {
          e.stopPropagation();
          openNutrientInfo(infoKey);
        });
      }
      macroGridEl.appendChild(card);
    });

    energyTotalEl.textContent = Math.round(tot.energia) + ' kcal';
    const pct = Math.min(100, (tot.energia / goal) * 100);
    energyFillEl.style.width = pct + '%';

    // Donut
    const macros = [
      { label:'Hiilihydraatit', val:tot.hiilihydraatti, kcal:tot.hiilihydraatti*4, color:'#f59e0b' },
      { label:'Proteiinit',     val:tot.proteiini,      kcal:tot.proteiini*4,      color:'#3a7d5f' },
      { label:'Rasvat',         val:tot.rasva,          kcal:tot.rasva*9,          color:'#c8522a' },
    ];
    const totalMacroKcal = macros.reduce((s,m) => s+m.kcal, 0);
    chartCenterEl.textContent = Math.round(tot.energia) || '–';
    chartSlicesEl.innerHTML = '';
    chartLegendEl.innerHTML = '';

    if (totalMacroKcal > 0) {
      const cx=110, cy=110, r=80, stroke=28, circ=2*Math.PI*r;
      let offset = 0;
      macros.forEach(m => {
        const frac  = m.kcal / totalMacroKcal;
        const dash  = frac * circ;
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',r);
        circle.setAttribute('fill','none'); circle.setAttribute('stroke',m.color);
        circle.setAttribute('stroke-width',stroke);
        circle.setAttribute('stroke-dasharray',`${dash} ${circ-dash}`);
        circle.setAttribute('stroke-dashoffset', circ/4 - offset*circ);
        circle.setAttribute('transform',`rotate(-90 ${cx} ${cy})`);
        chartSlicesEl.appendChild(circle);
        offset += frac;

        const item = document.createElement('div'); item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background:${m.color}"></span>
          <span class="legend-label">${m.label}</span>
          <span class="legend-val">${m.val}g</span>
          <span class="legend-pct">${Math.round(frac*100)}%</span>`;
        chartLegendEl.appendChild(item);
      });
    }
  }

  // ── Clear ───────────────────────────────────────────────────
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!await appConfirm('Tyhjennetäänkö päivän ateriat?')) return;
    getLog(currentDate).meals = [];
    saveLogs(); renderMeals(); renderSummary();
    if (calOpen) renderCalendar();
  });

  // ── Goal ────────────────────────────────────────────────────
  goalInputEl.addEventListener('input', () => {
    goal = parseInt(goalInputEl.value) || 2000;
    goalDisplayEl.textContent = goal;
    localStorage.setItem(GOAL_KEY, goal);
    renderSummary();
  });

  // ── Add food modal ──────────────────────────────────────────
  document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('addFoodForm').reset();
    document.getElementById('modalOverlay').classList.add('active');
  });
  document.getElementById('closeModalBtn').addEventListener('click',  () => document.getElementById('modalOverlay').classList.remove('active'));
  document.getElementById('cancelModalBtn').addEventListener('click', () => document.getElementById('modalOverlay').classList.remove('active'));
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) document.getElementById('modalOverlay').classList.remove('active'); });

  document.getElementById('addFoodForm').addEventListener('submit', e => {
    e.preventDefault();
    const g = id => parseFloat(document.getElementById(id).value) || 0;
    const food = normalizeFood({
      id: Date.now(),
      nimi:           document.getElementById('f_nimi').value.trim(),
      kategoria:      document.getElementById('f_kategoria').value.trim(),
      energia:        g('f_energia'),
      proteiini:      g('f_proteiini'),
      hiilihydraatti: g('f_hiilihydraatti'),
      rasva:          g('f_rasva'),
      tyydyttynyt:    g('f_tyydyttynyt'),
      kuitu:          g('f_kuitu'),
      sokeri:         g('f_sokeri'),
      suola:          g('f_suola'),
      muistiinpano:   document.getElementById('f_muistiinpano').value.trim(),
      terveyshyodyt:  document.getElementById('f_terveyshyodyt').value.trim(),
    });
    if (!food.nimi) return;
    foods.push(food);
    saveFoods(); renderFoods(); updateCategoryFilter();
    document.getElementById('modalOverlay').classList.remove('active');
    showToast(`${food.nimi} lisätty!`, 'success');
  });

  // ── Backup / Restore ────────────────────────────────────────
  document.getElementById('backupBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(foods, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `foods-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('restoreInput').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) { alert('Virheellinen tiedosto.'); return; }
        // Normalisoidaan kentät — toimii sekä vanhalla (energia_kcal) että uudella formaatilla
        const normalized = imported.map(normalizeFood);
        if (await appConfirm(`Palautetaanko ${normalized.length} ruokaa? Nykyiset korvataan.`)) {
          foods = normalized;
          saveFoods(); renderFoods(); updateCategoryFilter();
          showToast(`Palautettu ${normalized.length} ruokaa!`, 'success');
        }
      } catch { alert('Tiedoston lukeminen epäonnistui.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ── Toast ───────────────────────────────────────────────────
  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── Nutrient info modal ──────────────────────────────────────
  function openNutrientInfo(key) {
    const info = (typeof NUTRIENT_INFO !== 'undefined') && NUTRIENT_INFO[key];
    if (!info) return;

    document.getElementById('niTitle').textContent = info.nimi;
    document.getElementById('niDot').style.background = info.vari || 'var(--accent)';
    document.getElementById('niDesc').textContent = info.kuvaus;

    const benefitsEl = document.getElementById('niBenefits');
    benefitsEl.innerHTML = '';
    (info.hyodyt || []).forEach(h => {
      const li = document.createElement('li'); li.textContent = h; benefitsEl.appendChild(li);
    });

    const recsEl = document.getElementById('niRecs');
    recsEl.innerHTML = '';
    (info.suositukset || []).forEach(r => {
      const row = document.createElement('div');
      row.className = 'nutrient-rec-row';
      row.innerHTML = `<span class="nutrient-rec-group">${r.ryhma}</span><span class="nutrient-rec-val">${r.arvo}</span>`;
      recsEl.appendChild(row);
    });

    // Food examples
    const examplesSection = document.getElementById('niExamplesSection');
    const examplesEl = document.getElementById('niExamples');
    examplesEl.innerHTML = '';
    if (info.ruokaesimerkit && info.ruokaesimerkit.length) {
      examplesSection.style.display = 'flex';
      info.ruokaesimerkit.forEach(ex => {
        const row = document.createElement('div');
        row.className = 'nutrient-rec-row';
        row.innerHTML = `<span class="nutrient-rec-group">${ex.nimi}</span><span class="nutrient-rec-val">${ex.arvo}</span>`;
        examplesEl.appendChild(row);
      });
    } else {
      examplesSection.style.display = 'none';
    }

    const noteEl = document.getElementById('niNote');
    noteEl.textContent = info.huom || '';
    noteEl.style.display = info.huom ? 'block' : 'none';

    document.getElementById('nutrientInfoOverlay').classList.add('active');
  }

  // Close handlers — attached after DOM is ready
  document.getElementById('niCloseBtn').addEventListener('click', () => {
    document.getElementById('nutrientInfoOverlay').classList.remove('active');
  });
  document.getElementById('nutrientInfoOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('nutrientInfoOverlay'))
      document.getElementById('nutrientInfoOverlay').classList.remove('active');
  });

  function uid_rl() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

  // ── Panel toggle (Ruoat ↔ Ateriat) ─────────────────────────
  let activePanel = 'ruoat';
  document.querySelectorAll('.lp-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activePanel = btn.dataset.panel;
      document.querySelectorAll('.lp-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === activePanel));
      document.getElementById('ruoatView').style.display     = activePanel === 'ruoat'   ? 'block' : 'none';
      document.getElementById('ateriatView').style.display   = activePanel === 'ateriat' ? 'block' : 'none';
      document.getElementById('ruoatActions').style.display  = activePanel === 'ruoat'   ? 'flex'  : 'none';
      document.getElementById('ateriatActions').style.display= activePanel === 'ateriat' ? 'flex'  : 'none';
      if (activePanel === 'ateriat') renderMealTemplates();
    });
  });

  // ── Food info modal (ⓘ on food list item) ───────────────────
  function openFoodInfo(food) {
    document.getElementById('fiTitle').textContent = food.nimi;

    // Kuvaus (muistiinpano) — show or hide
    const descEl = document.getElementById('fiDesc');
    if (food.muistiinpano) {
      descEl.textContent = food.muistiinpano;
      descEl.style.display = 'block';
    } else {
      descEl.textContent = '';
      descEl.style.display = 'none';
    }

    // Terveyshyödyt section — show as bullet list if filled
    const bSection = document.getElementById('fiBenefitsSection');
    const bEl = document.getElementById('fiBenefits');
    if (food.terveyshyodyt && food.terveyshyodyt.trim()) {
      bSection.style.display = 'flex';
      // Support both newline-separated and single text
      const lines = food.terveyshyodyt.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        // Render as bullet list using nutrient-benefits style
        bEl.innerHTML = '';
        bEl.style.cssText = '';
        const ul = document.createElement('ul');
        ul.className = 'nutrient-benefits';
        lines.forEach(line => {
          const li = document.createElement('li'); li.textContent = line; ul.appendChild(li);
        });
        bSection.querySelector('.nutrient-section-title').textContent = 'Terveyshyödyt';
        bEl.parentNode.insertBefore(ul, bEl);
        bEl.style.display = 'none';
      } else {
        bEl.style.display = 'block';
        bEl.textContent = food.terveyshyodyt;
        bSection.querySelector('.nutrient-section-title').textContent = 'Terveyshyödyt';
      }
    } else {
      bSection.style.display = 'none';
    }

    // Nutritional values per 100 g
    const recsEl = document.getElementById('fiRecs');
    recsEl.innerHTML = '';
    const vals = [
      { label: 'Energia',        val: food.energia,        unit: 'kcal' },
      { label: 'Proteiini',      val: food.proteiini,      unit: 'g' },
      { label: 'Hiilihydraatti', val: food.hiilihydraatti, unit: 'g' },
      { label: 'Rasva',          val: food.rasva,          unit: 'g' },
      { label: 'Tyyd. rasva',    val: food.tyydyttynyt,    unit: 'g' },
      { label: 'Kuitu',          val: food.kuitu,          unit: 'g' },
      { label: 'Sokeri',         val: food.sokeri,         unit: 'g' },
      { label: 'Suola',          val: food.suola,          unit: 'g' },
    ];
    vals.forEach(v => {
      const row = document.createElement('div');
      row.className = 'nutrient-rec-row';
      row.innerHTML = `<span class="nutrient-rec-group">${v.label}</span><span class="nutrient-rec-val">${round(v.val || 0)} ${v.unit}</span>`;
      recsEl.appendChild(row);
    });

    document.getElementById('foodInfoOverlay').classList.add('active');
  }

  document.getElementById('fíCloseBtn').addEventListener('click', () => {
    document.getElementById('foodInfoOverlay').classList.remove('active');
  });
  document.getElementById('foodInfoOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('foodInfoOverlay'))
      document.getElementById('foodInfoOverlay').classList.remove('active');
  });

  // ── Meal templates (Ateriat) ────────────────────────────────
  let editingTemplate = null;
  let mtIngredients   = []; // { foodId, grams }

  function calcTemplateTotals(tmpl) {
    const tot = { energia:0, proteiini:0, hiilihydraatti:0, rasva:0 };
    (tmpl.ingredients || []).forEach(ing => {
      const f = foods.find(x => x.id === ing.foodId);
      if (!f) return;
      const k = (ing.grams || 100) / 100;
      tot.energia        += (f.energia        || 0) * k;
      tot.proteiini      += (f.proteiini      || 0) * k;
      tot.hiilihydraatti += (f.hiilihydraatti || 0) * k;
      tot.rasva          += (f.rasva          || 0) * k;
    });
    return { energia: round(tot.energia), proteiini: round(tot.proteiini), hiilihydraatti: round(tot.hiilihydraatti), rasva: round(tot.rasva) };
  }

  function renderMealTemplates() {
    const con = document.getElementById('mealTemplateList');
    con.innerHTML = '';
    if (!mealTemplates.length) {
      con.innerHTML = '<li class="no-results" style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.88rem;font-style:italic;">Ei tallennettuja aterioita.<br>Luo ateriapohja "+ Uusi ateria" napilla.</li>';
      return;
    }
    mealTemplates.forEach(tmpl => {
      const tot  = calcTemplateTotals(tmpl);
      const ingNames = (tmpl.ingredients || []).map(ing => {
        const f = foods.find(x => x.id === ing.foodId);
        return f ? f.nimi : '?';
      }).join(', ');

      const li = document.createElement('li');
      li.className = 'meal-template-item';
      li.innerHTML = `
        <div class="meal-template-info">
          <div class="meal-template-name">${tmpl.nimi}</div>
          <div class="meal-template-sub">${ingNames || '—'}</div>
          <div class="meal-template-sub" style="margin-top:2px;">P ${tot.proteiini}g · H ${tot.hiilihydraatti}g · R ${tot.rasva}g</div>
        </div>
        <span class="meal-template-kcal">${tot.energia} kcal</span>
        <button class="food-item-edit" title="Muokkaa" data-edit-tmpl="${tmpl.id}">✎</button>
        <button class="food-item-del"  title="Poista"  data-del-tmpl="${tmpl.id}">×</button>
        <button class="meal-template-add" title="Lisää aterialle" data-add-tmpl="${tmpl.id}">+</button>`;

      li.querySelector('[data-edit-tmpl]').addEventListener('click', e => { e.stopPropagation(); openEditTemplate(tmpl.id); });
      li.querySelector('[data-del-tmpl]').addEventListener('click', async e => {
        e.stopPropagation();
        if (await appConfirm(`Poistetaanko ateria "${tmpl.nimi}"?`)) {
          mealTemplates = mealTemplates.filter(t => t.id !== tmpl.id);
          saveTemplates(); renderMealTemplates();
        }
      });
      li.querySelector('[data-add-tmpl]').addEventListener('click', e => { e.stopPropagation(); addTemplateToLog(tmpl.id); });
      li.addEventListener('click', () => addTemplateToLog(tmpl.id));
      con.appendChild(li);
    });
  }

  // ── Meal picker modal ───────────────────────────────────────
  let _pendingTmplId = null;

  function addTemplateToLog(tmplId) {
    const tmpl = mealTemplates.find(t => t.id === tmplId);
    if (!tmpl || !tmpl.ingredients.length) return;
    _pendingTmplId = tmplId;
    document.getElementById('mealPickerTitle').textContent = `"${tmpl.nimi}" → mille aterialle?`;
    // Highlight current selectedMeal
    document.querySelectorAll('.meal-picker-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.meal === selectedMeal);
    });
    document.getElementById('mealPickerOverlay').classList.add('active');
  }

  function _doAddTemplateToLog(mealName) {
    const tmpl = mealTemplates.find(t => t.id === _pendingTmplId);
    if (!tmpl) return;
    tmpl.ingredients.forEach(ing => {
      const f = foods.find(x => x.id === ing.foodId);
      if (!f) return;
      const g = ing.grams || 100;
      const r = v => round((v || 0) * g / 100);
      getLog(currentDate).meals.push({
        id: Date.now() + Math.random(),
        foodId: f.id, name: f.nimi, meal: mealName, grams: g,
        energia: r(f.energia), proteiini: r(f.proteiini),
        hiilihydraatti: r(f.hiilihydraatti), rasva: r(f.rasva),
        tyydyttynyt: r(f.tyydyttynyt), kuitu: r(f.kuitu),
        sokeri: r(f.sokeri), suola: r(f.suola),
      });
    });
    saveLogs(); renderMeals(); renderSummary();
    if (calOpen) renderCalendar();
    showToast(`${tmpl.nimi} lisätty ${mealName}alle!`, 'success');
    selectedMeal = mealName;
  }

  document.querySelectorAll('.meal-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('mealPickerOverlay').classList.remove('active');
      _doAddTemplateToLog(btn.dataset.meal);
    });
  });
  document.getElementById('mealPickerCloseBtn').addEventListener('click', () => {
    document.getElementById('mealPickerOverlay').classList.remove('active');
  });
  document.getElementById('mealPickerOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('mealPickerOverlay'))
      document.getElementById('mealPickerOverlay').classList.remove('active');
  });

  // ── Meal template modal ───────────────────────────────────────
  function buildMtIngredientRow(ing, idx) {
    const row = document.createElement('div');
    row.className = 'mt-ingredient-row';

    const sel = document.createElement('select');
    foods.slice().sort((a,b) => a.nimi.localeCompare(b.nimi,'fi')).forEach(f => {
      const o = document.createElement('option');
      o.value = f.id; o.textContent = f.nimi;
      if (f.id === ing.foodId) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => { mtIngredients[idx].foodId = parseInt(sel.value) || sel.value; });

    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = '1'; inp.step = '10';
    inp.value = ing.grams || 100;
    inp.addEventListener('input', () => { mtIngredients[idx].grams = parseFloat(inp.value) || 100; });

    const lbl = document.createElement('span'); lbl.className = 'mt-gram-label'; lbl.textContent = 'g';

    const rm = document.createElement('button');
    rm.className = 'food-item-del'; rm.textContent = '×'; rm.type = 'button';
    rm.addEventListener('click', () => { mtIngredients.splice(idx,1); refreshMtList(); });

    row.appendChild(sel); row.appendChild(inp); row.appendChild(lbl); row.appendChild(rm);
    return row;
  }

  function refreshMtList() {
    const con = document.getElementById('mtIngredientList'); con.innerHTML = '';
    mtIngredients.forEach((ing,idx) => con.appendChild(buildMtIngredientRow(ing,idx)));
  }

  function openNewTemplate() {
    document.getElementById('mtModalTitle').textContent = 'Uusi ateria';
    document.getElementById('mt_nimi').value = '';
    document.getElementById('mt_edit_id').value = '';
    mtIngredients = foods.length ? [{ foodId: foods[0].id, grams: 100 }] : [];
    refreshMtList();
    document.getElementById('mealTemplateOverlay').classList.add('active');
  }

  function openEditTemplate(tmplId) {
    const tmpl = mealTemplates.find(t => t.id === tmplId);
    if (!tmpl) return;
    document.getElementById('mtModalTitle').textContent = 'Muokkaa ateriaa';
    document.getElementById('mt_nimi').value    = tmpl.nimi;
    document.getElementById('mt_edit_id').value = tmpl.id;
    mtIngredients = tmpl.ingredients.map(i => ({ ...i }));
    refreshMtList();
    document.getElementById('mealTemplateOverlay').classList.add('active');
  }

  function closeMtModal() { document.getElementById('mealTemplateOverlay').classList.remove('active'); }

  document.getElementById('openMealTemplateBtn').addEventListener('click', openNewTemplate);
  document.getElementById('mtAddIngredientBtn').addEventListener('click', () => {
    mtIngredients.push({ foodId: foods[0]?.id || '', grams: 100 });
    refreshMtList();
  });
  document.getElementById('mtCancelBtn').addEventListener('click', closeMtModal);
  document.getElementById('mtCloseBtn').addEventListener('click', closeMtModal);
  document.getElementById('mealTemplateOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('mealTemplateOverlay')) closeMtModal();
  });

  document.getElementById('mtSaveBtn').addEventListener('click', () => {
    const nimi = document.getElementById('mt_nimi').value.trim();
    if (!nimi) { document.getElementById('mt_nimi').focus(); return; }
    if (!mtIngredients.length) { alert('Lisää vähintään yksi raaka-aine.'); return; }

    const editId = document.getElementById('mt_edit_id').value;
    const tmpl   = { id: editId || uid_rl(), nimi, ingredients: mtIngredients.map(i => ({ ...i })) };

    if (editId) {
      const idx = mealTemplates.findIndex(t => t.id === editId);
      if (idx !== -1) mealTemplates[idx] = tmpl;
    } else {
      mealTemplates.push(tmpl);
    }
    saveTemplates(); renderMealTemplates(); closeMtModal();
    showToast(`${nimi} tallennettu!`, 'success');
  });

  // ── Ateriat backup / restore ──────────────────────────────────
  document.getElementById('ateriatBackupBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(mealTemplates, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ateriat-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('ateriatRestoreInput').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const imp = JSON.parse(ev.target.result);
        if (!Array.isArray(imp)) { alert('Virheellinen tiedosto.'); return; }
        if (await appConfirm(`Palautetaanko ${imp.length} ateriaa?`)) {
          mealTemplates = imp; saveTemplates(); renderMealTemplates();
          showToast('Ateriat palautettu!', 'success');
        }
      } catch { alert('Lukeminen epäonnistui.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ── Init ────────────────────────────────────────────────────
  updateCategoryFilter();
  renderFoods();
  updateDayTitle();
  renderMeals();
  renderSummary();

})(); // end ravintolaskuri


/* =============================================================
   TREENIPÄIVÄKIRJA
   ============================================================= */
(function () {

  const NO_BAR   = 'none';
  const STORE_KEY = 'workout-journal-v3';

  const DEFAULT_BARS = [
    { id:'straight', name:'Suora tanko', weight:20, desc:'Olympia-tanko' },
    { id:'ez',       name:'Mutka tanko', weight:10, desc:'EZ-curl' },
    { id:'hex',      name:'Hex bar',     weight:18, desc:'Trap / Hex bar' },
  ];
  const DEFAULT_EXERCISES = [
    { id:'ex1', name:'Hauiskääntö',     muscle:'Hauikset', barId:'ez',       cableId:'none' },
    { id:'ex2', name:'Kyykky',          muscle:'Jalat',    barId:'straight', cableId:'none' },
    { id:'ex3', name:'Käsipainokääntö', muscle:'Hauikset', barId:'none',     cableId:'none' },
    { id:'ex4', name:'Maastaveto',      muscle:'Selkä',    barId:'hex',      cableId:'none' },
    { id:'ex5', name:'Penkkipunnerrus', muscle:'Rinta',    barId:'straight', cableId:'none' },
    { id:'ex6', name:'Sivunostot',      muscle:'Olkapäät', barId:'none',     cableId:'none' },
    { id:'ex7', name:'Soutu',           muscle:'Selkä',    barId:'straight', cableId:'none' },
  ];
  const DEFAULT_PROGRAMS = [
    { id:'prog1', name:'Rintapäivä', exercises:[
      { exerciseId:'ex5', sets:'4', reps:'8-10' },
      { exerciseId:'ex6', sets:'3', reps:'12-15' },
    ]},
    { id:'prog2', name:'Selkä & hauikset', exercises:[
      { exerciseId:'ex7', sets:'4', reps:'8-10' },
      { exerciseId:'ex4', sets:'3', reps:'5' },
      { exerciseId:'ex1', sets:'3', reps:'10-12' },
      { exerciseId:'ex3', sets:'3', reps:'10-12' },
    ]},
  ];

  let st = loadState();

  function loadState() {
    try { const r = JSON.parse(localStorage.getItem(STORE_KEY)); if (r) return r; } catch {}
    return { bars:DEFAULT_BARS, exercises:DEFAULT_EXERCISES, programs:DEFAULT_PROGRAMS, history:[], currentLog:[] };
  }
  function save()       { localStorage.setItem(STORE_KEY, JSON.stringify(st)); }
  function getBar(id)   { if (!id || id===NO_BAR) return null; return st.bars.find(b=>b.id===id)||null; }
  function getEx(id)    { return st.exercises.find(e=>e.id===id)||null; }
  function hasBar(ex)    { return ex && ex.barId && ex.barId !== NO_BAR; }
  function hasCable(ex)  { return ex && ex.cableId && ex.cableId !== 'none'; }
  function cableLabel(ex) {
    if (!ex || !hasCable(ex)) return '';
    return ex.cableId === 'alatalja' ? 'Alatalja' : 'Ylätalja';
  }
  function calcWeight(ex, plates, dumbb) {
    if (!ex) return 0;
    if (hasBar(ex)) { const b=getBar(ex.barId); return (b?b.weight:0)+(parseFloat(plates)||0); }
    return parseFloat(dumbb)||0;
  }
  function fmtDate(ts)  { return new Date(ts).toLocaleDateString('fi-FI',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
  function uid()        { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function sortedEx()   { return [...st.exercises].sort((a,b)=>a.name.localeCompare(b.name,'fi',{sensitivity:'base'})); }

  // ── Tabs ───────────────────────────────────────────────────
  document.getElementById('tj-muscle-filter').addEventListener('change', renderExercises);

  document.querySelectorAll('.tj-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tj-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.tj-tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tj-tab-'+tab.dataset.tab).classList.add('active');
    });
  });
  function switchTjTab(name) {
    document.querySelectorAll('.tj-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
    document.querySelectorAll('.tj-tab-content').forEach(c=>c.classList.toggle('active',c.id==='tj-tab-'+name));
  }

  // ── Render Log — single card, sub-headers, auto-update weights ──
  function renderLog() {
    const con    = document.getElementById('tj-log-entries');
    const footer = document.getElementById('tj-log-footer');
    document.getElementById('tj-log-date').textContent = fmtDate(Date.now());

    if (!st.currentLog.length) {
      con.innerHTML = `<div class="tj-empty"><div class="tj-empty-icon">⊕</div><p>Ei vielä liikkeitä.<br>Paina "+ Lisää liike" tai lataa ohjelma.</p></div>`;
      footer.style.display = 'none'; return;
    }
    footer.style.display = 'block';
    con.innerHTML = '';

    // Single outer card containing all exercises
    const card = document.createElement('div');
    card.className = 'tj-log-card';

    st.currentLog.forEach((entry, idx) => {
      const ex      = getEx(entry.exerciseId); if (!ex) return;
      const bar     = getBar(ex.barId);
      const total   = calcWeight(ex, entry.plates, entry.dumbbell);
      const usesBar = hasBar(ex);

      const usesCable = hasCable(ex);
      const cLabel    = usesCable ? cableLabel(ex) : '';
      // Sub line: show bar info, cable info, or nothing (hide completely if neither)
      const sub = usesBar
        ? `${bar?bar.weight:0} kg tanko + ${parseFloat(entry.plates)||0} kg levyjä`
        : (usesCable ? cLabel : '');

      // Weight input row — auto-updates on input event, no button
      const weightEditHTML = usesBar
        ? `<div class="tj-weight-edit-row">
             <label>Levypainot:</label>
             <input type="number" class="tj-weight-input" data-idx="${idx}" data-type="plates"
               value="${parseFloat(entry.plates)||0}" min="0" step="0.5" placeholder="0" />
             <span style="font-size:0.76rem;color:var(--text-muted)">kg levyjä</span>
           </div>`
        : `<div class="tj-weight-edit-row">
             <label>Paino:</label>
             <input type="number" class="tj-weight-input" data-idx="${idx}" data-type="dumbbell"
               value="${parseFloat(entry.dumbbell)||0}" min="0" step="0.5" placeholder="0" />
             <span style="font-size:0.76rem;color:var(--text-muted)">kg</span>
           </div>`;

      const el = document.createElement('div');
      el.className = 'tj-log-entry';
      el.innerHTML = `
        <div class="tj-log-entry-header">
          <div>
            <div class="tj-log-entry-title">${ex.name}</div>
            <div class="tj-log-entry-meta">${ex.muscle}${ (usesBar && bar) ? ' · ' + bar.name : ''}${ usesCable ? ' · ' + cLabel : ''}${ (!usesBar && !usesCable && ex.usesDumbbells) ? ' · Käsipainot' : ''}</div>
          </div>
          <button class="tj-btn-icon danger" data-rm="${idx}">✕</button>
        </div>
        <div class="tj-log-entry-body">
          <div class="tj-weight-total" data-total="${idx}">${total} kg</div>
          ${sub ? `<div class="tj-weight-sub" data-sub="${idx}">${sub}</div>` : '<div data-sub="${idx}"></div>'}
          ${weightEditHTML}
          <div class="tj-badges" style="margin-top:6px;">
            <span class="tj-badge tj-badge-green tj-badge-clickable" data-edit-idx="${idx}" data-edit-field="sets">${entry.sets} sarjaa</span>
            <span class="tj-badge tj-badge-blue tj-badge-clickable" data-edit-idx="${idx}" data-edit-field="reps">${entry.reps} toistoa</span>
            ${(usesBar || usesCable || ex.usesDumbbells) ? `<span class="tj-badge tj-badge-amber tj-badge-weight" data-bidx="${idx}">${total} kg · ${usesBar && bar ? bar.name : (usesCable ? cLabel : 'Käsipainot')}</span>` : ''}
          </div>
        </div>`;

      // Remove
      el.querySelector('[data-rm]').addEventListener('click', () => {
        st.currentLog.splice(idx, 1); save(); renderLog();
      });

      // Auto-update weight on input — no button needed
      // Clickable sets/reps badges
      el.querySelectorAll('.tj-badge-clickable').forEach(badge => {
        badge.addEventListener('click', () => {
          openEditSetsReps(parseInt(badge.dataset.editIdx), badge.dataset.editField);
        });
      });

      el.querySelector('.tj-weight-input').addEventListener('input', e => {
        const i    = parseInt(e.target.dataset.idx);
        const type = e.target.dataset.type;
        const v    = parseFloat(e.target.value) || 0;
        if (type === 'plates') st.currentLog[i].plates   = v;
        else                    st.currentLog[i].dumbbell = v;
        save();
        // Update display without full re-render (avoid losing focus)
        const exI      = getEx(st.currentLog[i].exerciseId);
        const barI     = getBar(exI?.barId);
        const newTotal = calcWeight(exI, st.currentLog[i].plates, st.currentLog[i].dumbbell);
        const newSub   = hasBar(exI)
          ? `${barI?barI.weight:0} kg tanko + ${parseFloat(st.currentLog[i].plates)||0} kg levyjä`
          : (hasCable(exI) ? cableLabel(exI) : '');
        const totalEl = card.querySelector(`[data-total="${i}"]`);
        const subEl   = card.querySelector(`[data-sub="${i}"]`);
        const badgeEl = card.querySelector(`[data-bidx="${i}"]`);
        if (totalEl) totalEl.textContent = newTotal + ' kg';
        if (subEl)   subEl.textContent   = newSub;
        if (badgeEl) badgeEl.textContent = newTotal + ' kg';
      });

      card.appendChild(el);
    });

    con.appendChild(card);
  }

  // ── Edit sets/reps modal (badge click) ─────────────────────
  let _editSetsRepsIdx = null;

  function openEditSetsReps(idx, field) {
    _editSetsRepsIdx = idx;
    const entry = st.currentLog[idx];
    if (!entry) return;
    const ex = getEx(entry.exerciseId);
    document.getElementById('editSetsRepsTitle').textContent = ex ? ex.name : 'Muokkaa';
    document.getElementById('editSets').value = entry.sets;
    document.getElementById('editReps').value = entry.reps;
    // Highlight the field being edited
    document.getElementById('editSets').parentElement.style.outline = field === 'sets' ? '2px solid var(--accent)' : '';
    document.getElementById('editReps').parentElement.style.outline = field === 'reps' ? '2px solid var(--accent)' : '';
    document.getElementById('tj-modal-edit-setsreps').classList.add('active');
  }

  document.getElementById('editSetsRepsSaveBtn').addEventListener('click', () => {
    if (_editSetsRepsIdx === null) return;
    st.currentLog[_editSetsRepsIdx].sets = document.getElementById('editSets').value;
    st.currentLog[_editSetsRepsIdx].reps = document.getElementById('editReps').value;
    save(); renderLog();
    document.getElementById('tj-modal-edit-setsreps').classList.remove('active');
  });
  document.getElementById('editSetsRepsCancelBtn').addEventListener('click', () => {
    document.getElementById('tj-modal-edit-setsreps').classList.remove('active');
  });
  document.getElementById('editSetsRepsCloseBtn').addEventListener('click', () => {
    document.getElementById('tj-modal-edit-setsreps').classList.remove('active');
  });
  document.getElementById('tj-modal-edit-setsreps').addEventListener('click', e => {
    if (e.target === document.getElementById('tj-modal-edit-setsreps'))
      document.getElementById('tj-modal-edit-setsreps').classList.remove('active');
  });

    // ── Render Exercises ──────────────────────────────────────
  function renderExercises() {
    const con = document.getElementById('tj-exercises-list');
    const muscleFilter = document.getElementById('tj-muscle-filter')?.value || '';
    let list = sortedEx();
    if (muscleFilter) list = list.filter(ex => ex.muscle === muscleFilter);
    if (!st.exercises.length) { con.innerHTML=`<div class="tj-empty"><div class="tj-empty-icon">◻</div><p>Ei liikkeitä.</p></div>`; return; }
    if (!list.length) { con.innerHTML=`<div class="tj-empty"><div class="tj-empty-icon">◻</div><p>Ei liikkeitä valitussa lihasryhmässä.</p></div>`; return; }
    con.innerHTML = '';
    list.forEach(ex => {
      const bar      = getBar(ex.barId);
      const barLabel = hasBar(ex) ? (bar ? `${bar.name} (${bar.weight} kg)` : '—') : '';
      const cLabel   = hasCable(ex) ? cableLabel(ex) : '';
      const dbLabel  = ex.usesDumbbells ? 'Käsipainot' : '';
      const equipParts = [barLabel, cLabel, dbLabel].filter(Boolean);
      const equipLabel = equipParts.join(' + ');   // empty string if nothing → show only muscle
      const el = document.createElement('div'); el.className = 'tj-card';
      el.innerHTML = `
        <div class="tj-card-body">
          <div class="tj-card-title">${ex.name}</div>
          <div class="tj-card-sub">${ex.muscle}${equipLabel ? ' · ' + equipLabel : ''}</div>
        </div>
        <div class="tj-card-actions">
          <button class="tj-btn-icon" data-edit="${ex.id}">✎</button>
          <button class="tj-btn-icon danger" data-del="${ex.id}">✕</button>
        </div>`;
      el.querySelector('[data-edit]').addEventListener('click', () => openEditEx(ex.id));
      el.querySelector('[data-del]').addEventListener('click', async () => {
        if (await appConfirm(`Poistetaanko "${ex.name}"?`)) { st.exercises=st.exercises.filter(e=>e.id!==ex.id); save(); renderExercises(); }
      });
      con.appendChild(el);
    });
  }

  // ── Render Bars ───────────────────────────────────────────
  function renderBars() {
    const con = document.getElementById('tj-bars-grid'); con.innerHTML = '';
    st.bars.forEach(bar => {
      const el = document.createElement('div'); el.className = 'tj-bar-card';
      el.innerHTML = `
        <h3>${bar.name}</h3>
        <div class="tj-bar-desc">${bar.desc}</div>
        <div class="tj-bar-weight">${bar.weight}</div>
        <div class="tj-bar-unit">kg</div>
        <div class="tj-bar-row">
          <input type="number" id="tj-bar-inp-${bar.id}" value="${bar.weight}" min="0" step="0.5" />
          <button class="btn-add-new" style="font-size:0.8rem;padding:6px 10px;" data-bar="${bar.id}">Tallenna</button>
        </div>`;
      el.querySelector('[data-bar]').addEventListener('click', () => {
        const v = parseFloat(document.getElementById(`tj-bar-inp-${bar.id}`).value);
        if (!isNaN(v) && v >= 0) { const b=st.bars.find(b=>b.id===bar.id); if(b){b.weight=v;save();renderBars();} }
      });
      con.appendChild(el);
    });
  }

  // ── Render Programs ───────────────────────────────────────
  function renderPrograms() {
    const con = document.getElementById('tj-programs-list');
    if (!st.programs?.length) { con.innerHTML=`<div class="tj-empty"><div class="tj-empty-icon">◻</div><p>Ei ohjelmia.</p></div>`; return; }
    con.innerHTML = '';
    st.programs.forEach(prog => {
      const el = document.createElement('div'); el.className = 'tj-program-card';
      const tags = prog.exercises.map(pe => { const ex=getEx(pe.exerciseId); return ex?`<span class="tj-badge tj-badge-orange">${ex.name}</span>`:''; }).join('');
      el.innerHTML = `
        <div class="tj-program-card-header">
          <div>
            <div class="tj-program-card-title">${prog.name}</div>
            <div class="tj-program-card-count">${prog.exercises.length} liikettä</div>
          </div>
          <div>
            <button class="tj-btn-icon" data-ep="${prog.id}">✎</button>
            <button class="tj-btn-icon danger" data-dp="${prog.id}">✕</button>
          </div>
        </div>
        <div class="tj-program-card-body">
          ${tags}
          <button class="tj-program-load-btn" data-lp="${prog.id}">↓ Lataa treeniin</button>
        </div>`;
      el.querySelector('[data-ep]').addEventListener('click', () => openEditProgram(prog.id));
      el.querySelector('[data-dp]').addEventListener('click', async () => { if(await appConfirm(`Poistetaanko "${prog.name}"?`)){st.programs=st.programs.filter(p=>p.id!==prog.id);save();renderPrograms();} });
      el.querySelector('[data-lp]').addEventListener('click', () => loadProgram(prog.id));
      con.appendChild(el);
    });
  }

  // ── Render History ────────────────────────────────────────
  function renderHistory() {
    const con = document.getElementById('tj-history-list');
    if (!st.history.length) { con.innerHTML=`<div class="tj-empty"><div class="tj-empty-icon">◻</div><p>Ei tallennettuja treenejä.</p></div>`; return; }
    con.innerHTML = '';
    [...st.history].sort((a,b)=>b.timestamp-a.timestamp).forEach(w => {
      const names = w.entries.map(e => { const ex=st.exercises.find(x=>x.id===e.exerciseId); return ex?ex.name:'?'; }).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
      const el = document.createElement('div'); el.className = 'tj-history-card';
      el.innerHTML = `
        <div class="tj-history-header">
          <div class="tj-history-date">${fmtDate(w.timestamp)}</div>
          <span class="tj-history-count">${w.entries.length} liikettä</span>
        </div>
        <div class="tj-history-exercises">${names||'—'}</div>`;
      el.addEventListener('click', () => openHistDetail(w.id));
      con.appendChild(el);
    });
  }

  // ── Add Set Modal ─────────────────────────────────────────
  function fillExSelect(selId) {
    const sel = document.getElementById(selId); sel.innerHTML = '';
    sortedEx().forEach(ex => { const o=document.createElement('option'); o.value=ex.id; o.textContent=ex.name; sel.appendChild(o); });
    updateWeightUI();
  }

  function updateWeightUI() {
    const ex = getEx(document.getElementById('tj-set-exercise').value);
    document.getElementById('tj-weight-section').style.display    = ex&&hasBar(ex)  ? 'block' : 'none';
    document.getElementById('tj-dumbbell-section').style.display  = ex&&!hasBar(ex) ? 'block' : 'none';
    if (ex && hasBar(ex)) updateBreakdown();
    else document.getElementById('tj-weight-breakdown').classList.remove('visible');
  }

  function updateBreakdown() {
    const ex     = getEx(document.getElementById('tj-set-exercise').value);
    const plates = document.getElementById('tj-set-plates').value;
    const bd     = document.getElementById('tj-weight-breakdown');
    if (!ex || !hasBar(ex)) { bd.classList.remove('visible'); return; }
    const bar  = getBar(ex.barId);
    const barW = bar ? bar.weight : 0;
    const pN   = parseFloat(plates) || 0;
    const tot  = barW + pN;
    bd.innerHTML = `<div class="tj-weight-breakdown-total">${tot} kg yhteensä</div><div>${barW} kg (${bar?bar.name:'tanko'}) + ${pN} kg levyjä</div>`;
    bd.classList.add('visible');
  }

  document.getElementById('tj-set-exercise').addEventListener('change', updateWeightUI);
  document.getElementById('tj-set-plates').addEventListener('input', updateBreakdown);
  document.getElementById('tj-btn-add-set').addEventListener('click', () => { fillExSelect('tj-set-exercise'); openTjModal('tj-modal-add-set'); });

  document.getElementById('tj-btn-confirm-set').addEventListener('click', () => {
    const exId = document.getElementById('tj-set-exercise').value;
    const ex   = getEx(exId); if (!ex) return;
    const entry = { id:uid(), exerciseId:exId,
      sets:document.getElementById('tj-set-sets').value,
      reps:document.getElementById('tj-set-reps').value,
      plates:0, dumbbell:0 };
    if (hasBar(ex)) entry.plates   = parseFloat(document.getElementById('tj-set-plates').value) || 0;
    else            entry.dumbbell = parseFloat(document.getElementById('tj-set-dumbbell').value) || 0;
    st.currentLog.push(entry); save(); renderLog();
    closeTjModal('tj-modal-add-set');
    document.getElementById('tj-set-plates').value   = '';
    document.getElementById('tj-set-dumbbell').value = '';
  });

  // ── Exercise modal ─────────────────────────────────────────
  function fillBarSelect(selId, currentBarId) {
    const sel = document.getElementById(selId); sel.innerHTML = '';
    const no  = document.createElement('option'); no.value=NO_BAR; no.textContent='Ei tankoa (käsipainot tms.)';
    if (!currentBarId || currentBarId===NO_BAR) no.selected = true; sel.appendChild(no);
    st.bars.forEach(bar => { const o=document.createElement('option'); o.value=bar.id; o.textContent=`${bar.name} (${bar.weight} kg)`; if(bar.id===currentBarId) o.selected=true; sel.appendChild(o); });
  }

  // Dumbbell toggle handler
  document.querySelectorAll('#tj-dumbbell-toggle .tj-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tj-dumbbell-toggle .tj-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tj-exercise-dumbbell').value = btn.dataset.val;
    });
  });

  function setDumbbellToggle(val) {
    document.querySelectorAll('#tj-dumbbell-toggle .tj-toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === val);
    });
    document.getElementById('tj-exercise-dumbbell').value = val;
  }

  document.getElementById('tj-btn-new-exercise').addEventListener('click', () => {
    document.getElementById('tj-exercise-modal-title').textContent = 'Uusi liike';
    document.getElementById('tj-exercise-name').value  = '';
    document.getElementById('tj-exercise-muscle').value = 'Rinta';
    document.getElementById('tj-exercise-edit-id').value = '';
    fillBarSelect('tj-exercise-bar', NO_BAR);
    document.getElementById('tj-exercise-cable').value = 'none';
    setDumbbellToggle('no');
    openTjModal('tj-modal-exercise');
  });

  function openEditEx(exId) {
    const ex = getEx(exId); if (!ex) return;
    document.getElementById('tj-exercise-modal-title').textContent = 'Muokkaa liikettä';
    document.getElementById('tj-exercise-name').value   = ex.name;
    document.getElementById('tj-exercise-muscle').value = ex.muscle;
    document.getElementById('tj-exercise-edit-id').value = ex.id;
    fillBarSelect('tj-exercise-bar', ex.barId);
    document.getElementById('tj-exercise-cable').value = ex.cableId || 'none';
    setDumbbellToggle(ex.usesDumbbells ? 'yes' : 'no');
    openTjModal('tj-modal-exercise');
  }

  document.getElementById('tj-btn-save-exercise').addEventListener('click', () => {
    const name   = document.getElementById('tj-exercise-name').value.trim();
    const muscle = document.getElementById('tj-exercise-muscle').value;
    const barId  = document.getElementById('tj-exercise-bar').value;
    const editId = document.getElementById('tj-exercise-edit-id').value;
    const cableId       = document.getElementById('tj-exercise-cable').value || 'none';
    const usesDumbbells = document.getElementById('tj-exercise-dumbbell').value === 'yes';
    if (!name) { document.getElementById('tj-exercise-name').focus(); return; }
    if (editId) { const ex=st.exercises.find(e=>e.id===editId); if(ex){ex.name=name;ex.muscle=muscle;ex.barId=barId;ex.cableId=cableId;ex.usesDumbbells=usesDumbbells;} }
    else st.exercises.push({ id:uid(), name, muscle, barId, cableId, usesDumbbells });
    save(); renderExercises(); closeTjModal('tj-modal-exercise');
  });

  // ── Program modal ──────────────────────────────────────────
  let progRows = [];

  function buildProgRow(pe, idx) {
    const row = document.createElement('div'); row.className = 'tj-prog-ex-row';
    // Exercise select
    const exSel = document.createElement('select');
    sortedEx().forEach(ex => { const o=document.createElement('option'); o.value=ex.id; o.textContent=ex.name; if(ex.id===pe.exerciseId) o.selected=true; exSel.appendChild(o); });
    exSel.addEventListener('change', () => progRows[idx].exerciseId = exSel.value);
    // Sets with label
    const setsCol = document.createElement('div'); setsCol.className = 'tj-prog-col';
    const setsLbl = document.createElement('span'); setsLbl.className = 'tj-prog-col-label'; setsLbl.textContent = 'Sarjat';
    const setsSel = document.createElement('select');
    [1,2,3,4,5,6].forEach(v => { const o=document.createElement('option'); o.value=String(v); o.textContent=v+'s'; if(String(v)===pe.sets) o.selected=true; setsSel.appendChild(o); });
    setsSel.addEventListener('change', () => progRows[idx].sets = setsSel.value);
    setsCol.appendChild(setsLbl); setsCol.appendChild(setsSel);
    // Reps with label
    const repsCol = document.createElement('div'); repsCol.className = 'tj-prog-col';
    const repsLbl = document.createElement('span'); repsLbl.className = 'tj-prog-col-label'; repsLbl.textContent = 'Toistot';
    const repsSel = document.createElement('select');
    ['1','2','3','4','5','6-8','8-10','10-12','12-15','15-20'].forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; if(v===pe.reps) o.selected=true; repsSel.appendChild(o); });
    repsSel.addEventListener('change', () => progRows[idx].reps = repsSel.value);
    repsCol.appendChild(repsLbl); repsCol.appendChild(repsSel);
    // Remove
    const rm = document.createElement('button'); rm.className='tj-btn-icon danger'; rm.textContent='✕';
    rm.style.cssText = 'align-self:flex-end;margin-bottom:1px;';
    rm.addEventListener('click', () => { progRows.splice(idx,1); refreshProgList(); });
    row.appendChild(exSel); row.appendChild(setsCol); row.appendChild(repsCol); row.appendChild(rm);
    return row;
  }

  function refreshProgList() {
    const con = document.getElementById('tj-program-exercise-list'); con.innerHTML = '';
    progRows.forEach((pe,idx) => con.appendChild(buildProgRow(pe,idx)));
  }

  document.getElementById('tj-btn-add-program-ex').addEventListener('click', () => {
    const first = sortedEx()[0]; if (!first) return;
    progRows.push({ exerciseId:first.id, sets:'3', reps:'8-10' }); refreshProgList();
  });

  document.getElementById('tj-btn-new-program').addEventListener('click', () => {
    document.getElementById('tj-program-modal-title').textContent = 'Uusi ohjelma';
    document.getElementById('tj-program-name').value = '';
    document.getElementById('tj-program-edit-id').value = '';
    const first = sortedEx()[0];
    progRows = [{ exerciseId:first?first.id:'', sets:'3', reps:'8-10' }];
    refreshProgList(); openTjModal('tj-modal-program');
  });

  function openEditProgram(progId) {
    const prog = st.programs.find(p=>p.id===progId); if (!prog) return;
    document.getElementById('tj-program-modal-title').textContent = 'Muokkaa ohjelmaa';
    document.getElementById('tj-program-name').value = prog.name;
    document.getElementById('tj-program-edit-id').value = prog.id;
    progRows = prog.exercises.map(pe=>({...pe})); refreshProgList(); openTjModal('tj-modal-program');
  }

  document.getElementById('tj-btn-save-program').addEventListener('click', () => {
    const name = document.getElementById('tj-program-name').value.trim();
    if (!name) { document.getElementById('tj-program-name').focus(); return; }
    if (!progRows.length) { alert('Lisää vähintään yksi liike.'); return; }
    const editId    = document.getElementById('tj-program-edit-id').value;
    const exercises = progRows.map(pe=>({exerciseId:pe.exerciseId,sets:pe.sets,reps:pe.reps}));
    if (!st.programs) st.programs = [];
    if (editId) { const p=st.programs.find(p=>p.id===editId); if(p){p.name=name;p.exercises=exercises;} }
    else st.programs.push({ id:uid(), name, exercises });
    save(); renderPrograms(); closeTjModal('tj-modal-program');
  });

  // ── Load program ───────────────────────────────────────────
  function loadProgram(progId) {
    const prog = st.programs.find(p=>p.id===progId); if (!prog) return;
    prog.exercises.forEach(pe => { const ex=getEx(pe.exerciseId); if(!ex) return; st.currentLog.push({id:uid(),exerciseId:pe.exerciseId,sets:pe.sets,reps:pe.reps,plates:0,dumbbell:0}); });
    save(); renderLog(); closeTjModal('tj-modal-load-program'); switchTjTab('log');
  }

  document.getElementById('tj-btn-load-program').addEventListener('click', () => {
    if (!st.programs?.length) { alert('Ei ohjelmia tallennettu.'); return; }
    const con = document.getElementById('tj-load-program-list'); con.innerHTML = '';
    st.programs.forEach(prog => {
      const names = prog.exercises.map(pe=>{const ex=getEx(pe.exerciseId);return ex?ex.name:'?';}).join(', ');
      const el = document.createElement('div'); el.className='tj-load-item';
      el.innerHTML=`<div><div class="tj-load-item-name">${prog.name}</div><div class="tj-load-item-sub">${prog.exercises.length} liikettä · ${names}</div></div><div class="tj-load-arrow">→</div>`;
      el.addEventListener('click', () => loadProgram(prog.id)); con.appendChild(el);
    });
    openTjModal('tj-modal-load-program');
  });

  // ── Save workout ───────────────────────────────────────────
  document.getElementById('tj-btn-save-workout').addEventListener('click', () => {
    if (!st.currentLog.length) return;
    st.history.push({ id:uid(), timestamp:Date.now(), entries:[...st.currentLog] });
    st.currentLog = []; save(); renderLog(); renderHistory(); switchTjTab('history');
  });

  // ── History detail ─────────────────────────────────────────
  let viewingWorkoutId = null;

  function openHistDetail(workoutId) {
    const w = st.history.find(x=>x.id===workoutId); if (!w) return;
    viewingWorkoutId = workoutId;
    document.getElementById('tj-history-detail-title').textContent = fmtDate(w.timestamp);
    const body = document.getElementById('tj-history-detail-body'); body.innerHTML = '';
    w.entries.forEach(entry => {
      const ex      = st.exercises.find(e=>e.id===entry.exerciseId);
      const bar     = ex ? getBar(ex.barId) : null;
      const total   = ex ? calcWeight(ex,entry.plates,entry.dumbbell) : '?';
      const usesBar = ex ? hasBar(ex) : false;
      const div = document.createElement('div'); div.className='tj-history-detail-item';
      div.innerHTML=`
        <div class="tj-history-detail-hdr">${ex?ex.name:'(poistettu)'} <span class="tj-muted">· ${ex?ex.muscle:''}</span></div>
        <div class="tj-history-detail-body">
          <span class="tj-badge tj-badge-green">${entry.sets} sarjaa</span>
          <span class="tj-badge tj-badge-blue">${entry.reps} toistoa</span>
          <span class="tj-badge tj-badge-amber">${total} kg</span>
          ${usesBar&&bar?`<span class="tj-muted">${bar.weight}kg tanko + ${parseFloat(entry.plates)||0}kg levyjä</span>`:''}
          ${!usesBar&&hasCable(ex)?`<span class="tj-muted">${cableLabel(ex)}</span>`:''}
        </div>`;
      body.appendChild(div);
    });
    openTjModal('tj-modal-history-detail');
  }

  document.getElementById('tj-btn-delete-workout').addEventListener('click', async () => {
    if (!viewingWorkoutId) return;
    if (await appConfirm('Poistetaanko treeni?')) { st.history=st.history.filter(w=>w.id!==viewingWorkoutId); save(); renderHistory(); closeTjModal('tj-modal-history-detail'); }
  });

  document.getElementById('tj-btn-clear-history').addEventListener('click', async () => {
    if (!st.history.length) return;
    if (await appConfirm('Tyhjennetäänkö koko historia?')) { st.history=[]; save(); renderHistory(); }
  });

  // ── Backup / Restore ───────────────────────────────────────
  document.getElementById('tjBackupBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(st,null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`treeni-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('tjRestoreInput').addEventListener('change', e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader(); reader.onload=async ev=>{
      try {
        const imp=JSON.parse(ev.target.result);
        if(!imp.bars||!imp.exercises){alert('Virheellinen tiedosto.');return;}
        if(!imp.programs) imp.programs=[];
        if(await appConfirm('Palautetaanko varmuuskopio?')){st=imp;save();renderAll();showToastTj('Palautettu!');}
      } catch {alert('Lukeminen epäonnistui.');}
      e.target.value='';
    }; reader.readAsText(file);
  });

  // ── Toast helper for treeni section ───────────────────────
  function showToastTj(msg) {
    // reuse ravintolaskuri toast element
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast success show';
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── Modal helpers ──────────────────────────────────────────
  function openTjModal(id)  { document.getElementById(id).classList.add('active'); }
  function closeTjModal(id) { document.getElementById(id).classList.remove('active'); }

  document.querySelectorAll('[data-tj-close]').forEach(btn => {
    btn.addEventListener('click', () => closeTjModal(btn.dataset.tjClose));
  });
  document.querySelectorAll('#app-treeni .modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if(e.target===overlay) closeTjModal(overlay.id); });
  });

  // ── Init ───────────────────────────────────────────────────
  function renderAll() { renderLog(); renderExercises(); renderBars(); renderPrograms(); renderHistory(); }
  renderAll();

})(); // end treenipäiväkirja
