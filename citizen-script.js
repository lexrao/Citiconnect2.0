// ===================================
// Citizen Portal - JavaScript
// ===================================

// Application State
const AppState = {
    citizenMap: null,
    selectedCoordinates: null,
    clickMarker: null,
    db: null,
    reportCounter: 1
};

// ===================================
// Firebase Configuration
// ===================================
const firebaseConfig = {
    apiKey: "AIzaSyAFKNK3RkyNE2pMNTbHfIQnCi2pKlZo6L0",
    authDomain: "citiconnect-66702.firebaseapp.com",
    projectId: "citiconnect-66702",
    storageBucket: "citiconnect-66702.firebasestorage.app",
    messagingSenderId: "901952262667",
    appId: "1:901952262667:web:18c8f477bbc9563d4e2d0e"
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ===================================
// Firebase Database Operations
// ===================================
function initDatabase() {
    AppState.db = db;
    return Promise.resolve(db);
}

// ===================================
// Cloudinary Photo Upload
// ===================================
const CLOUDINARY_CLOUD_NAME = 'dur5mhgap';
const CLOUDINARY_UPLOAD_PRESET = 'barangay_photos';

function uploadPhotoToCloudinary(photo) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        // Convert dataUrl to blob
        fetch(photo.dataUrl)
            .then(r => r.blob())
            .then(blob => {
                formData.append('file', blob, photo.name);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                formData.append('folder', 'barangay_danao_reports');
                return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
            })
            .then(res => res.json())
            .then(data => {
                if (data.secure_url) {
                    resolve({ name: photo.name, url: data.secure_url });
                } else {
                    reject(new Error('Upload failed: ' + JSON.stringify(data)));
                }
            })
            .catch(reject);
    });
}

async function saveReportToDB(report) {
    // Upload all proof photos to Cloudinary first
    let savedPhotos = [];
    if (report.photos && report.photos.length > 0) {
        try {
            savedPhotos = await Promise.all(
                report.photos.map(p => uploadPhotoToCloudinary(p))
            );
            console.log(`Uploaded ${savedPhotos.length} photos to Cloudinary`);
        } catch (err) {
            console.warn('Photo upload failed, saving without photos:', err);
            savedPhotos = report.photos.map(p => ({ name: p.name, url: null }));
        }
    }

    const reportToSave = {
        ...report,
        date: report.date instanceof Date
            ? firebase.firestore.Timestamp.fromDate(report.date)
            : report.date,
        photos: savedPhotos  // store Cloudinary URLs in Firestore
    };

    // Remove undefined fields
    Object.keys(reportToSave).forEach(k => reportToSave[k] === undefined && delete reportToSave[k]);

    return db.collection('reports').doc(report.id).set(reportToSave)
        .then(() => console.log('Report saved to Firestore with Cloudinary photo URLs'));
}

function loadCounterFromDB() {
    return db.collection('settings').doc('reportCounter').get().then(doc => {
        return doc.exists ? doc.data().value : 1;
    });
}

function saveCounterToDB(counter) {
    return db.collection('settings').doc('reportCounter').set({ value: counter });
}

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

async function initializeApp() {
    try {
        await initDatabase();
        const savedCounter = await loadCounterFromDB();
        AppState.reportCounter = savedCounter;
        
        setupEventListeners();
        initializeCitizenMap();
        console.log('Citizen Portal initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        setupEventListeners();
        initializeCitizenMap();
    }
    // Init community monitor charts after DB is ready
    setTimeout(initCitizenMonitor, 300);
}

// ===================================
// Event Listeners Setup
// ===================================
function setupEventListeners() {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }
}

// ===================================
// Initialize Citizen Map
// ===================================
function initializeCitizenMap() {
    // Check if map container exists
    const mapContainer = document.getElementById('citizenMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    AppState.citizenMap = L.map('citizenMap').setView([9.796891, 123.906304], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(AppState.citizenMap);
    

    
    const barangayBounds = [
        [9.790, 123.900],
        [9.790, 123.912],
        [9.804, 123.912],
        [9.804, 123.900]
    ];
    
    L.polygon(barangayBounds, {
        color: '#8B1538',
        fillOpacity: 0,
        weight: 2
    }).addTo(AppState.citizenMap);

    // Add click event to set coordinates
    AppState.citizenMap.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        console.log('Map clicked at:', lat, lng); // Debug log
        
        // Update coordinates input field
        const coordsInput = document.getElementById('coordinates');
        if (coordsInput) {
            coordsInput.value = `${lat}, ${lng}`;
            console.log('Coordinates updated in input'); // Debug log
        } else {
            console.error('Coordinates input field not found');
        }
        
        AppState.selectedCoordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
        
        // Remove previous marker if exists
        if (AppState.clickMarker) {
            AppState.citizenMap.removeLayer(AppState.clickMarker);
        }
        
        // Add new marker
        AppState.clickMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(AppState.citizenMap);
        
        AppState.clickMarker.bindPopup(`
            <div class="popup-title">Selected Location</div>
            <div class="popup-content">
                Coordinates: ${lat}, ${lng}<br>
                <small>This will be your report location</small>
            </div>
        `).openPopup();
        
        console.log('Marker added to map'); // Debug log
    });
    
    // Fix map display after initialization
    setTimeout(() => {
        AppState.citizenMap.invalidateSize();
        console.log('Map initialized and ready');
    }, 100);
}

