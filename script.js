document.addEventListener('DOMContentLoaded', () => {
    // --- UI Referansları ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const shopModal = document.getElementById('shopModal');
    const gameContainer = document.getElementById('game-container');
    const logContent = document.getElementById('log-content');
    const housesGrid = document.getElementById('houses-grid');
    const dayNightOverlay = document.getElementById('day-night-overlay');
    const timeDisplay = document.getElementById('time-display');

    // Göstergeler
    const fuelStatus = document.getElementById('fuel-status');
    const tempBar = document.getElementById('temp-bar');
    const tempVal = document.getElementById('temp-val');
    const powerDisplay = document.getElementById('power-digital');
    const targetPowerDisplay = document.getElementById('target-power-digital');
    const gridPercentage = document.getElementById('grid-percentage');
    const fuelBar = document.getElementById('fuel-bar');
    const fuelVal = document.getElementById('fuel-val');
    const moneyVal = document.getElementById('money-val');
    const stabilityWarning = document.getElementById('stability-warning');

    // Kontroller
    const rod1 = document.getElementById('rod1');
    const rod2 = document.getElementById('rod2');
    const rod3 = document.getElementById('rod3');
    const rodDisplays = [
        document.getElementById('val-rod1'), 
        document.getElementById('val-rod2'), 
        document.getElementById('val-rod3')
    ];
    const coolingSlider = document.getElementById('coolingSlider');
    const coolingVal = document.getElementById('cooling-val');
    const scramBtn = document.getElementById('scram-btn');
    const refuelBtn = document.getElementById('refuel-btn');
    const openShopBtn = document.getElementById('open-shop-btn');
    const closeShopBtn = document.querySelector('.shop-close');

    // --- Oyun Durumu ---
    let gameState = {
        active: false,
        fuel: 'uranium',
        temp: 25,
        targetTemp: 25, // Stabilizasyon için eklendi
        power: 0,
        money: 500, // Başlangıç parası
        rods: [100, 100, 100],
        fuelLevel: 100, 
        coolingRate: 50, 
        targetPower: 800, 
        time: 0, 
        dayTime: 0, // 0-24 saat döngüsü için
        eventTimer: 0, 
        eventActive: null, 
        powerFactorBase: 2.2,
        maxSafeTemp: 1200, // Yükseltilebilir
        gameOver: false,
        upgrades: {
            turbine: false,
            cooling: false,
            containment: false
        }
    };

    // --- Sabitler ---
    const TOTAL_HOUSES = 15;
    const POWER_FACTOR = 2.2; 
    const MAX_TEMP_FROM_RODS = 1800; 
    const FUEL_CONSUMPTION_RATE = 0.003; // Biraz düşürüldü
    const REFUEL_COST = 2000;

    // Yük Profili (Saat ve Hedef)
    const LOAD_PROFILE = [
        { name: "GECE (Düşük Tüketim)", duration: 60, target: 800, overlay: "overlay-night", hourStart: 0 },
        { name: "SABAH (Yüksek Tüketim)", duration: 90, target: 1400, overlay: "overlay-morning", hourStart: 6 },
        { name: "ÖĞLE (Endüstriyel Yük)", duration: 90, target: 1200, overlay: "", hourStart: 12 },
        { name: "AKŞAM (Kritik Zirve)", duration: 120, target: 1600, overlay: "overlay-evening", hourStart: 18 }
    ];
    let currentProfileIndex = 0;

    // Kritik Denge Pozisyonları (Değişkenlik için)
    const TARGET_RODS = {
        R1_MIN: 20, R1_MAX: 35, 
        R2_MIN: 45, R2_MAX: 65, 
        R3_MIN: 80, R3_MAX: 95  
    };

    // --- Temel Fonksiyonlar ---

    function initCity() {
        housesGrid.innerHTML = '';
        for(let i=0; i<TOTAL_HOUSES; i++) {
            const house = document.createElement('div');
            house.classList.add('house');
            house.id = `house-${i}`;
            housesGrid.appendChild(house);
        }
    }

    function log(msg, isWarning = false) {
        const p = document.createElement('p');
        p.innerText = `> ${msg}`;
        p.style.color = isWarning ? '#ffcc00' : '#0f0';
        logContent.prepend(p);
        if (logContent.children.length > 20) logContent.lastChild.remove();
    }

    window.startGame = (fuel) => {
        gameState.fuel = fuel;
        gameState.active = true;
        selectionScreen.classList.remove('active');
        gameContainer.style.display = 'block';
        initCity();
        
        // Reset
        gameState.temp = 25;
        gameState.targetTemp = 25;
        gameState.power = 0;
        gameState.money = 500;
        gameState.rods = [100, 100, 100];
        gameState.fuelLevel = 100;
        gameState.coolingRate = 50;
        gameState.time = 0;
        gameState.dayTime = 0;
        gameState.maxSafeTemp = 1200;
        gameState.gameOver = false;
        gameState.upgrades = { turbine: false, cooling: false, containment: false };
        currentProfileIndex = 0;

        // Reset UI Elements
        document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('purchased'));
        document.querySelectorAll('.buy-btn').forEach(el => {
            el.disabled = false; 
            el.innerText = el.innerText.replace(" (SATIN ALINDI)", "");
        });

        [rod1, rod2, rod3].forEach(rod => { rod.disabled = false; rod.value = 100; });
        updateRodInputs();
        coolingSlider.value = 50; 
        updateUI();

        fuelStatus.innerText = `YAKIT: ${fuel.toUpperCase()}`;
        log(`Sistem başlatıldı. Yakıt: ${fuel}. İyi şanslar operatör.`);
        updateTargetPower(true); 
        gameLoop();
    };

    // Event Listeners - Start Buttons
    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    // --- Oyun Mantığı ---

    function updateTargetPower(isInitial = false) {
        const profile = LOAD_PROFILE[currentProfileIndex];
        if (!profile) {
            // Döngü biterse başa sar (Sonsuz oyun)
            currentProfileIndex = 0;
            updateTargetPower();
            return;
        }
        gameState.targetPower = profile.target;
        targetPowerDisplay.innerText = `${profile.target} MW`;
        
        // Overlay ve Zaman Görseli
        dayNightOverlay.className = "overlay-layer " + profile.overlay;
        
        if (!isInitial) log(`YENİ VARDİYA: ${profile.name} - Hedef: ${profile.target} MW`, true);
    }

    // YENİ: Market Fonksiyonu
    window.buyUpgrade = (type, cost) => {
        if(gameState.money >= cost && !gameState.upgrades[type]) {
            gameState.money -= cost;
            gameState.upgrades[type] = true;
            
            // UI Güncelleme
            const item = document.getElementById(`item-${type}`);
            item.classList.add('purchased');
            item.querySelector('button').innerText = "SATIN ALINDI";
            item.querySelector('button').disabled = true;

            // Etkileri Uygula
            if(type === 'containment') {
                gameState.maxSafeTemp = 1500;
                log("SİSTEM: Koruma kabı güçlendirildi. Max ısı 1500°C.", false);
            } else if(type === 'cooling') {
                log("SİSTEM: Yapay Zeka soğutma optimizasyonu aktif.", false);
            } else {
                log("SİSTEM: Türbin verimliliği artırıldı.", false);
            }
            updateUI();
        } else {
            if(gameState.money < cost) alert("Yetersiz bakiye!");
        }
    };

    let loopCount = 0;
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;
        loopCount++;

        // 1. Zaman ve Profil Yönetimi
        if (loopCount % 60 === 0) { // Her saniye (yaklaşık)
            gameState.time++;
            
            // Para Kazanma (Her saniye üretilen gücün %5'i kadar + Türbin Bonusu)
            if(gameState.power > 0) {
                let earnings = gameState.power * 0.05;
                if(gameState.upgrades.turbine) earnings *= 1.2;
                gameState.money += earnings;
            }

            const currentProfile = LOAD_PROFILE[currentProfileIndex];
            // Profil süresi doldu mu?
            if (gameState.time > currentProfile.duration) {
                gameState.time = 0;
                currentProfileIndex++;
                updateTargetPower();
            }

            // Saat Gösterimi (Yapay)
            let hour = (currentProfile.hourStart + Math.floor((gameState.time / currentProfile.duration) * 6)) % 24;
            timeDisplay.innerText = `${hour < 10 ? '0'+hour : hour}:00`;
        }

        // 2. Fizik Hesaplamaları (Stabilize Edilmiş)
        const rodValues = gameState.rods.map(val => parseInt(val));
        
        // Ortalama çubuk açıklığı (0 = kapalı, 100 = açık, ters mantık: input 0 -> %100 açık)
        // DÜZELTME: Slider 100 = Tamamen içeride (Reaksiyon yok), Slider 0 = Tamamen dışarıda (Max Reaksiyon)
        // Ancak UI'da genellikle 100% = Tam güç algılanır. 
        // Kodumuzda: value=100 -> Rodlar içerde (Power Düşük). Value=0 -> Rodlar dışarıda (Power Yüksek).
        // UI'da kullanıcıya "Çekilme Oranı" göstereceğiz.
        
        const rodOpenness = rodValues.map(v => 100 - v); // 0 (kapalı) ile 100 (açık) arası
        const avgOpenness = rodOpenness.reduce((a,b)=>a+b,0) / 300; 
        
        // Stabilite Kontrolü (Hotspot)
        const maxRod = Math.max(...rodOpenness);
        const minRod = Math.min(...rodOpenness);
        const instability = (maxRod - minRod) / 100; // 0 ile 1 arası
        
        // Isı Hedefi Hesaplama
        const fuelMult = gameState.fuel === 'plutonium' ? 1.3 : 1.0;
        let heatGen = (avgOpenness * MAX_TEMP_FROM_RODS * fuelMult);
        
        // Hotspot cezası (Dengesiz çubuklar ekstra ısı üretir)
        heatGen += (instability * 500);

        // Soğutma Etkisi
        let coolingEffect = (gameState.coolingRate / 100) * 1.5; // Taban soğutma
        if(gameState.upgrades.cooling) coolingEffect *= 1.25; // Yükseltme
        
        // Hedef Sıcaklık (Isı Üretimi - Soğutma)
        // Fizik: Isı üretimi sabit, soğutma sıcaklıkla orantılı çalışır (Newton's Law of Cooling basitleştirilmiş)
        // Denge Sıcaklığı = Isı Üretimi / Soğutma Katsayısı
        // Ancak oyun için basitleştirilmiş:
        
        // Yeni Stabil Mantık: Hedef sıcaklığı belirle ve ona doğru yumuşakça git (Lerp)
        let equilibriumTemp = 25 + (heatGen * (1.0 - (coolingEffect * 0.6))); 
        
        // Sıcaklık Değişimi (Smooth)
        const diff = equilibriumTemp - gameState.temp;
        gameState.temp += diff * 0.02; // Her karede farkın %2'sini kapat

        // Güç Üretimi (Türbinler belli ısıdan sonra çalışır)
        if (gameState.temp > 200) {
            let efficientTemp = Math.min(gameState.temp, 1000); // 1000 derece üstü ekstra güç vermez, sadece risk
            gameState.power = Math.floor((efficientTemp - 200) * gameState.powerFactorBase);
        } else {
            gameState.power = 0;
        }

        // Yakıt Tüketimi
        if (gameState.power > 0 && gameState.fuelLevel > 0) {
            gameState.fuelLevel -= (gameState.power / 1000) * FUEL_CONSUMPTION_RATE;
        }

        // --- Kontroller ve Uyarılar ---
        if(instability > 0.3) {
            stabilityWarning.innerText = "DİKKAT: ÇUBUK DENGESİZLİĞİ!";
            stabilityWarning.classList.add('danger');
        } else {
            stabilityWarning.innerText = "Stabilite: Normal";
            stabilityWarning.classList.remove('danger');
        }

        // Yakıt Bitmesi
        if (gameState.fuelLevel <= 0) {
            gameState.fuelLevel = 0;
            gameState.power = 0;
            if(refuelBtn.disabled) refuelBtn.disabled = false;
        }

        checkGameStatus();
        updateUI();
        requestAnimationFrame(gameLoop);
    }

    function checkGameStatus() {
        if (gameState.gameOver) return;

        // Erime
        if (gameState.temp >= gameState.maxSafeTemp) {
            endGame(false, `ÇEKİRDEK ERİDİ! (${Math.floor(gameState.temp)}°C). Radyasyon sızıntısı başladı.`);
        }
    }

    function updateUI() {
        // Barlar
        let tempPct = (gameState.temp / gameState.maxSafeTemp) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C / Max ${gameState.maxSafeTemp}`;
        
        // Renkler
        if (gameState.temp < gameState.maxSafeTemp * 0.7) tempBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.temp < gameState.maxSafeTemp * 0.9) tempBar.style.backgroundColor = "#ffcc00"; 
        else tempBar.style.backgroundColor = "#ff0000"; 

        powerDisplay.innerText = `${gameState.power} MW`;
        moneyVal.innerText = Math.floor(gameState.money).toLocaleString();
        
        fuelBar.style.width = `${Math.max(0, gameState.fuelLevel)}%`;
        fuelVal.innerText = `${Math.floor(gameState.fuelLevel)}%`;
        
        coolingVal.innerText = `${gameState.coolingRate}%`;

        // Şehir Işıkları
        let powerPerHouse = gameState.targetPower / TOTAL_HOUSES; 
        let litCount = Math.floor(gameState.power / powerPerHouse);
        if (gameState.power === 0) litCount = 0;
        
        for (let i = 0; i < TOTAL_HOUSES; i++) {
            const house = document.getElementById(`house-${i}`);
            if (i < litCount) house.classList.add('lit');
            else house.classList.remove('lit');
        }
        
        let gridPct = Math.min(100, Math.floor((gameState.power / gameState.targetPower) * 100));
        gridPercentage.innerText = `${gridPct}%`;
        gridPercentage.style.color = gridPct >= 100 ? '#00ffcc' : (gridPct < 50 ? 'red' : 'white');
    }

    function endGame(victory, msg) {
        gameState.gameOver = true;
        gameState.active = false;
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        endScreen.classList.add('active');
        
        title.innerText = victory ? "GÖREV BAŞARILI" : "SİSTEM KAPANDI";
        title.style.color = victory ? "#00cc66" : "red";
        message.innerText = msg;
    }

    // --- Etkileşimler ---

    function updateRodInputs() {
        gameState.rods[0] = parseInt(rod1.value);
        gameState.rods[1] = parseInt(rod2.value);
        gameState.rods[2] = parseInt(rod3.value);

        // UI'da "Çekilme Oranını" (100 - value) gösterelim ki daha mantıklı olsun
        // Input aşağı (100) = Kapalı (%0 Güç)
        // Input yukarı (0) = Açık (%100 Güç)
        rodDisplays[0].innerText = (100 - gameState.rods[0]) + '%';
        rodDisplays[1].innerText = (100 - gameState.rods[1]) + '%';
        rodDisplays[2].innerText = (100 - gameState.rods[2]) + '%';
    }

    [rod1, rod2, rod3].forEach(rod => rod.addEventListener('input', updateRodInputs));

    coolingSlider.addEventListener('input', () => {
        gameState.coolingRate = parseInt(coolingSlider.value);
        coolingVal.innerText = gameState.coolingRate + '%';
    });

    scramBtn.addEventListener('click', () => {
        if (!gameState.active) return;
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        gameState.rods = [100,100,100];
        updateRodInputs();
        log("!!! SCRAM !!! Tüm çubuklar indirildi.");
    });

    refuelBtn.addEventListener('click', () => {
        if(gameState.money >= REFUEL_COST) {
            if(gameState.power < 100) {
                gameState.money -= REFUEL_COST;
                gameState.fuelLevel = 100;
                log("Yakıt ikmali tamamlandı.", false);
                refuelBtn.disabled = true;
            } else {
                log("UYARI: İkmal için reaktör gücünü düşürün (<100 MW).", true);
            }
        } else {
            log("Yetersiz bakiye! İkmal için 2.000$ gerekli.", true);
        }
    });

    // Market Kontrolleri
    openShopBtn.addEventListener('click', () => shopModal.classList.add('active'));
    closeShopBtn.addEventListener('click', () => shopModal.classList.remove('active'));

    // Bilgi Modalı
    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const infoClose = modal.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    const infoData = {
        "sogutma": { title: "Soğutma Kuleleri", text: "Sıcak suyu buharlaştırarak soğutan sistem. Yükseltme ile daha verimli çalışır." },
        "reaktor": { title: "Reaktör Kalbi", text: "Fisyonun gerçekleştiği yer. Sıcaklığı sürekli kontrol altında tutmalısın." },
        "turbin": { title: "Buhar Türbini", text: "Isıyı elektriğe çevirir. Daha iyi türbinler daha çok para kazandırır." },
        "su_kaynagi": { title: "Su Pompaları", text: "Sisteme soğuk su basar. Soğutma sliderı burayı kontrol eder." },
        "yakit_deposu": { title: "Yakıt Depolama", text: "Uranyum ve Plütonyum çubukları burada saklanır." }
    };

    infoPoints.forEach(p => {
        p.addEventListener('click', () => {
            const key = p.getAttribute('data-info');
            if(infoData[key]){
                modalTitle.innerText = infoData[key].title;
                modalText.innerText = infoData[key].text;
                modal.classList.add('active');
            }
        });
    });
    infoClose.addEventListener('click', () => modal.classList.remove('active'));
    
    // Dışarı tıklayınca kapatma
    window.onclick = (e) => {
        if(e.target == modal) modal.classList.remove('active');
        if(e.target == shopModal) shopModal.classList.remove('active');
    };
});
