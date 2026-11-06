/* ================= CONSTANTES ================= */
const MOCK_USER = { email: 'teste@teste.com', password: '123456' };
const CATEGORIES = ['camisa', 'calca', 'sapato', 'acessorio'];
const CATEGORY_LABEL = { camisa: 'Camisa/Blusa', calca: 'Calça/Short', sapato: 'Calçado', acessorio: 'Acessório' };
const CATEGORY_ICON  = { camisa: '👕', calca: '👖', sapato: '👟', acessorio: '👜' };
const WEATHERS = ['quente', 'ameno', 'frio'];

/* ================= STORAGE ================= */
const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } },
    raw: {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch {} },
        remove(k) { try { localStorage.removeItem(k); } catch {} }
    }
};

/* ================= STATE ================= */
let clothes = [];
let outfits = [];
let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

/* ================= BOOT ================= */
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupAuth();
    setupTabs();
    setupUpload();
    setupOutfit();
    setupChat();
    setupCalendar();
    setupTravel();
    setupBazar();
    setupSeed();
    checkAuth();
}

function checkAuth() {
    if (store.raw.get('mockAuth') === 'true') showApp();
    else showAuth();
}
function showAuth() {
    document.getElementById('app-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
}
function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    loadData();
    renderCloset();
    renderStats();
    renderCalendar();
    initChat();
}

/* ================= DATA ================= */
function loadData() {
    clothes = store.get('mockClothes', []).map(normalizeCloth);
    outfits = store.get('mockOutfits', []);
    saveClothes();
}
function saveClothes() { store.set('mockClothes', clothes); }
function saveOutfits() { store.set('mockOutfits', outfits); }

function normalizeCloth(c) {
    return {
        id: c.id || Date.now() + Math.random(),
        name: c.name || CATEGORY_LABEL[c.category] || 'Peça',
        category: c.category || 'camisa',
        image_url: c.image_url,
        price: Number(c.price) || 0,
        timesWorn: c.timesWorn || 0,
        lastWorn: c.lastWorn || null,
        occasions: c.occasions || ['casual'],
        seasons: c.seasons || WEATHERS.slice(),
        created_at: c.created_at || new Date().toISOString()
    };
}

/* ================= AUTH ================= */
function setupAuth() {
    document.getElementById('auth-form').addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const pw    = document.getElementById('password').value;
        if (email === MOCK_USER.email && pw === MOCK_USER.password) {
            store.raw.set('mockAuth', 'true');
            showApp();
        } else {
            alert('❌ E-mail ou senha incorretos.\nUse: teste@teste.com / 123456');
        }
    });
    document.getElementById('btn-logout').addEventListener('click', () => {
        store.raw.remove('mockAuth');
        showAuth();
        document.getElementById('auth-form').reset();
    });
}

/* ================= TABS ================= */
function setupTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'stats')    renderStats();
            if (btn.dataset.tab === 'calendar') renderCalendar();
            if (btn.dataset.tab === 'bazar')    renderBazares();
        });
    });
}

/* ================= IMAGE RESIZE ================= */
function resizeImage(file, maxW = 500) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = reject;
        r.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const cv = document.createElement('canvas');
                let { width: w, height: h } = img;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                cv.width = w; cv.height = h;
                cv.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(cv.toDataURL('image/jpeg', 0.75));
            };
            img.src = e.target.result;
        };
        r.readAsDataURL(file);
    });
}

