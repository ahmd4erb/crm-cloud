// استيراد الدوال المطلوبة من حزمة Firebase SDK
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";

// إعدادات اتصال فايربيز
const firebaseConfig = {
  apiKey: "AIzaSyDpH2obY_UOwSDen64Q0HvX4q4BJIKwVMI",
  authDomain: "ahmd4erb-8c507.firebaseapp.com",
  projectId: "ahmd4erb-8c507",
  storageBucket: "ahmd4erb-8c507.firebasestorage.app",
  messagingSenderId: "815193144806",
  appId: "1:815193144806:web:cdc9e67059a8e3acb6ea27",
  measurementId: "G-9JFE9P25RR"
};

// تهيئة تطبيق فايربيز وقاعدة البيانات Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// أسماء المجموعات في سحابة فايربيز (متوافقة مع النظام السحابي للعملاء)
const CUSTOMERS_COLLECTION = 'asgate_customers_cloud';
const VISITS_COLLECTION = 'asgate_visits_cloud'; // مجموعة الزيارات السحابية (إن وجدت)

const urlParams = new URLSearchParams(window.location.search);
const clientCode = urlParams.get('code');
let clientFirestoreId = null; // معرف المستند الحقيقي في فايربيز
let clientName = '';

const contentBody = document.getElementById('contentBody');
const managerTableBody = document.getElementById('managerTableBody');

function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function safe(v, fallback = '-') {
  const val = v && String(v).trim() ? String(v).trim() : fallback;
  return escapeHTML(val);
}

function goBackAndFocus() {
  if (clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
  window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// جلب بيانات العميل المحددة من سحابة فايربيز بناءً على الكود
async function loadClientData() {
  if (!clientCode) return;
  
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    let targetClient = null;
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.code === clientCode) {
        clientFirestoreId = docSnap.id;
        targetClient = data;
      }
    });

    if (!targetClient) {
      document.getElementById('c-name').innerText = 'العميل غير موجود';
      return;
    }

    clientName = targetClient.comp || '';
    document.title = `${safe(targetClient.comp, 'تفاصيل العميل')} | ASGate`;
    document.getElementById('c-name').innerText = safe(targetClient.comp, 'غير محدد');
    document.getElementById('c-cr1').innerText = safe(targetClient.cr1 || targetClient.cr || targetClient.record, '0000000');
    document.getElementById('c-cr2').innerText = safe(targetClient.cr2, 'غير محدد');
    document.getElementById('c-city').innerText = safe(targetClient.city || targetClient.address, 'غير محدد');
    document.getElementById('c-district').innerText = safe(targetClient.district, 'غير محدد');
    document.getElementById('c-source').innerText = safe(targetClient.classification || targetClient.source, 'غير محدد');
    document.getElementById('c-owner').innerText = safe(targetClient.owner, 'غير محدد');
  } catch (error) {
    console.error("خطأ أثناء جلب بيانات العميل من السحابة:", error);
  }
}

function renderEmptyMessage(message) {
  contentBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:48px;color:#94a3b8;font-size:15px;background:#f8fafc;">${message}</td></tr>`;
}

function getStatusBadge(statusStr) {
  const status = String(statusStr).toLowerCase();
  if (status.includes('مكتمل')) return `<span class="status-badge status-green">${statusStr}</span>`;
  if (status.includes('معلق')) return `<span class="status-badge status-yellow">${statusStr}</span>`;
  if (status.includes('جديد')) return `<span class="status-badge status-white">${statusStr}</span>`;
  if (status.includes('مرتجع')) return `<span class="status-badge status-light-red">${statusStr}</span>`;
  if (status.includes('مفقود') || status.includes('خسارة')) return `<span class="status-badge status-dark-red">${statusStr}</span>`;
  return `<span class="status-badge status-green">${statusStr}</span>`;
}

