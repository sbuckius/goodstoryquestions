// --- Configurable questions ---
const QUESTIONS = [
  "What makes a good story?",
  "What makes an interesting story?",
  "What makes a poignant story?",
  "What makes a meaningful, influential story?",
  "What makes a bad story?",
  "What makes for a broken story?",
  "What makes a sad story?",
  "What makes a suspenseful story?",
  "What makes a surprising and unexpected story?",
  "What makes an impactful, moving story?",
  "What makes an inspirational story?",
  "What makes a poetic story?",
  "What makes an encouraging, uplifting story?",
  "What makes a thought-provoking story that encourages a new perspective?",
  "What makes a funny story?",
  "What makes a charged, edgy story?"
];

// --- DOM refs ---
const sectionsEl = document.getElementById('sections');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const statusEl = document.getElementById('status');
const idlineEl = document.getElementById('idline');

let inputs = [];
let userId = localStorage.getItem('qa_user_id') || null;

function ensureUserId(){
  if(!userId){
    userId = crypto.randomUUID();
    localStorage.setItem('qa_user_id', userId);
  }
  idlineEl.textContent = `Local User ID: ${userId}`;
}
function setStatus(msg){
  statusEl.textContent = msg;
  if(msg) setTimeout(()=> statusEl.textContent='', 3500);
}

// Build the form
function buildUI(){
  ensureUserId();
  sectionsEl.innerHTML = '';
  inputs = [];
  QUESTIONS.forEach((q,i)=>{
    const wrap = document.createElement('div');
    wrap.className='section';
    const h = document.createElement('h3');
    h.textContent = `Section ${i+1}`;
    const p = document.createElement('p');
    p.className='q';
    p.textContent = q;
    const ta = document.createElement('textarea');
    ta.placeholder='Type your answer here...';
    wrap.append(h,p,ta);
    sectionsEl.appendChild(wrap);
    inputs.push(ta);
  });
}

function getAnswers(){ 
  return inputs.map((ta,i)=>({ index:i, question: QUESTIONS[i], answer: ta.value.trim() })); 
}
function setAnswers(answers){ 
  if(!answers) return; 
  answers.forEach(a=>{ if(inputs[a.index]) inputs[a.index].value = a.answer || ''; }); 
}
function resetAll(){ 
  inputs.forEach(ta => (ta.value = "")); 
  setStatus("Cleared."); 
}

function exportAnswers(){
  const lines = [];
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push(`User ID: ${userId}`);
  lines.push("");
  getAnswers().forEach((item, idx) => {
    lines.push(`Section ${idx+1}`);
    lines.push(`Q: ${item.question}`);
    lines.push(`A: ${item.answer || ''}`);
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url;
  a.download = `qa-export-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

// --- Firebase init (optional) ---
let firebaseAvailable = false, rtdb = null, auth = null;
(function tryInitFirebase(){
  try{
    if(typeof firebase === 'undefined') return;
const firebaseConfig = {

  apiKey: "AIzaSyCxCt0ar14LCmydlhF-VUmlb5JSlPvEYcs",

  authDomain: "questionanswersgoodstory.firebaseapp.com",

  projectId: "questionanswersgoodstory",

  storageBucket: "questionanswersgoodstory.firebasestorage.app",

  messagingSenderId: "55954176037",

  appId: "1:55954176037:web:f3f4d6392cd3f21b49a7cc",

  measurementId: "G-CGP40M5ERK"

};
    if(Object.values(firebaseConfig).some(v=> String(v).includes('YOUR_'))) return;
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    rtdb = firebase.database();
    firebaseAvailable = true;
  }catch(e){ console.warn('Firebase init skipped:', e); }
})();

async function saveAnswers(){
  if(!firebaseAvailable){ setStatus('Saved locally (Firebase not configured).'); return; }
  try{
    saveBtn.disabled = true;
    const payload = { userId, answers: getAnswers(), updatedAt: firebase.database.ServerValue.TIMESTAMP };
    await rtdb.ref('responses/' + userId).update(payload);
    setStatus('Saved! ✔️');
  }catch(err){ console.error(err); setStatus('Save failed.'); }
  finally{ saveBtn.disabled = false; }
}

async function loadLatest(){
  if(!firebaseAvailable) return;
  try{
    const snap = await rtdb.ref('responses/' + userId).get();
    if(snap.exists()){
      const data = snap.val();
      setAnswers(data.answers);
      if(data.updatedAt){ setStatus(`Loaded previous answers (${new Date(data.updatedAt).toLocaleString()})`); }
    }
  }catch(err){ console.error(err); }
}

// --- Boot ---
(function boot(){
  buildUI();
  resetBtn.addEventListener('click', resetAll);
  saveBtn.addEventListener('click', saveAnswers);
  exportBtn.addEventListener('click', exportAnswers);
  if(firebaseAvailable){
    auth.signInAnonymously().then(loadLatest).catch(e=>{ console.warn('Auth error:', e); });
  }
})();
