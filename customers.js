import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpH2obY_UOwSDen64Q0HvX4q4BJIKwVMI",
  authDomain: "ahmd4erb-8c507.firebaseapp.com",
  projectId: "ahmd4erb-8c507",
  storageBucket: "ahmd4erb-8c507.firebasestorage.app",
  messagingSenderId: "815193144806",
  appId: "1:815193144806:web:cdc9e67059a8e3acb6ea27",
  measurementId: "G-9JFE9P25RR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CUSTOMERS_COLLECTION = 'asgate_customers_cloud';
const LOGS_COLLECTION = 'asgate_customers_logs_cloud';

const tableBody = document.getElementById('tableBody');
const logsBody = document.getElementById('activityList'); 
const totalCustomers = document.getElementById('stat-total'); 
const monthCustomers = document.getElementById('stat-month'); 
const todayCustomers = document.getElementById('stat-today'); 
const searchInput = document.getElementById('searchInput');

let searchTimeout;
let cachedCustomers = [];
let cachedLogs = [];

async function getCustomers() {
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    cachedCustomers = [];
    querySnapshot.forEach((docSnap) => {
      cachedCustomers.push({ id: docSnap.id, ...docSnap.data() });
    });
    return cachedCustomers;
  } catch (error) {
    console.error("Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¬Ù„Ø¨ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©: ", error);
    return cachedCustomers;
  }
}

async function getLogs() {
  try {
    const q = query(collection(db, LOGS_COLLECTION));
    const querySnapshot = await getDocs(q);
    cachedLogs = [];
    querySnapshot.forEach((docSnap) => {
      cachedLogs.push({ id: docSnap.id, ...docSnap.data() });
    });
    return cachedLogs;
  } catch (error) {
    console.error("Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¬Ù„Ø¨ Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø· Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©: ", error);
    return cachedLogs;
  }
}

