import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtYzKI4ta7gzeqWxSQ6FMEu8A427islUQ",
  authDomain: "caixasv1.firebaseapp.com",
  projectId: "caixasv1",
  storageBucket: "caixasv1.firebasestorage.app",
  messagingSenderId: "545325374379",
  appId: "1:545325374379:web:6d422f3e9af5f195df10ee",
  measurementId: "G-8K54YESCGD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const ADM = ["6266","4144","70029"];
const $ = (s)=>document.querySelector(s);
const byId = (id)=>document.getElementById(id);

function matriculaToEmail(m){ return `${m}@movebuss.local`; }
function toFloat(v){ const n = parseFloat(v); return isNaN(n)?0:n; }

// UI refs
const authSection = byId('authSection');
const appSection = byId('appSection');
const logoutBtn = byId('logoutBtn');
const loginBtn = byId('loginBtn');
const showRegister = byId('showRegister');
const cancelRegister = byId('cancelRegister');
const registerBtn = byId('registerBtn');
const adminControls = byId('adminControls');
const toggleCreateForm = byId('toggleCreateForm');
const createForm = byId('createForm');
const listaRelatorios = byId('listaRelatorios');
const userInfo = byId('userInfo');
const roleBadge = byId('roleBadge');
const btnResumo = byId('btnResumo');
const closeResumo = byId('closeResumo');
const resumoPanel = byId('resumoPanel');

// Modal Pós
const posModal = byId('posModal');
const posTexto = byId('posTexto');
const modalSalvar = byId('modalSalvar');
const modalFechar = byId('modalFechar');
const btnAnexar = byId('btnAnexar');
const btnVerAnexo = byId('btnVerAnexo');
const btnExcluirAnexo = byId('btnExcluirAnexo');
const fileInput = byId('fileInput');

// Form relatório
const dataCaixa = byId('dataCaixa');
const matRel = byId('matRel');
const valorFolha = byId('valorFolha');
const valorDinheiro = byId('valorDinheiro');
const sobraFalta = byId('sobraFalta');
const observacao = byId('observacao');

let CURRENT = { user:null, admin:false, matricula:null };

onAuthStateChanged(auth, async (user)=>{
  if(user){
    const matricula = user.email.split('@')[0];
    const admin = ADM.includes(matricula);
    CURRENT = { user, admin, matricula };

    // UI: toggle admin-only
    document.querySelectorAll('.btn-admin').forEach(el=>{
      el.classList.toggle('hidden', !admin);
    });
    adminControls.classList.toggle('hidden', !admin);

    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    userInfo.textContent = `Matrícula: ${matricula}`;
    roleBadge.textContent = admin ? 'ADMIN' : 'USUÁRIO';

    if(admin){
      loadRelatoriosAdmin();
    }else{
      loadRelatoriosUser(matricula);
    }
  }else{
    CURRENT = { user:null, admin:false, matricula:null };
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
});

// Login / Cadastro
loginBtn?.addEventListener('click', async ()=>{
  const m = byId('loginMatricula').value.trim();
  const s = byId('loginSenha').value.trim();
  if(!m||!s) return alert('Informe matrícula e senha.');
  try{ await signInWithEmailAndPassword(auth, matriculaToEmail(m), s); }
  catch(e){ alert('Erro no login: '+e.message); }
});

showRegister?.addEventListener('click', ()=> byId('registerCard').classList.toggle('hidden'));
cancelRegister?.addEventListener('click', ()=> byId('registerCard').classList.add('hidden'));
registerBtn?.addEventListener('click', async ()=>{
  const m = byId('regMatricula').value.trim();
  const n = byId('regNome').value.trim();
  const s = byId('regSenha').value.trim();
  if(!m||!n||!s) return alert('Preencha todos os campos.');
  try{
    const cred = await createUserWithEmailAndPassword(auth, matriculaToEmail(m), s);
    await setDoc(doc(db,'usuarios', cred.user.uid), { matricula:m, nome:n, isAdmin: ADM.includes(m) });
    alert('Usuário cadastrado! Faça login.');
    byId('registerCard').classList.add('hidden');
  }catch(e){ alert('Erro no cadastro: '+e.message); }
});

logoutBtn?.addEventListener('click', ()=> signOut(auth));

// Calcular sobra/falta
[dataCaixa, valorFolha, valorDinheiro].forEach(el=> el?.addEventListener('input', ()=>{
  const sf = toFloat(valorDinheiro.value) - toFloat(valorFolha.value);
  sobraFalta.value = sf.toFixed(2);
}));

// Salvar relatório (somente admin)
byId('saveRelatorio')?.addEventListener('click', async ()=>{
  if(!CURRENT.admin) return alert('Apenas admins podem criar relatórios.');
  const dataStr = dataCaixa.value; const mat = matRel.value.trim();
  if(!dataStr || !mat) return alert('Informe data e matrícula.');
  const payload = {
    data: dataStr,
    criadoEm: new Date().toLocaleString('pt-BR'),
    timestamp: serverTimestamp(),
    matricula: mat,
    valorFolha: toFloat(valorFolha.value),
    valorDinheiro: toFloat(valorDinheiro.value),
    sobraFalta: toFloat(valorDinheiro.value) - toFloat(valorFolha.value),
    observacao: (observacao.value||'').trim(),
    posTexto:'', posImgUrl:'', posEditado:false
  };
  try{
    await addDoc(collection(db,'relatorios'), payload);
    alert('Relatório salvo!');
    createForm.classList.add('hidden');
    loadRelatoriosAdmin();
  }catch(e){ alert('Erro ao salvar: '+e.message); }
});

// Toggle criar form
toggleCreateForm?.addEventListener('click', ()=>{
  if(!CURRENT.admin) return;
  createForm.classList.toggle('hidden');
});

// Listagens
async function loadRelatoriosUser(m){
  listaRelatorios.innerHTML='';
  const q = query(collection(db,'relatorios'), where('matricula','==', m), orderBy('timestamp','desc'));
  const snap = await getDocs(q);
  let count=0;
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const el = renderRelatorio(docSnap.id, d, false);
    if(count>=15){ el.querySelector('.kv').classList.add('hidden'); }
    listaRelatorios.appendChild(el);
    count++;
  });
  if(!snap.size) listaRelatorios.innerHTML='<div class="card">Nenhum relatório.</div>';
}