// ===================================
// High Priority Keywords for Auto-Verification (English, Tagalog, Bisaya)
// ===================================
const HIGH_PRIORITY_KEYWORDS = {
    emergency: [
        // English
        'emergency', 'urgent', 'critical', 'danger', 'dangerous', 'life-threatening', 
        'severe', 'serious', 'crisis', 'help', 'mayday', 'sos',
        // Tagalog
        'emerhensiya', 'agarang', 'kritikal', 'panganib', 'mapanganib', 'seryoso',
        'malubha', 'krisis', 'tulong', 'saklolo',
        // Bisaya
        'emerhensya', 'dinalian', 'peligro', 'delikado', 'grabeng', 'grabe',
        'hilabi', 'tabang', 'luwasa'
    ],
    safety: [
        // English
        'accident', 'injury', 'injured', 'fire', 'flood', 'flooding', 'collapsed', 
        'explosion', 'crash', 'collision', 'vehicle accident', 'car accident',
        'trapped', 'stuck', 'falling', 'fell', 'drowning', 'drown',
        // Tagalog
        'aksidente', 'sugat', 'nasugatan', 'sunog', 'baha', 'binaha', 'gumuho',
        'sumabog', 'bumangga', 'banggaan', 'naaksidente', 'nahulog', 'nalunod',
        'naiipit', 'nakulong',
        // Bisaya
        'aksidente', 'samad', 'nasamdan', 'sunog', 'baha', 'binaha', 'nahagba',
        'mibuto', 'nabangga', 'nahulog', 'nalunod', 'napit', 'nasakpan'
    ],
    health: [
        // English
        'disease', 'outbreak', 'contaminated', 'toxic', 'poison', 'poisoning',
        'dead body', 'corpse', 'death', 'died', 'dying', 'unconscious',
        'bleeding', 'blood', 'heart attack', 'stroke', 'seizure', 'overdose',
        'epidemic', 'pandemic', 'infected', 'infection',
        // Tagalog
        'sakit', 'pagkalat ng sakit', 'kontaminado', 'lason', 'natokhang',
        'bangkay', 'patay', 'namatay', 'namamatay', 'walang malay',
        'dumudugo', 'dugo', 'atake sa puso', 'stroke', 'hika', 'epidemya',
        'pandemya', 'nahawa', 'impeksyon',
        // Bisaya
        'sakit', 'hugaw', 'hilo', 'lason', 'patay', 'namatay',
        'minatay', 'walay malay', 'dugo', 'nagdugo', 'atake sa kasingkasing',
        'epidemya', 'pandemya', 'natakdan', 'impeksyon'
    ],
    mentalHealth: [
        // English
        'suicide', 'suicidal', 'self-harm', 'jumping', 'hanging',
        'overdose', 'mental health crisis', 'threatening to jump',
        // Tagalog
        'magpapakamatay', 'pagpapakamatay', 'sasaktan ang sarili',
        'tutulon', 'magbibitay', 'bibitay', 'krisis sa kaisipan',
        // Bisaya
        'mopatay sa kaugalingon', 'moambak', 'magbitay', 'mobitay',
        'krisis sa pangisip'
    ],
    infrastructure: [
        // English
        'burst pipe', 'gas leak', 'electrical fire', 'live wire', 'exposed wire',
        'sinkhole', 'landslide', 'building collapse', 'structure collapse',
        'dam break', 'bridge collapse', 'power outage', 'major leak',
        'water main break', 'sewage overflow',
        // Tagalog
        'tumagas na tubo', 'tumagas na gas', 'sunog na kuryente', 'nakalantad na kable',
        'butas sa lupa', 'pagguho ng lupa', 'gumuho ang gusali', 'nawalan ng kuryente',
        'tumagas na tubig', 'umaapaw na dumi',
        // Bisaya
        'nabuak nga tubo', 'mitulo nga gas', 'sunog sa koryente', 'bukhad nga kable',
        'lungag sa yuta', 'nahagba ang yuta', 'nahagba ang bilding', 'wala koryente',
        'mitulo nga tubig', 'miagas ang hugaw'
    ],
    crime: [
        // English
        'robbery', 'violence', 'assault', 'threat', 'armed', 'shooting',
        'gunfire', 'stabbing', 'murder', 'rape', 'kidnapping', 'hostage',
        'domestic violence', 'child abuse', 'fighting', 'brawl', 'riot',
        // Tagalog
        'holdap', 'nakawan', 'karahasan', 'pananakot', 'may armas', 'binaril',
        'putukan', 'sinaksak', 'pinatay', 'ginahasa', 'kidnap', 'dinukot',
        'bihag', 'away', 'gulo', 'pangaabuso sa bata',
        // Bisaya
        'tulisan', 'kagubot', 'panghilabtan', 'hulga', 'armado', 'gipusil',
        'pusil', 'gidunggab', 'gipatay', 'giabuso', 'gikawat', 'gihostage',
        'away', 'panagbingkil', 'pag-abuso sa bata'
    ],
    environmental: [
        // English
        'major spill', 'chemical spill', 'hazardous waste', 'massive dumping',
        'oil spill', 'toxic fumes', 'gas cloud', 'radiation',
        'illegal logging', 'forest fire', 'wildfire',
        // Tagalog
        'malaking pagtagas', 'kemikal na nabuhos', 'mapanganib na basura',
        'malaking pagtatapon', 'natagasang langis', 'nakakamatay na usok',
        'illegal na pagputol ng puno', 'sunog sa kagubatan',
        // Bisaya
        'dako nga pagula', 'kemikal nga nabubo', 'makahilo nga basura',
        'daghang gilabay', 'mitulo nga lana', 'makahilo nga aso',
        'illegal nga pagputol sa kahoy', 'sunog sa lasang'
    ],
    disaster: [
        // English
        'typhoon', 'earthquake', 'tsunami', 'tornado', 'hurricane',
        'volcanic eruption', 'avalanche', 'mudslide', 'flash flood',
        'storm surge', 'tidal wave', 'disaster',
        // Tagalog
        'bagyo', 'lindol', 'tsunami', 'buhawi', 'pagputok ng bulkan',
        'gumuho ang lupa', 'pagbaha', 'malakas na daluyong', 'sakuna', 'kalamidad',
        // Bisaya
        'bagyo', 'linog', 'tsunami', 'buhawi', 'mibuto ang bulkan',
        'nahagba ang yuta', 'lunop', 'kusog nga balud', 'kalamidad', 'katalagman'
    ],
    animals: [
        // English
        'rabid dog', 'snake bite', 'animal attack', 'stray dogs attacking',
        'dangerous animal', 'wild animal', 'aggressive dog',
        // Tagalog
        'ulol na aso', 'kagat ng ahas', 'sinalakay ng hayop', 'nanlaban ang aso',
        'mapanganib na hayop', 'mababangis na aso',
        // Bisaya
        'buang nga iro', 'gipaak sa bitin', 'gisulong sa hayop', 'midelikado nga hayop',
        'ihalas nga hayop', 'bangis nga iro'
    ]
};

