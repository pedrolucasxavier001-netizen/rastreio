const STORAGE_KEY = 'encomendas';
const PIN_KEY = 'admin-';
let encomendas = [];
let openId = null;
let adminPin = null;
let isAdmin = false;
let pinStep = null;
let pinFirstEntry = null;

const clientView = document.getElementById('client-view');
const adminView = document.getElementById('admin-view');
const formPanel = document.getElementById('form-panel');
const listEl = document.getElementById('list');
const emptyState = document.getElementById('empty-state');
const overlay = document.getElementById('pin-overlay');
const pinInput = document.getElementById('pin-input');
const pinTitle = document.getElementById('pin-title');
const pinDesc = document.getElementById('pin-desc');
const pinError = document.getElementById('pin-error');
const modeToggleBtn = document.getElementById('btn-mode-toggle');

function pad2(n){ return String(n).padStart(2, '0'); }
function localDateStr(d){
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}
function parseLocalDateStr(str){
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1]-1, parts[2]);
}
function esc(val){
  if(val === undefined || val === null) return '';
  return String(val).replace(/[&<>"]'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.getElementById('f-data').value = localDateStr(new Date());

document.querySelectorAll('#faq-list .faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    item.classList.toggle('open');
  });
});

modeToggleBtn.addEventListener('click', async () => {
  if(isAdmin){
    isAdmin = false;
    formPanel.classList.add('hidden');
    adminView.classList.add('hidden');
    clientView.classList.remove('hidden');
    modeToggleBtn.textContent = '🔒 Área administrativa';
  } else {
    modeToggleBtn.disabled = true;
    await loadEncomendas();
    modeToggleBtn.disabled = false;
    openPinFlow('enter-admin');
  }
});

function openPinFlow(intent){
  pinError.style.display = 'none';
  pinInput.value = '';
  if(adminPin === null){
    pinStep = 'create';
    pinFirstEntry = null;
    pinTitle.textContent = 'Definir PIN de acesso';
    pinDesc.textContent = 'Crie um PIN para proteger o painel administrativo. Só quem souber o PIN vê os totais e cadastra novas encomendas.';
  } else {
    pinStep = 'verify';
    pinTitle.textContent = 'Digite seu PIN';
    pinDesc.textContent = 'Acesso restrito ao administrador.';
  }
  overlay.dataset.intent = intent;
  overlay.classList.add('open');
  setTimeout(() => pinInput.focus(), 50);
}

document.getElementById('pin-cancel').addEventListener('click', () => {
  overlay.classList.remove('open');
});
document.getElementById('pin-confirm').addEventListener('click', handlePinConfirm);
pinInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handlePinConfirm(); });

async function handlePinConfirm(){
  const val = pinInput.value.trim();
  if(val.length < 4){
    pinError.textContent = 'Use um PIN com pelo menos 4 dígitos.';
    pinError.style.display = 'block';
    return;
  }
  if(pinStep === 'create'){
    if(pinFirstEntry === null){
      pinFirstEntry = val;
      pinInput.value = '';
      pinTitle.textContent = 'Confirme o PIN';
      pinDesc.textContent = 'Digite o mesmo PIN novamente para confirmar.';
      pinError.style.display = 'none';
      return;
    } else {
      if(val !== pinFirstEntry){
        pinError.textContent = 'Os PINs não coincidem. Tente novamente.';
        pinError.style.display = 'block';
        pinFirstEntry = null;
        pinInput.value = '';
        pinTitle.textContent = 'Definir PIN de acesso';
        return;
      }
      adminPin = val;
      await window.storage.set(PIN_KEY, adminPin, true);
      enterAdmin();
    }
  } else {
    if(val === adminPin){
      enterAdmin();
    } else {
      pinError.textContent = 'PIN incorreto. Tente novamente.';
      pinError.style.display = 'block';
      pinInput.value = '';
    }
  }
}

function enterAdmin(){
  overlay.classList.remove('open');
  isAdmin = true;
  clientView.classList.add('hidden');
  adminView.classList.remove('hidden');
  modeToggleBtn.textContent = 'Sair do modo administrador';
  render();
}

