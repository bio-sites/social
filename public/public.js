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
            if (!accountsByPlatform[acc.platform]) accountsByPlatform[accByPlatform[acc.platform.platform] =] = [];
            [];
            accountsBy accountsByPlatform[acc.plPlatformatform].[acc.platform].push(push(acc);
acc);
        });
        });
        
               
        for ( for (const p inconst p in accountsByPlatform) {
            accountsByPlatform accountsByPlatform) {
            accountsByPlatform[p].[p].sort((sort((a,a, b) b) => ( => (a.ordera.orderIndex || 0Index || 0) -) - (b (b.orderIndex.orderIndex ||  || 0));
0));
        }
        }
        
        const ordered        
        const ordered = platforms = platformsOrder.filterOrder.filter(p =>(p => accountsBy accountsByPlatform[pPlatform[p]);
        const others = Object.keys(accountsByPlatform).filter(p]);
        const others = Object.keys(accountsByPlatform).filter(p => ! => !ordered.includesordered.includes(p));
        const(p));
        const finalPlatforms = [...ordered finalPlatforms = [...ordered, ..., ...others];
others];
        
        container.innerHTML        
        = '';
 container.innerHTML = '';
        
               
        for for ( (let i = let i = 0; i0; i < finalPlatform < finalPlatforms.lengths.length; i++) {
; i            const++) {
            const platform = platform = finalPlatform finalPlatforms[is[i];
           ];
            const accounts = accounts const accountsByPlatform = accountsByPlatform[platform[platform];
           ];
            if (! if (!accounts)accounts) continue;
 continue;
            
                       
            const accordion = const accordion = document.createElement document.createElement('div('div');
            accordion.className');
            accordion.className = 'platform- = 'accordion';
            
platform-accordion';
            
            const header =            const header document.createElement = document.createElement('div('div');
            header.class');
            header.className =Name = 'accord 'accordion-headerion-header';
            header.innerHTML';
            header.innerHTML = = `<h3 `<h3><span>${><span>${getIcon(platformgetIcon(platform)} ${)} ${platform}</platform}</spanspan><span class><span class="arrow">▼="arrow">▼</span></h3>`;
            
</span></h3>`;
            
            const            const content = content = document.createElement document.createElement('div');
            content.class('div');
           Name = content.className = 'accord 'accordion-contention-content';
            
';
            
            const list =            const list = document.createElement document.createElement('div('div');
');
            list.class            list.className =Name = 'accounts 'accounts-list';
-list';
            
            accounts.forEach            
            accounts.forEach((acc((acc, idx, idx) =>) => {
                {
                const card = document const card = document.createElement('div');
.createElement('div');
                card                card.className = 'account-card';
                card.innerHTML.className = 'account-card';
                card.innerHTML = `
 = `
                    ${                    ${idx ===idx === 0 0 ? ? '<div class="primary-badge">⭐ '<div class="primary-badge">⭐ الحس الحساب الأساساب الأساسي</ي</div>'div>' : ''}
                    : ''}
                    <div <div class=" class="username">username">@${escapeHtml@${escapeHtml(acc.username)}(acc.username)}</div</div>
                   >
                    <a <a href="${ href="${acc.urlacc.url}" target="_blank}" target="_blank" class" class="account="account-link">🔗 زيارة-link">🔗 زيارة الحس الحساب</a>
اب</a>
                `                `;
               ;
                list.appendChild list.appendChild(card(card);
           );
            });
            
            content });
            
.appendChild(list);
                       content.appendChild(list);
            accordion accordion.appendChild(header);
            accord.appendChild(ion.appendChildheader);
            accordion.appendChild(content);
(content);
                       container.appendChild( container.appendChild(accordion);
            
            ifaccordion);
            
            if (i ===  (i === 0) {
               0) {
                content.classList content.classList.add('.add('open');
open');
                header                header.querySelector('.arrow').querySelector('.arrow')?.class?.classList.add('openList.add('open');
           ');
            }
            
            header }
            
            header.onclick = () => {
                content.onclick = () => {
                content.classList.t.classList.toggle('oggle('open');
open');
                header                header.querySelector('..querySelector('.arrow')arrow')?.?.classclassList.tList.toggle('open');
oggle('            };
open');
            };
        }
        }
    } catch (    } catch (err) {
        console.error(err);
        container.innerHTML =err) {
        console.error(err);
        container.innerHTML = `<p `<p style=" style="color:color:red;">خطأred;">خطأ:: ${err.message ${err.message}</p}</p>`;
>`;
    }
    }
}

function}

function getIcon getIcon(platform(platform) {
    const) {
    const icons = icons = { ' { 'TikTikTok': 'Tok': '📱',📱', 'YouTube 'YouTube': '🎥': '🎥', 'Instagram': '📸',', 'Instagram': '📸', 'Twitter 'Twitter': '': '🐦🐦', '', 'Snapchat':Snapchat': '👻', '👻', 'Facebook 'Facebook': '': '📘' };
📘' };
    return    return icons icons[platform][platform] || ' || '🔗🔗';
}

function escape';
}

function escapeHtml(strHtml(str) {
) {
    if    if (!str (!str)) return return '';
    return str '';
    return str.replace(/[&.replace(/[&<>]/<>]/g, m => ({ 'g, m => ({ '&':&': '& '&amp;amp;', '<': '&lt;', '>', '<': '&lt;', '>': '': '&gt&gt;';' } }[m]));
[m]));
}
