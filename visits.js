// ==========================================
// 1. إعدادات واستيراد Firebase سحابياً
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentActiveNoteRowId = null;

// ==========================================
// 2. الاستماع اللحظي للبيانات من Firebase
// ==========================================
function listenToVisits() {
    const visitsRef = collection(db, "visits");
    onSnapshot(visitsRef, (snapshot) => {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        // حفظ الصفوف المفتوحة أو الحقول أثناء الكتابة لعدم إعادة رسمها وتخريب الكتابة
        const focusedElementId = document.activeElement ? document.activeElement.id || document.activeElement.className : null;
        
        tbody.innerHTML = '';
        
        if (!snapshot.empty) {
            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                data.id = docSnapshot.id;
                renderRow(data, false);
            });
        }
        updateStats();
    }, (error) => {
        console.error("خطأ في استقبال البيانات السحابية:", error);
    });
}

// ==========================================
// 3. بناء وتقديم الصفوف (Render Rows)
// ==========================================
function renderRow(data = {}, animate = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rowId = data.id || 'visit_' + Date.now();

    const tr = document.createElement('tr');
    tr.className = 'main-row';
    tr.id = rowId;
    if (animate) tr.classList.add('fade-in');

    const formattedOppVal = data.oppValue ? Number(data.oppValue).toLocaleString('en-US') : '';

    tr.innerHTML = `
        <td class="col-select"><input type="checkbox" class="select-check row-select"></td>
        <td class="col-company"><input type="text" class="excel-input comp-input" value="${data.comp || ''}" placeholder="اسم الشركة"></td>
        <td class="col-address"><input type="text" class="excel-input address-input" value="${data.address || ''}" placeholder="العنوان"></td>
        <td class="col-manager"><input type="text" class="excel-input mgr-input" value="${data.mgr || ''}" placeholder="المسؤول"></td>
        <td class="col-mobile">
            <div class="phone-cell-container">
                <input type="text" class="excel-input mob-input" value="${data.mob || ''}" placeholder="الجوال">
                ${data.mob ? `<a href="https://wa.me/${data.mob.replace(/[^0-9]/g, '')}" target="_blank" class="whatsapp-icon-btn"><i class="fab fa-whatsapp"></i></a>` : ''}
            </div>
        </td>
        <td class="col-email"><input type="text" class="excel-input email-input" value="${data.email || ''}" placeholder="الإيميل"></td>
        <td class="col-record"><input type="text" class="excel-input record-input" value="${data.record || ''}" placeholder="السجل"></td>
        <td class="col-date">
            <input type="date" class="excel-input visit-date-val" value="${data.visitDate || getTodayDate()}">
        </td>
        <td class="col-service"><input type="text" class="excel-input service-input" value="${data.curServ || ''}" placeholder="الخدمة"></td>
        <td class="col-val"><input type="text" class="excel-input opp-val" value="${data.oppValue || ''}" placeholder="0"></td>
        <td class="col-notes">
            <div class="notes-preview" onclick="openNotesModal('${rowId}')" data-full-notes="${data.notes || ''}">
                ${data.notes ? data.notes : 'إضافة ملاحظة...'}
            </div>
        </td>
        <td class="col-status">
            <select class="excel-input status-select ${getStatusClass(data.status)}" onchange="handleStatusChange(this, '${rowId}')">
                <option value="جديدة" ${data.status === 'جديدة' ? 'selected' : ''}>جديدة</option>
                <option value="مكتملة" ${data.status === 'مكتملة' ? 'selected' : ''}>مكتملة</option>
                <option value="مؤجلة" ${data.status === 'مؤجلة' ? 'selected' : ''}>مؤجلة</option>
                <option value="ملغاة" ${data.status === 'ملغاة' ? 'selected' : ''}>ملغاة</option>
            </select>
        </td>
        <td class="col-edit">
            <div class="edit-date-container">
                <span class="edit-date-d">${data.editDate || '-'}</span>
                <input type="hidden" class="edit-date-val" value="${data.editDate || ''}">
            </div>
        </td>
        <td class="col-owner"><input type="text" class="excel-input owner-input" value="${data.owner || ''}" placeholder="المالك"></td>
    `;
    tbody.appendChild(tr);

    // ربط الحفظ التلقائي عند الكتابة السريعة
    tr.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => saveSingleRow(rowId));
    });
}

function getStatusClass(status) {
    if (status === 'مكتمبة' || status === 'مكتملة') return 'status-yellow';
    if (status === 'ملغاة') return 'status-red';
    return '';
}

function getTodayDate() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

// ==========================================
// 4. الحفظ وإدارة العمليات السحابية
// ==========================================

async function saveSingleRow(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const visitData = {
        comp: row.querySelector('.comp-input').value,
        address: row.querySelector('.address-input').value,
        mgr: row.querySelector('.mgr-input').value,
        mob: row.querySelector('.mob-input').value,
        email: row.querySelector('.email-input').value,
        record: row.querySelector('.record-input').value,
        visitDate: row.querySelector('.visit-date-val').value,
        curServ: row.querySelector('.service-input').value,
        oppValue: row.querySelector('.opp-val').value,
        notes: row.querySelector('.notes-preview').getAttribute('data-full-notes') || '',
        status: row.querySelector('.status-select').value,
        editDate: row.querySelector('.edit-date-val').value,
        owner: row.querySelector('.owner-input').value,
    };

    try {
        await setDoc(doc(db, "visits", rowId), visitData, { merge: true });
        updateStats();
    } catch (e) {
        console.error("خطأ بالحفظ السحابي:", e);
    }
}