document.getElementById('btn-new').addEventListener('click', () => {
  formPanel.classList.toggle('hidden');
});
document.getElementById('btn-cancel').addEventListener('click', () => {
  formPanel.classList.add('hidden');
});

function genCode(){
  const n = Math.floor(1000 + Math.random()*9000);
  return 'BR' + n + '-SPMG-' + Math.floor(100 + Math.random()*900);
}

document.getElementById('btn-save').addEventListener('click', async () => {
  const destino = document.getElementById('f-destino').value.trim() || 'Itabira, MG';
  const dias = Math.max(1, Math.min(15, parseInt(document.getElementById('f-dias').value) || 4));
  const dataStr = document.getElementById('f-data').value;
  const dataInput = dataStr ? parseLocalDateStr(dataStr) : new Date();
  let codigo = document.getElementById('f-codigo').value.trim() || genCode();

  const novo = {
    id: Date.now().toString(),
    codigo,
    destino,
    dias,
    postDate: dataInput.toISOString(),
    remetente: document.getElementById('f-remetente').value.trim() || 'Não informado',
    destinatario: document.getElementById('f-destinatario').value.trim() || 'Não informado',
    telefone: document.getElementById('f-telefone').value.trim() || 'Não informado',
    servico: document.getElementById('f-servico').value,
    transportadora: document.getElementById('f-transportadora').value.trim() || 'Rota Direta Transportes',
    peso: document.getElementById('f-peso').value || '—',
    valor: document.getElementById('f-valor').value || '—',
    endereco: document.getElementById('f-endereco').value.trim() || 'Não informado',
    obs: document.getElementById('f-obs').value.trim() || 'Nenhuma'
  };

  encomendas.push(novo);
  await saveEncomendas();

  ['f-destino','f-codigo','f-remetente','f-destinatario','f-telefone','f-transportadora','f-peso','f-valor','f-endereco','f-obs']
    .forEach(id => { if(id !== 'f-destino' && id !== 'f-transportadora') document.getElementById(id).value = ''; });
  document.getElementById('f-destino').value = 'Itabira, MG';
  document.getElementById('f-transportadora').value = 'Rota Direta Transportes';
  document.getElementById('f-dias').value = '4';

  formPanel.classList.add('hidden');
  openId = novo.id;
  render();
});

async function saveEncomendas(){
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(encomendas), true);
  }catch(e){
    console.error('Falha ao salvar', e);
  }
}

async function loadEncomendas(){
  try{
    const result = await window.storage.get(STORAGE_KEY, true);
    encomendas = result ? JSON.parse(result.value) : [];
  }catch(e){
    encomendas = [];
  }
  try{
    const pinResult = await window.storage.get(PIN_KEY, true);
    adminPin = pinResult ? pinResult.value : null;
  }catch(e){
    adminPin = null;
  }
}

async function removeEncomenda(id){
  encomendas = encomendas.filter(e => e.id !== id);
  await saveEncomendas();
  render();
}

function buildStages(destino, dias){
  const stages = [];
  stages.push({label:'Pedido coletado', place:'São Paulo, SP'});
  for(let i=1; i<dias-1; i++){
    stages.push({label:'Em trânsito', place:'Rodovia rumo a ' + destino});
  }
  if(dias >= 2) stages.push({label:'Saiu para entrega', place: destino});
  stages.push({label:'Entregue', place: destino});
  return stages;
}

function fmtDate(d){
  return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
}

function computeStatus(enc){
  const today = new Date();
  today.setHours(0,0,0,0);
  const stages = buildStages(enc.destino, enc.dias);
  const postDate = new Date(enc.postDate);
  postDate.setHours(0,0,0,0);
  const msPerDay = 86400000;
  const diffDays = Math.floor((today - postDate) / msPerDay);
  const reachedEnd = diffDays >= enc.dias;
  const delivered = !!enc.liberada;
  const held = reachedEnd && !delivered;
  const lastIdx = stages.length - 1;
  const capIdx = Math.max(0, lastIdx - 1);
  const stageIdx = delivered ? lastIdx : Math.max(0, Math.min(capIdx, diffDays));
  let pct;
  if(delivered){
    pct = 100;
  } else if(held){
    pct = Math.max(85, Math.round((capIdx / lastIdx) * 100));
  } else {
    pct = Math.round((stageIdx / lastIdx) * 100);
  }
  return {stages, postDate, stageIdx, delivered, held, pct, msPerDay, lastIdx};
}

