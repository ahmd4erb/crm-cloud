// ==========================================
// 1. إعدادات واستيراد Firebase
// ==========================================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";

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
const analytics = getAnalytics(app);
const db = getFirestore(app);

const STORAGE_KEY = "visits_data_v1";

// ==========================================
// 2. دوال التحميل والحفظ السحابي
// ==========================================

// تحميل البيانات من Firebase Firestore
async function loadSavedData() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    try {
        const querySnapshot = await getDocs(collection(db, "visits"));
        if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnapshot) => {
                const v = docSnapshot.data();
                v.id = docSnapshot.id; 
                renderRow(v, false);
            });
        } else {
            renderRow({}, false);
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات من السحابة: ", error);
        // Fallback محلي في حال انقطاع الاتصال
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (rawData) { 
            JSON.parse(rawData).forEach(v => renderRow(v, false)); 
        } else { 
            renderRow({}, false); 
        }
    }
    
    reorderRows();
    updateStats();
    renderActivityLog();
}

// الحفظ التلقائي في Firebase Firestore
async function saveAllDataSilently() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    
    rows.forEach(async (row) => {
        const rowId = row.id;
        const subRow = document.getElementById('sub-' + rowId); 
        const products = [];
        
        if (subRow) { 
            subRow.querySelectorAll('.product-body tr').forEach(pRow => { 
                const inputs = pRow.querySelectorAll('input, select'); 
                if (inputs.length >= 5) {
                    products.push({ 
                        type: inputs[0].value, 
                        desc: inputs[1].value, 
                        qty: inputs[2].value, 
                        sub: inputs[3].value, 
                        total: inputs[4].value 
                    }); 
                } 
            }); 
        }

        const visitData = {
            comp: row.cells[1].querySelector('input').value, 
            address: row.cells[2].querySelector('input').value, 
            mgr: row.cells[3].querySelector('input').value, 
            mob: row.cells[4].querySelector('input').value, 
            email: row.cells[5].querySelector('input').value, 
            record: row.cells[6].querySelector('input').value, 
            visitDate: row.querySelector('.visit-date-val').value, 
            curServ: row.cells[8].querySelector('input').value, 
            oppValue: row.cells[9].querySelector('input').value, 
            notes: row.cells[10].querySelector('.notes-preview').getAttribute('data-full-notes') || '', 
            status: row.cells[11].querySelector('select').value, 
            editDate: row.querySelector('.edit-date-val')?.value || '', 
            owner: row.cells[13].querySelector('input').value, 
            products: products
        };

        try {
            await setDoc(doc(db, "visits", rowId), visitData);
        } catch (e) {
            console.error("خطأ أثناء الحفظ السحابي:", e);
        }
    });

    // نسخة احتياطية محلية سريعة
    const localBackupData = Array.from(rows).map(row => ({
        comp: row.cells[1].querySelector('input').value
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localBackupData));
}

// ==========================================
// 3. دوال إدارة الصفوف والواجهة
// ==========================================

