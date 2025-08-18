// Configuração Firebase (adicione a sua)
var firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Mostrar/ocultar telas
function showLogin() {
  document.getElementById("loginContainer").classList.remove("hidden");
  document.getElementById("registerContainer").classList.add("hidden");
  document.getElementById("mainContainer").classList.add("hidden");
}
function showRegister() {
  document.getElementById("loginContainer").classList.add("hidden");
  document.getElementById("registerContainer").classList.remove("hidden");
  document.getElementById("mainContainer").classList.add("hidden");
}
function showMain() {
  document.getElementById("loginContainer").classList.add("hidden");
  document.getElementById("registerContainer").classList.add("hidden");
  document.getElementById("mainContainer").classList.remove("hidden");
}

// Cadastro de usuário
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const matricula = document.getElementById("registerMatricula").value.trim();
  const nome = document.getElementById("registerNome").value.trim();
  const senha = document.getElementById("registerPassword").value;
  const email = `${matricula}@movebuss.local`; // sempre movebuss.local

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
    await db.collection("usuarios").doc(matricula).set({
      matricula,
      nome,
      email
    });
    alert("Usuário cadastrado com sucesso!");
    document.getElementById("registerForm").reset();
    showLogin();
  } catch (error) {
    alert("Erro no cadastro: " + error.message);
  }
});

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const matricula = document.getElementById("loginMatricula").value.trim();
  const senha = document.getElementById("loginPassword").value;
  const email = `${matricula}@movebuss.local`;
  try {
    await auth.signInWithEmailAndPassword(email, senha);
  } catch (error) {
    alert("Erro no login: " + error.message);
  }
});

// Estado de autenticação
auth.onAuthStateChanged(async (user) => {
  if (user) {
    showMain();
    carregarRelatorios();
  } else {
    showLogin();
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

// Criar relatório (somente admin)
document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const matricula = document.getElementById("relMatricula").value.trim();
  const descricao = document.getElementById("relDescricao").value.trim();
  try {
    await db.collection("relatorios").add({
      matricula,
      descricao,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Relatório salvo!");
    document.getElementById("reportForm").reset();
    carregarRelatorios();
  } catch (error) {
    alert("Erro ao salvar relatório: " + error.message);
  }
});

// Carregar relatórios
async function carregarRelatorios() {
  const container = document.getElementById("reportList");
  container.innerHTML = "";
  const snapshot = await db.collection("relatorios").orderBy("criadoEm","desc").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "relatorio";
    div.setAttribute("data-matricula", data.matricula);
    div.innerHTML = `<strong>${data.matricula}</strong>: ${data.descricao}`;
    container.appendChild(div);
  });
}

// Mostrar/ocultar telas de registro
document.getElementById("showRegister").addEventListener("click", showRegister);
document.getElementById("backToLogin").addEventListener("click", showLogin);

// Filtro de relatórios por matrícula
document.getElementById("adminFilterMat").addEventListener("input", (e) => {
  const termo = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".relatorio").forEach(card => {
    const mat = card.getAttribute("data-matricula")?.toLowerCase() || "";
    card.style.display = termo === "" || mat.includes(termo) ? "block" : "none";
  });
});
