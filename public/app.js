// ==== Firebase Config ====
var firebaseConfig = {
  apiKey: "AIzaSyDtYzKI4ta7gzeqWxSQ6FMEu8A427islUQ",
  authDomain: "caixasv1.firebaseapp.com",
  projectId: "caixasv1",
  storageBucket: "caixasv1.firebasestorage.app",
  messagingSenderId: "545325374379",
  appId: "1:545325374379:web:6d422f3e9af5f195df10ee",
  measurementId: "G-8K54YESCGD"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ==== Helpers ====
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);
const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL'}).format(Number(n||0));
const isAdminMat = (mat) => ["6266","4144","70029"].includes(mat);
const emailFromMat = (m) => `${m}@movebuss.local`;

// Inputs
const inLoginMat = qs("#loginMatricula");
const inLoginPwd = qs("#loginSenha");
const inRegMat = qs("#regMatricula");
const inRegNome = qs("#regNome");
const inRegPwd = qs("#regSenha");

// Views
const authView = qs("#authView");
const appView = qs("#appView");
const adminControls = qs("#adminControls");
const formCard = qs("#formCard");
const resumoPanel = qs("#resumoPanel");

// ==== Auth UI ====
qs("#btnShowRegister").addEventListener("click", ()=>{
  qs("#registerCard").classList.remove("hidden");
});
qs("#btnCancelRegister").addEventListener("click", ()=>{
  qs("#registerCard").classList.add("hidden");
});

qs("#btnLogin").addEventListener("click", async ()=>{
  const mat = inLoginMat.value.trim();
  const pwd = inLoginPwd.value;
  if(!mat || !pwd){ alert("Informe matrícula e senha"); return; }
  const email = emailFromMat(mat);
  try {
    await auth.signInWithEmailAndPassword(email, pwd);
  } catch(err){
    alert("Erro no login: "+err.message);
  }
});

qs("#btnLogout").addEventListener("click", ()=> auth.signOut());