async function releaseEncomenda(id){
  const enc = encomendas.find(e => e.id === id);
  if(!enc) return;
  enc.liberada = true;
  enc.liberadaEm = new Date().toISOString();
  await saveEncomendas();
  render();
}

document.getElementById('btn-search').addEventListener('click', doSearch);
document.getElementById('search-code').addEventListener('keydown', (e) => { if(e.key === 'Enter') doSearch(); });

async function doSearch(){
  await loadEncomendas();
  const q = document.getElementById('search-code').value.trim().toUpperCase();
  const msg = document.getElementById('search-msg');
  const resultCard = document.getElementById('result-card');
  msg.style.display = 'none';
  resultCard.classList.remove('open');
  resultCard.innerHTML = '';

  if(!q){ return; }
  const enc = encomendas.find(e => e.codigo.toUpperCase() === q);
  if(!enc){
    msg.style.display = 'block';
    return;
  }

  const {stages, postDate, stageIdx, delivered, held, pct, msPerDay, lastIdx} = computeStatus(enc);

  resultCard.innerHTML = `
    <div class="card-top">
      <div>
        <div class="code">${esc(enc.codigo)}</div>
        <div class="route">São Paulo<span class="arrow">→</span>${esc(enc.destino)}</div>
      </div>
      <div class="status-pill ${delivered ? 'delivered' : (held ? 'held' : 'transit')}">
        ${delivered ? 'Entregue' : (held ? 'Mercadoria retida' : esc(stages[stageIdx].label))}
      </div>
    </div>
    <div class="progress-track">
      <div class="progress-fill ${delivered ? 'done' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="progress-meta">
      <span>Postado em ${fmtDate(postDate)}</span>
      <span>Destinatário: ${esc(enc.destinatario)}</span>
    </div>
    ${held ? `<div class="held-banner"><span class="ic">🔒</span><span>Sua encomenda está retida em análise. Nossa equipe entrará em contato em breve — se preferir, fale com o suporte informando o código ${esc(enc.codigo)}.</span></div>` : ''}
    <div class="timeline-title">Linha do tempo</div>
  `;

  stages.forEach((s, i) => {
    const date = new Date(postDate.getTime() + i*msPerDay);
    const isLast = i === lastIdx;
    const blocked = held && isLast;
    const done = !blocked && (i < stageIdx || delivered);
    const current = !blocked && i === stageIdx && !delivered;
    const label = blocked ? 'Mercadoria retida' : esc(s.label);
    const place = blocked ? 'Aguardando liberação' : esc(s.place);
    const row = document.createElement('div');
    row.className = 'stop';
    row.innerHTML = `
      <div class="stop-marker ${done ? 'done' : ''} ${current ? 'current' : ''} ${blocked ? 'blocked' : ''}"></div>
      <div class="stop-text">
        <div class="stop-label ${!(done||current||blocked) ? 'pending' : ''}">${label}</div>
        <div class="stop-place">${place}</div>
      </div>
      <div class="stop-date">${blocked ? '—' : fmtDate(date)}</div>
    `;
    resultCard.appendChild(row);
  });

  resultCard.classList.add('open');
}

