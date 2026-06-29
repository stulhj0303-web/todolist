import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigValid } from "./firebase-config.js";

const firebaseAvailable = isFirebaseConfigValid(firebaseConfig);
let app = null;
let auth = null;
let db = null;

if (firebaseAvailable) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    "Firebase 설정이 올바르지 않습니다. firebase-config.js 파일에서 실제 값을 입력해주세요.",
  );
}

const taskListEl = document.getElementById("task-list");
const totalCountEl = document.getElementById("total-count");
const doneCountEl = document.getElementById("done-count");
const todoCountEl = document.getElementById("todo-count");
const importantCountEl = document.getElementById("important-count");
const taskSummaryEl = document.getElementById("task-summary");
const activeFilterEl = document.getElementById("active-filter");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const taskTitle = document.getElementById("task-title");
const taskDue = document.getElementById("task-due");
const taskPriority = document.getElementById("task-priority");
const addTaskBtn = document.getElementById("add-task-btn");
const menuButtons = document.querySelectorAll(".menu-item");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const registerShell = document.getElementById("register-shell");
const registerName = document.getElementById("register-name");
const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerSubmitBtn = document.getElementById("register-submit-btn");
const registerCancelBtn = document.getElementById("register-cancel-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMessage = document.getElementById("auth-message");
const registerMessage = document.getElementById("register-message");
const userEmailEl = document.getElementById("user-email");
const userAvatarEl = document.getElementById("user-avatar");
const avatarBtn = document.getElementById("avatar-btn");
const avatarModal = document.getElementById("avatar-modal");
const avatarUrlInput = document.getElementById("avatar-url");
const saveAvatarBtn = document.getElementById("save-avatar-btn");
const closeAvatarBtn = document.getElementById("close-avatar-btn");
const authShell = document.querySelector(".auth-shell");
const appShell = document.querySelector(".app-shell");

let taskFilter = "all";
let tasks = [];
let unsubscribeTasks = null;
let currentUserId = null;

const formatTaskTimestamp = (timestamp) => {
  if (!timestamp) return 0;
  return typeof timestamp.toMillis === "function"
    ? timestamp.toMillis()
    : timestamp;
};

const getUserTasksQuery = (uid) =>
  query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));

function showAuth() {
  authShell.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  authShell.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function openAvatarModal() {
  avatarModal.classList.remove("hidden");
  avatarUrlInput.value = userAvatarEl.src.includes("avatar-default.svg")
    ? ""
    : userAvatarEl.src;
  avatarUrlInput.focus();
}

function closeAvatarModal() {
  avatarModal.classList.add("hidden");
}

function saveAvatar() {
  const url = avatarUrlInput.value.trim();
  if (url) {
    userAvatarEl.src = url;
  } else {
    userAvatarEl.src = "avatar-default.svg";
  }
  closeAvatarModal();
}

function showFirebaseSetupMessage() {
  setAuthMessage(
    "Firebase 설정이 필요합니다. firebase-config.js에 실제 값을 입력해주세요.",
    true,
  );
  registerMessage.textContent =
    "Firebase 설정이 없어서 회원가입을 할 수 없습니다.";
  registerMessage.style.color = "var(--danger)";
}

function requireFirebase() {
  if (!firebaseAvailable) {
    showFirebaseSetupMessage();
    return false;
  }
  return true;
}

function setAuthMessage(message, error = false) {
  authMessage.textContent = message;
  authMessage.style.color = error ? "var(--danger)" : "var(--muted)";
}

function renderTasks() {
  const queryText = searchInput.value.trim().toLowerCase();
  let visibleTasks = tasks.filter((task) => {
    const matchesFilter =
      taskFilter === "all" ||
      (taskFilter === "active" && !task.done) ||
      (taskFilter === "done" && task.done) ||
      (taskFilter === "important" && task.priority === "important");

    const matchesSearch = task.title.toLowerCase().includes(queryText);
    return matchesFilter && matchesSearch;
  });

  visibleTasks = visibleTasks.slice();
  if (sortSelect.value === "due") {
    visibleTasks.sort((a, b) => {
      const aDue = a.due || "9999-12-31";
      const bDue = b.due || "9999-12-31";
      return aDue.localeCompare(bDue);
    });
  } else if (sortSelect.value === "newest") {
    visibleTasks.sort(
      (a, b) =>
        formatTaskTimestamp(b.createdAt) - formatTaskTimestamp(a.createdAt),
    );
  } else if (sortSelect.value === "oldest") {
    visibleTasks.sort(
      (a, b) =>
        formatTaskTimestamp(a.createdAt) - formatTaskTimestamp(b.createdAt),
    );
  } else if (sortSelect.value === "important") {
    visibleTasks.sort((a, b) => {
      const aScore = a.priority === "important" ? 0 : 1;
      const bScore = b.priority === "important" ? 0 : 1;
      return aScore - bScore;
    });
  }

  taskListEl.innerHTML = visibleTasks
    .map((task) => {
      const badgeClass = task.priority === "important" ? "important" : "normal";
      const doneClass = task.done ? "done" : "";
      return `
        <li class="task-item ${task.priority === "important" ? "important" : ""}">
          <button class="small-btn done" data-action="toggle" data-id="${task.id}">${task.done ? "✔" : "○"}</button>
          <div class="task-info">
            <div class="task-title-row">
              <h4 class="${doneClass}">${task.title}</h4>
              <span class="task-badge ${badgeClass}">${task.priority === "important" ? "중요" : "일반"}</span>
            </div>
            <div class="task-meta">
              <span>${task.due}</span>
            </div>
          </div>
          <button class="small-btn delete" data-action="delete" data-id="${task.id}">✕</button>
        </li>`;
    })
    .join("");

  totalCountEl.textContent = tasks.length;
  doneCountEl.textContent = tasks.filter((task) => task.done).length;
  todoCountEl.textContent = tasks.filter((task) => !task.done).length;
  importantCountEl.textContent = tasks.filter(
    (task) => task.priority === "important" && !task.done,
  ).length;
  taskSummaryEl.textContent = `${visibleTasks.length}개 항목`;
}

function setFilter(filter, name) {
  taskFilter = filter;
  activeFilterEl.textContent = name;
  menuButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.textContent === name),
  );
  renderTasks();
}