async function loadRelatoriosAdmin(filter=null){
  listaRelatorios.innerHTML='';
  let qBase = collection(db,'relatorios');
  if(filter){ qBase = query(qBase, where('matricula','==', filter), orderBy('timestamp','desc')); }
  else{ qBase = query(qBase, orderBy('timestamp','desc'), limit(20)); }
  const snap = await getDocs(qBase);
  snap.forEach(docSnap=> listaRelatorios.appendChild(renderRelatorio(docSnap.id, docSnap.data(), true)));
  if(!snap.size) listaRelatorios.innerHTML='<div class="card">Nenhum relatório.</div>';
}

// Resumo
byId('adminFilterMat')?.addEventListener('change', (e)=>{
  if(!CURRENT.admin) return;
  const v = e.target.value.trim();
  loadRelatoriosAdmin(v || null);
});
btnResumo?.addEventListener('click', async ()=>{
  if(!CURRENT.admin) return;
  const m = byId('adminFilterMat').value.trim();
  if(!m) return alert('Informe matrícula.');
  const q = query(collection(db,'relatorios'), where('matricula','==', m));
  const snap = await getDocs(q);
  let total=0, sobras=[], faltas=[];
  snap.forEach(s=>{
    const d = s.data(); total += (d.valorFolha||0);
    const sf = d.sobraFalta||0;
    if(sf>=0) sobras.push(`${d.data}: ${sf.toFixed(2)}`); else faltas.push(`${d.data}: ${sf.toFixed(2)}`);
  });
  $('#resumoPanel').classList.remove('hidden');
  $('#resumoContent').innerHTML = `
    <div class="kv">
      <div><b>Total do mês (folha):</b></div><div>R$ ${total.toFixed(2)}</div>
      <div><b>Dias com sobra:</b></div><div>${sobras.join('<br>')||'-'}</div>
      <div><b>Dias com falta:</b></div><div>${faltas.join('<br>')||'-'}</div>
    </div>`;
});
closeResumo?.addEventListener('click', ()=> resumoPanel.classList.add('hidden'));

// Render
function renderRelatorio(id, d, isAdmin){
  const wrap = document.createElement('div'); wrap.className='relatorio';
  wrap.innerHTML = `
    <div class="min-header">
      <div><b>${d.data}</b> ${d.posEditado ? '<span class="tag-warning">verificar pós conferência</span>':''}</div>
      <div class="row gap">
        <button class="btn btn-ghost toggle">Esconder/Exibir</button>
        ${isAdmin ? '<button class="btn btn-ghost btn-admin" data-edit>Editar relatório</button><button class="btn btn-ghost danger btn-admin" data-del>Excluir relatório</button>' : ''}
        <button class="btn btn-metal" data-pos>Pós conferência</button>
      </div>
    </div>
    <div class="kv">
      <div>Data/Hora criação:</div><div>${d.criadoEm||'-'}</div>
      <div>Matrícula:</div><div>${d.matricula}</div>
      <div>Valor folha:</div><div>R$ ${(d.valorFolha||0).toFixed(2)}</div>
      <div>Valor dinheiro:</div><div>R$ ${(d.valorDinheiro||0).toFixed(2)}</div>
      <div>Sobra/Falta:</div><div>R$ ${(d.sobraFalta||0).toFixed(2)}</div>
      <div>Observação:</div><div>${d.observacao||'-'}</div>
    </div>
  `;
  const kv = wrap.querySelector('.kv');
  wrap.querySelector('.toggle').addEventListener('click', ()=> kv.classList.toggle('hidden'));
  wrap.querySelector('[data-pos]').addEventListener('click', ()=> openPosModal(id, d, isAdmin));
  if(isAdmin){
    wrap.querySelector('[data-edit]')?.addEventListener('click', ()=> editRelatorio(id, d));
    wrap.querySelector('[data-del]')?.addEventListener('click', ()=> delRelatorio(id));
  }
  // Oculta botões admin se não for admin (defesa na UI)
  if(!CURRENT.admin){ wrap.querySelectorAll('.btn-admin').forEach(b=> b.classList.add('hidden')); }
  return wrap;
}

