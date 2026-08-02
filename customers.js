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
    console.error("خطأ أثناء جلب العملاء من السحابة: ", error);
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
    console.error("خطأ أثناء جلب سجل النشاط من السحابة: ", error);
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
  if (s.includes('جديد') || s.includes('مفتوح')) return 'status-active';
  if (s.includes('نشط') || s.includes('مكتمل') || s.includes('تم')) return 'status-active';
  if (s.includes('متابعة')) return 'status-med';
  if (s.includes('مغلق') || s.includes('ملغي')) return 'status-inactive';
  return 'status-small';
}

function classBadgeColor(classification) {
  const c = normalizeText(classification);
  if (c.includes('حكومي')) return 'status-gov';
  if (c.includes('هام')) return 'status-important';
  if (c.includes('متوسط')) return 'status-med';
  if (c.includes('صغير')) return 'status-small';
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
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = days[d.getDay()];
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${dayName} ${dateStr} ${timeStr}`;
}

function renderCustomers(list) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:28px;color:#6b7280;">لا توجد بيانات لعرضها</td></tr>`;
    return;
  }

  list.forEach((v, index) => {
    const classification = safe(v.classification || v.source || 'غير محدد');
    const tr = document.createElement('tr');
    tr.className = 'main-row';
    
    tr.innerHTML = `
      <td><input type="checkbox" class="select-check" data-id="${v.id}" data-index="${index}"></td>
      <td><a href="#" onclick="event.preventDefault(); window.location.href='customer-details.html?code=${v.code}'" class="code-link">${safe(v.code, '00001')}</a></td>
      <td><strong>${safe(v.comp)}</strong></td>
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
      <td><div class="notes-preview" onclick="openNoteModal('${v.id}'); event.stopPropagation()">${safe(v.notesText || v.lastNote || 'اضغط لإضافة ملاحظة')}</div></td>
      <td><span class="${badgeClass(v.status)}" style="padding: 2px 8px; border-radius: 4px;">${safe(v.status, 'جديد')}</span></td>
      <td>${safe(v.owner)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderLogs(list) {
  if (!logsBody) return;
  logsBody.innerHTML = '';

  if (!list.length) {
    logsBody.innerHTML = `<div style="text-align:center;padding:28px;color:#6b7280;">لا يوجد سجل نشاط بعد</div>`;
    return;
  }

  list.slice(0, 20).forEach(log => {
    logsBody.innerHTML += `
      <div class="log-entry">
        <span class="log-badge-user"><i class="fas fa-user"></i> ${safe(log.user || 'المستخدم')}</span>
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
    Swal.fire('تنبيه', 'يرجى إدخال اسم الشركة', 'warning');
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
    status: 'جديد',
    classification: 'صغير',
    notesText: '',
    notesHistory: []
  };

  try {
    await addDoc(collection(db, CUSTOMERS_COLLECTION), newCust);
    
    const creator = document.getElementById('addCreator').value || 'المستخدم';
    const newLog = {
      user: creator,
      date: getFullDateString(),
      action: `إنشاء عميل جديد برقم ${newCust.code} ( ${newCust.comp} )`
    };
    await addDoc(collection(db, LOGS_COLLECTION), newLog);

    closeAddCustomerModal();
    
    cachedCustomers = await getCustomers();
    cachedLogs = await getLogs();
    
    updateStats(cachedCustomers);
    renderCustomers(cachedCustomers);
    renderLogs(cachedLogs);

    Swal.fire('نجاح', 'تم إضافة العميل بنجاح إلى السحابة', 'success');
  } catch (error) {
    console.error("خطأ أثناء الحفظ:", error);
    Swal.fire('خطأ', 'حدث خطأ أثناء حفظ البيانات سحابياً', 'error');
  }
}

let currentCustomerId = null;
function openNoteModal(customerId) {
    currentCustomerId = customerId;
    document.getElementById('noteModal').style.display = 'flex';
    const customer = cachedCustomers.find(c => c.id === customerId);
    document.getElementById('modalTextArea').value = '';
    
    const historyLog = document.getElementById('historyLog');
    if (customer && customer.notesHistory && customer.notesHistory.length) {
        historyLog.innerHTML = customer.notesHistory.map(n => `<div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #cbd5e1; font-size:11px;"><strong>${n.date}</strong>: ${n.text}</div>`).join('');
    } else {
        historyLog.innerHTML = '<div style="color:#64748b; font-size:11px; text-align:center;">لا يوجد سجل ملاحظات سابق.</div>';
    }
}

function closeNote() {
    document.getElementById('noteModal').style.display = 'none';
    currentCustomerId = null;
}

async function saveNote() {
    if (!currentCustomerId) return;
    const text = document.getElementById('modalTextArea').value;
    if (!text.trim()) {
        closeNote();
        return;
    }

    const customer = cachedCustomers.find(c => c.id === currentCustomerId);
    if (!customer) return;
    
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    if (!customer.notesHistory) customer.notesHistory = [];
    customer.notesHistory.unshift({ date: dateStr, text: text });
    customer.notesText = text;
    
    try {
      const custRef = doc(db, CUSTOMERS_COLLECTION, currentCustomerId);
      await updateDoc(custRef, {
          notesText: customer.notesText,
          notesHistory: customer.notesHistory
      });
      
      cachedCustomers = await getCustomers();
      closeNote();
      renderCustomers(cachedCustomers);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'تم حفظ الملاحظة سحابياً', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error("خطأ في حفظ الملاحظة:", error);
      Swal.fire('خطأ', 'فشل حفظ الملاحظة في السحابة', 'error');
    }
}

function toggleDropdown(event, el) {
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
        Swal.fire('تنبيه', 'يرجى تحديد عميل واحد على الأقل', 'info');
        return;
    }
    
    if (action === 'حذف') {
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "لن تتمكن من التراجع عن هذا الإجراء وسيتم الحذف من السحابة!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    for (const id of selectedIds) {
                        await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
                    }
                    
                    cachedCustomers = await getCustomers();
                    renderCustomers(cachedCustomers);
                    updateStats(cachedCustomers);
                    Swal.fire('تم الحذف!', 'تم حذف العملاء المحددين بنجاح من السحابة.', 'success');
                } catch (error) {
                    console.error("خطأ أثناء الحذف:", error);
                    Swal.fire('خطأ', 'حدث خطأ أثناء حذف العملاء', 'error');
                }
            }
        });
    } else {
        Swal.fire('معلومة', `إجراء ${action} غير متاح في هذه النسخة حالياً.`, 'info');
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

// ربط جميع الدوال الحيوية بالـ window صراحة لتجنب أي أخطاء في الـ onclick
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