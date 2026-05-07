import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// استخراج المعرف القصير
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
        await loadAccounts(userId);
        
    } catch (err) {
        container.innerHTML = `<p style="color:red;">⚠️ خطأ: ${err.message}</p>`;
    }
}

async function loadAccounts(uid) {
    try {
        const q = query(collection(db, "accounts"), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p>😞 لا توجد حسابات منشورة</p>';
            return;
        }
        
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement("div");
            card.className = "account-card";
            card.innerHTML = `
                <h3>📱 ${escapeHtml(data.platform)}</h3>
                <p>@${escapeHtml(data.username)}</p>
                <a href="${data.url}" target="_blank">🔗 زيارة الحساب</a>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:red;">⚠️ خطأ: ${err.message}</p>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}
