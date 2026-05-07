import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// عناصر DOM
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsList = document.getElementById('accountsList');
const authMessage = document.getElementById('authMessage');

let currentUser = null;
let accountsRef = null;

// مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        accountsRef = collection(db, 'accounts');
        loadAccounts();
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        accountsList.innerHTML = '';
    }
});

// تسجيل الدخول
const login = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ في تسجيل الدخول: ' + error.message;
    }
};

// إنشاء حساب جديد
const signup = async (email, password) => {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ في إنشاء الحساب: ' + error.message;
    }
};

// تسجيل الخروج
logoutBtn.onclick = async () => {
    await signOut(auth);
};

// معالجة النموذج
authForm.onsubmit = (e) => e.preventDefault();
loginBtn.onclick = () => login(emailInput.value, passwordInput.value);
signupBtn.onclick = () => signup(emailInput.value, passwordInput.value);

// ---------- عمليات CRUD للحسابات ----------
async function loadAccounts() {
    if (!currentUser) return;
    const q = query(accountsRef, where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    accountsList.innerHTML = '';
    querySnapshot.forEach(docSnap => {
        const account = docSnap.data();
        displayAccountCard(docSnap.id, account);
    });
}

function displayAccountCard(id, account) {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `
        <div class="account-info">
            <h3>${escapeHtml(account.platform)}</h3>
            <p>@${escapeHtml(account.username)}</p>
            <a href="${account.url}" target="_blank">زيارة الرابط</a>
        </div>
        <div class="account-actions">
            <button class="edit" data-id="${id}">✏️ تعديل</button>
            <button class="delete" data-id="${id}">🗑️ حذف</button>
        </div>
    `;
    card.querySelector('.edit').onclick = () => editAccount(id, account);
    card.querySelector('.delete').onclick = () => deleteAccount(id);
    accountsList.appendChild(card);
}

// إضافة حساب جديد
addAccountBtn.onclick = async () => {
    const platform = document.getElementById('platform').value.trim();
    const username = document.getElementById('username').value.trim();
    const url = document.getElementById('url').value.trim();
    if (!platform || !username || !url) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }
    try {
        await addDoc(accountsRef, {
            userId: currentUser.uid,
            platform: platform,
            username: username,
            url: url,
            createdAt: new Date()
        });
        document.getElementById('platform').value = '';
        document.getElementById('username').value = '';
        document.getElementById('url').value = '';
        loadAccounts();
    } catch (error) {
        alert('فشل الإضافة: ' + error.message);
    }
};

// تعديل حساب
async function editAccount(id, oldAccount) {
    const newPlatform = prompt('تعديل اسم المنصة:', oldAccount.platform);
    if (newPlatform === null) return;
    const newUsername = prompt('تعديل اسم المستخدم:', oldAccount.username);
    if (newUsername === null) return;
    const newUrl = prompt('تعديل الرابط:', oldAccount.url);
    if (newUrl === null) return;
    
    const accountDoc = doc(db, 'accounts', id);
    await updateDoc(accountDoc, {
        platform: newPlatform,
        username: newUsername,
        url: newUrl
    });
    loadAccounts();
}

// حذف حساب
async function deleteAccount(id) {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
        const accountDoc = doc(db, 'accounts', id);
        await deleteDoc(accountDoc);
        loadAccounts();
    }
}

// دالة مساعدة للهروب من HTML
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== زر المشاركة - الرابط العام ==========
// دالة لإنشاء معرف قصير (لإخفاء الـ UID الكامل)
function getShortId(uid) {
    // خذ أول 6 حروف وآخر 4 حروف من الـ UID
    return uid.substring(0, 6) + uid.substring(uid.length - 4);
}

// دالة للحصول على المسار الأساسي للموقع (يعمل تلقائياً)
function getBasePath() {
    const pathname = window.location.pathname;
    // إذا كان المسار ينتهي بـ /، احذف آخر جزء
    if (pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.onclick = async () => {
        if (!currentUser) {
            alert('الرجاء تسجيل الدخول أولاً');
            return;
        }
        
        const uid = currentUser.uid;
        const shortId = getShortId(uid); // معرف قصير بدلاً من المعرف الكامل
        const origin = window.location.origin;
        const basePath = getBasePath();
        
        // بناء الرابط العام (مع إخفاء الـ UID الكامل)
        const publicLink = `${origin}${basePath}/public/?id=${shortId}`;
        
        console.log("الرابط العام:", publicLink);
        
        // حفظ العلاقة بين المعرف القصير والـ UID الكامل في Firebase
        try {
            const linksRef = collection(db, 'shortLinks');
            const q = query(linksRef, where("shortId", "==", shortId));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                await addDoc(linksRef, {
                    shortId: shortId,
                    userId: uid,
                    createdAt: new Date()
                });
            }
        } catch (err) {
            console.warn("خطأ في حفظ الرابط:", err);
        }
        
        // نسخ الرابط
        try {
            await navigator.clipboard.writeText(publicLink);
            alert(`✅ تم نسخ الرابط العام!\n\n${publicLink}\n\nيمكنك إرساله لأي شخص لمشاهدة حساباتك`);
        } catch (err) {
            alert(`انسخ الرابط يدوياً:\n${publicLink}`);
        }
    };
}