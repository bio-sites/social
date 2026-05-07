import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// عناصر DOM
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupName = document.getElementById('signupName');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsList = document.getElementById('accountsList');
const authMessage = document.getElementById('authMessage');
const profileNameSpan = document.getElementById('profileName');
const editProfileBtn = document.getElementById('editProfileBtn');

let currentUser = null;
let accountsRef = null;
let currentProfileName = "";

// إظهار حقل الاسم عند الضغط على "إنشاء حساب جديد"
if (showSignupBtn) {
    showSignupBtn.onclick = () => {
        signupName.style.display = "block";
        signupName.placeholder = "الاسم الذي سيظهر في صفحتك العامة";
        signupName.focus();
        showSignupBtn.style.display = "none";
    };
}

// مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        accountsRef = collection(db, 'accounts');
        
        // تحميل اسم المستخدم من Firestore
        await loadUserProfile();
        await loadAccounts();
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        accountsList.innerHTML = '';
        // إعادة تعيين نموذج التسجيل
        signupName.style.display = "none";
        signupName.value = "";
        if (showSignupBtn) showSignupBtn.style.display = "block";
    }
});

// تحميل ملف المستخدم (الاسم)
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            currentProfileName = userDoc.data().name || "المستخدم";
        } else {
            currentProfileName = "المستخدم";
        }
        
        if (profileNameSpan) profileNameSpan.innerText = currentProfileName;
    } catch (error) {
        console.error("خطأ في تحميل الملف الشخصي:", error);
        currentProfileName = "المستخدم";
        if (profileNameSpan) profileNameSpan.innerText = currentProfileName;
    }
}

// حفظ اسم المستخدم في Firestore
async function saveUserProfile(name) {
    if (!currentUser) return false;
    
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, {
            name: name,
            email: currentUser.email,
            updatedAt: new Date()
        }, { merge: true });
        
        currentProfileName = name;
        if (profileNameSpan) profileNameSpan.innerText = name;
        return true;
    } catch (error) {
        console.error("خطأ في حفظ الملف الشخصي:", error);
        alert("حدث خطأ أثناء حفظ الاسم: " + error.message);
        return false;
    }
}

// تعديل اسم المستخدم
if (editProfileBtn) {
    editProfileBtn.onclick = async () => {
        const newName = prompt("أدخل الاسم الذي سيظهر في صفحتك العامة:", currentProfileName);
        if (newName && newName.trim() !== "") {
            const success = await saveUserProfile(newName.trim());
            if (success) {
                alert("✅ تم تحديث اسم المستخدم بنجاح!");
                
                // تحديث الرابط العام إذا كان مخزناً مسبقاً
                const shortId = currentUser.uid.substring(0, 6) + currentUser.uid.substring(currentUser.uid.length - 4);
                const linksRef = collection(db, 'shortLinks');
                const q = query(linksRef, where("shortId", "==", shortId));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const linkDoc = snapshot.docs[0];
                    await updateDoc(doc(db, 'shortLinks', linkDoc.id), {
                        userName: newName.trim(),
                        updatedAt: new Date()
                    });
                }
            }
        }
    };
}

// تسجيل الدخول
const login = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ في تسجيل الدخول: ' + error.message;
    }
};

// إنشاء حساب جديد (مع اسم المستخدم)
const signup = async (email, password, displayName) => {
    if (!displayName || displayName.trim() === "") {
        authMessage.innerText = 'الرجاء إدخال اسم المستخدم';
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // حفظ اسم المستخدم في Firestore
        await setDoc(doc(db, 'users', user.uid), {
            name: displayName.trim(),
            email: email,
            createdAt: new Date()
        });
        
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ في إنشاء الحساب: ' + error.message;
    }
};

// تسجيل الخروج
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await signOut(auth);
    };
}

// معالجة النموذج
if (authForm) {
    authForm.onsubmit = (e) => e.preventDefault();
}
if (loginBtn) {
    loginBtn.onclick = () => login(emailInput.value, passwordInput.value);
}
if (signupBtn) {
    signupBtn.onclick = () => signup(emailInput.value, passwordInput.value, signupName.value);
}

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
if (addAccountBtn) {
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
}

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
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== زر المشاركة - الرابط العام ==========
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.onclick = async () => {
        if (!currentUser) {
            alert('الرجاء تسجيل الدخول أولاً');
            return;
        }
        
        const uid = currentUser.uid;
        const shortId = uid.substring(0, 6) + uid.substring(uid.length - 4);
        const publicLink = `https://rawan-fahad.github.io/abdualrahman/public/?id=${shortId}`;
        
        console.log("الرابط العام:", publicLink);
        
        // حفظ العلاقة بين المعرف القصير والـ UID الكامل واسم المستخدم
        try {
            const linksRef = collection(db, 'shortLinks');
            const q = query(linksRef, where("shortId", "==", shortId));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                await addDoc(linksRef, {
                    shortId: shortId,
                    userId: uid,
                    userName: currentProfileName,
                    createdAt: new Date()
                });
            } else {
                // تحديث الاسم إذا تغير
                await updateDoc(doc(db, 'shortLinks', snapshot.docs[0].id), {
                    userName: currentProfileName,
                    updatedAt: new Date()
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
