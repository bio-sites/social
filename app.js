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
let sortable = null;

const defaultPlatforms = ['TikTok', 'YouTube', 'Instagram', 'Twitter', 'Snapchat', 'Facebook'];
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
        console.error("خطأ:", error);
        userPlatformsOrder = [...defaultPlatforms];
    }
}

async function loadCustomPlatforms() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        const existingPlatforms = new Set();
        snapshot.forEach(doc => {
            existingPlatforms.add(doc.data().platform);
        });
        customPlatforms = [...existingPlatforms].filter(p => !defaultPlatforms.includes(p));
        updatePlatformSelect();
    } catch (error) {
        console.error("خطأ:", error);
    }
}

function updatePlatformSelect() {
    if (!platformSelect) return;
    platformSelect.innerHTML = '<option value="new">+ إضافة منصة جديدة</option>';
    const orderedPlatforms = [...userPlatformsOrder, ...customPlatforms.filter(p => !userPlatformsOrder.includes(p))];
    orderedPlatforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = getPlatformIcon(platform) + ' ' + platform;
        platformSelect.appendChild(option);
    });
}

function getPlatformIcon(platform) {
    const icons = {
        'TikTok': '📱', 'YouTube': '🎥', 'Instagram': '📸', 
        'Twitter': '🐦', 'Snapchat': '👻', 'Facebook': '📘'
    };
    return icons[platform] || '🔗';
}

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

if (editProfileBtn) {
    editProfileBtn.onclick = async () => {
        const newName = prompt("أدخل الاسم الذي سيظهر في صفحتك العامة:", currentProfileName);
        if (newName && newName.trim() !== "") {
            await saveUserProfile(newName.trim());
            alert("✅ تم تحديث اسم المستخدم!");
        }
    };
}

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

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await signOut(auth);
    };
}

async function saveAccountsOrder(platform, accountIds) {
    if (!currentUser) return;
    for (let i = 0; i < accountIds.length; i++) {
        await updateDoc(doc(db, 'accounts', accountIds[i]), { orderIndex: i });
    }
}