// ===================================
// Verify High Priority Report
// ===================================
function verifyHighPriorityReport(description, priority) {
    // If not marked as high priority, no need to verify
    if (priority !== 'High') {
        return { verified: true, reason: 'Not high priority' };
    }
    
    const descLower = description.toLowerCase();
    
    // Check if description contains high-priority keywords
    let matchedKeywords = [];
    
    for (const [category, keywords] of Object.entries(HIGH_PRIORITY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (descLower.includes(keyword)) {
                matchedKeywords.push({ category, keyword });
            }
        }
    }
    
    // Verified if keywords found
    if (matchedKeywords.length > 0) {
        return {
            verified: true,
            autoVerified: true,
            matchedKeywords: matchedKeywords,
            reason: `Auto-verified: Contains urgent keywords (${matchedKeywords.map(m => m.keyword).join(', ')})`
        };
    }
    
    // Check description length and detail
    if (description.length < 30) {
        return {
            verified: false,
            requiresReview: true,
            reason: 'Description too short for high priority - requires LGU review'
        };
    }
    
    // Not enough evidence but description is detailed
    return {
        verified: true,
        requiresReview: true,
        reason: 'Detailed description provided - pending LGU review'
    };
}

// ===================================
// Report Form Submission
// ===================================
async function handleReportSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value;
    const priority = document.getElementById('priority').value;
    
    // Verify high priority reports
    const verification = verifyHighPriorityReport(description, priority);
    
    // BLOCK submission if high priority but not verified
    if (priority === 'High' && !verification.verified) {
        alert(
            '❌ CANNOT SUBMIT AS HIGH PRIORITY\n\n' +
            'Your report cannot be submitted as HIGH PRIORITY because the description does not contain urgent keywords.\n\n' +
            '🚨 High priority is ONLY for emergencies like:\n' +
            '• Accidents, fires, floods\n' +
            '• Medical emergencies\n' +
            '• Crimes in progress\n' +
            '• Life-threatening situations\n' +
            '• Natural disasters\n\n' +
            'Reason: ' + verification.reason + '\n\n' +
            'Please either:\n' +
            '1. Add urgent details if this IS an emergency\n' +
            '2. Change priority to Medium or Low\n\n' +
            '⚠️ Examples of HIGH PRIORITY descriptions:\n' +
            '• "Sunog sa bahay! Kailangan ng tulong!"\n' +
            '• "Car accident, people injured"\n' +
            '• "Emergency! May baha, delikado!"\n' +
            '• "Holdap, need help urgently!"'
        );
        
        // Highlight the description and priority fields
        document.getElementById('description').style.borderColor = '#ef4444';
        document.getElementById('priority').style.borderColor = '#ef4444';
        
        // Reset border after 3 seconds
        setTimeout(() => {
            document.getElementById('description').style.borderColor = '#e5e7eb';
            document.getElementById('priority').style.borderColor = '#e5e7eb';
        }, 3000);
        
        return; // STOP submission completely
    }
    
    // Show confirmation for auto-verified urgent reports
    if (priority === 'High' && verification.autoVerified) {
        const confirm = window.confirm(
            '✅ URGENT REPORT DETECTED\n\n' +
            'Your report has been verified as a genuine HIGH PRIORITY emergency.\n\n' +
            'Keywords detected: ' + verification.matchedKeywords.map(m => m.keyword).join(', ') + '\n\n' +
            '🚨 This report will receive IMMEDIATE attention from the LGU.\n\n' +
            'Click OK to submit this urgent report.'
        );
        
        if (!confirm) {
            return; // User cancelled
        }
    }
    
    const formData = {
        id: `CR-2024-${String(AppState.reportCounter).padStart(3, '0')}`,
        name: document.getElementById('name').value,
        contact: document.getElementById('contact').value,
        email: document.getElementById('email').value,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        description: description,
        priority: priority,
        status: 'Pending',
        date: new Date(),
        coordinates: AppState.selectedCoordinates || parseCoordinates(document.getElementById('coordinates').value),
        verified: verification.verified,
        autoVerified: verification.autoVerified || false,
        requiresReview: verification.requiresReview || false,
        verificationReason: verification.reason,
        matchedKeywords: verification.matchedKeywords || [],
        photos: AppState.selectedPhotos.map(p => ({ name: p.name, dataUrl: p.dataUrl }))
    };
    
    AppState.reportCounter++;
    
    try {
        await saveReportToDB(formData);
        await saveCounterToDB(AppState.reportCounter);
        console.log('Report saved to database');
    } catch (error) {
        console.error('Error saving to database:', error);
    }
    
    let successMessage = `✅ Report submitted successfully!\n\nYour reference ID is: ${formData.id}`;
    
    if (priority === 'High' && verification.autoVerified) {
        successMessage += '\n\n🚨 URGENT: This report has been marked as HIGH PRIORITY and will receive immediate attention from the LGU!';
    }
    
    successMessage += '\n\nThank you for helping improve our barangay!';
    
    showAlert('submitAlert', 'success', successMessage);

    // Send submission confirmation notification (reuse LGU notification config)
    sendSubmissionConfirmation(formData);
    
    document.getElementById('reportForm').reset();
    AppState.selectedPhotos = [];
    renderPhotoPreview();
    
    AppState.selectedCoordinates = null;
    if (AppState.clickMarker) {
        AppState.citizenMap.removeLayer(AppState.clickMarker);
        AppState.clickMarker = null;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        hideAlert('submitAlert');
    }, 10000);
}

