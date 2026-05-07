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

// إظهار حقل الاسم عند الضغط على "إنشاء حساب جديد"
if (showSignupBtn) {
    showSignupBtn.onclick = () => {
        signupName.style.display = "block";
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
        
        await loadUserProfile();
        await loadAccounts();
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        accountsList.innerHTML = '';
        signupName.style.display = "none";
        signupName.value = "";
        if (showSignupBtn) showSignupBtn.style.display = "block";
    }
});

// تحميل اسم المستخدم من Firebase
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
        console.error("خطأ:", error);
        currentProfileName = "المستخدم";
        if (profileNameSpan) profileNameSpan.innerText = currentProfileName;
    }
}

// حفظ اسم المستخدم في Firebase
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
        console.error("خطأ:", error);
        alert("حدث خطأ: " + error.message);
        return false;
    }
}

// تعديل اسم المستخدم
if (editProfileBtn) {
    editProfileBtn.onclick = async () => {
        const newName = prompt("أدخل الاسم الذي سيظهر في صفحتك العامة:", currentProfileName);
        if (newName && newName.trim() !== "") {
            await saveUserProfile(newName.trim());
            alert("✅ تم تحديث اسم المستخدم!");
        }
    };
}

// تسجيل الدخول
loginBtn.onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ: ' + error.message;
    }
};

// إنشاء حساب جديد
signupBtn = document.createElement('button');
signupBtn.id = 'signupBtn';
signupBtn.innerText = 'تأكيد إنشاء الحساب';
signupBtn.style.backgroundColor = '#28a745';
signupBtn.style.marginTop = '10px';
signupBtn.style.display = 'none';
authForm.appendChild(signupBtn);

signupBtn.onclick = async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const name = signupName.value;
    
    if (!name || name.trim() === "") {
        authMessage.innerText = 'الرجاء إدخال اسم المستخدم';
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: name.trim(),
            email: email,
            createdAt: new Date()
        });
        authMessage.innerText = '';
    } catch (error) {
        authMessage.innerText = 'خطأ: ' + error.message;
    }
};

// عند ظهور حقل الاسم، نظهر زر التأكيد
signupName.addEventListener('input', () => {
    if (signupName.value.trim() !== "") {
        signupBtn.style.display = 'block';
    } else {
        signupBtn.style.display = 'none';
    }
});

// تسجيل الخروج
logoutBtn.onclick = async () => {
    await signOut(auth);
};

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
    if (confirm('هل أنت متأكد؟')) {
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
                await addDoc(linksRef, {
                    shortId: shortId,
                    userId: uid,
                    userName: currentProfileName,
                    createdAt: new Date()
                });
            } else {
                await updateDoc(doc(db, 'shortLinks', snapshot.docs[0].id), {
                    userName: currentProfileName,
                    updatedAt: new Date()
                });
            }
            
            await navigator.clipboard.writeText(publicLink);
            alert(`✅ تم نسخ الرابط!\n${publicLink}`);
        } catch (err) {
            alert(`انسخ الرابط يدوياً:\n${publicLink}`);
        }
    };
}