async function editRelatorio(id, d){
  if(!CURRENT.admin) return;
  createForm.classList.remove('hidden');
  dataCaixa.value = d.data||'';
  matRel.value = d.matricula||'';
  valorFolha.value = d.valorFolha||0;
  valorDinheiro.value = d.valorDinheiro||0;
  sobraFalta.value = (d.sobraFalta||0).toFixed(2);
  observacao.value = d.observacao||'';
  byId('saveRelatorio').onclick = async ()=>{
    try{
      await updateDoc(doc(db,'relatorios', id), {
        data: dataCaixa.value,
        matricula: matRel.value.trim(),
        valorFolha: toFloat(valorFolha.value),
        valorDinheiro: toFloat(valorDinheiro.value),
        sobraFalta: toFloat(valorDinheiro.value) - toFloat(valorFolha.value),
        observacao: observacao.value.trim()
      });
      alert('Relatório atualizado!');
      createForm.classList.add('hidden');
      loadRelatoriosAdmin();
    }catch(e){ alert('Erro ao atualizar: '+e.message); }
  };
}

async function delRelatorio(id){
  if(!CURRENT.admin) return;
  if(!confirm('Excluir este relatório?')) return;
  try{
    // Soft delete (mantém histórico; ajuste para deleteDoc se desejar remoção total)
    await updateDoc(doc(db,'relatorios', id), { deleted:true });
    alert('Relatório marcado como excluído.');
    loadRelatoriosAdmin();
  }catch(e){ alert('Erro ao excluir: '+e.message); }
}

// Pós Conferência
let POS_CTX = { id:null, data:null, isAdmin:false };
async function openPosModal(id, d, isAdmin){
  POS_CTX = { id, data:d, isAdmin };
  posModal.classList.remove('hidden');
  posTexto.value = d.posTexto || '';
  modalSalvar.classList.toggle('hidden', !isAdmin);
  btnAnexar.classList.toggle('hidden', !isAdmin);
  btnExcluirAnexo.classList.toggle('hidden', !isAdmin);
  const prev = document.getElementById('previewArea'); prev.innerHTML='';
  if(d.posImgUrl){ const img=document.createElement('img'); img.src=d.posImgUrl; img.alt='Anexo'; prev.appendChild(img); }
}
modalFechar.addEventListener('click', ()=> posModal.classList.add('hidden'));
modalSalvar.addEventListener('click', async ()=>{
  if(!POS_CTX.isAdmin) return;
  try{
    await updateDoc(doc(db,'relatorios', POS_CTX.id), { posTexto: posTexto.value, posEditado:true });
    alert('Pós conferência salva!');
    posModal.classList.add('hidden');
    CURRENT.admin ? loadRelatoriosAdmin() : loadRelatoriosUser(CURRENT.matricula);
  }catch(e){ alert('Erro ao salvar pós conferência: '+e.message); }
});
btnAnexar.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', async (e)=>{
  if(!POS_CTX.isAdmin) return;
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const r = ref(storage, `post_conferencia/${POS_CTX.id}/${file.name}`);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    await updateDoc(doc(db,'relatorios', POS_CTX.id), { posImgUrl:url, posEditado:true });
    openPosModal(POS_CTX.id, { ...POS_CTX.data, posImgUrl:url, posTexto:posTexto.value, posEditado:true }, true);
  }catch(e){ alert('Erro ao anexar: '+e.message); }
});
btnVerAnexo.addEventListener('click', ()=>{
  const img = document.querySelector('#previewArea img');
  const url = img ? img.src : (POS_CTX.data?.posImgUrl||'');
  if(!url) return alert('Sem imagem anexada.');
  window.open(url, '_blank');
});
btnExcluirAnexo.addEventListener('click', async ()=>{
  if(!POS_CTX.isAdmin) return;
  if(!POS_CTX.data?.posImgUrl) return alert('Sem imagem.');
  try{
    const path = POS_CTX.data.posImgUrl.split('/o/')[1].split('?')[0];
    const storagePath = decodeURIComponent(path);
    const r = ref(storage, storagePath);
    await deleteObject(r);
    await updateDoc(doc(db,'relatorios', POS_CTX.id), { posImgUrl:'', posEditado:true });
    alert('Imagem excluída.');
    posModal.classList.add('hidden');
    CURRENT.admin ? loadRelatoriosAdmin() : loadRelatoriosUser(CURRENT.matricula);
  }catch(e){ alert('Erro ao excluir imagem: '+e.message); }
});
