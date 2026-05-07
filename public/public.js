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

// قراءة المعرف من الرابط
const urlParams = new URLSearchParams(window.location.search);
let shortId = urlParams.get('id');

// إذا لم يجد id، جرب uid (للتوافق مع الروابط القديمة)
if (!shortId) {
    shortId = urlParams.get('uid');
}

console.log("=== صفحة المشاركة العامة ===");
console.log("الرابط:", window.location.href);
console.log("المعرف المستخرج:", shortId);

if (!shortId) {
    container.innerHTML = '<p style="color:red; text-align:center;">❌ رابط غير صالح - لم يتم العثور على معرف المستخدم</p>';
    if (usernameSpan) usernameSpan.innerText = "غير معروف";
} else {
    container.innerHTML = '<p style="text-align:center;">⏳ جاري تحميل الحسابات...</p>';
    loadUserData(shortId);
}

async function loadUserData(shortId) {
    try {
        let userId = null;
        let userName = null;
        
        // محاولة 1: البحث في shortLinks
        const shortLinksRef = collection(db, 'shortLinks');
        const q = query(shortLinksRef, where("shortId", "==", shortId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            userId = data.userId;
            userName = data.userName;
            console.log("✅ تم العثور في shortLinks - userId:", userId);
        } else {
            // محاولة 2: استخدام المعرف مباشرة
            userId = shortId;
            console.log("⚠️ لم يتم العثور في shortLinks، نستخدم المعرف مباشرة:", userId);
        }
        
        // محاولة 3: جلب اسم المستخدم من مجموعة users (الأهم)
        if (userId) {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.name) {
                    userName = userData.name;
                    console.log("✅ تم جلب اسم المستخدم من users:", userName);
                } else {
                    console.warn("⚠️ مستخدم موجود لكن بدون حقل name");
                }
            } else {
                console.warn("⚠️ لم يتم العثور على مستخدم في مجموعة users");
                // عرض جميع المستخدمين لمساعدتك
                const allUsers = await getDocs(collection(db, 'users'));
                console.log("المستخدمين المتاحين في users:");
                allUsers.forEach(doc => {
                    console.log("  - ID:", doc.id, "الاسم:", doc.data().name);
                });
            }
        }
        
        // إذا لم نجد اسماً، استخدم default
        if (!userName) {
            userName = "المستخدم";
        }
        
        // عرض الاسم في الواجهة
        if (usernameSpan) {
            usernameSpan.innerText = userName;
            console.log("📝 تم عرض الاسم في الواجهة:", userName);
        }
        
        // تحميل ترتيب المنصات
        let platformsOrder = [];
        if (userId) {
            const orderDoc = await getDoc(doc(db, 'platformsOrder', userId));
            if (orderDoc.exists()) {
                platformsOrder = orderDoc.data().order || [];
            }
        }
        
        await loadAccountsWithAccordion(userId, platformsOrder);
        
    } catch (err) {
        console.error("❌ خطأ في loadUserData:", err);
        container.innerHTML = `<p style="color:red;">⚠️ خطأ: ${err.message}</p>`;
        if (usernameSpan) usernameSpan.innerText = "خطأ";
    }
}

async function loadAccountsWithAccordion(userId, platformsOrder) {
    if (!userId) {
        container.innerHTML = '<p style="color:red; text-align:center;">❌ لم يتم العثور على معرف المستخدم</p>';
        return;
    }
    
    try {
        const accountsRef = collection(db, "accounts");
        const q = query(accountsRef, where("userId", "==", userId));
        const snapshot = await getDocs(q);
        
        console.log("عدد الحسابات التي تم العثور عليها:", snapshot.size);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;">😞 لا توجد حسابات منشورة لهذا المستخدم</p>';
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
        
        console.log("المنصات المرتبة:", finalPlatforms);
        
        // تنظيف الحاوية
        container.innerHTML = '';
        
        // إنشاء القوائم المنسدلة لكل منصة
        for (let i = 0; i < finalPlatforms.length; i++) {
            const platform = finalPlatforms[i];
            const accounts = accountsByPlatform[platform];
            if (!accounts || accounts.length === 0) continue;
            
            console.log(`إنشاء قائمة منسدلة لمنصة ${platform}، عدد الحسابات: ${accounts.length}`);
            
            // عنصر الأكورديون الرئيسي
            const accordion = document.createElement('div');
            accordion.className = 'platform-accordion';
            accordion.style.cssText = 'margin-bottom: 15px; border-radius: 12px; overflow: hidden; border: 1px solid #ddd; background: white;';
            
            // رأس الأكورديون (المنصة)
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.style.cssText = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
            header.innerHTML = `
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <span>${getPlatformIcon(platform)} ${platform}</span>
                    <span class="arrow" style="transition: transform 0.3s;">▼</span>
                </h3>
            `;
            
            // محتوى الأكورديون (الحسابات)
            const content = document.createElement('div');
            content.className = 'accordion-content';
            content.style.cssText = 'max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; background: #f8f9fa;';
            
            // حاوية الحسابات
            const accountsDiv = document.createElement('div');
            accountsDiv.className = 'accounts-list';
            accountsDiv.style.cssText = 'padding: 15px;';
            
            // إضافة الحسابات
            accounts.forEach((account, idx) => {
                const isPrimary = idx === 0;
                const card = document.createElement('div');
                card.className = 'account-card';
                card.style.cssText = 'background: white; border-radius: 10px; padding: 12px 15px; margin-bottom: 10px; border-right: 4px solid #667eea;';
                card.innerHTML = `
                    ${isPrimary ? '<div class="primary-badge" style="background: gold; color: #333; padding: 2px 8px; border-radius: 20px; font-size: 11px; display: inline-block; margin-bottom: 5px;">⭐ الحساب الأساسي</div>' : ''}
                    <div class="username" style="margin: 5px 0; font-weight: bold;">@${escapeHtml(account.username)}</div>
                    <a href="${account.url}" target="_blank" class="account-link" style="font-size: 12px; color: #667eea; text-decoration: none;">🔗 زيارة الحساب</a>
                `;
                accountsDiv.appendChild(card);
            });
            
            content.appendChild(accountsDiv);
            accordion.appendChild(header);
            accordion.appendChild(content);
            container.appendChild(accordion);
            
            // فتح الأكورديون الأول فقط
            if (i === 0) {
                content.style.maxHeight = content.scrollHeight + "px";
                content.classList.add('open');
                const arrow = header.querySelector('.arrow');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }
            
            // إضافة حدث النقر للفتح/الإغلاق
            header.onclick = () => {
                if (content.classList.contains('open')) {
                    content.style.maxHeight = null;
                    content.classList.remove('open');
                    const arrow = header.querySelector('.arrow');
                    if (arrow) arrow.style.transform = 'rotate(0deg)';
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.classList.add('open');
                    const arrow = header.querySelector('.arrow');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                }
            };
        }
        
        console.log("✅ تم عرض الحسابات كقوائم منسدلة بنجاح!");
        
    } catch (err) {
        console.error("خطأ في تحميل الحسابات:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">⚠️ خطأ في تحميل البيانات: ${escapeHtml(err.message)}</p>`;
    }
}

function getPlatformIcon(platform) {
    const icons = {
        'TikTok': '📱',
        'YouTube': '🎥',
        'Instagram': '📸',
        'Twitter': '🐦',
        'Snapchat': '👻',
        'Facebook': '📘'
    };
    return icons[platform] || '🔗';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