async function loadAccounts() {
    if (!currentUser) return;
    const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    
    const accountsByPlatform = {};
    snapshot.forEach(doc => {
        const account = doc.data();
        account.id = doc.id;
        if (!accountsByPlatform[account.platform]) {
            accountsByPlatform[account.platform] = [];
        }
        accountsByPlatform[account.platform].push(account);
    });
    
    for (const platform in accountsByPlatform) {
        accountsByPlatform[platform].sort((a, b) => {
            const aIndex = a.orderIndex !== undefined ? a.orderIndex : 0;
            const bIndex = b.orderIndex !== undefined ? b.orderIndex : 0;
            return aIndex - bIndex;
        });
    }
    
    const orderedPlatforms = userPlatformsOrder.filter(p => accountsByPlatform[p]);
    const otherPlatforms = Object.keys(accountsByPlatform).filter(p => !orderedPlatforms.includes(p));
    const finalPlatforms = [...orderedPlatforms, ...otherPlatforms];
    
    accountsList.innerHTML = '';
    
    for (const platform of finalPlatforms) {
        const accounts = accountsByPlatform[platform];
        if (!accounts || accounts.length === 0) continue;
        
        // إنشاء عنصر الأكورديون
        const accordion = document.createElement('div');
        accordion.className = 'platform-accordion';
        
        // رأس الأكورديون
        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.innerHTML = `
            <h3>
                <span>${getPlatformIcon(platform)} ${platform}</span>
                <span class="arrow">▼</span>
            </h3>
            <div class="platform-actions">
                <button class="addAccountBtn" data-platform="${platform}">➕ إضافة</button>
            </div>
        `;
        
        // محتوى الأكورديون (الحسابات)
        const content = document.createElement('div');
        content.className = 'accordion-content';
        
        const accountsContainer = document.createElement('div');
        accountsContainer.className = 'accounts-list';
        accountsContainer.setAttribute('data-platform', platform);
        
        accounts.forEach((account, idx) => {
            const isPrimary = idx === 0;
            const card = document.createElement('div');
            card.className = 'account-card';
            card.setAttribute('data-account-id', account.id);
            card.innerHTML = `
                <div class="drag-handle">☰</div>
                <div class="account-info">
                    ${isPrimary ? '<div class="primary-badge">⭐ الحساب الأساسي</div>' : ''}
                    <div class="username">@${escapeHtml(account.username)}</div>
                    <a href="${account.url}" target="_blank" class="account-link">🔗 زيارة الحساب</a>
                </div>
                <div class="account-actions">
                    <button class="edit" data-id="${account.id}" data-username="${account.username}" data-url="${account.url}">✏️</button>
                    <button class="delete" data-id="${account.id}">🗑️</button>
                    ${!isPrimary ? `<button class="set-primary" data-id="${account.id}" data-platform="${platform}">⭐ اجعل أساسي</button>` : ''}
                </div>
            `;
            accountsContainer.appendChild(card);
        });
        
        content.appendChild(accountsContainer);
        accordion.appendChild(header);
        accordion.appendChild(content);
        accountsList.appendChild(accordion);
        
        // تفعيل السحب والإفلات للحسابات
        if (accounts.length >= 2) {
            new Sortable(accountsContainer, {
                animation: 200,
                handle: '.drag-handle',
                direction: 'vertical',
                onEnd: async () => {
                    const items = accountsContainer.children;
                    const newOrderIds = [];
                    for (let i = 0; i < items.length; i++) {
                        const accountId = items[i].getAttribute('data-account-id');
                        if (accountId) newOrderIds.push(accountId);
                    }
                    await saveAccountsOrder(platform, newOrderIds);
                    await loadAccounts();
                }
            });
        }
        
        // تفعيل حدث الفتح/الإغلاق
        header.onclick = (e) => {
            if (e.target.classList.contains('addAccountBtn') || e.target.closest('.addAccountBtn')) return;
            content.classList.toggle('open');
            const arrow = header.querySelector('.arrow');
            if (arrow) arrow.classList.toggle('open');
        };
        
        // فتح الأكورديون الأول افتراضياً
        if (finalPlatforms.indexOf(platform) === 0) {
            content.classList.add('open');
            const arrow = header.querySelector('.arrow');
            if (arrow) arrow.classList.add('open');
        }
    }
    
    // إضافة الأحداث
    document.querySelectorAll('.addAccountBtn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            addAccountToPlatform(btn.dataset.platform);
        };
    });
    
    document.querySelectorAll('.edit').forEach(btn => {
        btn.onclick = () => editAccount(btn.dataset.id, btn.dataset.username, btn.dataset.url);
    });
    
    document.querySelectorAll('.delete').forEach(btn => {
        btn.onclick = () => deleteAccount(btn.dataset.id);
    });
    
    document.querySelectorAll('.set-primary').forEach(btn => {
        btn.onclick = () => setPrimaryAccount(btn.dataset.id, btn.dataset.platform);
    });
}

async function setPrimaryAccount(accountId, platform) {
    const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid), where("platform", "==", platform));
    const snapshot = await getDocs(q);
    const accounts = [];
    snapshot.forEach(doc => accounts.push({ id: doc.id, data: doc.data() }));
    
    const otherAccounts = accounts.filter(a => a.id !== accountId);
    const newOrder = [{ id: accountId }, ...otherAccounts];
    
    for (let i = 0; i < newOrder.length; i++) {
        await updateDoc(doc(db, 'accounts', newOrder[i].id), { orderIndex: i });
    }
    
    alert(`✅ تم تعيين هذا الحساب كأساسي لمنصة ${platform}`);
    await loadAccounts();
}