// إضافة زيارة جديدة فوراً إلى Firebase
async function insertNewRow() {
    const newId = 'visit_' + Date.now();
    const newVisit = {
        comp: '',
        address: '',
        mgr: '',
        mob: '',
        email: '',
        record: '',
        visitDate: getTodayDate(),
        curServ: '',
        oppValue: '0',
        notes: '',
        status: 'جديدة',
        editDate: getTodayDate(),
        owner: ''
    };

    try {
        await setDoc(doc(db, "visits", newId), newVisit);
    } catch (error) {
        console.error("خطأ في إضافة صف جديد سحابياً:", error);
    }
}

function handleStatusChange(selectElem, rowId) {
    const tr = selectElem.closest('tr');
    selectElem.className = `excel-input status-select ${getStatusClass(selectElem.value)}`;
    
    const today = getTodayDate();
    const editDateCell = tr.querySelector('.edit-date-d');
    const editDateVal = tr.querySelector('.edit-date-val');
    
    if (editDateCell) editDateCell.textContent = today;
    if (editDateVal) editDateVal.value = today;
    
    saveSingleRow(rowId);
}

// ==========================================
// 5. الملاحظات (Modal)
// ==========================================
function openNotesModal(rowId) {
    currentActiveNoteRowId = rowId;
    const row = document.getElementById(rowId);
    if (!row) return;

    const preview = row.querySelector('.notes-preview');
    const currentNotes = preview.getAttribute('data-full-notes') || '';
    
    document.getElementById('modalTextArea').value = currentNotes;
    document.getElementById('historyLog').innerText = currentNotes ? `الملاحظات الحالية:\n${currentNotes}` : 'لا توجد ملاحظات سابقة.';
    document.getElementById('noteModal').style.display = 'flex';
}

function closeNote() {
    document.getElementById('noteModal').style.display = 'none';
    currentActiveNoteRowId = null;
}

function saveNote() {
    if (!currentActiveNoteRowId) return;
    const row = document.getElementById(currentActiveNoteRowId);
    const newText = document.getElementById('modalTextArea').value;
    
    if (row) {
        const preview = row.querySelector('.notes-preview');
        preview.setAttribute('data-full-notes', newText);
        preview.innerText = newText ? newText : 'إضافة ملاحظة...';
        saveSingleRow(currentActiveNoteRowId);
    }
    closeNote();
}

// ==========================================
// 6. الإحصائيات والفلاتر وتصدير الأزرار للنطاق العام
// ==========================================
function updateStats() {
    const rows = document.querySelectorAll('#tableBody .main-row');
    let totalCount = rows.length;
    let todayCount = 0;
    let monthCount = 0;
    let totalVal = 0;
    let monthVal = 0;

    const todayStr = getTodayDate();
    const currentMonthStr = todayStr.substring(0, 7);

    rows.forEach(row => {
        const dateVal = row.querySelector('.visit-date-val')?.value || '';
        const val = parseFloat(row.querySelector('.opp-val')?.value) || 0;

        totalVal += val;

        if (dateVal === todayStr) {
            todayCount++;
        }
        if (dateVal.startsWith(currentMonthStr)) {
            monthCount++;
            monthVal += val;
        }
    });

    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalCount;
    if (document.getElementById('stat-month')) document.getElementById('stat-month').innerText = monthCount;
    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = todayCount;
    if (document.getElementById('stat-value-total')) document.getElementById('stat-value-total').innerText = totalVal.toLocaleString('en-US');
    if (document.getElementById('stat-value-month')) document.getElementById('stat-value-month').innerText = monthVal.toLocaleString('en-US');
}

function toggleAllCheckboxes(master) {
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = master.checked);
}

function toggleDropdown(event, btn) {
    event.stopPropagation();
    const menu = btn.nextElementSibling;
    menu.classList.toggle('show');
}

window.onclick = function() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
};

async function handleBulkAction(action) {
    const selectedRows = document.querySelectorAll('.row-select:checked');
    if (selectedRows.length === 0) {
        Swal.fire('تنبيه', 'يرجى تحديد عنصر واحد على الأقل', 'warning');
        return;
    }

    if (action === 'حذف') {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: `سيتم حذف ${selectedRows.length} من العناصر المحددة نهائياً من السحابة`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        });

        if (result.isConfirmed) {
            for (let cb of selectedRows) {
                const tr = cb.closest('tr');
                if (tr && tr.id) {
                    await deleteDoc(doc(db, "visits", tr.id));
                }
            }
            Swal.fire('تم الحذف!', 'تم حذف الزيارات بنجاح من السحابة.', 'success');
        }
    } else {
        Swal.fire('إشعار', `تم تطبيق إجراء (${action}) على ${selectedRows.length} سجل.`, 'info');
    }
}

function toggleLogExpansion() {
    const section = document.getElementById('activityLogSection');
    if (section) section.classList.toggle('expanded');
}

// تصدير الدوال إلى window لكي تستجيب لها أزرار الـ HTML
window.insertNewRow = insertNewRow;
window.openNotesModal = openNotesModal;
window.closeNote = closeNote;
window.saveNote = saveNote;
window.handleStatusChange = handleStatusChange;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.toggleDropdown = toggleDropdown;
window.handleBulkAction = handleBulkAction;
window.toggleLogExpansion = toggleLogExpansion;

// البدء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    listenToVisits();
});