qs("#btnRegister").addEventListener("click", async ()=>{
  const mat = inRegMat.value.trim();
  const nome = inRegNome.value.trim();
  const pwd = inRegPwd.value;
  const email = emailFromMat(mat);
  if(!mat || !nome || !pwd){ alert("Preencha matrícula, nome e senha"); return; }
  try {
    // cria usuário no Auth
    await auth.createUserWithEmailAndPassword(email, pwd).catch(e=>{ throw e; });
    // cria/atualiza doc do usuário (permite self-create)
    await db.collection("usuarios").doc(mat).set({
      matricula: mat,
      nome: nome,
      email: email,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    alert("Usuário cadastrado!");
    qs("#registerCard").classList.add("hidden");
  } catch(err){
    alert("Erro no cadastro: "+err.message);
  }
});

// ==== State ====
let currentUser = null;
let currentMat = null;
let currentIsAdmin = false;

auth.onAuthStateChanged(async (u)=>{
  if(u){
    currentUser = u;
    currentMat = (u.email || "").split("@")[0];
    currentIsAdmin = isAdminMat(currentMat);
    qs("#userInfo").textContent = `Matrícula: ${currentMat}`;
    qs("#roleBadge").textContent = currentIsAdmin ? "ADMIN" : "USUÁRIO";

    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    qs("#btnLogout").classList.remove("hidden");
    if(currentIsAdmin) adminControls.classList.remove("hidden"); else adminControls.classList.add("hidden");

    initApp();
  } else {
    currentUser = null;
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
    qs("#btnLogout").classList.add("hidden");
  }
});

// ==== App Logic ====
function initApp(){
  // Datas padrão BR
  const hoje = new Date();
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth()+1).padStart(2,'0');
  const dd = String(hoje.getDate()).padStart(2,'0');
  qs("#dataCaixa").value = `${yyyy}-${mm}-${dd}`;

  // Eventos admin
  qs("#btnToggleForm").onclick = ()=> formCard.classList.toggle("hidden");
  qs("#btnResumo").onclick = ()=> resumoPanel.classList.toggle("hidden");
  qs("#btnCloseResumo").onclick = ()=> resumoPanel.classList.add("hidden");

  // Cálculo sobra/falta
  const calc = ()=>{
    const vf = parseFloat(qs("#valorFolha").value||0);
    const vd = parseFloat(qs("#valorDinheiro").value||0);
    qs("#sobraFalta").value = (vd - vf).toFixed(2);
  };
  ["valorFolha","valorDinheiro"].forEach(id=> qs("#"+id).addEventListener("input", calc));

  // Salvar relatório (ADMIN)
  qs("#btnSalvarRel").onclick = async ()=>{
    if(!currentIsAdmin){ alert("Apenas admins podem salvar relatórios."); return; }
    const dataCaixa = qs("#dataCaixa").value;
    const matricula = qs("#matRel").value.trim();
    const valorFolha = parseFloat(qs("#valorFolha").value||0);
    const valorDinheiro = parseFloat(qs("#valorDinheiro").value||0);
    const sobraFalta = parseFloat(qs("#sobraFalta").value||0);
    const observacao = qs("#observacao").value.trim();

    if(!dataCaixa || !matricula){ alert("Informe data do caixa e matrícula."); return; }

    try {
      await db.collection("relatorios").add({
        dataCaixa,
        matricula,
        valorFolha,
        valorDinheiro,
        sobraFalta,
        observacao,
        posConferencia: "",
        posConferenciaEditadoEm: null,
        temPosConferencia: false,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert("Relatório salvo!");
      loadRelatorios();
    } catch(err){
      alert("Erro ao salvar relatório: "+err.message);
    }
  };

  // Filtro admin por matrícula (client-side)
  qs("#adminFilterMat").addEventListener("input", (e)=>{
    const termo = e.target.value.trim().toLowerCase();
    qsa(".relatorio").forEach(card=>{
      const mat = (card.getAttribute("data-matricula")||"").toLowerCase();
      card.style.display = (!termo || mat.includes(termo)) ? "block" : "none";
    });
  });

  loadRelatorios();
}

// Carregar relatórios (admins veem todos; usuários veem só os próprios, últimos 15 expandidos)
async function loadRelatorios(){
  const list = qs("#listaRelatorios");
  list.innerHTML = "";

  let q = db.collection("relatorios").orderBy("criadoEm","desc");
  if(!currentIsAdmin){
    q = q.where("matricula","==", currentMat).orderBy("criadoEm","desc");
  }
  const snap = await q.get();
  let count = 0;
  snap.forEach(doc=>{
    const d = doc.data();
    const id = doc.id;
    const isOwner = d.matricula === currentMat;
    if(!currentIsAdmin && !isOwner) return;

    count++;
    const showExpanded = currentIsAdmin ? (count<=20) : (count<=15);

    const wrapper = document.createElement("div");
    wrapper.className = "relatorio";
    wrapper.setAttribute("data-matricula", d.matricula);

    const header = document.createElement("div");
    header.className = "min-header";
    const dataLabel = d.dataCaixa || "-";
    const posFlag = d.temPosConferencia ? '<span class="tag-warning">verificar pós conferência</span>' : "";
    header.innerHTML = `<strong>${dataLabel} — ${d.matricula}</strong> ${posFlag}`;

    const btns = document.createElement("div");
    const btnToggle = document.createElement("button");
    btnToggle.className = "btn btn-ghost";
    btnToggle.textContent = showExpanded ? "Esconder" : "Exibir";

    const btnPos = document.createElement("button");
    btnPos.className = "btn btn-metal";
    btnPos.textContent = "Pós conferência";
    btnPos.onclick = ()=> openPosModal(id, d);

    btns.appendChild(btnToggle);
    btns.appendChild(btnPos);

    if(currentIsAdmin){
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-metal";
      btnEdit.textContent = "Editar relatório";
      btnEdit.onclick = ()=> fillFormForEdit(id, d);

      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-ghost danger";
      btnDel.textContent = "Excluir relatório";
      btnDel.onclick = ()=> deleteRelatorio(id);

      btns.appendChild(btnEdit);
      btns.appendChild(btnDel);
    }

    header.appendChild(btns);

    const body = document.createElement("div");
    body.className = "kv";
    body.innerHTML = `
      <div>Data do caixa:</div><div>${d.dataCaixa || "-"}</div>
      <div>Valor folha:</div><div>${fmtBRL(d.valorFolha)}</div>
      <div>Valor em dinheiro:</div><div>${fmtBRL(d.valorDinheiro)}</div>
      <div>Sobra/Falta:</div><div>${fmtBRL(d.sobraFalta)}</div>
      <div>Observação:</div><div>${d.observacao || "-"}</div>
    `;
    if(!showExpanded) body.classList.add("hidden");

    btnToggle.onclick = ()=>{
      const hidden = body.classList.toggle("hidden");
      btnToggle.textContent = hidden ? "Exibir" : "Esconder";
    };

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    list.appendChild(wrapper);
  });
}

// Preencher form para editar (admin)
function fillFormForEdit(id, d){
  formCard.classList.remove("hidden");
  qs("#dataCaixa").value = d.dataCaixa || "";
  qs("#matRel").value = d.matricula || "";
  qs("#valorFolha").value = d.valorFolha || 0;
  qs("#valorDinheiro").value = d.valorDinheiro || 0;
  qs("#sobraFalta").value = (d.sobraFalta||0).toFixed(2);
  qs("#observacao").value = d.observacao || "";

  // Salvar atualização
  qs("#btnSalvarRel").onclick = async ()=>{
    if(!currentIsAdmin){ alert("Apenas admins podem salvar relatórios."); return; }
    try{
      await db.collection("relatorios").doc(id).update({
        dataCaixa: qs("#dataCaixa").value,
        matricula: qs("#matRel").value.trim(),
        valorFolha: parseFloat(qs("#valorFolha").value||0),
        valorDinheiro: parseFloat(qs("#valorDinheiro").value||0),
        sobraFalta: parseFloat(qs("#sobraFalta").value||0),
        observacao: qs("#observacao").value.trim()
      });
      alert("Relatório atualizado!");
      // restaurar ação padrão (create)
      initApp();
      loadRelatorios();
    }catch(err){
      alert("Erro ao atualizar: "+err.message);
    }
  };
}

// Excluir (admin)
async function deleteRelatorio(id){
  if(!currentIsAdmin){ alert("Apenas admins."); return; }
  if(!confirm("Confirma excluir?")) return;
  try{
    await db.collection("relatorios").doc(id).delete();
    loadRelatorios();
  }catch(err){
    alert("Erro ao excluir: "+err.message);
  }
}

// ==== Pós Conferência ====
let posCurrentId = null;
function openPosModal(id, d){
  posCurrentId = id;
  const isAdmin = currentIsAdmin;
  qs("#posModal").classList.remove("hidden");
  qs("#posTexto").value = d.posConferencia || "";
  qs("#modalSalvar").classList.toggle("hidden", !isAdmin);
  qs("#btnAnexar").classList.toggle("hidden", !isAdmin);
  qs("#btnExcluirAnexo").classList.toggle("hidden", !isAdmin);

  qs("#modalFechar").onclick = ()=> qs("#posModal").classList.add("hidden");
  qs("#btnAnexar").onclick = ()=> qs("#fileInput").click();
  qs("#fileInput").onchange = uploadAnexo;
  qs("#btnVerAnexo").onclick = ()=> viewAnexo(id);
  qs("#btnExcluirAnexo").onclick = ()=> deleteAnexo(id);

  qs("#modalSalvar").onclick = async ()=>{
    if(!currentIsAdmin){ return; }
    try{
      await db.collection("relatorios").doc(id).update({
        posConferencia: qs("#posTexto").value,
        posConferenciaEditadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        temPosConferencia: true
      });
      alert("Pós conferência salva!");
      qs("#posModal").classList.add("hidden");
      loadRelatorios();
    }catch(err){
      alert("Erro ao salvar pós conferência: "+err.message);
    }
  };
}

async function uploadAnexo(e){
  const file = e.target.files[0];
  if(!file || !posCurrentId) return;
  try{
    const ref = storage.ref().child(`anexos/${posCurrentId}/${file.name}`);
    await ref.put(file);
    alert("Imagem anexada!");
  }catch(err){
    alert("Erro no upload: "+err.message);
  }
}

async function viewAnexo(id){
  try{
    const listRef = storage.ref().child(`anexos/${id}`);
    const res = await listRef.listAll();
    if(res.items.length===0){ alert("Sem imagem anexada."); return; }
    const url = await res.items[0].getDownloadURL();
    const prev = qs("#previewArea");
    prev.innerHTML = `<img src="${url}" alt="anexo">`;
  }catch(err){
    alert("Erro ao visualizar: "+err.message);
  }
}

async function deleteAnexo(id){
  if(!currentIsAdmin) return;
  try{
    const listRef = storage.ref().child(`anexos/${id}`);
    const res = await listRef.listAll();
    await Promise.all(res.items.map(item=>item.delete()));
    alert("Imagem(s) excluída(s).");
    qs("#previewArea").innerHTML = "";
  }catch(err){
    alert("Erro ao excluir: "+err.message);
  }
}