async function openTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  if (tab === 'o-history') {
    document.getElementById('btn-o').classList.add('active');
    renderEmptyMessage('لا توجد طلبات سابقة مسجلة لهذا العميل حتى الآن.');
  } else if (tab === 'attachments') {
    document.getElementById('btn-a').classList.add('active');
    renderEmptyMessage('المنطقة المخصصة للمرفقات. يتم عرض ملفات PDF و Excel المرفوعة سحابياً هنا.');
  } else if (tab === 'v-history') {
    document.getElementById('btn-v').classList.add('active');
    
    try {
      // جلب الزيارات السحابية المرتبطة باسم العميل أو كوده
      const querySnapshot = await getDocs(collection(db, VISITS_COLLECTION));
      const visits = [];
      querySnapshot.forEach(docSnap => {
        const v = docSnap.data();
        if (v.comp === clientName || v.clientCode === clientCode) {
          visits.push(v);
        }
      });
      
      if (!visits.length) {
        renderEmptyMessage('لا توجد سجلات زيارات مسجلة لهذا العميل حالياً.');
        return;
      }
      
      contentBody.innerHTML = visits.map(v => `
        <tr>
          <td>${safe(v.visitDate || v.date)}</td>
          <td>${safe(v.address || v.location || 'غير محدد')}</td>
          <td>${getStatusBadge(v.status || 'مكتملة')}</td>
          <td>${safe(v.notes || '-')}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error("خطأ في جلب الزيارات السحابية:", error);
      renderEmptyMessage('حدث خطأ أثناء تحميل سجل الزيارات.');
    }
  }
}

// --- نظام فريق المتابعة المرتبط بالسحابة (Firestore) ---
async function loadManagersData() {
  if (!managerTableBody || !clientFirestoreId) return;

  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    
    let managers = [];
    if (docSnap.exists()) {
      const data = docSnap.data();
      managers = data.managers || [];
    }

    if (!managers.length) {
      managerTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:#94a3b8;font-size:15px;background:#f8fafc;">لا توجد بيانات متابعة. اضغط على "إضافة صف جديد" للبدء.</td></tr>`;
      return;
    }

    managerTableBody.innerHTML = managers.map((m, index) => `
      <tr>
        <td><input type="text" class="edit-input" placeholder="أدخل الاسم..." value="${safe(m.name, '')}" onchange="updateManager(${index}, 'name', this.value)"></td>
        <td><input type="text" class="edit-input" placeholder="05XXXXXXXX" value="${safe(m.mob, '')}" onchange="updateManager(${index}, 'mob', this.value)" dir="ltr" style="text-align:right;"></td>
        <td><input type="email" class="edit-input" placeholder="email@example.com" value="${safe(m.email, '')}" onchange="updateManager(${index}, 'email', this.value)" dir="ltr" style="text-align:right;"></td>
        <td class="text-center">
          <input type="radio" name="main_contact" ${m.main ? 'checked' : ''} onchange="setMainManager(${index})" style="cursor:pointer; width:18px; height:18px; accent-color:var(--primary);">
        </td>
        <td style="color:var(--muted); text-align:center;">${safe(m.date || getTodayDateFormatted())}</td>
        <td class="text-center">
          <button class="btn btn-danger" onclick="removeManagerRow(${index})">حذف</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("خطأ في تحميل مسؤولي المتابعة:", error);
  }
}

async function updateManager(index, field, value) {
  if (!clientFirestoreId) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let managers = docSnap.data().managers || [];
      if (managers[index]) {
        managers[index][field] = value;
        await updateDoc(docRef, { managers: managers });
      }
    }
  } catch (error) {
    console.error("خطأ أثناء تحديث بيانات المسؤول:", error);
  }
}

async function setMainManager(index) {
  if (!clientFirestoreId) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let managers = docSnap.data().managers || [];
      managers.forEach((m, i) => m.main = (i === index));
      await updateDoc(docRef, { managers: managers });
    }
  } catch (error) {
    console.error("خطأ أثناء تحديد المسؤول الأساسي:", error);
  }
}

async function addNewManagerRow() {
  if (!clientFirestoreId) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let managers = docSnap.data().managers || [];
      managers.push({ name: '', mob: '', email: '', main: managers.length === 0, date: getTodayDateFormatted() });
      await updateDoc(docRef, { managers: managers });
      await loadManagersData();
    }
  } catch (error) {
    console.error("خطأ أثناء إضافة صف جديد:", error);
  }
}

async function removeManagerRow(index) {
  if(!confirm('هل أنت متأكد من حذف هذا المسؤول؟')) return;
  if (!clientFirestoreId) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let managers = docSnap.data().managers || [];
      managers.splice(index, 1);
      await updateDoc(docRef, { managers: managers });
      await loadManagersData();
    }
  } catch (error) {
    console.error("خطأ أثناء الحذف:", error);
  }
}

// --- نظام النافذة المنبثقة للأنشطة والمرفقات ---
const noteModal = document.getElementById('noteModal');
const fileUpload = document.getElementById('fileUpload');
const fileNameDisplay = document.getElementById('fileName');

function openNoteModal() { noteModal.classList.add('active'); }
function closeNoteModal() { 
  noteModal.classList.remove('active'); 
  document.getElementById('activityNote').value = '';
  fileUpload.value = '';
  fileNameDisplay.textContent = '';
}

fileUpload.addEventListener('change', function(e) {
  if (this.files && this.files.length > 0) {
    fileNameDisplay.textContent = this.files[0].name;
  } else {
    fileNameDisplay.textContent = '';
  }
});

async function saveActivity() {
  const note = document.getElementById('activityNote').value;
  const file = fileUpload.files[0];
  
  if (!note && !file) {
    alert("يرجى كتابة ملاحظة أو إرفاق ملف");
    return;
  }
  
  if (!clientFirestoreId) {
    alert("لم يتم التعرف على معرّف العميل السحابي.");
    return;
  }

  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, clientFirestoreId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const clientData = docSnap.data();
      const notesHistory = clientData.notesHistory || [];
      
      const d = new Date();
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      
      notesHistory.unshift({
        date: dateStr,
        text: note,
        fileName: file ? file.name : null
      });

      await updateDoc(docRef, {
        notesText: note,
        notesHistory: notesHistory
      });

      closeNoteModal();
      alert("تم تسجيل النشاط وحفظه بنجاح في السحابة!");
    }
  } catch (error) {
    console.error("خطأ أثناء حفظ النشاط:", error);
    alert("حدث خطأ أثناء حفظ النشاط سحابياً.");
  }
}

// التهيئة الأولية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  await loadClientData();
  await loadManagersData();
  openTab('o-history');
});