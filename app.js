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
const shareBtn = document.getElementById('shareBtn');
const orderPlatformsBtn = document.getElementById('orderPlatformsBtn');
const orderModal = document.getElementById('orderModal');
const sortablePlatformsList = document.getElementById('sortablePlatformsList');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const closeOrderBtn = document.getElementById('closeOrderBtn');
const platformSelect = document.getElementById('platformSelect');
const newPlatformInput = document.getElementById('newPlatform');
const accountUsername = document.getElementById('accountUsername');
const accountUrl = document.getElementById('accountUrl');

let currentUser = null;
let currentProfileName = "";
let isSignupMode = false;
let userPlatformsOrder = [];

// المنصات الأساسية المحددة مسبقاً
const defaultPlatforms = ['TikTok', 'YouTube', 'Instagram', 'Twitter', 'Snapchat', 'Facebook'];
let allPlatforms = [...defaultPlatforms];
let customPlatforms = [];

// إظهار/إخفاء حقل المنصة الجديدة
if (platformSelect) {
    platformSelect.onchange = () => {
        if (platformSelect.value === 'new') {
            newPlatformInput.style.display = 'block';
            newPlatformInput.placeholder = 'مثال: Telegram, Discord, LinkedIn';
        } else {
            newPlatformInput.style.display = 'none';
            newPlatformInput.value = '';
        }
    };
}

// إظهار/إخفاء حقل الاسم عند الضغط على إنشاء حساب
if (showSignupBtn) {
    showSignupBtn.onclick = () => {
        if (isSignupMode) {
            isSignupMode = false;
            signupName.style.display = "none";
            showSignupBtn.textContent = "إنشاء حساب جديد";
            showSignupBtn.style.backgroundColor = "#28a745";
            loginBtn.textContent = "تسجيل الدخول";
            loginBtn.style.backgroundColor = "#2a5298";
            authMessage.innerText = '';
        } else {
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
        await loadUserProfile();
        await loadPlatformsOrder();
        await loadAccounts();
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        accountsList.innerHTML = '';
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

// تحميل ترتيب المنصات من Firebase
async function loadPlatformsOrder() {
    if (!currentUser) return;
    try {
        const orderDoc = await getDoc(doc(db, 'platformsOrder', currentUser.uid));
        if (orderDoc.exists()) {
            userPlatformsOrder = orderDoc.data().order || [];
        } else {
            userPlatformsOrder = [...defaultPlatforms];
            await setDoc(doc(db, 'platformsOrder', currentUser.uid), { order: userPlatformsOrder });
        }
        await loadCustomPlatforms();
    } catch (error) {
        console.error("خطأ في تحميل الترتيب:", error);
        userPlatformsOrder = [...defaultPlatforms];
    }
}

// تحميل المنصات المخصصة من الحسابات
async function loadCustomPlatforms() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        const existingPlatforms = new Set();
        snapshot.forEach(doc => {
            const platform = doc.data().platform;
            existingPlatforms.add(platform);
        });
        
        // إضافة المنصات المخصصة إلى القائمة
        customPlatforms = [...existingPlatforms].filter(p => !defaultPlatforms.includes(p));
        allPlatforms = [...defaultPlatforms, ...customPlatforms];
        
        // تحديث قائمة الاختيار
        updatePlatformSelect();
    } catch (error) {
        console.error("خطأ:", error);
    }
}

// تحديث قائمة المنصات في Select
function updatePlatformSelect() {
    if (!platformSelect) return;
    platformSelect.innerHTML = '<option value="new">+ إضافة منصة جديدة</option>';
    const orderedPlatforms = [...userPlatformsOrder, ...customPlatforms.filter(p => !userPlatformsOrder.includes(p))];
    orderedPlatforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        let icon = '';
        switch(platform) {
            case 'TikTok': icon = '📱 '; break;
            case 'YouTube': icon = '🎥 '; break;
            case 'Instagram': icon = '📸 '; break;
            case 'Twitter': icon = '🐦 '; break;
            case 'Snapchat': icon = '👻 '; break;
            case 'Facebook': icon = '📘 '; break;
            default: icon = '🔗 ';
        }
        option.textContent = icon + platform;
        platformSelect.appendChild(option);
    });
}

// تحميل اسم المستخدم
async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
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
                await setDoc(doc(db, 'platformsOrder', userCredential.user.uid), { order: [...defaultPlatforms] });
                authMessage.innerText = '✅ تم إنشاء الحساب بنجاح!';
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