function render(){
  listEl.innerHTML = '';
  emptyState.style.display = encomendas.length === 0 ? 'block' : 'none';

  let transitCount = 0;
  let deliveredCount = 0;
  let heldCount = 0;

  encomendas
    .slice()
    .sort((a,b) => new Date(b.postDate) - new Date(a.postDate))
    .forEach(enc => {
      const {stages, postDate, stageIdx, delivered, held, pct, msPerDay, lastIdx} = computeStatus(enc);
      if(delivered) deliveredCount++; else if(held) heldCount++; else transitCount++;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top">
          <div>
            <div class="code">${esc(enc.codigo)}</div>
            <div class="route">São Paulo<span class="arrow">→</span>${esc(enc.destino)}</div>
          </div>
          <div class="status-pill ${delivered ? 'delivered' : (held ? 'held' : 'transit')}">
            ${delivered ? 'Entregue' : (held ? 'Mercadoria retida' : esc(stages[stageIdx].label))}
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${delivered ? 'done' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="progress-meta">
          <span>Postado em ${fmtDate(postDate)}</span>
          <span>Destinatário: ${esc(enc.destinatario)}</span>
          <span>Prazo: ${enc.dias} dia${enc.dias > 1 ? 's' : ''}</span>
        </div>
        <div class="detail ${openId === enc.id ? 'open' : ''}" id="detail-${enc.id}"></div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
          <span></span>
          <div style="display:flex;gap:8px;">
            ${held ? `<button class="release" data-release="${enc.id}">🔓 Liberar mercadoria</button>` : ''}
            <button class="small-danger" data-remove="${enc.id}">Remover</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if(e.target.closest('[data-remove]') || e.target.closest('[data-release]')) return;
        openId = openId === enc.id ? null : enc.id;
        render();
      });

      listEl.appendChild(card);

      const detailEl = card.querySelector(`#detail-${enc.id}`);
      if(openId === enc.id){
        const info = document.createElement('div');
        info.className = 'info-grid';
        info.innerHTML = `
          <div class="info-item"><div class="k">Remetente</div><div class="v">${esc(enc.remetente)}</div></div>
          <div class="info-item"><div class="k">Destinatário</div><div class="v">${esc(enc.destinatario)}</div></div>
          <div class="info-item"><div class="k">Telefone</div><div class="v">${esc(enc.telefone)}</div></div>
          <div class="info-item"><div class="k">Serviço</div><div class="v">${esc(enc.servico)}</div></div>
          <div class="info-item"><div class="k">Transportadora</div><div class="v">${esc(enc.transportadora)}</div></div>
          <div class="info-item"><div class="k">Peso</div><div class="v">${enc.peso !== '—' ? esc(enc.peso) + ' kg' : '—'}</div></div>
          <div class="info-item"><div class="k">Valor declarado</div><div class="v">${enc.valor !== '—' ? 'R$ ' + esc(enc.valor) : '—'}</div></div>
          <div class="info-item full"><div class="k">Endereço de entrega</div><div class="v">${esc(enc.endereco)}</div></div>
          <div class="info-item full"><div class="k">Observações</div><div class="v">${esc(enc.obs)}</div></div>
        `;
        detailEl.appendChild(info);

        if(held){
          const banner = document.createElement('div');
          banner.className = 'held-banner';
          banner.innerHTML = `<span class="ic">🔒</span><span>Esta encomenda chegou ao prazo final e está retida aguardando liberação manual. Use o botão "Liberar mercadoria" para marcá-la como entregue.</span>`;
          detailEl.appendChild(banner);
        }

        stages.forEach((s, i) => {
          const date = new Date(postDate.getTime() + i*msPerDay);
          const isLast = i === lastIdx;
          const blocked = held && isLast;
          const done = !blocked && (i < stageIdx || delivered);
          const current = !blocked && i === stageIdx && !delivered;
          const label = blocked ? 'Mercadoria retida' : esc(s.label);
          const place = blocked ? 'Aguardando liberação' : esc(s.place);
          const row = document.createElement('div');
          row.className = 'stop';
          row.innerHTML = `
            <div class="stop-marker ${done ? 'done' : ''} ${current ? 'current' : ''} ${blocked ? 'blocked' : ''}"></div>
            <div class="stop-text">
              <div class="stop-label ${!(done||current||blocked) ? 'pending' : ''}">${label}</div>
              <div class="stop-place">${place}</div>
            </div>
            <div class="stop-date">${blocked ? '—' : fmtDate(date)}</div>
          `;
          detailEl.appendChild(row);
        });
      }

      const removeBtn = card.querySelector('[data-remove]');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEncomenda(enc.id);
      });

      const releaseBtn = card.querySelector('[data-release]');
      if(releaseBtn){
        releaseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          releaseEncomenda(enc.id);
        });
      }
    });

  document.getElementById('stat-total').textContent = encomendas.length;
  document.getElementById('stat-transit').textContent = transitCount;
  document.getElementById('stat-delivered').textContent = deliveredCount;
}

loadEncomendas();