/* ================= UPLOAD ================= */
function setupUpload() {
    document.getElementById('upload-form').addEventListener('submit', async e => {
        e.preventDefault();
        const file = document.getElementById('clothing-image').files[0];
        if (!file) return alert('Selecione uma imagem.');
        try {
            const image_url = await resizeImage(file);
            clothes.unshift({
                id: Date.now(),
                name: document.getElementById('clothing-name').value.trim() || 'Peça',
                category: document.getElementById('clothing-category').value,
                price: Number(document.getElementById('clothing-price').value) || 0,
                image_url,
                occasions: [...document.querySelectorAll('.occ:checked')].map(i => i.value),
                seasons: WEATHERS.slice(),
                timesWorn: 0,
                lastWorn: null,
                created_at: new Date().toISOString()
            });
            if (!clothes[0].occasions.length) clothes[0].occasions = ['casual'];
            saveClothes();
            renderCloset();
            renderStats();
            e.target.reset();
            alert('✅ Peça adicionada!');
        } catch (err) {
            alert('Erro ao processar imagem.');
            console.error(err);
        }
    });
}

function renderCloset() {
    const grid  = document.getElementById('closet-grid');
    const count = document.getElementById('closet-count');
    if (count) count.textContent = `(${clothes.length})`;
    if (!clothes.length) {
        grid.innerHTML = '<p class="empty">Seu armário está vazio. Adicione uma peça acima!</p>';
        return;
    }
    grid.innerHTML = clothes.map(c => `
        <div class="clothing-card">
            <div class="card-img"><img src="${c.image_url}" alt="${escapeHtml(c.name)}"></div>
            <div class="card-body">
                <div class="card-title">${CATEGORY_ICON[c.category] || ''} ${escapeHtml(c.name)}</div>
                <div class="card-meta">${c.timesWorn}x usado</div>
                <button class="btn-wear" data-id="${c.id}">✓ Usar hoje</button>
                <button class="btn-del"  data-id="${c.id}">🗑️</button>
            </div>
        </div>
    `).join('');
    grid.querySelectorAll('.btn-wear').forEach(b => b.addEventListener('click', () => markWorn(b.dataset.id)));
    grid.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteCloth(b.dataset.id)));
}

function markWorn(id) {
    const c = clothes.find(x => String(x.id) === String(id));
    if (!c) return;
    c.timesWorn++;
    c.lastWorn = new Date().toISOString();
    saveClothes();
    renderCloset();
    renderStats();
}
window.wornFromStats = function (id) { markWorn(id); renderStats(); };

function deleteCloth(id) {
    if (!confirm('Remover esta peça?')) return;
    clothes = clothes.filter(x => String(x.id) !== String(id));
    saveClothes();
    renderCloset();
    renderStats();
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

/* ================= OUTFIT ENGINE ================= */
function pickPiece(category, occasion, weather, exclude = []) {
    let pool = clothes.filter(c =>
        c.category === category &&
        !exclude.includes(c.id) &&
        (!occasion || c.occasions.includes(occasion)) &&
        (c.seasons.includes(weather) || c.seasons.length === WEATHERS.length)
    );
    if (!pool.length) pool = clothes.filter(c => c.category === category && !exclude.includes(c.id));
    if (!pool.length) return null;

    pool.sort((a, b) => {
        if (a.timesWorn !== b.timesWorn) return a.timesWorn - b.timesWorn;
        const dA = a.lastWorn ? new Date(a.lastWorn).getTime() : 0;
        const dB = b.lastWorn ? new Date(b.lastWorn).getTime() : 0;
        return dA - dB;
    });
    return pool[0];
}

function suggestOutfit(occasion, weather) {
    return {
        top:       pickPiece('camisa',    occasion, weather),
        bottom:    pickPiece('calca',     occasion, weather),
        shoes:     pickPiece('sapato',    occasion, weather),
        accessory: pickPiece('acessorio', occasion, weather),
        occasion, weather
    };
}

function tempToWeather(t) {
    if (t >= 26) return 'quente';
    if (t <= 16) return 'frio';
    return 'ameno';
}

async function getCurrentWeather() {
    try {
        const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
        );
        const { latitude, longitude } = pos.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const data = await r.json();
        return { temp: data.current.temperature_2m, source: 'api' };
    } catch {
        const m = new Date().getMonth();
        return { temp: m >= 4 && m <= 8 ? 22 : m >= 9 ? 28 : 20, source: 'mock' };
    }
}