function normalizeText(v) {
  return String(v || '').toLowerCase().trim();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function badgeClass(status) {
  const s = normalizeText(status);
  if (s.includes('Ø¬Ø¯ÙŠØ¯') || s.includes('Ù…ÙØªÙˆØ­')) return 'status-active';
  if (s.includes('Ù†Ø´Ø·') || s.includes('Ù…ÙƒØªÙ…Ù„') || s.includes('ØªÙ…')) return 'status-active';
  if (s.includes('Ù…ØªØ§Ø¨Ø¹Ø©')) return 'status-med';
  if (s.includes('Ù…ØºÙ„Ù‚') || s.includes('Ù…Ù„ØºÙŠ')) return 'status-inactive';
  return 'status-small';
}

function classBadgeColor(classification) {
  const c = normalizeText(classification);
  if (c.includes('Ø­ÙƒÙˆÙ…ÙŠ')) return 'status-gov';
  if (c.includes('Ù‡Ø§Ù…')) return 'status-important';
  if (c.includes('Ù…ØªÙˆØ³Ø·')) return 'status-med';
  if (c.includes('ØµØºÙŠØ±')) return 'status-small';
  return 'status-small';
}

function safe(value, fallback = '-') {
  const val = value && String(value).trim() ? String(value).trim() : fallback;
  return escapeHTML(val);
}

function getDisplayManager(v) {
  if (v.delegatePriority && v.delegateName) return safe(v.delegateName);
  return safe(v.mgr);
}

function getDisplayMobile(v) {
  if (v.delegatePriority && v.delegateMob) return safe(v.delegateMob);
  return safe(v.mob);
}

function getDisplayEmail(v) {
  if (v.delegatePriority && v.delegateEmail) return safe(v.delegateEmail);
  return safe(v.email);
}

function getFullDateString() {
    const d = new Date();
    const days = ['Ø§Ù„Ø£Ø­Ø¯', 'Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†', 'Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡', 'Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡', 'Ø§Ù„Ø®Ù…ÙŠØ³', 'Ø§Ù„Ø¬Ù…Ø¹Ø©', 'Ø§Ù„Ø³Ø¨Øª'];
    const dayName = days[d.getDay()];
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${dayName} ${dateStr} ${timeStr}`;
}


function renderCustomers(list) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:28px;color:#6b7280;">لا توجد بيانات لعرضها</td></tr>`;
    return;
  }

  list.forEach((v, index) => {
    const classification = safe(v.classification || v.source || 'غير محدد');
    const tr = document.createElement('tr');
    tr.className = 'main-row';
    
    let notesArray = [];
    try {
        if (v.notes && typeof v.notes === 'string') {
            const parsed = JSON.parse(v.notes);
            if (Array.isArray(parsed)) notesArray = parsed;
        } else if (v.notes && Array.isArray(v.notes)) {
            notesArray = v.notes;
        } else if (v.notesHistory && Array.isArray(v.notesHistory)) {
            notesArray = v.notesHistory.map(n => ({
                user: v.owner || 'المستخدم',
                date: n.date || getTodayFormatted(),
                time: n.time || '',
                text: n.text || ''
            }));
        } else if (v.notesText) {
            notesArray = [{ user: v.owner || 'المستخدم', date: v.creationDate || v.date || getTodayFormatted(), time: '', text: v.notesText }];
        }
    } catch(e) { notesArray = []; }

    const notesJsonStr = JSON.stringify(notesArray).replace(/'/g, "&#39;");
    const lastNote = getLastNoteOnlyFromJSON(JSON.stringify(notesArray));

    tr.innerHTML = `
      <td><input type="checkbox" class="select-check" data-id="${v.id}" data-index="${index}"></td>
      <td><a href="#" onclick="event.preventDefault(); window.location.href='customer-details.html?code=${v.code}'" class="code-link">${safe(v.code, '00001')}</a></td>
      <td><strong>${safe(v.comp)}</strong></td>
      <td>${safe(v.cr || v.cr1 || v.cr2 || '-')}</td>
      <td>${safe(v.address || v.city)}</td>
      <td>${getDisplayManager(v)}</td>
      <td>
        <div class="phone-cell-container">
           ${getDisplayMobile(v)}
           <a href="https://wa.me/${getDisplayMobile(v).replace(/\D/g,'')}" target="_blank" class="whatsapp-icon-btn" title="مراسلة واتساب" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i></a>
        </div>
      </td>
      <td>${getDisplayEmail(v)}</td>
      <td>${safe(v.creationDate || v.date)}</td>
      <td><span class="${classBadgeColor(classification)}" style="padding: 2px 8px; border-radius: 4px;">${classification}</span></td>
      <td><div class="notes-preview" data-full-notes='${notesJsonStr}' data-id="${v.id}" data-owner="${safe(v.owner)}" onclick="openNote(this); event.stopPropagation()">${safe(lastNote)}</div></td>
      <td><span class="${badgeClass(v.status)}" style="padding: 2px 8px; border-radius: 4px;">${safe(v.status, 'جديد')}</span></td>
      <td>${safe(v.owner)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

function getLastNoteOnlyFromJSON(jsonStr) { 
    try { 
        const arr = JSON.parse(jsonStr); 
        if(arr.length > 0) {
            const last = arr[arr.length - 1];
            return last.text ? (last.text.length > 30 ? last.text.substring(0,30)+'...' : last.text) : "مرفق";
        }
        return "أضف ملاحظة..."; 
    } catch(e) { return "أضف ملاحظة..."; } 
}

function renderLogs(list)
 {
  if (!logsBody) return;
  logsBody.innerHTML = '';

  if (!list.length) {
    logsBody.innerHTML = `<div style="text-align:center;padding:28px;color:#6b7280;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„ Ù†Ø´Ø§Ø· Ø¨Ø¹Ø¯</div>`;
    return;
  }

  list.slice(0, 20).forEach(log => {
    logsBody.innerHTML += `
      <div class="log-entry">
        <span class="log-badge-user"><i class="fas fa-user"></i> ${safe(log.user || 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…')}</span>
        <span class="log-divider">|</span>
        <span class="log-timestamp"><i class="far fa-clock"></i> ${safe(log.date)}</span>
        <span class="log-divider">|</span>
        <span class="log-action">${safe(log.action)}</span>
      </div>
    `;
  });
}

function updateStats(list) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const today = now.toISOString().slice(0, 10);

  if(totalCustomers) totalCustomers.textContent = list.length;
  if(monthCustomers) monthCustomers.textContent = list.filter(v => {
    const dStr = v.creationDate || v.date || '';
    if(dStr.includes('/')) {
        const parts = dStr.split('/');
        return parseInt(parts[1])-1 === thisMonth && parseInt(parts[2]) === thisYear;
    }
    const d = new Date(dStr);
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  
  if(todayCustomers) todayCustomers.textContent = list.filter(v => {
    const d = String(v.creationDate || v.date || '');
    return d.includes(today) || d.includes(`${now.getDate()}`) || d.includes(`${now.getMonth() + 1}`);
  }).length;
}

function debouncedFilterTable() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = normalizeText(searchInput.value);
    const filtered = cachedCustomers.filter(v => {
      const haystack = [
        v.code, v.comp, v.address, v.city, v.mgr, v.delegateName,
        v.mob, v.delegateMob, v.email, v.delegateEmail, v.status,
        v.owner, v.classification, v.notesText, v.lastNote
      ].map(normalizeText).join(' ');
      return haystack.includes(q);
    });
    renderCustomers(filtered);
  }, 300);
}