// ===================================
// PROOF PHOTOS
// ===================================
AppState.selectedPhotos = []; // array of { name, dataUrl }

function handlePhotoSelect(event) {
    processPhotoFiles(Array.from(event.target.files));
    event.target.value = ''; // reset so same file can be re-added
}

function handlePhotoDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('photoDropZone');
    dz.style.borderColor = '#d1d5db';
    dz.style.background  = '#fafafa';
    processPhotoFiles(Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/')));
}

function processPhotoFiles(files) {
    const remaining = 5 - AppState.selectedPhotos.length;
    if (remaining <= 0) { alert('Maximum 5 photos allowed.'); return; }
    files = files.slice(0, remaining);

    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) { alert(`"${file.name}" exceeds 5MB limit and was skipped.`); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            AppState.selectedPhotos.push({ name: file.name, dataUrl: e.target.result });
            renderPhotoPreview();
        };
        reader.readAsDataURL(file);
    });
}

function removePhoto(index) {
    AppState.selectedPhotos.splice(index, 1);
    renderPhotoPreview();
}

function renderPhotoPreview() {
    const grid = document.getElementById('photoPreviewGrid');
    if (!grid) return;
    if (AppState.selectedPhotos.length === 0) {
        grid.style.display = 'none';
        grid.innerHTML = '';
        return;
    }
    grid.style.display = 'flex';
    grid.innerHTML = AppState.selectedPhotos.map((p, i) => `
        <div style="position:relative;width:100px;height:100px;border-radius:10px;overflow:hidden;border:2px solid #e5e7eb;flex-shrink:0;">
            <img src="${p.dataUrl}" alt="${p.name}"
                style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
                onclick="openPhotoLightbox('${p.dataUrl}','${p.name.replace(/'/g,"\\'")}')">
            <button onclick="removePhoto(${i})"
                style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.65);color:white;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);color:white;font-size:9px;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
        </div>
    `).join('') + (AppState.selectedPhotos.length < 5 ? `
        <div onclick="document.getElementById('photoInput').click()"
            style="width:100px;height:100px;border-radius:10px;border:2px dashed #d1d5db;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#9ca3af;font-size:0.75em;gap:4px;flex-shrink:0;transition:all 0.2s;"
            onmouseover="this.style.borderColor='#8B1538';this.style.color='#8B1538'"
            onmouseout="this.style.borderColor='#d1d5db';this.style.color='#9ca3af'">
            <span style="font-size:1.5em;">＋</span><span>Add Photo</span>
        </div>` : '');
}

function openPhotoLightbox(dataUrl, name) {
    const existing = document.getElementById('photoLightbox');
    if (existing) existing.remove();
    const lb = document.createElement('div');
    lb.id = 'photoLightbox';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';
    lb.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:90vh;">
            <img src="${dataUrl}" alt="${name}" style="max-width:100%;max-height:85vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="text-align:center;color:rgba(255,255,255,0.7);font-size:13px;margin-top:10px;">${name}</div>
            <button onclick="document.getElementById('photoLightbox').remove()"
                style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:#ef4444;color:white;border:none;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
}