async function addAccountToPlatform(platform) {
    const username = prompt(`أدخل اسم المستخدم في ${platform}:`);
    if (!username) return;
    const url = prompt(`أدخل الرابط الكامل للحساب:`);
    if (!url) return;
    
    try {
        const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid), where("platform", "==", platform));
        const snapshot = await getDocs(q);
        
        await addDoc(collection(db, 'accounts'), {
            userId: currentUser.uid,
            platform: platform,
            username: username,
            url: url,
            createdAt: new Date(),
            orderIndex: snapshot.size
        });
        await loadCustomPlatforms();
        await loadAccounts();
        alert('✅ تم إضافة الحساب بنجاح!');
    } catch (error) {
        alert('فشل الإضافة: ' + error.message);
    }
}

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
            const q = query(collection(db, 'accounts'), where("userId", "==", currentUser.uid), where("platform", "==", platform));
            const snapshot = await getDocs(q);
            
            await addDoc(collection(db, 'accounts'), {
                userId: currentUser.uid,
                platform: platform,
                username: username,
                url: url,
                createdAt: new Date(),
                orderIndex: snapshot.size
            });
            
            accountUsername.value = '';
            accountUrl.value = '';
            platformSelect.value = 'TikTok';
            newPlatformInput.style.display = 'none';
            newPlatformInput.value = '';
            
            await loadCustomPlatforms();
            await loadPlatformsOrder();
            await loadAccounts();
            alert('✅ تم إضافة الحساب بنجاح!');
        } catch (error) {
            alert('فشل الإضافة: ' + error.message);
        }
    };
}

async function editAccount(id, oldUsername, oldUrl) {
    const newUsername = prompt('اسم المستخدم:', oldUsername);
    if (newUsername === null) return;
    const newUrl = prompt('الرابط:', oldUrl);
    if (newUrl === null) return;
    await updateDoc(doc(db, 'accounts', id), { username: newUsername, url: newUrl });
    await loadAccounts();
    alert('✅ تم تعديل الحساب بنجاح!');
}

async function deleteAccount(id) {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
        await deleteDoc(doc(db, 'accounts', id));
        await loadAccounts();
        alert('✅ تم حذف الحساب بنجاح!');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}

// ترتيب المنصات
if (orderPlatformsBtn) {
    orderPlatformsBtn.onclick = async () => {
        if (!currentUser) return;
        await loadCustomPlatforms();
        const allPlats = [...userPlatformsOrder];
        customPlatforms.forEach(p => {
            if (!allPlats.includes(p)) allPlats.push(p);
        });
        
        sortablePlatformsList.innerHTML = '';
        allPlats.forEach(platform => {
            const item = document.createElement('div');
            item.setAttribute('data-platform', platform);
            item.style.cssText = 'background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: grab; border: 1px solid #dee2e6;';
            item.innerHTML = `
                <span>${getPlatformIcon(platform)} ${platform}</span>
                <span style="cursor:grab;">☰</span>
            `;
            sortablePlatformsList.appendChild(item);
        });
        
        if (sortable) sortable.destroy();
        sortable = new Sortable(sortablePlatformsList, { animation: 200, handle: 'div', direction: 'vertical' });
        orderModal.style.display = 'flex';
    };
}

if (saveOrderBtn) {
    saveOrderBtn.onclick = async () => {
        if (!currentUser) return;
        const items = sortablePlatformsList.children;
        const newOrder = [];
        for (let i = 0; i < items.length; i++) {
            const platform = items[i].getAttribute('data-platform');
            if (platform) newOrder.push(platform);
        }
        if (newOrder.length > 0) {
            userPlatformsOrder = newOrder;
            await setDoc(doc(db, 'platformsOrder', currentUser.uid), { order: userPlatformsOrder });
            orderModal.style.display = 'none';
            await loadAccounts();
            alert('✅ تم حفظ ترتيب المنصات بنجاح!');
        }
    };
}

if (closeOrderBtn) {
    closeOrderBtn.onclick = () => {
        orderModal.style.display = 'none';
        if (sortable) sortable.destroy();
    };
}

// زر المشاركة
if (shareBtn) {
    shareBtn.onclick = async () => {
        if (!currentUser) return;
        const shortId = currentUser.uid.substring(0, 6) + currentUser.uid.substring(currentUser.uid.length - 4);
        const publicLink = `https://bio-sites.github.io/social/public/?id=${shortId}`;
        try {
            const linksRef = collection(db, 'shortLinks');
            const q = query(linksRef, where("shortId", "==", shortId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(linksRef, { shortId: shortId, userId: currentUser.uid, userName: currentProfileName, createdAt: new Date() });
            }
            await navigator.clipboard.writeText(publicLink);
            alert(`✅ تم نسخ الرابط!\n${publicLink}`);
        } catch (err) {
            alert(`انسخ الرابط يدوياً:\n${publicLink}`);
        }
    };
}