async function subscribeTaskUpdates(uid) {
  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  const tasksQuery = getUserTasksQuery(uid);
  unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
    tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderTasks();
  });
}

async function addTask() {
  const title = taskTitle.value.trim();
  const due = taskDue.value || new Date().toISOString().split("T")[0];
  const priority = taskPriority.value;

  if (!title || !currentUserId) {
    taskTitle.focus();
    return;
  }

  await addDoc(collection(db, "users", currentUserId, "tasks"), {
    title,
    due,
    priority,
    done: false,
    createdAt: serverTimestamp(),
  });

  taskTitle.value = "";
  taskDue.value = "";
  taskPriority.value = "normal";
}

async function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || !currentUserId) return;
  const taskRef = doc(db, "users", currentUserId, "tasks", id);
  await updateDoc(taskRef, { done: !task.done });
}

async function deleteTask(id) {
  if (!currentUserId) return;
  const taskRef = doc(db, "users", currentUserId, "tasks", id);
  await deleteDoc(taskRef);
}

function showRegister() {
  registerMessage.textContent = "";
  authShell.classList.add("hidden");
  registerShell.classList.remove("hidden");
}

function hideRegister() {
  registerShell.classList.add("hidden");
  authShell.classList.remove("hidden");
  registerName.value = "";
  registerEmail.value = "";
  registerPassword.value = "";
  registerMessage.textContent = "";
}

async function handleRegister() {
  if (!requireFirebase()) return;

  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value.trim();

  if (!name || !email || !password) {
    registerMessage.textContent = "이름, 이메일, 비밀번호를 모두 입력해주세요.";
    registerMessage.style.color = "var(--danger)";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;
    if (user) {
      await updateProfile(user, { displayName: name });
    }

    registerMessage.textContent = "회원가입 성공! 로그인 창으로 돌아갑니다.";
    registerMessage.style.color = "var(--accent)";
    hideRegister();
    setAuthMessage("회원가입이 완료되었습니다. 등록한 정보로 로그인하세요.");
    loginEmail.value = email;
    loginPassword.value = "";
  } catch (error) {
    registerMessage.textContent =
      "회원가입에 실패했습니다. 다시 입력해주세요. " + error.message;
    registerMessage.style.color = "var(--danger)";
  }
}

async function handleLogin() {
  if (!requireFirebase()) return;

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    setAuthMessage("이메일과 비밀번호를 모두 입력해주세요.", true);
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;
    if (user) {
      currentUserId = user.uid;
      userEmailEl.textContent = (user.displayName || user.email) + "님";
      showApp();
      subscribeTaskUpdates(user.uid);
    }
    setAuthMessage("로그인 성공! 앱으로 이동합니다.");
  } catch (error) {
    setAuthMessage("로그인 실패: " + error.message, true);
  }
}

async function handleLogout() {
  await signOut(auth);
}

loginBtn.addEventListener("click", handleLogin);
registerBtn.addEventListener("click", showRegister);
registerSubmitBtn.addEventListener("click", handleRegister);
registerCancelBtn.addEventListener("click", hideRegister);
logoutBtn.addEventListener("click", handleLogout);
avatarBtn.addEventListener("click", openAvatarModal);
saveAvatarBtn.addEventListener("click", saveAvatar);
closeAvatarBtn.addEventListener("click", closeAvatarModal);
addTaskBtn.addEventListener("click", addTask);
searchInput.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);

taskListEl.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) return;

  if (action === "toggle") {
    toggleTask(id);
  }
  if (action === "delete") {
    deleteTask(id);
  }
});

menuButtons.forEach((button) => {
  const label = button.textContent.trim();
  button.addEventListener("click", () => {
    if (label === "전체") setFilter("all", "전체");
    if (label === "진행 중") setFilter("active", "진행 중");
    if (label === "완료") setFilter("done", "완료");
    if (label === "중요") setFilter("important", "중요");
  });
});

if (firebaseAvailable) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserId = user.uid;
      userEmailEl.textContent = (user.displayName || user.email) + "님";
      showApp();
      subscribeTaskUpdates(user.uid);
    } else {
      currentUserId = null;
      tasks = [];
      taskListEl.innerHTML = "";
      showAuth();
    }
  });
} else {
  showAuth();
  setAuthMessage(
    "Firebase 설정이 필요합니다. firebase-config.js에 실제 값을 입력해주세요.",
    true,
  );
}

setFilter("all", "전체");