// تحميل وعرض الحسابات (مرتبة حسب المنصة)
async function loadAccounts() {
    if (!currentUser) return;
    const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    
    // تجميع الحسابات حسب المنصة
    const accountsByPlatform = {};
    snapshot.forEach(doc => {
        const account = doc.data();
        account.id = doc.id;
        if (!accountsByPlatform[account.platform]) {
            accountsByPlatform[account.platform] = [];
        }
        accountsByPlatform[account.platform].push(account);
    });
    
    // ترتيب المنصات حسب إعدادات المستخدم
    const orderedPlatforms = userPlatformsOrder.filter(p => accountsByPlatform[p]);
    const otherPlatforms = Object.keys(accountsByPlatform).filter(p => !orderedPlatforms.includes(p));
    const finalPlatforms = [...orderedPlatforms, ...otherPlatforms];
    
    // عرض الحسابات
    accountsList.innerHTML = '';
    for (const platform of finalPlatforms) {
        const accounts = accountsByPlatform[platform];
        if (!accounts || accounts.length === 0) continue;
        
        // إنشاء قسم المنصة
        const platformSection = document.createElement('div');
        platformSection.className = 'platform-section';
        platformSection.style.cssText = 'margin-bottom: 25px; border: 1px solid #ddd; border-radius: 15px; overflow: hidden;';
        
        // رأس المنصة
        const platformHeader = document.createElement('div');
        platformHeader.style.cssText = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;';
        platformHeader.innerHTML = `
            <h3 style="margin:0;">${getPlatformIcon(platform)} ${platform}</h3>
            <div>
                <button class="addAccountToPlatform" data-platform="${platform}" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 20px; padding: 5px 12px; cursor: pointer;">➕ إضافة حساب</button>
                <button class="movePlatformUp" data-platform="${platform}" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 20px; padding: 5px 12px; margin-right: 5px; cursor: pointer;">⬆️</button>
                <button class="movePlatformDown" data-platform="${platform}" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 20px; padding: 5px 12px; margin-right: 5px; cursor: pointer;">⬇️</button>
            </div>
        `;
        
        // حسابات المنصة
        const accountsContainer = document.createElement('div');
        accountsContainer.style.cssText = 'padding: 10px; background: #f8f9fa;';
        
        accounts.forEach((account, idx) => {
            const card = document.createElement('div');
            card.className = 'account-card';
            card.style.cssText = 'background: white; border-radius: 10px; padding: 12px; margin-bottom: 8px; border-right: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center;';
            
            const isPrimary = idx === 0;
            card.innerHTML = `
                <div style="flex:1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${isPrimary ? '<span style="background: gold; color: #333; padding: 2px 8px; border-radius: 20px; font-size: 11px;">⭐ الأساسي</span>' : ''}
                        <p style="margin:0; font-weight:bold;">@${escapeHtml(account.username)}</p>
                    </div>
                    <a href="${account.url}" target="_blank" style="font-size:12px; color:#667eea;">زيارة الرابط</a>
                </div>
                <div>
                    <button class="editAccount" data-id="${account.id}" data-platform="${account.platform}" data-username="${account.username}" data-url="${account.url}" style="background:#ffc107; color:#333; border:none; border-radius:5px; padding:5px 10px; margin:0 3px; cursor:pointer;">✏️</button>
                    <button class="deleteAccount" data-id="${account.id}" style="background:#dc3545; color:white; border:none; border-radius:5px; padding:5px 10px; margin:0 3px; cursor:pointer;">🗑️</button>
                    ${!isPrimary ? `<button class="setPrimaryAccount" data-id="${account.id}" data-platform="${account.platform}" style="background:#28a745; color:white; border:none; border-radius:5px; padding:5px 10px; margin:0 3px; cursor:pointer;">⭐ اجعل أساسي</button>` : ''}
                </div>
            `;
            accountsContainer.appendChild(card);
        });
        
        platformSection.appendChild(platformHeader);
        platformSection.appendChild(accountsContainer);
        accountsList.appendChild(platformSection);
    }
    
    // إضافة الأحداث
    document.querySelectorAll('.addAccountToPlatform').forEach(btn => {
        btn.onclick = () => {
            const platform = btn.dataset.platform;
            addAccountToPlatform(platform);
        };
    });
    
    document.querySelectorAll('.movePlatformUp').forEach(btn => {
        btn.onclick = () => movePlatform(btn.dataset.platform, 'up');
    });
    
    document.querySelectorAll('.movePlatformDown').forEach(btn => {
        btn.onclick = () => movePlatform(btn.dataset.platform, 'down');
    });
    
    document.querySelectorAll('.editAccount').forEach(btn => {
        btn.onclick = () => editAccount(btn.dataset.id, btn.dataset.username, btn.dataset.url);
    });
    
    document.querySelectorAll('.deleteAccount').forEach(btn => {
        btn.onclick = () => deleteAccount(btn.dataset.id);
    });
    
    document.querySelectorAll('.setPrimaryAccount').forEach(btn => {
        btn.onclick = () => setPrimaryAccount(btn.dataset.id, btn.dataset.platform);
    });
}

function getPlatformIcon(platform) {
    const icons = {
        'TikTok': '📱', 'YouTube': '🎥', 'Instagram': '📸', 
        'Twitter': '🐦', 'Snapchat': '👻', 'Facebook': '📘'
    };
    return icons[platform] || '🔗';
}