window.handlePhotoSelect  = handlePhotoSelect;
window.handlePhotoDrop    = handlePhotoDrop;
window.removePhoto        = removePhoto;
window.openPhotoLightbox  = openPhotoLightbox;

// ===================================
// TRACK MY REPORT
// ===================================
function getReportById(id) {
    return db.collection('reports').doc(id).get().then(doc => {
        if (!doc.exists) return null;
        const data = doc.data();
        return {
            ...data,
            date: data.date && data.date.toDate ? data.date.toDate() : new Date(data.date)
        };
    }).catch(() => null);
}

async function trackMyReport() {
    const rawId = document.getElementById('trackIdInput').value.trim().toUpperCase();
    const resultEl = document.getElementById('trackResult');

    if (!rawId) {
        resultEl.innerHTML = `<div style="padding:14px 18px;background:#fef3c7;border-radius:10px;border-left:4px solid #f59e0b;color:#92400e;font-weight:600;">⚠️ Please enter a reference ID (e.g. CR-2024-001)</div>`;
        return;
    }

    // Animated loading state
    resultEl.innerHTML = `
    <div style="text-align:center;padding:40px 20px;color:#6b7280;">
        <div style="font-size:2.5em;margin-bottom:12px;animation:spin 1s linear infinite;display:inline-block;">🔄</div>
        <div style="font-weight:700;font-size:1em;color:#374151;">Searching Firestore…</div>
        <div style="font-size:0.85em;margin-top:4px;color:#9ca3af;">Looking up report <span style="font-family:monospace;font-weight:700;color:#8B1538;">${rawId}</span></div>
    </div>
    <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>`;

    // Always fetch fresh from Firestore for real-time status
    const report = await getReportById(rawId);

    if (!report) {
        resultEl.innerHTML = `
        <div style="padding:24px;background:#fef2f2;border-radius:14px;border:2px solid #fecaca;display:flex;align-items:flex-start;gap:16px;">
            <div style="font-size:2em;line-height:1;flex-shrink:0;">❌</div>
            <div>
                <div style="font-weight:800;color:#991b1b;font-size:1.05em;margin-bottom:6px;">Report Not Found</div>
                <div style="color:#b91c1c;font-size:0.9em;margin-bottom:8px;">No report found with ID <strong style="font-family:monospace;">${rawId}</strong>.</div>
                <div style="color:#b91c1c;font-size:0.83em;background:#fee2e2;padding:8px 12px;border-radius:8px;">
                    💡 Check the reference ID from your submission confirmation.<br>Format: <strong>CR-2024-001</strong>
                </div>
            </div>
        </div>`;
        return;
    }

    const statusMeta = {
        'Pending':     { color: '#f59e0b', bg: '#fef3c7', barBg: '#fffbeb', icon: '🕐', label: 'Pending Review',  desc: 'Your report has been received and is in the queue. Our team will review it shortly.' },
        'In Progress': { color: '#2563eb', bg: '#dbeafe', barBg: '#eff6ff', icon: '🔧', label: 'Being Actioned',  desc: 'Our barangay team is actively working on your concern. We are on it!' },
        'Resolved':    { color: '#10b981', bg: '#d1fae5', barBg: '#f0fdf4', icon: '✅', label: 'Resolved',        desc: 'This report has been successfully resolved. Thank you for making Barangay Danao better!' },
    };
    const meta = statusMeta[report.status] || statusMeta['Pending'];

    const steps = [
        { key: 'Pending',     icon: '📥', label: 'Received',    desc: 'Report submitted' },
        { key: 'In Progress', icon: '🔧', label: 'In Progress', desc: 'Team working on it' },
        { key: 'Resolved',    icon: '✅', label: 'Resolved',    desc: 'Issue fixed' },
    ];
    const statusOrder = { 'Pending': 0, 'In Progress': 1, 'Resolved': 2 };
    const currentIdx  = statusOrder[report.status] ?? 0;

    const timelineHTML = steps.map((step, i) => {
        const done   = i <= currentIdx;
        const active = i === currentIdx;
        const lineColor = i < currentIdx ? meta.color : '#e5e7eb';
        return `
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
            ${i > 0 ? `<div style="position:absolute;top:19px;right:50%;width:100%;height:3px;background:${lineColor};z-index:0;transition:background 0.5s;"></div>` : ''}
            <div style="width:40px;height:40px;border-radius:50%;background:${done ? meta.color : '#e5e7eb'};display:flex;align-items:center;justify-content:center;font-size:1.15em;z-index:1;position:relative;
                box-shadow:${active ? '0 0 0 5px ' + meta.color + '33,0 4px 12px ' + meta.color + '44' : done ? '0 2px 8px ' + meta.color + '33' : 'none'};transition:all 0.4s;">
                ${done ? step.icon : '<span style="color:#d1d5db;font-size:1em;">●</span>'}
            </div>
            <div style="margin-top:8px;font-size:12px;font-weight:${active ? '800' : '500'};color:${done ? meta.color : '#9ca3af'};text-align:center;line-height:1.3;">
                ${step.label}
                ${active ? `<div style="font-size:10px;color:${meta.color};opacity:0.8;margin-top:2px;">${step.desc}</div>` : ''}
            </div>
        </div>`;
    }).join('');

    const priorityColors = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#10b981' };
    const priorityColor  = priorityColors[report.priority] || '#6b7280';
    const priorityBg     = { 'High': '#fef2f2', 'Medium': '#fef3c7', 'Low': '#f0fdf4' }[report.priority] || '#f9fafb';

    resultEl.innerHTML = `
    <div style="border:2px solid ${meta.color};border-radius:16px;overflow:hidden;animation:fadeIn 0.35s ease;">

        <!-- Status Banner -->
        <div style="background:${meta.bg};padding:20px 24px;display:flex;align-items:flex-start;gap:16px;border-bottom:2px solid ${meta.color}22;">
            <div style="font-size:2.8em;line-height:1;flex-shrink:0;">${meta.icon}</div>
            <div style="flex:1;">
                <div style="font-weight:800;color:${meta.color};font-size:1.2em;letter-spacing:-0.3px;">${meta.label}</div>
                <div style="color:#374151;font-size:0.87em;margin-top:5px;line-height:1.5;">${meta.desc}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">Reference ID</div>
                <div style="font-size:1.15em;font-weight:800;color:#1f2937;font-family:'Courier New',monospace;margin-top:2px;">${report.id}</div>
                <div style="font-size:11px;color:#9ca3af;margin-top:4px;">🔴 Live from Firestore</div>
            </div>
        </div>

        <!-- Progress Timeline -->
        <div style="background:${meta.barBg};padding:24px 28px;border-bottom:1px solid #f3f4f6;">
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.7px;margin-bottom:18px;">📊 Progress Timeline</div>
            <div style="display:flex;align-items:flex-start;position:relative;">${timelineHTML}</div>
        </div>

        <!-- Report Details Grid -->
        <div style="padding:22px 24px;background:white;">
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.7px;margin-bottom:14px;">📋 Report Details</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;">
                <div style="background:#f9fafb;border-radius:10px;padding:12px 15px;">
                    <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Category</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.92em;">${report.category}</div>
                </div>
                <div style="background:#f9fafb;border-radius:10px;padding:12px 15px;">
                    <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Location</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.92em;">📍 ${report.location}</div>
                </div>
                <div style="background:#f9fafb;border-radius:10px;padding:12px 15px;">
                    <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Date Submitted</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.92em;">📅 ${report.date.toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })}</div>
                </div>
                <div style="background:${priorityBg};border-radius:10px;padding:12px 15px;border:1px solid ${priorityColor}22;">
                    <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Priority</div>
                    <div style="font-weight:800;color:${priorityColor};font-size:0.92em;">⚡ ${report.priority}</div>
                </div>
                ${report.responseTime != null ? `
                <div style="background:#f0fdf4;border-radius:10px;padding:12px 15px;border:1px solid #bbf7d0;">
                    <div style="font-size:10px;color:#059669;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Response Time</div>
                    <div style="font-weight:800;color:#065f46;font-size:0.92em;">⏱️ ${report.responseTime} day${report.responseTime !== 1 ? 's' : ''}</div>
                </div>` : ''}
            </div>

            ${report.description ? `
            <div style="margin-top:12px;background:#f9fafb;border-left:4px solid ${meta.color};border-radius:0 10px 10px 0;padding:14px 16px;">
                <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Description</div>
                <div style="color:#374151;font-size:0.9em;line-height:1.7;">${report.description}</div>
            </div>` : ''}
        </div>

        <!-- Footer -->
        <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <span style="font-size:0.8em;color:#9ca3af;">💬 For urgent concerns, visit or call the Barangay Hall directly.</span>
            <button onclick="trackMyReport()" style="padding:6px 16px;background:white;border:1.5px solid ${meta.color};color:${meta.color};border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.background='${meta.bg}'" onmouseout="this.style.background='white'">
                ↻ Refresh Status
            </button>
        </div>
    </div>`;
}