/* ================= OUTFIT UI ================= */
function setupOutfit() {
    document.getElementById('btn-weather').addEventListener('click', async () => {
        const btn = document.getElementById('btn-weather');
        btn.disabled = true; btn.textContent = '⏳ Buscando...';
        const w = await getCurrentWeather();
        window._savedWeather = tempToWeather(w.temp);
        const emoji = window._savedWeather === 'quente' ? '☀️' : window._savedWeather === 'frio' ? '❄️' : '🌤️';
        btn.textContent = `${emoji} ${w.temp}°C (${window._savedWeather})${w.source === 'mock' ? ' *' : ''}`;
        btn.disabled = false;
    });

    document.getElementById('btn-suggest').addEventListener('click', () => {
        const occasion = document.getElementById('occasion-select').value;
        const weather  = window._savedWeather || 'ameno';
        renderOutfitResult(suggestOutfit(occasion, weather));
    });
}

function renderOutfitResult(outfit) {
    const wrap = document.getElementById('outfit-result');
    if (!outfit.top && !outfit.bottom && !outfit.shoes) {
        wrap.innerHTML = '<p class="empty">Adicione peças ao armário primeiro!</p>';
        return;
    }

    const slot = (p, cat) => p ? `
        <div class="outfit-slot">
            <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
            <div class="outfit-slot-label">${CATEGORY_ICON[p.category]} ${escapeHtml(p.name)}</div>
        </div>
    ` : `<div class="outfit-slot empty-slot"><span>${CATEGORY_ICON[cat]}</span><div>Sem ${CATEGORY_LABEL[cat]}</div></div>`;

    wrap.innerHTML = `
        <div class="outfit-board">
            <div class="outfit-header">
                <h3>✨ Look sugerido</h3>
                <p>Ocasião: ${outfit.occasion} · Clima: ${outfit.weather}</p>
            </div>
            <div class="mannequin-area">
                <div class="mannequin">
                    <svg viewBox="0 0 100 220" class="mannequin-svg">
                        <ellipse cx="50" cy="22" rx="18" ry="20" fill="#e9d5ff"/>
                        <path d="M32 45 Q50 55 68 45 L75 85 L70 130 L30 130 L25 85 Z" fill="#e9d5ff"/>
                        <rect x="35" y="130" width="12" height="65" fill="#e9d5ff"/>
                        <rect x="53" y="130" width="12" height="65" fill="#e9d5ff"/>
                        <ellipse cx="41" cy="200" rx="12" ry="7" fill="#e9d5ff"/>
                        <ellipse cx="59" cy="200" rx="12" ry="7" fill="#e9d5ff"/>
                    </svg>
                </div>
                <div class="outfit-slots">
                    ${slot(outfit.top, 'camisa')}
                    ${slot(outfit.bottom, 'calca')}
                    ${slot(outfit.shoes, 'sapato')}
                    ${slot(outfit.accessory, 'acessorio')}
                </div>
            </div>
            <button class="btn-primary" id="btn-save-outfit">💾 Salvar look de hoje</button>
        </div>
    `;
    document.getElementById('btn-save-outfit').addEventListener('click', () => saveOutfitToCalendar(outfit));
}

function saveOutfitToCalendar(outfit) {
    const today = new Date().toISOString().slice(0, 10);
    const ids = [outfit.top, outfit.bottom, outfit.shoes, outfit.accessory]
        .filter(Boolean).map(p => p.id);

    outfits = outfits.filter(o => o.date !== today);
    outfits.push({ date: today, pieceIds: ids, occasion: outfit.occasion, weather: outfit.weather });
    saveOutfits();

    ids.forEach(id => {
        const c = clothes.find(x => x.id === id);
        if (c) { c.timesWorn++; c.lastWorn = new Date().toISOString(); }
    });
    saveClothes();
    renderCloset();
    renderStats();
    renderCalendar();
    alert('✅ Look salvo no calendário!');
}

