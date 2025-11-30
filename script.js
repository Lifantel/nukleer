document.addEventListener('DOMContentLoaded', () => {
    // --- UI Referansları ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const shopModal = document.getElementById('shopModal');
    const gameContainer = document.getElementById('game-container');
    const housesGrid = document.getElementById('houses-grid');
    const dayNightOverlay = document.getElementById('day-night-overlay');
    const timeDisplay = document.getElementById('time-display');
    const newsTicker = document.getElementById('news-ticker');

    // Göstergeler
    const tempBar = document.getElementById('temp-bar');
    const tempVal = document.getElementById('temp-val');
    const powerDisplay = document.getElementById('power-digital');
    const targetPowerDisplay = document.getElementById('target-power-digital');
    const gridPercentage = document.getElementById('grid-percentage');
    const fuelBar = document.getElementById('fuel-bar');
    const fuelVal = document.getElementById('fuel-val');
    const moneyVal = document.getElementById('money-val');
    const repBarFill = document.getElementById('rep-bar-fill');
    const repVal = document.getElementById('rep-val');
    const stabilityWarning = document.getElementById('stability-warning');
    
    // Sağlık Barları
    const turbineHealthBar = document.getElementById('turbine-health-bar');
    const pumpHealthBar = document.getElementById('pump-health-bar');

    // Kontroller
    const rod1 = document.getElementById('rod1');
    const rod2 = document.getElementById('rod2');
    const rod3 = document.getElementById('rod3');
    const rodDisplays = [document.getElementById('val-rod1'), document.getElementById('val-rod2'), document.getElementById('val-rod3')];
    const coolingSlider = document.getElementById('coolingSlider');
    const coolingVal = document.getElementById('cooling-val');
    const scramBtn = document.getElementById('scram-btn');
    const refuelBtn = document.getElementById('refuel-btn');

    // --- Oyun Durumu (STATE) ---
    let gameState = {
        active: false,
        fuel: 'uranium',
        temp: 25,
        power: 0,
        money: 1000,
        reputation: 100, // % Halk desteği
        rods: [100, 100, 100], // 100 = Kapalı
        fuelLevel: 100, 
        coolingRate: 50, 
        targetPower: 800, 
        time: 0, 
        maxSafeTemp: 1200, 
        gameOver: false,
        componentHealth: { turbine: 100, pump: 100 }, // % Sağlık
        upgrades: { turbine: false, cooling: false, containment: false }
    };

    // --- Sabitler ---
    const TOTAL_HOUSES = 20;
    const REPAIR_COST = 500;
    const MAX_TEMP_RODS = 2000;
    
    // Haber Başlıkları
    const NEWS_FEED = {
        normal: ["Halk hizmetten memnun.", "Şehir ekonomisi büyüyor.", "Vali santrali ziyaret edecek.", "Hava durumu: Açık."],
        low_power: ["KESİNTİLER BAŞLADI!", "Hastane jeneratörleri devrede.", "Halk sokaklara döküldü.", "Sanayi üretimi durdu."],
        high_rad: ["RADYASYON ALARMI!", "Çevreciler protesto yapıyor.", "Tahliye planları hazırlanıyor.", "GEIGER SAYAÇLARI ÇILDIRDI!"],
        rich: ["Santral kâr rekoru kırdı.", "Yeni yatırımlar yolda.", "Borsa yükselişte."]
    };

    // Yük Profili
    const LOAD_PROFILE = [
        { name: "GECE", duration: 60, target: 600, overlay: "overlay-night", startHr: 0 },
        { name: "SABAH", duration: 90, target: 1500, overlay: "overlay-morning", startHr: 6 },
        { name: "ÖĞLE", duration: 90, target: 1200, overlay: "", startHr: 12 },
        { name: "AKŞAM", duration: 120, target: 1800, overlay: "overlay-evening", startHr: 18 }
    ];
    let currentProfileIndex = 0;

    // --- Başlatma ---
    function initCity() {
        housesGrid.innerHTML = '';
        for(let i=0; i<TOTAL_HOUSES; i++) {
            const h = document.createElement('div');
            h.classList.add('house');
            h.id = `house-${i}`;
            housesGrid.appendChild(h);
        }
    }

    window.startGame = (fuel) => {
        gameState.fuel = fuel;
        gameState.active = true;
        selectionScreen.classList.remove('active');
        gameContainer.style.display = 'block';
        initCity();
        
        // Reset
        gameState.temp = 25;
        gameState.power = 0;
        gameState.money = 1000;
        gameState.reputation = 100;
        gameState.rods = [100, 100, 100];
        gameState.fuelLevel = 100;
        gameState.componentHealth = { turbine: 100, pump: 100 };
        gameState.time = 0;
        gameState.gameOver = false;
        gameState.upgrades = { turbine: false, cooling: false, containment: false };
        currentProfileIndex = 0;
        
        // UI Reset
        updateRodInputs();
        updateUI();
        updateTargetPower(true);
        updateTicker("SİSTEM AKTİF. GÖREV: ŞEHRİ AYDINLAT.");
        gameLoop();
    };

    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    // --- Oyun Döngüsü ---
    let loopCount = 0;
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;
        loopCount++;

        // 1. Zaman ve Profil
        if (loopCount % 60 === 0) { // Her saniye
            gameState.time++;
            
            // Para Kazanma
            if(gameState.power > 0) {
                let gain = gameState.power * 0.1; // MW başına 0.1$
                if(gameState.upgrades.turbine) gain *= 1.25;
                // Türbin bozuksa az para
                gain *= (gameState.componentHealth.turbine / 100);
                gameState.money += gain;
            }

            // Ekipman Eskimesi (Yüksek ısı ve devir = hızlı eskime)
            if(gameState.power > 0) gameState.componentHealth.turbine -= 0.05;
            if(gameState.coolingRate > 50) gameState.componentHealth.pump -= 0.08;
            
            // Profil Kontrolü
            const profile = LOAD_PROFILE[currentProfileIndex];
            if(gameState.time > profile.duration) {
                gameState.time = 0;
                currentProfileIndex = (currentProfileIndex + 1) % LOAD_PROFILE.length;
                updateTargetPower();
            }
            
            // Saat
            let hr = (profile.startHr + Math.floor((gameState.time/profile.duration)*6)) % 24;
            timeDisplay.innerText = `${hr < 10 ? '0'+hr : hr}:00`;

            // Halk Desteği Kontrolü
            checkReputation();
            
            // Haber Güncelleme (Rastgele)
            if(Math.random() < 0.1) updateNews();
        }

        // 2. Fizik Motoru (Stabilize)
        const rodVals = gameState.rods.map(v => parseInt(v)); // 100 = Kapalı
        const rodOpenness = rodVals.map(v => 100 - v); // 0 = Kapalı, 100 = Açık
        
        // Isı Üretimi
        let opennessAvg = rodOpenness.reduce((a,b)=>a+b,0) / 300;
        let fuelMult = gameState.fuel === 'plutonium' ? 1.4 : 1.0;
        let heatGen = opennessAvg * MAX_TEMP_RODS * fuelMult;
        
        // Hotspot Cezası (Dengesizlik)
        let instability = (Math.max(...rodOpenness) - Math.min(...rodOpenness)) / 100;
        heatGen += instability * 400;

        // Soğutma (Pompa sağlığına bağlı!)
        let pumpEfficiency = gameState.componentHealth.pump / 100;
        let coolingPower = (gameState.coolingRate / 100) * 1200 * pumpEfficiency;
        if(gameState.upgrades.cooling) coolingPower *= 1.3;

        // Yeni Sıcaklık (Termal Atalet ile - yavaş değişim)
        // Hedef sıcaklık: Üretim ile soğutmanın dengelendiği nokta
        let targetT = 25 + (heatGen - coolingPower);
        if(targetT < 25) targetT = 25;
        
        // Mevcut sıcaklığı hedefe doğru %1 yaklaştır (Smoothing)
        gameState.temp += (targetT - gameState.temp) * 0.01;

        // Güç Üretimi
        if(gameState.temp > 150) {
            // İdeal çalışma aralığı 300-900 derece arası
            let efficiency = 1;
            if(gameState.temp > 1000) efficiency = 0.5; // Aşırı ısınma verimi düşürür
            
            gameState.power = Math.floor((gameState.temp - 100) * 1.5 * efficiency);
            // Türbin sağlığı etkisi
            gameState.power *= (gameState.componentHealth.turbine / 100);
        } else {
            gameState.power = 0;
        }

        // Yakıt Tüketimi
        if(gameState.power > 0) gameState.fuelLevel -= 0.005;

        // Uyarılar
        if(instability > 0.3) {
            stabilityWarning.innerText = "UYARI: Çubuk Dengesizliği!";
            stabilityWarning.classList.add('danger');
        } else {
            stabilityWarning.innerText = "Stabilite: Normal";
            stabilityWarning.classList.remove('danger');
        }

        checkGameOver();
        updateUI();
        requestAnimationFrame(gameLoop);
    }

    // --- Yardımcı Mantık ---

    function checkReputation() {
        // Hedef gücün ne kadarını karşılıyoruz?
        let coverage = gameState.power / gameState.targetPower;
        
        if(coverage < 0.8) {
            // Elektrik yetersiz -> Halk kızar
            gameState.reputation -= 0.5;
        } else if(coverage > 1.2) {
            // Aşırı yükleme -> Şebeke zararı -> Hafif kızgınlık
            gameState.reputation -= 0.2;
        } else {
            // İyi hizmet -> Mutluluk artar
            gameState.reputation += 0.1;
        }

        // Radyasyon korkusu
        if(gameState.temp > gameState.maxSafeTemp * 0.8) {
            gameState.reputation -= 1.0; // Panik!
        }

        gameState.reputation = Math.min(100, Math.max(0, gameState.reputation));
    }

    function updateTargetPower(first = false) {
        const p = LOAD_PROFILE[currentProfileIndex];
        gameState.targetPower = p.target;
        targetPowerDisplay.innerText = p.target + " MW";
        dayNightOverlay.className = "overlay-layer " + p.overlay;
        if(!first) updateTicker(`YENİ TALEP DÖNEMİ: ${p.name}. HEDEF ${p.target} MW.`);
    }

    function updateNews() {
        let category = 'normal';
        if(gameState.power < gameState.targetPower * 0.5) category = 'low_power';
        if(gameState.temp > gameState.maxSafeTemp * 0.8) category = 'high_rad';
        if(gameState.money > 5000) category = 'rich';
        
        const msg = NEWS_FEED[category][Math.floor(Math.random() * NEWS_FEED[category].length)];
        updateTicker(msg);
    }

    function updateTicker(msg) {
        newsTicker.innerText = `>>> ${msg} <<<`;
        // Animasyonu resetle
        newsTicker.style.animation = 'none';
        newsTicker.offsetHeight; /* trigger reflow */
        newsTicker.style.animation = 'ticker 15s linear infinite';
    }

    window.repairComponent = (comp) => {
        if(gameState.money >= REPAIR_COST) {
            gameState.money -= REPAIR_COST;
            gameState.componentHealth[comp] = 100;
            updateTicker(`${comp.toUpperCase()} TAMİR EDİLDİ.`);
        } else {
            updateTicker("YETERSİZ BAKİYE!");
        }
    };

    window.buyUpgrade = (type, cost) => {
        if(gameState.money >= cost && !gameState.upgrades[type]) {
            gameState.money -= cost;
            gameState.upgrades[type] = true;
            document.getElementById(`item-${type}`).style.opacity = "0.5";
            document.getElementById(`item-${type}`).querySelector('button').innerText = "ALINDI";
            document.getElementById(`item-${type}`).querySelector('button').disabled = true;
            
            if(type === 'containment') gameState.maxSafeTemp = 1600;
        }
    };

    function checkGameOver() {
        if(gameState.temp >= gameState.maxSafeTemp + 200) {
            endGame("ÇEKİRDEK ERİMESİ! Bölge radyasyona boğuldu.");
        }
        if(gameState.reputation <= 0) {
            endGame("KOVULDUN! Halk isyan etti ve valilik lisansını iptal etti.");
        }
        if(gameState.fuelLevel <= 0 && gameState.money < 2000 && gameState.power < 10) {
            endGame("İFLAS! Yakıt bitti ve alacak paran yok.");
        }
    }

    function endGame(msg) {
        gameState.gameOver = true;
        gameState.active = false;
        endScreen.classList.add('active');
        document.getElementById('end-message').innerText = msg;
    }

    // --- UI Update ---
    function updateUI() {
        // Barlar
        let tPct = (gameState.temp / gameState.maxSafeTemp) * 100;
        tempBar.style.width = Math.min(tPct, 100) + '%';
        tempVal.innerText = Math.floor(gameState.temp) + "°C";
        
        if(gameState.temp < 800) tempBar.style.background = "#00cc66";
        else if(gameState.temp < 1100) tempBar.style.background = "#ffcc00";
        else tempBar.style.background = "#ff0000";

        powerDisplay.innerText = gameState.power + " MW";
        moneyVal.innerText = Math.floor(gameState.money).toLocaleString();
        
        fuelBar.style.width = gameState.fuelLevel + '%';
        fuelVal.innerText = Math.floor(gameState.fuelLevel) + '%';

        // Sağlık Barları
        turbineHealthBar.style.width = gameState.componentHealth.turbine + '%';
        turbineHealthBar.firstElementChild.style.background = gameState.componentHealth.turbine > 50 ? '#00cc66' : 'red';
        
        pumpHealthBar.style.width = gameState.componentHealth.pump + '%';
        pumpHealthBar.firstElementChild.style.background = gameState.componentHealth.pump > 50 ? '#00cc66' : 'red';

        // Reputasyon
        repBarFill.style.width = gameState.reputation + '%';
        repVal.innerText = Math.floor(gameState.reputation) + '%';

        // Şehir Işıkları
        let needed = gameState.targetPower / TOTAL_HOUSES;
        let lit = Math.floor(gameState.power / needed);
        for(let i=0; i<TOTAL_HOUSES; i++) {
            const h = document.getElementById(`house-${i}`);
            if(i < lit) h.classList.add('lit'); else h.classList.remove('lit');
        }
        let gridPct = Math.min(100, Math.floor((gameState.power/gameState.targetPower)*100));
        gridPercentage.innerText = gridPct + '%';
        gridPercentage.style.color = gridPct >= 100 ? '#00ffcc' : 'orange';

        // Yakıt Butonu
        if(gameState.fuelLevel < 50 && gameState.money >= 2000) refuelBtn.disabled = false;
        else refuelBtn.disabled = true;
    }

    // Input Events
    function updateRodInputs() {
        gameState.rods[0] = parseInt(rod1.value);
        gameState.rods[1] = parseInt(rod2.value);
        gameState.rods[2] = parseInt(rod3.value);
        
        // 100-val çünkü slider yukarı (0) = Açık
        rodDisplays[0].innerText = (100 - gameState.rods[0]) + '%';
        rodDisplays[1].innerText = (100 - gameState.rods[1]) + '%';
        rodDisplays[2].innerText = (100 - gameState.rods[2]) + '%';
    }
    
    [rod1, rod2, rod3].forEach(r => r.addEventListener('input', updateRodInputs));
    
    coolingSlider.addEventListener('input', () => {
        gameState.coolingRate = parseInt(coolingSlider.value);
        coolingVal.innerText = gameState.coolingRate + '%';
    });

    scramBtn.addEventListener('click', () => {
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        updateRodInputs();
    });

    refuelBtn.addEventListener('click', () => {
        if(gameState.power < 50) {
            gameState.money -= 2000;
            gameState.fuelLevel = 100;
            updateTicker("YAKIT TANKLARI DOLDURULDU.");
        } else {
            updateTicker("GÜVENLİK UYARISI: REAKTÖRÜ DURDURUN!");
        }
    });

    document.getElementById('open-shop-btn').addEventListener('click', () => shopModal.classList.add('active'));
    document.querySelector('.shop-close').addEventListener('click', () => shopModal.classList.remove('active'));
});