async function openAddCustomerModal() {
  document.getElementById('addCustomerModal').style.display = 'flex';
  
  const customers = await getCustomers();
  let nextNum = 1;
  if (customers.length > 0) {
      const codes = customers.map(c => {
          const match = c.code ? c.code.match(/\d+/) : null;
          return match ? parseInt(match[0], 10) : 0;
      });
      nextNum = Math.max(...codes) + 1;
  }
  const code = 'CUST-' + String(nextNum).padStart(5, '0');
  document.getElementById('addCode').value = code;
  
  const d = new Date();
  const todayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  document.getElementById('addDate').value = todayStr;
  
  ['addComp', 'addCity', 'addAddress', 'addMainCR', 'addSubCR', 'addManager', 'addMob', 'addEmail', 'addCreator'].forEach(id => {
     document.getElementById(id).value = '';
  });
}

function closeAddCustomerModal() {
  document.getElementById('addCustomerModal').style.display = 'none';
}

async function saveNewCustomer() {
  const comp = document.getElementById('addComp').value;
  if(!comp.trim()) {
    Swal.fire('ØªÙ†Ø¨ÙŠÙ‡', 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©', 'warning');
    return;
  }

  const newCust = {
    code: document.getElementById('addCode').value,
    date: document.getElementById('addDate').value,
    creationDate: document.getElementById('addDate').value,
    comp: comp,
    city: document.getElementById('addCity').value,
    address: document.getElementById('addAddress').value,
    cr: document.getElementById('addMainCR').value,
    cr1: document.getElementById('addMainCR').value,
    cr2: document.getElementById('addSubCR').value,
    mgr: document.getElementById('addManager').value,
    mob: document.getElementById('addMob').value,
    email: document.getElementById('addEmail').value,
    owner: document.getElementById('addCreator').value,
    status: 'Ø¬Ø¯ÙŠØ¯',
    classification: 'ØµØºÙŠØ±',
    notesText: '',
    notesHistory: []
  };

  try {
    await addDoc(collection(db, CUSTOMERS_COLLECTION), newCust);
    
    const creator = document.getElementById('addCreator').value || 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…';
    const newLog = {
      user: creator,
      date: getFullDateString(),
      action: `Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯ Ø¨Ø±Ù‚Ù… ${newCust.code} ( ${newCust.comp} )`
    };
    await addDoc(collection(db, LOGS_COLLECTION), newLog);

    closeAddCustomerModal();
    
    cachedCustomers = await getCustomers();
    cachedLogs = await getLogs();
    
    updateStats(cachedCustomers);
    renderCustomers(cachedCustomers);
    renderLogs(cachedLogs);

    Swal.fire('Ù†Ø¬Ø§Ø­', 'ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­ Ø¥Ù„Ù‰ Ø§Ù„Ø³Ø­Ø§Ø¨Ø©', 'success');
  } catch (error) {
    console.error("Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø­ÙØ¸:", error);
    Swal.fire('Ø®Ø·Ø£', 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø³Ø­Ø§Ø¨ÙŠØ§Ù‹', 'error');
  }
}


let currentActivePreview = null;
let currentCustomerId = null;

function openNote(el) {
    currentActivePreview = el;
    currentCustomerId = el.getAttribute('data-id');
    let arr = []; 
    try { 
        const raw = el.getAttribute('data-full-notes') || "[]";
        const decoded = raw.replace(/&#39;/g, "'");
        arr = JSON.parse(decoded); 
    } catch(e) { arr = []; }
    
    const historyLog = document.getElementById('historyLog');
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    if (historyLog) {
        historyLog.innerHTML = arr.map(msg => {
            let msgDateObj = new Date(msg.date);
            let dayStr = isNaN(msgDateObj) ? '' : days[msgDateObj.getDay()] + ' ';
            let userName = msg.user && msg.user !== "المستخدم" ? msg.user : (el.getAttribute('data-owner') || "المستخدم");
            let timeStr = msg.time ? msg.time : '';

            return `
            <div class="log-entry" style="display: block; line-height: 1.6;">
                <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="log-badge-user"><i class="fas fa-user-circle"></i> ${userName}</span>
                    <span class="log-divider">|</span>
                    <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayStr}${msg.date} ${timeStr}</span>
                    <span class="log-divider">|</span>
                </div>
                <div class="log-action" style="padding-right: 5px; color: #0f172a; font-size: 11px; font-weight: 700; white-space: pre-wrap; display: block;">${escapeHTML(msg.text || '')}</div>
            </div>
            `;
        }).join('') || '<div style="color:#64748b; text-align:center; font-size:10px; padding:20px; font-weight:700;">لا توجد ملاحظات سابقة - ابدأ بإضافة ملاحظة للعميل</div>';
    }
    
    document.getElementById('noteModal').style.display = 'flex';
    document.getElementById('modalTextArea').value = '';
    document.getElementById('modalTextArea').focus();
}

function openNoteModal(customerId) {
    const el = document.querySelector(`.notes-preview[data-id="${customerId}"]`);
    if (el) {
        openNote(el);
    } else {
        currentCustomerId = customerId;
        currentActivePreview = null;
        document.getElementById('noteModal').style.display = 'flex';
    }
}

function closeNote() {
    document.getElementById('noteModal').style.display = 'none';
    currentActivePreview = null;
    currentCustomerId = null;
}

async function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if (!txt) { closeNote(); return; }

    let arr = [];
    if (currentActivePreview) {
        try { 
            const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
            const decoded = raw.replace(/&#39;/g, "'");
            arr = JSON.parse(decoded); 
        } catch(e) { arr = []; }
    } else if (currentCustomerId) {
        const cust = cachedCustomers.find(c => c.id === currentCustomerId);
        if (cust) {
            try {
                if (cust.notes) arr = typeof cust.notes === 'string' ? JSON.parse(cust.notes) : cust.notes;
                else if (cust.notesHistory) arr = cust.notesHistory.map(n=>({user:cust.owner||'المستخدم', date:n.date||getTodayFormatted(), time:n.time||'', text:n.text||''}));
            } catch(e) {}
        }
    }

    let username = "المستخدم";
    if (currentActivePreview) {
        const owner = currentActivePreview.getAttribute('data-owner');
        if (owner && owner !== '-') username = owner;
    }
    if (username === "المستخدم" && currentCustomerId) {
        const cust = cachedCustomers.find(c=>c.id===currentCustomerId);
        if (cust && cust.owner) username = cust.owner;
    }

    const newNote = { user: username, date: getTodayFormatted(), time: getTimeFormatted(), text: txt };
    arr.push(newNote);

    if (currentActivePreview) {
        const jsonStr = JSON.stringify(arr).replace(/'/g, "&#39;");
        currentActivePreview.setAttribute('data-full-notes', jsonStr);
        currentActivePreview.innerText = txt.length > 30 ? txt.substring(0,30)+'...' : txt;
    }

    try {
        if (currentCustomerId) {
            const custRef = doc(db, CUSTOMERS_COLLECTION, currentCustomerId);
            await updateDoc(custRef, {
                notes: JSON.stringify(arr),
                notesText: txt,
                notesHistory: arr,
                lastNote: txt
            });
            cachedCustomers = await getCustomers();
            renderCustomers(cachedCustomers);
        }
    } catch (error) {
        console.error("خطأ في حفظ الملاحظة:", error);
    }

    closeNote();
}

function toggleDropdown
(event, el) {
    event.stopPropagation();
    const menu = el.nextElementSibling;
    document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

function toggleAllCheckboxes(source) {
    const checkboxes = document.querySelectorAll('.select-check');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function handleBulkAction(action) {
    const selectedCheckboxes = document.querySelectorAll('.select-check:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id'));
    
    if (!selectedIds.length) {
        Swal.fire('ØªÙ†Ø¨ÙŠÙ‡', 'ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø¹Ù…ÙŠÙ„ ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„', 'info');
        return;
    }
    
    if (action === 'Ø­Ø°Ù') {
        Swal.fire({
            title: 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ',
            text: "Ù„Ù† ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ³ÙŠØªÙ… Ø§Ù„Ø­Ø°Ù Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
            cancelButtonText: 'Ø¥Ù„ØºØ§Ø¡'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    for (const id of selectedIds) {
                        await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
                    }
                    
                    cachedCustomers = await getCustomers();
                    renderCustomers(cachedCustomers);
                    updateStats(cachedCustomers);
                    Swal.fire('ØªÙ… Ø§Ù„Ø­Ø°Ù!', 'ØªÙ… Ø­Ø°Ù Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø­Ø¯Ø¯ÙŠÙ† Ø¨Ù†Ø¬Ø§Ø­ Ù…Ù† Ø§Ù„Ø³Ø­Ø§Ø¨Ø©.', 'success');
                } catch (error) {
                    console.error("Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø­Ø°Ù:", error);
                    Swal.fire('Ø®Ø·Ø£', 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­Ø°Ù Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡', 'error');
                }
            }
        });
    } else {
        Swal.fire('Ù…Ø¹Ù„ÙˆÙ…Ø©', `Ø¥Ø¬Ø±Ø§Ø¡ ${action} ØºÙŠØ± Ù…ØªØ§Ø­ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù†Ø³Ø®Ø© Ø­Ø§Ù„ÙŠØ§Ù‹.`, 'info');
    }
}

function toggleLogExpansion() {
    const section = document.getElementById('activityLogSection');
    const icon = document.querySelector('#toggleExpandBtn i');
    if(section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        icon.classList.remove('fa-compress-alt');
        icon.classList.add('fa-expand-alt');
    } else {
        section.classList.add('expanded');
        icon.classList.remove('fa-expand-alt');
        icon.classList.add('fa-compress-alt');
    }
}

async function loadSavedData() {
  cachedCustomers = await getCustomers();
  cachedLogs = await getLogs();
  
  updateStats(cachedCustomers);
  renderCustomers(cachedCustomers);
  renderLogs(cachedLogs);

  if (searchInput) {
    searchInput.addEventListener('input', debouncedFilterTable);
  }
}

// Ø±Ø¨Ø· Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¯ÙˆØ§Ù„ Ø§Ù„Ø­ÙŠÙˆÙŠØ© Ø¨Ø§Ù„Ù€ window ØµØ±Ø§Ø­Ø© Ù„ØªØ¬Ù†Ø¨ Ø£ÙŠ Ø£Ø®Ø·Ø§Ø¡ ÙÙŠ Ø§Ù„Ù€ onclick
window.loadSavedData = loadSavedData;
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.saveNewCustomer = saveNewCustomer;
window.openNoteModal = openNoteModal;
window.closeNote = closeNote;
window.saveNote = saveNote;
window.toggleDropdown = toggleDropdown;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.handleBulkAction = handleBulkAction;
window.toggleLogExpansion = toggleLogExpansion;
window.debouncedFilterTable = debouncedFilterTable;