/* ================= CHATBOT ================= */
function setupChat() {
    document.getElementById('chat-form').addEventListener('submit', e => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;
        addChatMessage(msg, 'user');
        input.value = '';
        setTimeout(() => addChatMessage(chatbotReply(msg), 'bot'), 350);
    });
}

function initChat() {
    const box = document.getElementById('chat-messages');
    if (box.children.length) return;
    addChatMessage('Olá! 👋 Sou seu assistente de moda. Digite <strong>"ajuda"</strong> para ver o que posso fazer.', 'bot');
}

function addChatMessage(text, who) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    if (who === 'user') div.textContent = text;
    else div.innerHTML = text.replace(/\n/g, '<br>');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function chatbotReply(text) {
    const m = text.toLowerCase();

    if (/ajuda|help|comando|o que (você |vc )?pode/.test(m)) {
        return `🤖 <strong>Comandos disponíveis:</strong><br><br>
            • <em>"sugerir look para [ocasião]"</em> — trabalho, festa, casual, estudo<br>
            • <em>"look para frio / calor"</em><br>
            • <em>"estatísticas"</em> — dados do armário<br>
            • <em>"peças esquecidas"</em> — roupas não usadas<br>
            • <em>"viagem de [N] dias"</em> — montar mala<br>
            • <em>"bazar"</em> — bazares próximos<br>
            • <em>"quantas combinações"</em>`;
    }

    if (/sugerir|look|outfit|monta|o que (eu )?vestir|que roupa/.test(m)) {
        let occasion = null;
        if (/trabalho|escrit|reuni/.test(m)) occasion = 'trabalho';
        else if (/festa|balada|festej/.test(m)) occasion = 'festa';
        else if (/estudo|faculdade|escola|aula/.test(m)) occasion = 'estudo';
        else if (/viagem|viaj/.test(m)) occasion = 'viagem';
        else if (/casual|dia a dia/.test(m)) occasion = 'casual';

        let weather = 'ameno';
        if (/frio|inverno|fresco/.test(m)) weather = 'frio';
        else if (/calor|quente|verão|verao/.test(m)) weather = 'quente';

        const o = suggestOutfit(occasion, weather);
        if (!o.top && !o.bottom && !o.shoes) {
            return '❌ Você ainda não tem peças suficientes cadastradas. Adicione roupas no armário primeiro!';
        }
        const list = [
            o.top && `👕 ${o.top.name}`,
            o.bottom && `👖 ${o.bottom.name}`,
            o.shoes && `👟 ${o.shoes.name}`,
            o.accessory && `👜 ${o.accessory.name}`
        ].filter(Boolean).join('<br>');

        return `✨ <strong>Sugestão de look${occasion ? ' para ' + occasion : ''} (${weather}):</strong><br>${list}<br><br>💡 <em>Priorizei peças menos usadas!</em>`;
    }

    if (/estatística|stats|número|numero|quantas combina/.test(m)) {
        const total = clothes.length;
        const combos = calculateCombinations();
        const avg = total ? (clothes.reduce((s, c) => s + c.timesWorn, 0) / total).toFixed(1) : 0;
        return `📊 <strong>Estatísticas do armário</strong><br><br>
            • Peças: ${total}<br>
            • Combinações possíveis: ${combos}<br>
            • Média de usos por peça: ${avg}<br><br>
            💡 Veja mais na aba <strong>Estatísticas</strong>!`;
    }

    if (/esquecid|não usad|nao usad|nunca us/.test(m)) {
        const forgotten = clothes.filter(c => c.timesWorn === 0);
        if (!forgotten.length) return '🎉 Nenhuma peça esquecida! Você usa todo o armário.';
        const names = forgotten.slice(0, 5).map(c => `• ${CATEGORY_ICON[c.category]} ${c.name}`).join('<br>');
        return `👀 <strong>Peças nunca usadas (${forgotten.length}):</strong><br><br>${names}${forgotten.length > 5 ? '<br>...' : ''}<br><br>♻️ Que tal dar uma chance?`;
    }

    if (/viagem|mala/.test(m)) {
        const days = parseInt(m.match(/(\d+)\s*dia/)?.[1] || '3');
        const plan = buildTravelPlan(days, 'ameno');
        if (!plan.items.length) return '❌ Cadastre peças primeiro!';
        const list = plan.items.map(p => `• ${CATEGORY_ICON[p.category]} ${p.name}`).join('<br>');
        return `🧳 <strong>Mala para ${days} dias:</strong><br><br>${list}`;
    }

    if (/bazar|brechó|brecho|segunda mão|segunda mao/.test(m)) {
        return '📍 Veja a aba <strong>Bazares</strong> para encontrar os mais próximos da sua região!';
    }

    if (/sustenta|reaproveita|economia|economiz/.test(m)) {
        const unused = clothes.filter(c => c.timesWorn === 0).length;
        return `♻️ Reaproveitar é tudo! Você tem <strong>${unused}</strong> peça(s) que nunca usou.<br><br>Digite <em>"peças esquecidas"</em> para ver a lista.`;
    }

    return '🤖 Não entendi. Digite <strong>"ajuda"</strong> para ver o que posso fazer.';
}

