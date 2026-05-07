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
let isSignupMode = false;

// إظهار/إخفاء حقل الاسم عند الضغط على زر إنشاء حساب
if (showSignupBtn) {
    showSignupBtn.onclick = () => {
        if (isSignupMode) {
            // العودة إلى وضع تسجيل الدخول
            isSignupMode = false;
            signupName.style.display = "none";
            showSignupBtn.textContent = "إنشاء حساب جديد";
            showSignupBtn.style.backgroundColor = "#28a745";
            loginBtn.textContent = "تسجيل الدخول";
            loginBtn.style.backgroundColor = "#2a5298";
            authMessage.innerText = '';
        } else {
            // الدخول في وضع إنشاء حساب
            isSignupMode = true;
            signupName.style.display = "block";
            signupName.focus();
            showSignupBtn.textContent = "إلغاء";
            showSignupBtn.style.backgroundColor = "#dc3545";
            loginBtn.textContent = "✅ تأكيد إنشاء الحساب";
            loginBtn.style.backgroundColor = "#28a745";
            authMessage.innerText = '📝 أدخل اسمك ثم اضغط تأكيد إنشاء الحساب';
        }
    };
}

// مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        accountsRef = collection(db, 'accounts');
        
        await loadUserProfile();
        await loadAccounts();
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        accountsList.innerHTML = '';
        // إعادة تعيين
        isSignupMode = false;
        signupName.style.display = "none";
        signupName.value = "";
        showSignupBtn.textContent = "إنشاء حساب جديد";
        showSignupBtn.style.backgroundColor = "#28a745";
        loginBtn.textContent = "تسجيل الدخول";
        loginBtn.style.backgroundColor = "#2a5298";
        authMessage.innerText = '';
    }
});

// تحميل اسم المستخدم
async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        currentProfileName = userDoc.exists() ? (userDoc.data().name || "المستخدم") : "المستخدم";
        if (profileNameSpan) profileNameSpan.innerText = currentProfileName;
    } catch (error) {
        currentProfileName = "المستخدم";
        if (profileNameSpan) profileNameSpan.innerText = currentProfileName;
    }
}

// حفظ اسم المستخدم
async function saveUserProfile(name) {
    if (!currentUser) return false;
    try {
        await setDoc(doc(db, 'users', currentUser.uid), {
            name: name,
            email: currentUser.email,
            updatedAt: new Date()
        }, { merge: true });
        currentProfileName = name;
        if (profileNameSpan) profileNameSpan.innerText = name;
        return true;
    } catch (error) {
        alert("حدث خطأ: " + error.message);
        return false;
    }
}

// تعديل الاسم
if (editProfileBtn) {
    editProfileBtn.onclick = async () => {
        const newName = prompt("أدخل الاسم الذي سيظهر في صفحتك العامة:", currentProfileName);
        if (newName && newName.trim() !== "") {
            await saveUserProfile(newName.trim());
            alert("✅ تم تحديث اسم المستخدم!");
        }
    };
}

// معالجة زر تسجيل الدخول / إنشاء الحساب
if (loginBtn) {
    loginBtn.onclick = async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            authMessage.innerText = '❌ الرجاء إدخال البريد الإلكتروني وكلمة المرور';
            return;
        }
        
        if (isSignupMode) {
            // إنشاء حساب جديد
            const name = signupName.value.trim();
            if (!name) {
                authMessage.innerText = '❌ الرجاء إدخال اسم المستخدم';
                return;
            }
            if (password.length < 6) {
                authMessage.innerText = '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل';
                return;
            }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    name: name,
                    email: email,
                    createdAt: new Date()
                });
                authMessage.innerText = '✅ تم إنشاء الحساب بنجاح!';
                // إعادة تعيين
                isSignupMode = false;
                signupName.style.display = "none";
                signupName.value = "";
                showSignupBtn.textContent = "إنشاء حساب جديد";
                showSignupBtn.style.backgroundColor = "#28a745";
                loginBtn.textContent = "تسجيل الدخول";
                loginBtn.style.backgroundColor = "#2a5298";
            } catch (error) {
                let errorMsg = error.code === 'auth/email-already-in-use' ? 'هذا البريد مستخدم بالفعل' : error.message;
                authMessage.innerText = '❌ ' + errorMsg;
            }
        } else {
            // تسجيل الدخول
            try {
                await signInWithEmailAndPassword(auth, email, password);
                authMessage.innerText = '';
            } catch (error) {
                authMessage.innerText = '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';
            }
        }
    };
}

// تسجيل الخروج
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await signOut(auth);
    };
}

// تحميل الحسابات
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
            <button class="edit">✏️ تعديل</button>
            <button class="delete">🗑️ حذف</button>
        </div>
    `;
    card.querySelector('.edit').onclick = () => editAccount(id, account);
    card.querySelector('.delete').onclick = () => deleteAccount(id);
    accountsList.appendChild(card);
}

// إضافة حساب
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
    const newPlatform = prompt('اسم المنصة:', oldAccount.platform);
    if (newPlatform === null) return;
    const newUsername = prompt('اسم المستخدم:', oldAccount.username);
    if (newUsername === null) return;
    const newUrl = prompt('الرابط:', oldAccount.url);
    if (newUrl === null) return;
    await updateDoc(doc(db, 'accounts', id), {
        platform: newPlatform,
        username: newUsername,
        url: newUrl
    });
    loadAccounts();
}

// حذف حساب
async function deleteAccount(id) {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
        await deleteDoc(doc(db, 'accounts', id));
        loadAccounts();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}

// زر المشاركة
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.onclick = async () => {
        if (!currentUser) return;
        const uid = currentUser.uid;
        const shortId = uid.substring(0, 6) + uid.substring(uid.length - 4);
        const publicLink = `https://rawan-fahad.github.io/abdualrahman/public/?id=${shortId}`;
        try {
            const linksRef = collection(db, 'shortLinks');
            const q = query(linksRef, where("shortId", "==", shortId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(linksRef, { shortId: shortId, userId: uid, userName: currentProfileName, createdAt: new Date() });
            }
            await navigator.clipboard.writeText(publicLink);
            alert(`✅ تم نسخ الرابط!\n${publicLink}`);
        } catch (err) {
            alert(`انسخ الرابط يدوياً:\n${publicLink}`);
        }
    };
}