function renderRow(data = {}, animate = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rowId = data.id || 'row_' + Date.now() + '_' + Math.random().toString(36.substring(2, 7));
    
    // إنشاء الصف الرئيسي
    const tr = document.createElement('tr');
    tr.className = 'main-row';
    tr.id = rowId;
    if (animate) tr.classList.add('fade-in');

    tr.innerHTML = `
        <td class="text-center"><input type="checkbox" class="row-select"></td>
        <td><input type="text" class="form-control" value="${data.comp || ''}" placeholder="اسم الشركة"></td>
        <td><input type="text" class="form-control" value="${data.address || ''}" placeholder="العنوان"></td>
        <td><input type="text" class="form-control" value="${data.mgr || ''}" placeholder="اسم المسؤول"></td>
        <td><input type="text" class="form-control" value="${data.mob || ''}" placeholder="الجوال"></td>
        <td><input type="text" class="form-control" value="${data.email || ''}" placeholder="البريد الإلكتروني"></td>
        <td><input type="text" class="form-control" value="${data.record || ''}" placeholder="رجل السجل"></td>
        <td class="text-center">
            <span class="visit-date-display">${data.visitDate || getTodayDate()}</span>
            <input type="date" class="form-control visit-date-val d-none" value="${data.visitDate || getTodayDate()}">
        </td>
        <td><input type="text" class="form-control" value="${data.curServ || ''}" placeholder="الخدمة الحالية"></td>
        <td><input type="number" class="form-control opp-val" value="${data.oppValue || 0}" placeholder="قيمة الفرصة"></td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-info notes-btn" onclick="openNotesModal('${rowId}')">ملاحظات</button>
            <div class="notes-preview d-none" data-full-notes="${data.notes || ''}"></div>
        </td>
        <td>
            <select class="form-control status-select" onchange="handleStatusChange(this)">
                <option value="جديدة" ${data.status === 'جديدة' ? 'selected' : ''}>جديدة</option>
                <option value="مكتملة" ${data.status === 'مكتملة' ? 'selected' : ''}>مكتملة</option>
                <option value="مؤجلة" ${data.status === 'مؤجلة' ? 'selected' : ''}>مؤجلة</option>
            </select>
        </td>
        <td class="text-center edit-date-cell">
            <span class="edit-date-display">${data.editDate || '-'}</span>
            <input type="hidden" class="edit-date-val" value="${data.editDate || ''}">
        </td>
        <td><input type="text" class="form-control" value="${data.owner || ''}" placeholder="المسؤول"></td>
        <td class="text-center">
            <button class="btn btn-sm btn-primary" onclick="toggleSubRow('${rowId}')"><i class="fas fa-boxes"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteRow('${rowId}')"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);

    // إنشاء الصف الفرعي للمنتجات
    const subTr = document.createElement('tr');
    subTr.className = 'sub-row d-none';
    subTr.id = 'sub-' + rowId;
    subTr.innerHTML = `
        <td colspan="15">
            <div class="p-3 bg-light border rounded">
                <div class="d-flex justify-content-between mb-2">
                    <strong>المنتجات / الخدمات المرتبطة بالزيارة</strong>
                    <button class="btn btn-sm btn-success" onclick="addProductRow('${rowId}')">+ إضافة منتج</button>
                </div>
                <table class="table table-sm table-bordered bg-white product-table">
                    <thead>
                        <tr>
                            <th>نوع المنتج</th>
                            <th>الوصف</th>
                            <th>الكمية</th>
                            <th>السعر الفرعي</th>
                            <th>الإجمالي</th>
                            <th>حذف</th>
                        </tr>
                    </thead>
                    <tbody class="product-body"></tbody>
                </table>
            </div>
        </td>
    `;
    tbody.appendChild(subTr);

    // تعبئة المنتجات إذا وجدت
    if (data.products && Array.isArray(data.products)) {
        data.products.forEach(p => addProductRow(rowId, p));
    }

    // ربط أحداث التغيير للحفظ التلقائي
    tr.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => {
            saveAllDataSilently();
            updateStats();
        });
    });
}

// دالة حذف صف فردي مع التحديث السحابي
async function deleteRow(rowId) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        const row = document.getElementById(rowId);
        const subRow = document.getElementById('sub-' + rowId);
        
        if (row) row.remove();
        if (subRow) subRow.remove();

        try {
            await deleteDoc(doc(db, "visits", rowId));
        } catch (error) {
            console.error("خطأ أثناء الحذف من السحابة:", error);
        }

        reorderRows();
        updateStats();
        saveAllDataSilently();
    }
}

function reorderRows() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    rows.forEach((row, index) => {
        // يمكنك إضافة ترتيب مرئي إذا رغبت
    });
}

function updateStats() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    let totalOpp = 0;
    rows.forEach(row => {
        const val = parseFloat(row.querySelector('.opp-val').value) || 0;
        totalOpp += val;
    });
    const totalElement = document.getElementById('totalOpportunities');
    if (totalElement) totalElement.textContent = totalOpp;
}

function renderActivityLog() {
    // منطقة سجل النشاطات إن وجدت بالواجهة
}

function getTodayDate() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function toggleSubRow(rowId) {
    const subRow = document.getElementById('sub-' + rowId);
    if (subRow) {
        subRow.classList.toggle('d-none');
    }
}

function addProductRow(rowId, pData = {}) {
    const subRow = document.getElementById('sub-' + rowId);
    if (!subRow) return;
    const pBody = subRow.querySelector('.product-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control" value="${pData.type || ''}"></td>
        <td><input type="text" class="form-control" value="${pData.desc || ''}"></td>
        <td><input type="number" class="form-control" value="${pData.qty || 1}" oninput="calcProductTotal(this)"></td>
        <td><input type="number" class="form-control" value="${pData.sub || 0}" oninput="calcProductTotal(this)"></td>
        <td><input type="number" class="form-control product-total" value="${pData.total || 0}" readonly></td>
        <td class="text-center"><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); saveAllDataSilently();"><i class="fas fa-times"></i></button></td>
    `;
    pBody.appendChild(tr);
}

function calcProductTotal(input) {
    const tr = input.closest('tr');
    const qty = parseFloat(tr.querySelectorAll('input')[2].value) || 0;
    const sub = parseFloat(tr.querySelectorAll('input')[3].value) || 0;
    tr.querySelector('.product-total').value = qty * sub;
    saveAllDataSilently();
}

function handleStatusChange(selectElem) {
    const tr = selectElem.closest('tr');
    const editDateCell = tr.querySelector('.edit-date-cell');
    const editDateVal = editDateCell.querySelector('.edit-date-val');
    const editDateDisplay = editDateCell.querySelector('.edit-date-display');
    
    const today = getTodayDate();
    editDateVal.value = today;
    editDateDisplay.textContent = today;
    saveAllDataSilently();
}

function openNotesModal(rowId) {
    const row = document.getElementById(rowId);
    const preview = row.querySelector('.notes-preview');
    const currentNotes = preview.getAttribute('data-full-notes') || '';
    
    const newNotes = prompt('أدخل الملاحظات:', currentNotes);
    if (newNotes !== null) {
        preview.setAttribute('data-full-notes', newNotes);
        saveAllDataSilently();
    }
}

// ==========================================
// 4. تهيئة الأحداث عند تحميل المستند
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();

    const addBtn = document.getElementById('addRowBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            renderRow({}, true);
            saveAllDataSilently();
        });
    }
});