/* ================= STATS ================= */
function calculateCombinations() {
    const counts = {};
    CATEGORIES.forEach(c => counts[c] = clothes.filter(x => x.category === c).length);
    if (!counts.camisa || !counts.calca || !counts.sapato) return 0;
    return counts.camisa * counts.calca * counts.sapato * (counts.acessorio > 0 ? counts.acessorio + 1 : 1);
}

function renderStats() {
    const wrap = document.getElementById('stats-content');
    if (!wrap) return;
    if (!clothes.length) { wrap.innerHTML = '<p class="empty">Adicione peças para ver estatísticas.</p>'; return; }

    const total  = clothes.length;
    const combos = calculateCombinations();
    const avg    = (clothes.reduce((s, c) => s + c.timesWorn, 0) / total).toFixed(1);
    const forgot = clothes.filter(c => c.timesWorn === 0);
    const mostWorn = [...clothes].sort((a, b) => b.timesWorn - a.timesWorn).slice(0, 5);
    const bestCPU  = clothes.filter(c => c.price > 0)
        .map(c => ({ ...c, cpu: c.price / (c.timesWorn || 1) }))
        .sort((a, b) => a.cpu - b.cpu).slice(0, 5);

    const catCounts = {};
    CATEGORIES.forEach(c => catCounts[c] = clothes.filter(x => x.category === c).length);

    wrap.innerHTML = `
        <div class="stats-cards">
            <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Peças</div></div>
            <div class="stat-card accent"><div class="stat-num">${combos.toLocaleString('pt-BR')}</div><div class="stat-label">Combinações possíveis</div></div>
            <div class="stat-card"><div class="stat-num">${avg}</div><div class="stat-label">Média de usos</div></div>
            <div class="stat-card warn"><div class="stat-num">${forgot.length}</div><div class="stat-label">Peças esquecidas</div></div>
        </div>
        <div class="stats-grid">
            <div class="stats-block">
                <h3>📦 Por categoria</h3>
                ${CATEGORIES.map(c => `<div class="stats-row"><span>${CATEGORY_ICON[c]} ${CATEGORY_LABEL[c]}</span><strong>${catCounts[c]}</strong></div>`).join('')}
            </div>
            <div class="stats-block">
                <h3>🔥 Mais usadas</h3>
                ${mostWorn.filter(c => c.timesWorn > 0).map(c => `<div class="stats-row"><span>${CATEGORY_ICON[c.category]} ${escapeHtml(c.name)}</span><strong>${c.timesWorn}x</strong></div>`).join('') || '<p class="empty-small">Nenhuma peça usada ainda</p>'}
            </div>
            <div class="stats-block">
                <h3>👀 Esquecidas</h3>
                ${forgot.length ? forgot.slice(0, 8).map(c => `<div class="stats-row"><span>${CATEGORY_ICON[c.category]} ${escapeHtml(c.name)}</span><button class="mini-btn" onclick="wornFromStats('${c.id}')">Usar</button></div>`).join('') : '<p class="empty-small">Todas as peças já foram usadas 🎉</p>'}
            </div>
            <div class="stats-block">
                <h3>💰 Melhor custo por uso</h3>
                ${bestCPU.length ? bestCPU.map(c => `<div class="stats-row"><span>${CATEGORY_ICON[c.category]} ${escapeHtml(c.name)}</span><strong>R$ ${c.cpu.toFixed(2)}</strong></div>`).join('') : '<p class="empty-small">Cadastre preços para ver</p>'}
            </div>
        </div>
    `;
}