window.trackMyReport = trackMyReport;

// ===================================
// SUBMISSION CONFIRMATION NOTIFICATION
// ===================================
async function sendSubmissionConfirmation(report) {
    // Read shared notification config set by LGU admin
    let config = {};
    try { config = JSON.parse(localStorage.getItem('notifConfig') || '{}'); } catch(e) {}

    const smsEnabled   = config.smsEnabled   && config.semaphoreApiKey;
    const emailEnabled = config.emailjsEnabled && config.emailjsPublicKey && config.emailjsServiceId && config.emailjsTemplateId;

    const smsMsg =
        `📥 Barangay Danao, Antequera, Bohol\n` +
        `Your report (${report.id}) has been RECEIVED.\n` +
        `Category: ${report.category}\n` +
        `We will notify you of any status updates.\n` +
        `Thank you for reporting!`;

    const emailSubject = `[Barangay Danao] Report ${report.id} Received — ${report.category}`;
    const emailBody =
        `Dear ${report.name},\n\n` +
        `Thank you for submitting your community report to Barangay Danao, Antequera, Bohol.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `REPORT CONFIRMATION\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Reference ID : ${report.id}\n` +
        `Category     : ${report.category}\n` +
        `Location     : ${report.location}\n` +
        `Priority     : ${report.priority}\n` +
        `Status       : 🕐 Pending Review\n` +
        `Submitted On : ${new Date().toLocaleString('en-PH')}\n\n` +
        `Your report has been logged and will be reviewed by our barangay team. ` +
        `You will receive updates when the status changes to In Progress or Resolved.\n\n` +
        `Please save your Reference ID for tracking purposes.\n\n` +
        `Respectfully,\nBarangay Danao Administration\nAntequera, Bohol\n`;

    // Send SMS
    if (smsEnabled && report.contact) {
        try {
            let number = report.contact.replace(/\D/g, '');
            if (number.startsWith('0')) number = '63' + number.substring(1);
            if (!number.startsWith('63')) number = '63' + number;
            await fetch('https://api.semaphore.co/api/v4/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apikey: config.semaphoreApiKey,
                    number,
                    message: smsMsg,
                    sendername: config.semaphoreSenderName || 'BRNGY-DANAO',
                })
            });
        } catch(e) { console.warn('Submission SMS failed:', e); }
    }

    // Send Email
    if (emailEnabled && report.email) {
        try {
            if (!window.emailjs) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
                emailjs.init(config.emailjsPublicKey);
            }
            await emailjs.send(config.emailjsServiceId, config.emailjsTemplateId, {
                to_email:  report.email,
                to_name:   report.name,
                subject:   emailSubject,
                message:   emailBody,
                report_id: report.id,
                status:    'Pending',
                category:  report.category,
                location:  report.location,
            });
        } catch(e) { console.warn('Submission email failed:', e); }
    }
}


function showAlert(elementId, type, message) {
    const alertElement = document.getElementById(elementId);
    alertElement.className = `alert alert-${type} show`;
    alertElement.textContent = message;
}

function hideAlert(elementId) {
    const alertElement = document.getElementById(elementId);
    alertElement.classList.remove('show');
}

// ===================================
// Utility Functions
// ===================================
function parseCoordinates(coordString) {
    if (!coordString) return null;
    
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }
    return null;
}
// ===================================
// CITIZEN COMMUNITY MONITOR CHARTS
// ===================================

const CITIZEN_CATEGORY_META = {
    'Waste Management':        { emoji: '🗑️', color: '#ef4444' },
    'Infrastructure Damage':   { emoji: '🏗️', color: '#f59e0b' },
    'Environmental Violation': { emoji: '🌳', color: '#10b981' },
    'Public Safety':           { emoji: '🚨', color: '#8B1538' },
    'Water & Sanitation':      { emoji: '💧', color: '#2563eb' },
    'Street Lighting':         { emoji: '💡', color: '#D4AF37' },
    'Dog Issues':              { emoji: '🐕', color: '#a16207' },
    'Other':                   { emoji: '📋', color: '#6b7280' }
};



const CitizenMonitor = {
    categoryChart: null,
    statusChart: null,
    trendChart: null
};

function getLast8MonthsCitizen() {
    const months = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }
    return months;
}

function loadAllReportsForMonitor() {
    return db.collection('reports').get().then(snapshot => {
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                date: data.date && data.date.toDate ? data.date.toDate() : new Date(data.date)
            };
        });
    }).catch(() => []);
}

async function initCitizenMonitor() {
    const reports = await loadAllReportsForMonitor();
    updateCitizenStats(reports);
    renderCitizenCategoryChart(reports);
    renderCitizenStatusChart(reports);
    renderCitizenTrendChart(reports);
    const el = document.getElementById('citizenLastUpdated');
    if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

async function refreshCitizenMonitor() {
    ['categoryChart', 'statusChart', 'trendChart'].forEach(k => {
        if (CitizenMonitor[k]) { CitizenMonitor[k].destroy(); CitizenMonitor[k] = null; }
    });
    await initCitizenMonitor();
}

function updateCitizenStats(reports) {
    const pending  = reports.filter(r => r.status === 'Pending').length;
    const inProg   = reports.filter(r => r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const high     = reports.filter(r => r.priority === 'High' && r.status !== 'Resolved').length;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cit-total',    reports.length);
    set('cit-pending',  pending);
    set('cit-inprog',   inProg);
    set('cit-resolved', resolved);
    set('cit-high',     high);
}

function renderCitizenCategoryChart(reports) {
    const canvas = document.getElementById('citCategoryChart');
    if (!canvas) return;
    const cats = Object.keys(CITIZEN_CATEGORY_META);
    const counts = {};
    cats.forEach(c => counts[c] = 0);
    reports.forEach(r => {
        const cat = cats.includes(r.category) ? r.category : 'Other';
        counts[cat]++;
    });
    const sorted = cats.map(c => ({ cat: c, count: counts[c] })).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, x) => s + x.count, 0);

    CitizenMonitor.categoryChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: sorted.map(s => CITIZEN_CATEGORY_META[s.cat].emoji + ' ' + s.cat),
            datasets: [{
                data: sorted.map(s => s.count),
                backgroundColor: sorted.map(s => CITIZEN_CATEGORY_META[s.cat].color),
                borderColor: '#ffffff', borderWidth: 3, hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + ' reports' } }
            }
        }
    });

    const legendEl = document.getElementById('citCategoryLegend');
    if (legendEl) {
        legendEl.innerHTML = sorted.map(s => {
            const meta = CITIZEN_CATEGORY_META[s.cat];
            const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
            return '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:14px;background:#f9fafb;font-size:12px;font-weight:600;border:1px solid #e5e7eb;">'
                + '<span style="width:9px;height:9px;border-radius:50%;background:' + meta.color + ';flex-shrink:0;"></span>'
                + meta.emoji + ' <span style="color:#374151;">' + s.cat + '</span>'
                + ' <strong style="color:' + meta.color + ';">' + s.count + '</strong>'
                + ' <span style="color:#9ca3af;">(' + pct + '%)</span>'
                + '</span>';
        }).join('');
    }
}

function renderCitizenStatusChart(reports) {
    const canvas = document.getElementById('citStatusChart');
    if (!canvas) return;
    const pending  = reports.filter(r => r.status === 'Pending').length;
    const inProg   = reports.filter(r => r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const total    = pending + inProg + resolved;

    CitizenMonitor.statusChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Progress', 'Resolved'],
            datasets: [{
                data: [pending, inProg, resolved],
                backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                borderColor: '#ffffff', borderWidth: 3, hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + ' reports' } }
            }
        }
    });

    const legendEl = document.getElementById('citStatusLegend');
    if (legendEl) {
        const resRate = total > 0 ? ((resolved / total) * 100).toFixed(0) : 0;
        const items = [
            { label: 'Pending',     count: pending,  color: '#f59e0b', bg: '#fef3c7', icon: '🕐' },
            { label: 'In Progress', count: inProg,   color: '#2563eb', bg: '#dbeafe', icon: '🔄' },
            { label: 'Resolved',    count: resolved, color: '#10b981', bg: '#d1fae5', icon: '✅' }
        ];
        legendEl.innerHTML = items.map(it => {
            const pct = total > 0 ? ((it.count / total) * 100).toFixed(1) : '0.0';
            return '<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:14px;background:' + it.bg + ';font-size:12px;font-weight:700;color:' + it.color + ';">'
                + it.icon + ' ' + it.label + ': ' + it.count
                + ' <span style="opacity:0.6;">(' + pct + '%)</span></span>';
        }).join('')
        + '<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:14px;background:#f3f4f6;font-size:12px;font-weight:700;color:#374151;">📊 Resolution Rate: ' + resRate + '%</span>';
    }
}

function renderCitizenTrendChart(reports) {
    const canvas = document.getElementById('citTrendChart');
    if (!canvas) return;
    const months = getLast8MonthsCitizen();

    const totals = months.map((m) => {
        return reports.filter(r => r.date.getFullYear() === m.year && r.date.getMonth() === m.month).length;
    });
    const resolvedPerMonth = months.map((m) => {
        return reports.filter(r => r.date.getFullYear() === m.year && r.date.getMonth() === m.month && r.status === 'Resolved').length;
    });
    const pendingPerMonth = months.map((m) => {
        return reports.filter(r => r.date.getFullYear() === m.year && r.date.getMonth() === m.month && r.status === 'Pending').length;
    });

    CitizenMonitor.trendChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                { label: 'Total Reports', data: totals, borderColor: '#8B1538', backgroundColor: 'rgba(139,21,56,0.10)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#8B1538', pointBorderColor: '#fff', pointBorderWidth: 2 },
                { label: 'Resolved',      data: resolvedPerMonth, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointBorderWidth: 2 },
                { label: 'Pending',       data: pendingPerMonth,  borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 2, tension: 0.4, fill: true, borderDash: [5,3], pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#f59e0b', pointBorderColor: '#fff', pointBorderWidth: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { padding: 14, font: { size: 12, weight: '600' }, boxWidth: 12 } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 10 }, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });

    const pillsEl = document.getElementById('citTrendPills');
    if (pillsEl) {
        const peak = Math.max(...totals);
        pillsEl.innerHTML = months.map((m, i) => {
            const isPeak = totals[i] === peak;
            return '<span style="display:inline-flex;flex-direction:column;align-items:center;padding:8px 14px;border-radius:10px;'
                + 'background:' + (isPeak ? 'linear-gradient(135deg,#8B1538,#D4AF37)' : '#f9fafb') + ';'
                + 'border:1px solid ' + (isPeak ? 'transparent' : '#e5e7eb') + ';">'
                + '<span style="font-size:11px;font-weight:700;color:' + (isPeak ? 'rgba(255,255,255,0.8)' : '#6b7280') + ';text-transform:uppercase;letter-spacing:.4px;">' + m.label + '</span>'
                + '<span style="font-size:1.4em;font-weight:800;color:' + (isPeak ? '#fff' : '#1f2937') + ';line-height:1.2;">' + totals[i] + '</span>'
                + (isPeak ? '<span style="font-size:10px;color:rgba(255,255,255,0.75);">Peak</span>' : '')
                + '</span>';
        }).join('');
    }
}

window.refreshCitizenMonitor = refreshCitizenMonitor;