async function movePlatform(platform, direction) {
    const index = userPlatformsOrder.indexOf(platform);
    if (direction === 'up' && index > 0) {
        [userPlatformsOrder[index-1], userPlatformsOrder[index]] = [userPlatformsOrder[index], userPlatformsOrder[index-1]];
    } else if (direction === 'down' && index < userPlatformsOrder.length - 1) {
        [userPlatformsOrder[index+1], userPlatformsOrder[index]] = [userPlatformsOrder[index], userPlatformsOrder[index+1]];
    }
    await setDoc(doc(db, 'platformsOrder', currentUser.uid), { order: userPlatformsOrder });
    await loadAccounts();
}

async function setPrimaryAccount(accountId, platform) {
    const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid), where("platform", "==", platform));
    const snapshot = await getDocs(q);
    const accounts = [];
    snapshot.forEach(doc => accounts.push({ id: doc.id, data: doc.data() }));
    
    accounts.sort((a,b) => a.data.createdAt?.toDate?.() - b.data.createdAt?.toDate?.());
    const orderedIds = [accountId, ...accounts.filter(a => a.id !== accountId).map(a => a.id)];
    
    alert(`✅ تم تعيين هذا الحساب كأساسي لمنصة ${platform}`);
    await loadAccounts();
}

async function addAccountToPlatform(platform) {
    const username = prompt(`أدخل اسم المستخدم في ${platform}:`);
    if (!username) return;
    const url = prompt(`أدخل الرابط الكامل للحساب (مثل https://${platform.toLowerCase()}.com/username):`);
    if (!url) return;
    
    try {
        await addDoc(collection(db, 'accounts'), {
            userId: currentUser.uid,
            platform: platform,
            username: username,
            url: url,
            createdAt: new Date()
        });
        await loadCustomPlatforms();
        await loadAccounts();
    } catch (error) {
        alert('فشل الإضافة: ' + error.message);
    }
}

// إضافة حساب جديد من النموذج
if (addAccountBtn) {
    addAccountBtn.onclick = async () => {
        let platform = platformSelect.value;
        if (platform === 'new') {
            platform = newPlatformInput.value.trim();
            if (!platform) {
                alert('الرجاء إدخال اسم المنصة الجديدة');
                return;
            }
        }
        
        const username = accountUsername.value.trim();
        const url = accountUrl.value.trim();
        
        if (!username || !url) {
            alert('الرجاء ملء جميع الحقول');
            return;
        }
        
        try {
            await addDoc(collection(db, 'accounts'), {
                userId: currentUser.uid,
                platform: platform,
                username: username,
                url: url,
                createdAt: new Date()
            });
            
            accountUsername.value = '';
            accountUrl.value = '';
            platformSelect.value = 'TikTok';
            newPlatformInput.style.display = 'none';
            newPlatformInput.value = '';
            
            await loadCustomPlatforms();
            await loadPlatformsOrder();
            await loadAccounts();
        } catch (error) {
            alert('فشل الإضافة: ' + error.message);
        }
    };
}

// تعديل حساب
async function editAccount(id, oldUsername, oldUrl) {
    const newUsername = prompt('اسم المستخدم:', oldUsername);
    if (newUsername === null) return;
    const newUrl = prompt('الرابط:', oldUrl);
    if (newUrl === null) return;
    await updateDoc(doc(db, 'accounts', id), { username: newUsername, url: newUrl });
    await loadAccounts();
}

// حذف حساب
async function deleteAccount(id) {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
        await deleteDoc(doc(db, 'accounts', id));
        await loadAccounts();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}

// زر ترتيب المنصات
if (orderPlatformsBtn) {
    orderPlatformsBtn.onclick = async () => {
        await loadCustomPlatforms();
        sortablePlatformsList.innerHTML = '';
        const allPlats = [...userPlatformsOrder, ...customPlatforms.filter(p => !userPlatformsOrder.includes(p))];
        allPlats.forEach(platform => {
            const item = document.createElement('div');
            item.style.cssText = 'background: #f0f0f0; padding: 10px; margin: 5px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: grab;';
            item.innerHTML = `
                <span>${getPlatformIcon(platform)} ${platform}</span>
                <span style="cursor:grab;">☰</span>
            `;
            sortablePlatformsList.appendChild(item);
        });
        orderModal.style.display = 'flex';
    };
}

// حفظ ترتيب المنصات
if (saveOrderBtn) {
    saveOrderBtn.onclick = async () => {
        const items = sortablePlatformsList.children;
        const newOrder = [];
        for (let i = 0; i < items.length; i++) {
            const text = items[i].querySelector('span:first-child').innerText;
            const platform = text.replace(/[📱🎥📸🐦👻📘🔗]/g, '').trim();
            newOrder.push(platform);
        }
        userPlatformsOrder = newOrder;
        await setDoc(doc(db, 'platformsOrder', currentUser.uid), { order: userPlatformsOrder });
        orderModal.style.display = 'none';
        await loadAccounts();
        alert('✅ تم حفظ ترتيب المنصات');
    };
}

if (closeOrderBtn) {
    closeOrderBtn.onclick = () => {
        orderModal.style.display = 'none';
    };
}

// زر المشاركة
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