/* ================= CALENDAR ================= */
function setupCalendar() {
    document.getElementById('cal-prev').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });
}

function renderCalendar() {
    const wrap  = document.getElementById('calendar-grid');
    const title = document.getElementById('cal-month');
    if (!wrap) return;

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    title.textContent = `${months[currentMonth]} ${currentYear}`;

    const first = new Date(currentYear, currentMonth, 1).getDay();
    const total = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    let html = ['D','S','T','Q','Q','S','S'].map(d => `<div class="cal-head">${d}</div>`).join('');
    for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= total; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getDate() === d && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        const planned = outfits.find(o => o.date === dateStr);
        const minis = planned
            ? planned.pieceIds.slice(0, 3).map(id => {
                const c = clothes.find(x => x.id === id);
                return c ? `<img class="cal-mini" src="${c.image_url}" alt="">` : '';
            }).join('')
            : '';

        html += `<div class="cal-day ${isToday ? 'today' : ''} ${planned ? 'planned' : ''}" data-date="${dateStr}">
            <div class="cal-num">${d}</div>
            <div class="cal-pieces">${minis}</div>
        </div>`;
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.cal-day[data-date]').forEach(el =>
        el.addEventListener('click', () => showDayDetail(el.dataset.date))
    );
}

function showDayDetail(dateStr) {
    const planned = outfits.find(o => o.date === dateStr);
    const [y, m, d] = dateStr.split('-');
    const label = `${d}/${m}/${y}`;

    if (!planned) {
        if (!confirm(`Nenhum look planejado para ${label}.\nDeseja sugerir um agora?`)) return;
        const o = suggestOutfit('casual', 'ameno');
        if (!o.top && !o.bottom && !o.shoes) return alert('Adicione peças ao armário primeiro!');
        const ids = [o.top, o.bottom, o.shoes, o.accessory].filter(Boolean).map(p => p.id);
        outfits.push({ date: dateStr, pieceIds: ids, occasion: 'casual', weather: 'ameno' });
        saveOutfits();
        renderCalendar();
        return;
    }
    const pieces = planned.pieceIds.map(id => clothes.find(c => c.id === id)).filter(Boolean);
    alert(`📅 Look de ${label}:\n\n` + pieces.map(p => `• ${p.name}`).join('\n'));
}

/* ================= TRAVEL ================= */
function buildTravelPlan(days, weather) {
    const counts = {
        camisa:    Math.ceil(days / 2),
        calca:     Math.ceil(days / 3),
        sapato:    Math.min(2, Math.ceil(days / 4)),
        acessorio: 1
    };
    const items = [], used = [];
    Object.entries(counts).forEach(([cat, n]) => {
        for (let i = 0; i < n; i++) {
            const p = pickPiece(cat, 'viagem', weather, used);
            if (p) { items.push(p); used.push(p.id); }
        }
    });
    return { items, counts };
}

