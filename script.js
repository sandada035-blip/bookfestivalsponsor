// 🔥 ជំនួស URL នេះជាមួយ Web App URL របស់អ្នកដែលបាន Deploy ពី Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbz3qTPm73ywTMpnbZbNf-BPtbjwkTirjDDk48kOfi-4RqB8GWpRFnoB26bCkc_l-Te4/exec";

let RAW = { headers: [], rows: [], meta: {} };
let KEY = { name: null, sex: null, class: null, books: null }; // បន្ថែម key សម្រាប់សៀវភៅ

async function loadData() {
    const stateBox = document.getElementById("stateBox");
    stateBox.style.display = "block";
    stateBox.textContent = "កំពុងភ្ជាប់ទៅកាន់ Google Sheet...";
    document.getElementById("grid").innerHTML = ""; // Clear grid ពេលកំពុង load

    try {
        // បន្ថែម timestamp ដើម្បីកុំឱ្យជាប់ Cache
        const response = await fetch(API_URL + "?t=" + new Date().getTime());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        RAW = await response.json();
        detectKeys(RAW.headers);
        buildFilters();
        render();
        stateBox.style.display = "none"; // លាក់ប្រអប់ state ពេលជោគជ័យ
    } catch (error) {
        stateBox.textContent = "បរាជ័យក្នុងការទាញទិន្នន័យ។ សូមពិនិត្យមើល URL ឬ Internet របស់អ្នក។";
        stateBox.style.color = "red";
        console.error("Load Error:", error);
    }
}

// ស្វែងរក Column ដោយស្វ័យប្រវត្តិ (បន្ថែមការរក Column សៀវភៅ)
function detectKeys(headers) {
    const safeHeaders = headers || [];
    const find = (tags) => safeHeaders.find(h => tags.some(t => String(h).toLowerCase().includes(t)));
    
    KEY.name = find(["ឈ្មោះ", "name", "គោត្តនាម", "student"]);
    KEY.sex = find(["ភេទ", "sex", "gender"]);
    KEY.class = find(["ថ្នាក់", "class", "grade", "បន្ទប់"]);
    // រកមើល Column ដែលមានពាក្យថា "សៀវភៅ" ឬ "book"
    KEY.books = find(["សៀវភៅ", "book", "ចំនួនសៀវភៅ"]);
}

function buildFilters() {
    const classSel = document.getElementById("classFilter");
    const sexSel = document.getElementById("sexFilter");
    
    // Reset options, keep first
    classSel.length = 1; sexSel.length = 1;

    if(!RAW.rows) return;

    const classes = [...new Set(RAW.rows.map(r => r[KEY.class]).filter(c => c && String(c).trim() !== ""))];
    const sexes = [...new Set(RAW.rows.map(r => r[KEY.sex]).filter(s => s && String(s).trim() !== ""))];

    classes.sort().forEach(c => classSel.add(new Option(c, c)));
    sexes.sort().forEach(s => sexSel.add(new Option(s, s)));
}

function formatMoney(amountStr) {
    // បំប្លែង String ទៅជាលេខ ហើយ Format ដាក់ក្បៀស
    const num = parseFloat(String(amountStr).replace(/[^0-9.-]/g, "")) || 0;
    return num.toLocaleString('en-US');
}

function render() {
    if(!RAW.rows) return;

    const q = document.getElementById("q").value.toLowerCase().trim();
    const cls = document.getElementById("classFilter").value;
    const sex = document.getElementById("sexFilter").value;
    const sortBy = document.getElementById("sortBy").value;

    // 1. Filter Data
    let filtered = RAW.rows.filter(r => {
        // Search គ្រប់ Column
        const rowText = Object.values(r).join(" ").toLowerCase();
        const matchQ = !q || rowText.includes(q);
        // Filter តាម Dropdown
        const matchCls = !cls || (r[KEY.class] && String(r[KEY.class]) === cls);
        const matchSex = !sex || (r[KEY.sex] && String(r[KEY.sex]) === sex);
        
        return matchQ && matchCls && matchSex;
    });

    // 2. Sort Data
    if (sortBy === "name_asc" && KEY.name) {
        filtered.sort((a,b) => String(a[KEY.name] || "").localeCompare(String(b[KEY.name] || "")));
    } else if (sortBy === "amount_desc") {
        filtered.sort((a,b) => {
             const valA = parseFloat(String(a.__amountE).replace(/[^0-9.-]/g, "")) || 0;
             const valB = parseFloat(String(b.__amountE).replace(/[^0-9.-]/g, "")) || 0;
             return valB - valA;
        });
    }

    // 3. Update Summary
    document.getElementById("sumCount").textContent = filtered.length;
    
    let totalMoney = filtered.reduce((sum, r) => {
        const val = parseFloat(String(r.__amountE).replace(/[^0-9.-]/g, "")) || 0;
        return sum + val;
    }, 0);
    document.getElementById("sumENum").textContent = totalMoney.toLocaleString('en-US');
    
    if(RAW.meta && RAW.meta.updatedISO) {
         document.getElementById("subtitle").textContent = `Updated: ${new Date(RAW.meta.updatedISO).toLocaleTimeString()}`;
    }

    // 4. Render Cards (រចនាថ្មីតាមសំណើ)
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const stateBox = document.getElementById("stateBox");

    if (filtered.length === 0) {
        stateBox.style.display = "block";
        stateBox.textContent = "មិនមានទិន្នន័យត្រូវនឹងការស្វែងរក។";
    } else {
        stateBox.style.display = "none";
        
        filtered.forEach(r => {
            const name = r[KEY.name] || "មិនមានឈ្មោះ";
            // យកអក្សរដំបូងនៃភេទ (ឧទាហរណ៍៖ ប្រុស -> ប)
            const sexShort = (r[KEY.sex] && String(r[KEY.sex]).trim().length > 0) ? String(r[KEY.sex]).trim().charAt(0) : "?";
            // ទាញយកចំនួនសៀវភៅ (ប្រសិនបើមិនមាន ដាក់ 0)
            const booksCount = (KEY.books && r[KEY.books]) ? r[KEY.books] : "0";
            const amountFormatted = formatMoney(r.__amountE);

            const card = document.createElement("div");
            card.className = "student-card";
            // ប្រើ HTML Structure ថ្មីដើម្បីឱ្យដូចរូបភាពគំរូ
            card.innerHTML = `
                <div class="card-content-top">
                    <div class="student-info-wrapper">
                        <div class="avatar">${String(name).charAt(0).toUpperCase()}</div>
                        <div class="student-details">
                            <h3>${name}</h3>
                            <div class="chips-container">
                                <span class="chip chip-sex" title="${r[KEY.sex] || ''}">${sexShort}</span>
                                <span class="chip chip-books">សៀវភៅ: ${booksCount}</span>
                            </div>
                        </div>
                    </div>
                    <span class="row-number">#${r.__rowNumber}</span>
                </div>
                <div class="amount-box-bottom">
                    <span class="amount-value">${amountFormatted} <small>KHR</small></span>
                    <span class="amount-label">ថវិកា</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

// Event Listeners
document.getElementById("q").addEventListener("input", render);
document.getElementById("classFilter").addEventListener("change", render);
document.getElementById("sexFilter").addEventListener("change", render);
document.getElementById("sortBy").addEventListener("change", render);
document.getElementById("btnRefresh").addEventListener("click", loadData);

// Load data on start

window.onload = loadData;
