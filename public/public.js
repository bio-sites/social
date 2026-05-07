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
const fullUrl = window.location.href;

// استخراج المعرف من الرابط (يدعم id و uid)
let identifier = null;

// ابحث عن id= أو uid=
let match = fullUrl.match(/[?&]id=([^&]+)/);
if (match && match[1]) {
    identifier = match[1];
    console.log("تم استخراج id:", identifier);
}

if (!identifier) {
    match = fullUrl.match(/[?&]uid=([^&]+)/);
    if (match && match[1]) {
        identifier = match[1];
        console.log("تم استخراج uid:", identifier);
    }
}

console.log("الرابط الكامل:", fullUrl);

if (!identifier) {
    container.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <p style="color:red;">❌ لم يتم العثور على معرف المستخدم في الرابط</p>
            <p>الرابط الحالي: <code>${escapeHTML(fullUrl)}</code></p>
            <p>الرابط الصحيح يجب أن يكون مثل: <code>${window.location.origin}/public/?id=xxxxx</code></p>
            <hr>
            <p>💡 للحصول على الرابط الصحيح، اضغط على زر "مشاركة" داخل حسابك.</p>
        </div>
    `;
} else {
    container.innerHTML = '<p style="text-align:center;">⏳ جاري تحميل الحسابات...</p>';
    // تحويل المعرف القصير إلى userId كامل
    resolveIdentifier(identifier);
}

// دالة لتحويل المعرف القصير (id) إلى userId كامل
async function resolveIdentifier(identifier) {
    try {
        let userId = null;
        
        // إذا كان المعرف يبدو مثل المعرف القصير (أقل من 20 حرفاً)
        if (identifier.length < 20) {
            // ابحث في مجموعة shortLinks
            const shortLinksRef = collection(db, 'shortLinks');
            const q = query(shortLinksRef, where("shortId", "==", identifier));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                userId = snapshot.docs[0].data().userId;
                console.log("تم تحويل المعرف القصير إلى userId:", userId);
            }
        }
        
        // إذا لم يتم العثور على userId، حاول استخدام المعرف نفسه كـ userId
        if (!userId) {
            userId = identifier;
        }
        
        // الآن قم بتحميل الحسابات
        await loadAccounts(userId);
        
    } catch (err) {
        console.error("خطأ في حل المعرف:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">⚠️ خطأ: ${escapeHTML(err.message)}</p>`;
    }
}

async function loadAccounts(uid) {
    try {
        const q = query(collection(db, "accounts"), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        
        console.log("عدد الحسابات:", snapshot.size);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;">😞 لا توجد حسابات منشورة لهذا المستخدم.</p>';
            return;
        }
        
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement("div");
            card.style.cssText = "background: #f8f9fa; border-radius: 12px; padding: 15px; margin-bottom: 12px; border-right: 5px solid #2a5298; text-align: right;";
            card.innerHTML = `
                <h3 style="margin:0 0 8px 0; color:#2a5298;">📱 ${escapeHTML(data.platform)}</h3>
                <p style="margin:5px 0; color:#555;">@${escapeHTML(data.username)}</p>
                <a href="${data.url}" target="_blank" style="display:inline-block; margin-top:8px; background:#2a5298; color:white; padding:6px 15px; border-radius:20px; text-decoration:none;">🔗 زيارة الحساب</a>
            `;
            container.appendChild(card);
        });
        
        // إضافة تذييل
        const footer = document.createElement("div");
        footer.style.cssText = "text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #888;";
        footer.innerHTML = '✓ تم عرض الحسابات بنجاح';
        container.appendChild(footer);
        
    } catch (err) {
        console.error("خطأ في تحميل الحسابات:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">⚠️ خطأ في تحميل البيانات: ${escapeHTML(err.message)}</p>`;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
}