function setupTravel() {
    document.getElementById('btn-travel').addEventListener('click', () => {
        const days    = parseInt(document.getElementById('travel-days').value) || 3;
        const weather = document.getElementById('travel-weather').value;
        const plan    = buildTravelPlan(days, weather);
        const wrap    = document.getElementById('travel-result');

        if (!plan.items.length) { wrap.innerHTML = '<p class="empty">Adicione peças ao armário primeiro!</p>'; return; }

        wrap.innerHTML = `
            <div class="travel-board">
                <h3>🧳 Mala para ${days} dias · ${weather}</h3>
                <div class="travel-grid">
                    ${plan.items.map(p => `
                        <div class="travel-item">
                            <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
                            <div>${CATEGORY_ICON[p.category]} ${escapeHtml(p.name)}</div>
                        </div>
                    `).join('')}
                </div>
                <p class="travel-tip">💡 ${plan.counts.camisa} camisas, ${plan.counts.calca} calças, ${plan.counts.sapato} calçados — boa viagem!</p>
            </div>
        `;
    });
}

/* ================= BAZARES ================= */
const MOCK_BAZARES = [
    { name: 'Bazar do Bairro', address: 'Rua das Flores, 123', distance: '0.8 km', phone: '(11) 9999-1111', hours: 'Seg-Sáb · 9h-18h', type: 'Roupas e acessórios' },
    { name: 'Brechó Estilo',   address: 'Av. Central, 456',    distance: '1.5 km', phone: '(11) 9999-2222', hours: 'Ter-Dom · 10h-19h', type: 'Vintage e semijoias' },
    { name: 'Bazar Solidário', address: 'Rua da Caridade, 789',distance: '2.3 km', phone: '(11) 9999-3333', hours: 'Seg-Sex · 8h-17h',  type: 'Roupas usadas' },
    { name: 'EcoModa',         address: 'Rua Sustentável, 321',distance: '3.1 km', phone: '(11) 9999-4444', hours: 'Qua-Sáb · 11h-20h', type: 'Sustentável' }
];

function renderBazares() {
    const wrap = document.getElementById('bazar-list');
    if (!wrap) return;
    wrap.innerHTML = MOCK_BAZARES.map(b => `
        <div class="bazar-card">
            <h3>🏪 ${b.name}</h3>
            <p>📍 ${b.address} · <strong>${b.distance}</strong></p>
            <p>📞 ${b.phone}</p>
            <p>🕒 ${b.hours}</p>
            <p>🏷️ ${b.type}</p>
            <a class="btn-map" target="_blank" rel="noopener"
               href="https://www.google.com/maps/search/${encodeURIComponent(b.name + ' ' + b.address)}">
               🗺️ Abrir no Maps
            </a>
        </div>
    `).join('');
}

function setupBazar() {
    document.getElementById('btn-geoloc-bazar').addEventListener('click', () => {
        if (!navigator.geolocation) return alert('Geolocalização não disponível.');
        navigator.geolocation.getCurrentPosition(
            () => window.open('https://www.google.com/maps/search/bazar+perto+de+mim', '_blank'),
            () => alert('Não foi possível obter sua localização.')
        );
    });
    renderBazares();
}

/* ================= SEED (ROUPAS DE TESTE) ================= */

// Gera uma imagem SVG colorida com emoji + nome (funciona offline)
function makePlaceholder(bg, emoji, label, textColor = '#fff') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="${bg}"/>
        <text x="200" y="180" font-size="140" text-anchor="middle"
              dominant-baseline="middle">${emoji}</text>
        <text x="200" y="320" font-size="26" text-anchor="middle"
              fill="${textColor}" font-weight="bold"
              font-family="Segoe UI, sans-serif">${label}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Converte "N dias atrás" em ISO string
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

function setupSeed() {
    document.getElementById('btn-seed').addEventListener('click', () => {
        if (clothes.length && !confirm('Isso substituirá as peças atuais. Continuar?')) return;
        loadSampleClothes();
        alert('✅ 20 peças de teste carregadas!');
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        if (!confirm('Apagar todas as peças do armário?')) return;
        clothes = [];
        outfits = [];
        saveClothes();
        saveOutfits();
        renderCloset();
        renderStats();
        renderCalendar();
    });
}

