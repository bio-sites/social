import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA4sIfT6u6n8XWRPn2dLktlKfEP16VPw40",
    authDomain: "my-social-links-ede8c.firebaseapp.com",
    projectId: "my-social-links-ede8c",
    storageBucket: "my-social-links-ede8c.firebasestorage.app",
    messagingSenderId: "515940881963",
    appId: "1:515940881963:web:5093dc75b133024d52bc6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const container = document.getElementById('accountsListPublic');
const usernameDisplaySpan = document.getElementById('usernameDisplay');
const fullUrl = window.location.href;

let shortId = null;
const match = fullUrl.match(/[?&]id=([^&]+)/);
if (match && match[1]) {
    shortId = match[1];
}

if (!shortId) {
    container.innerHTML = '<p style="color:red;">❌ رابط غير صالح</p>';
    if (usernameDisplaySpan) usernameDisplaySpan.innerText = "غير معروف";
} else {
    container.innerHTML = '<p>⏳ جاري التحميل...</p>';
    findUserIdByShortId(shortId);
}

async function findUserIdByShortId(shortId) {
    try {
        const q = query(collection(db, 'shortLinks'), where("shortId", "==", shortId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:red;">❌ رابط غير صالح</p>';
            if (usernameDisplaySpan) usernameDisplaySpan.innerText = "غير موجود";
            return;
        }
        
        const data = snapshot.docs[0].data();
        const userId = data.userId;
        const userName = data.userName || "المستخدم";
        
        if (usernameDisplaySpan) usernameDisplaySpan.innerText = userName;
        
        // تحميل ترتيب المنصات
        const orderDoc = await getDoc(doc(db, 'platformsOrder', userId));
        let platformsOrder = orderDoc.exists() ? orderDoc.data().order : [];
        
        await loadAccounts(userId, platformsOrder);
    } catch (err) {
        container.innerHTML = `<p style="color:red;">⚠️ خطأ: ${err.message}</p>`;
    }
}

async function loadAccounts(uid, platformsOrder) {
    try {
        const q = query(collection(db, "accounts"), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p>😞 لا توجد حسابات منشورة</p>';
            return;
        }
        
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
        
        // ترتيب الحسابات داخل كل منصة حسب orderIndex
        for (const platform in accountsByPlatform) {
            accountsByPlatform[platform].sort((a, b) => {
                const aIndex = a.orderIndex !== undefined ? a.orderIndex : 0;
                const bIndex = b.orderIndex !== undefined ? b.orderIndex : 0;
                return aIndex - bIndex;
            });
        }
        
        // ترتيب المنصات
        const orderedPlatforms = platformsOrder.filter(p => accountsByPlatform[p]);
        const otherPlatforms = Object.keys(accountsByPlatform).filter(p => !orderedPlatforms.includes(p));
        const finalPlatforms = [...orderedPlatforms, ...otherPlatforms];
        
        container.innerHTML = '';
        
        for (const
