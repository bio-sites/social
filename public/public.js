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
const usernameSpan = document.getElementById('usernameDisplay');
const urlParams = new URLSearchParams(window.location.search);
const shortId = urlParams.get('id');

console.log("رابط المشاركة:", window.location.href);
console.log("المعرف القصير:", shortId);

if (!shortId) {
    container.innerHTML = '<p style="color:red; text-align:center;">❌ رابط غير صالح</p>';
    if (usernameSpan) usernameSpan.innerText = "غير معروف";
} else {
    container.innerHTML = '<p style="text-align:center;">⏳ جاري التحميل...</p>';
    loadUserData(shortId);
}

async function loadUserData(shortId) {
    try {
        const q = query(collection(db, 'shortLinks'), where("shortId", "==", shortId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:red; text-align:center;">❌ رابط غير صالح</p>';
            return;
        }
        
        const data = snapshot.docs[0].data();
        const userId = data.userId;
        const userName = data.userName || "المستخدم";
        
        if (usernameSpan) usernameSpan.innerText = userName;
        
        const orderDoc = await getDoc(doc(db, 'platformsOrder', userId));
        const platformsOrder = orderDoc.exists() ? orderDoc.data().order : [];
        
        await loadAccounts(userId, platformsOrder);
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red; text-align:center;">خطأ: ${err.message}</p>`;
    }
}

async function loadAccounts(userId, platformsOrder) {
    try {
        const q = query(collection(db, "accounts"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;">لا توجد حسابات منشورة</p>';
            return;
        }
        
        const accountsByPlatform = {};
        snapshot.forEach(doc => {
            const acc = doc.data();
            if (!accountsByPlatform[acc.platform]) accountsByPlatform[acc.platform] = [];
            accountsByPlatform[acc.platform].push(acc);
        });
        
        for (const p in accountsByPlatform) {
            accountsByPlatform[p].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        }
        
        const ordered = platformsOrder.filter(p => accountsByPlatform[p]);
        const others = Object.keys(accountsByPlatform).filter(p => !ordered.includes(p));
        const finalPlatforms = [...ordered, ...others];
        
        container.innerHTML = '';
        
        for (let i = 0; i < finalPlatforms.length; i++) {
            const platform = finalPlatforms[i];
            const accounts = accountsByPlatform[platform];
            if (!accounts) continue;
            
            const accordion = document.createElement('div');
            accordion.className = 'platform-accordion';
            
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerHTML = `<h3><span>${getIcon(platform)} ${platform}</span><span class="arrow">▼</span></h3>`;
            
            const content = document.createElement('div');
            content.className = 'accordion-content';
            
            const list = document.createElement('div');
            list.className = 'accounts-list';
            
            accounts.forEach((acc, idx) => {
                const card = document.createElement('div');
                card.className = 'account-card';
                card.innerHTML = `
                    ${idx === 0 ? '<div class="primary-badge">⭐ الحساب الأساسي</div>' : ''}
                    <div class="username">@${escapeHtml(acc.username)}</div>
                    <a href="${acc.url}" target="_blank" class="account-link">🔗 زيارة الحساب</a>
                `;
                list.appendChild(card);
            });
            
            content.appendChild(list);
            accordion.appendChild(header);
            accordion.appendChild(content);
            container.appendChild(accordion);
            
            if (i === 0) {
                content.classList.add('open');
                const arrow = header.querySelector('.arrow');
                if (arrow) arrow.classList.add('open');
            }
            
            header.onclick = () => {
                content.classList.toggle('open');
                const arrow = header.querySelector('.arrow');
                if (arrow) arrow.classList.toggle('open');
            };
        }
        
        console.log("تم عرض الحسابات كقوائم منسدلة بنجاح!");
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red;">خطأ: ${err.message}</p>`;
    }
}

function getIcon(platform) {
    const icons = {
        'TikTok': '📱', 'YouTube': '🎥', 'Instagram': '📸',
        'Twitter': '🐦', 'Snapchat': '👻', 'Facebook': '📘'
    };
    return icons[platform] || '🔗';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