function loadSampleClothes() {
    // [nome, categoria, cor, emoji, corTexto, preço, ocasiões, usos, diasDesdeÚltimoUso]
    const samples = [
        // ---------- CAMISAS / BLUSAS ----------
        ['Camiseta Branca Básica', 'camisa', '#f5f5f5', '👕', '#333', 39.90,  ['casual','estudo'],           12, 2],
        ['Camisa Social Azul',     'camisa', '#3b82f6', '👔', '#fff', 129.90, ['trabalho'],                  8,  5],
        ['Blusa Floral Rosa',      'camisa', '#ec4899', '👚', '#fff', 89.90,  ['festa','casual'],            3,  20],
        ['Camiseta Preta',         'camisa', '#1f2937', '👕', '#fff', 49.90,  ['casual','viagem'],           15, 1],
        ['Regata Verde',           'camisa', '#10b981', '🩱', '#fff', 29.90,  ['casual','viagem'],           5,  10],
        ['Blusa de Frio Cinza',    'camisa', '#6b7280', '🧥', '#fff', 149.90, ['trabalho','casual'],         2,  30],
        ['Cropped Vermelho',       'camisa', '#dc2626', '👚', '#fff', 69.90,  ['festa'],                     0,  null],

        // ---------- CALÇAS / SHORTS ----------
        ['Calça Jeans Skinny',     'calca', '#1e40af', '👖', '#fff', 179.90, ['casual'],                    10, 3],
        ['Calça Social Preta',     'calca', '#111827', '👖', '#fff', 199.90, ['trabalho'],                  6,  7],
        ['Short Jeans',            'calca', '#3b82f6', '🩳', '#fff', 79.90,  ['casual','viagem'],           4,  15],
        ['Legging Preta',          'calca', '#000000', '👖', '#fff', 59.90,  ['casual','estudo'],           8,  4],
        ['Calça Bege Alfaiataria', 'calca', '#d4a574', '👖', '#fff', 189.90, ['trabalho','festa'],          1,  45],

        // ---------- CALÇADOS ----------
        ['Tênis Branco',           'sapato', '#e5e7eb', '👟', '#333', 249.90, ['casual'],                    14, 2],
        ['Sapato Social Preto',    'sapato', '#1f2937', '👞', '#fff', 289.90, ['trabalho'],                  5,  8],
        ['Sandália Dourada',       'sapato', '#f59e0b', '👠', '#fff', 159.90, ['festa'],                     2,  25],
        ['Bota Preta',             'sapato', '#3f2f1a', '👢', '#fff', 329.90, ['trabalho','casual'],         3,  12],
        ['Chinelo Havaianas',      'sapato', '#06b6d4', '🩴', '#fff', 25.90,  ['viagem','casual'],           20, 1],

        // ---------- ACESSÓRIOS ----------
        ['Bolsa Marrom',           'acessorio', '#78350f', '👜', '#fff', 199.90, ['casual','trabalho'],      7,  5],
        ['Colar Dourado',          'acessorio', '#f59e0b', '📿', '#fff', 49.90,  ['festa'],                  1,  40],
        ['Cinto Preto',            'acessorio', '#1f2937', '🎀', '#fff', 89.90,  ['trabalho'],               4,  10],
        ['Óculos de Sol',          'acessorio', '#0f172a', '🕶️', '#fff', 159.90, ['viagem'],                 0,  null]
    ];

    clothes = samples.map(([name, category, bg, emoji, textColor, price, occasions, timesWorn, lastWornDays], i) => ({
        id: Date.now() + i,
        name,
        category,
        image_url: makePlaceholder(bg, emoji, name, textColor),
        price,
        occasions,
        seasons: WEATHERS.slice(),
        timesWorn,
        lastWorn: lastWornDays === null ? null : daysAgo(lastWornDays),
        created_at: daysAgo(60 - i)
    }));

    outfits = [];
    saveClothes();
    saveOutfits();
    renderCloset();
    renderStats();
    renderCalendar();
}