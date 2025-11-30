document.addEventListener('DOMContentLoaded', () => {
    // --- Elementler ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const gameContainer = document.getElementById('game-container');
    const logContent = document.getElementById('log-content');
    const housesGrid = document.getElementById('houses-grid');
    
    // Göstergeler
    const fuelStatus = document.getElementById('fuel-status');
    const tempBar = document.getElementById('temp-bar');
    const tempVal = document.getElementById('temp-val');
    const powerDisplay = document.getElementById('power-digital');
    const targetPowerDisplay = document.getElementById('target-power-digital');
    const gridPercentage = document.getElementById('grid-percentage');
    const fuelBar = document.getElementById('fuel-bar');
    const fuelVal = document.getElementById('fuel-val');

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

    // --- Oyun Değişkenleri ---
    let gameState = {
        active: false,
        fuel: 'uranium',
        temp: 25,
        power: 0,
        rods: [100, 100, 100],
        fuelLevel: 100, 
        coolingRate: 50, 
        targetPower: 1000, 
        time: 0, 
        eventTimer: 0, 
        eventActive: null, 
        powerFactorBase: 2.2, 
        housesLit: 0,
        gameOver: false
    };

    // --- Sabitler ---
    const TOTAL_HOUSES = 10;
    const MELTDOWN_TEMP = 1200; 
    const POWER_FACTOR = 2.2; 
    const MAX_TEMP_FROM_RODS = 1800; 
    const FUEL_CONSUMPTION_RATE = 0.005; 
    const MAX_COOLING_EFFECT = 1.2; 
    const CRITICAL_POWER_WIN = 1500; 

    // Dinamik Yük Profili
    const LOAD_PROFILE = [
        { name: "GECE DÜŞÜK", duration: 60, target: 800 },
        { name: "SABAH YÜKSEK", duration: 120, target: 1200 },
        { name: "ÖĞLE SABİT", duration: 90, target: 1000 },
        { name: "AKŞAM KRİTİK", duration: 180, target: CRITICAL_POWER_WIN }
    ];
    let currentLoadProfileIndex = 0;

    // Kritik Denge Pozisyonları
    const TARGET_RODS = {
        R1_MIN: 20, R1_MAX: 30, 
        R2_MIN: 50, R2_MAX: 60, 
        R3_MIN: 85, R3_MAX: 90  
    };
    
    // Bilgi Verisi
    const infoData = {
        "sogutma": { title: "Soğutma Kuleleri", text: "Bu hiperbolik kuleler, türbinlerden gelen buharı yoğunlaştırıp tekrar su haline getirerek sistemi soğutur. Çıkan duman radyoaktif olmayan temiz su buharıdır." },
        "reaktor": { title: "Reaktör Binası (Koruma Kabı)", text: "Reaktör çekirdeğinin bulunduğu bu dev yapı, nükleer fisyon reaksiyonunun gerçekleştiği ve kontrol çubuklarıyla yönetildiği alandır. Bu kalın beton ve çelik yapısıyla çevreyi korur." },
        "turbin": { title: "Türbin Odası", text: "Reaktörde üretilen buharın kinetik enerjisinin mekanik enerjiye dönüştüğü yerdir. Buhar, dev türbinleri döndürür ve bu hareket jeneratörde elektriğe çevrilir." },
        "su_kaynagi": { title: "Su Kaynağı (Deniz/Nehir Girişi)", text: "Santralin ana soğutma suyu kaynağıdır. Büyük pompalar aracılığıyla soğutma kuleleri ve kondansatörler için su çekilir. Bu suyun akış hızı ve sıcaklığı sürekli izlenmelidir." },
        "yakit_deposu": { title: "Kullanılmış Yakıt Deposu", text: "Reaktörden çıkarılan kullanılmış yakıt çubuklarının depolandığı alandır. Bu çubuklar yüksek oranda radyoaktif kalır ve tamamen soğuyana kadar burada özel havuzlarda tutulur." }
    };

    // Şehri Kur
    function initCity() {
        housesGrid.innerHTML = '';
        for(let i=0; i<TOTAL_HOUSES; i++) {
            const house = document.createElement('div');
            house.classList.add('house');
            house.id = `house-${i}`;
            housesGrid.appendChild(house);
        }
    }

    // Log Yazdırma
    function log(msg, isWarning = false) {
        const p = document.createElement('p');
        p.innerText = `> ${msg}`;
        p.style.color = isWarning ? '#ffcc00' : '#0f0';
        logContent.prepend(p);
        if (logContent.children.length > 15) logContent.lastChild.remove();
    }

    // Oyunu Başlat
    window.startGame = (fuel) => {
        gameState.fuel = fuel;
        gameState.active = true;
        selectionScreen.classList.remove('active');
        gameContainer.style.display = 'block';
        initCity();
        
        // Sıfırlama
        gameState.temp = 25;
        gameState.power = 0;
        gameState.rods = [100, 100, 100];
        gameState.fuelLevel = 100;
        gameState.coolingRate = 50;
        gameState.time = 0;
        gameState.eventTimer = 0;
        gameState.eventActive = null;
        gameState.powerFactorBase = 2.2;
        gameState.gameOver = false;
        currentLoadProfileIndex = 0;
        loopCount = 0; 

        [rod1, rod2, rod3].forEach(rod => rod.disabled = false);
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        updateRodInputs();
        coolingSlider.value = 50; 

        fuelStatus.innerText = `YAKIT: ${fuel.toUpperCase()}`;
        log(`Yakıt yüklendi: ${fuel.toUpperCase()}. Sistem Aktif.`);
        log("Göreviniz: Şebeke taleplerini karşılayın ve kritik dengeye ulaşın.");
        
        updateTargetPower(true); 
        gameLoop();
    };

    // Buton Dinleyicileri (Hata buradaydı, artık HTML'de varlar)
    const uBtn = document.getElementById('uraniumBtn');
    const pBtn = document.getElementById('plutoniumBtn');
    
    if(uBtn) uBtn.addEventListener('click', () => window.startGame('uranium'));
    if(pBtn) pBtn.addEventListener('click', () => window.startGame('plutonium'));

    // Şebeke Yükünü Güncelleme
    function updateTargetPower(isInitial = false) {
        const profile = LOAD_PROFILE[currentLoadProfileIndex];
        if (!profile) {
            log("TÜM GÜÇ HEDEFLERİ TAMAMLANDI. TEBRİKLER!", false);
            endGame(true, "GÖREV BAŞARILI! Tüm şebeke taleplerini başarıyla karşıladınız ve santrali güvende tuttunuz.");
            return;
        }
        gameState.targetPower = profile.target;
        targetPowerDisplay.innerText = `${profile.target} MW (${profile.name})`;
        if (!isInitial) log(`Şebeke Talebi Değişti: Yeni Hedef ${profile.target} MW (${profile.name}).`, true);
    }

    // Rastgele Olaylar
    function handleRandomEvents(loopCount) {
        if (!gameState.active) return;
        
        if (gameState.eventActive && loopCount > gameState.eventActive.endTime) {
            log(`[OLAY BİTTİ] ${gameState.eventActive.title}. Sistem normale döndü.`, false);
            if (gameState.eventActive.type === 'turbine') {
                gameState.powerFactorBase = POWER_FACTOR;
            }
            if (gameState.eventActive.type === 'rod_stuck') {
                gameState.eventActive.targetRod.disabled = false;
            }
            gameState.eventActive = null;
        }

        const EVENT_CHECK_INTERVAL = 6000; 
        if (!gameState.eventActive && gameState.eventTimer > EVENT_CHECK_INTERVAL) {
            gameState.eventTimer = 0;
            if (Math.random() < 0.5) { 
                const events = [
                    { title: "Türbin Basınç Sensörü Arızası", type: "turbine", penalty: 0.5, duration: 2000 },
                    { title: "Su Pompası Arızası (Soğutma Verimi Düştü)", type: "cooling", penalty: 0.4, duration: 3000 },
                    { title: "Kontrol Çubuğu Sıkıştı (Rod B)", type: "rod_stuck", targetRod: rod2, duration: 1500 }
                ];
                const newEvent = events[Math.floor(Math.random() * events.length)];
                newEvent.endTime = loopCount + newEvent.duration;
                gameState.eventActive = newEvent;
                log(`!!! KRİTİK OLAY: ${newEvent.title} !!!`, true);
                
                if (newEvent.type === 'turbine') {
                    gameState.powerFactorBase = POWER_FACTOR - newEvent.penalty;
                } else if (newEvent.type === 'rod_stuck') {
                    newEvent.targetRod.disabled = true;
                }
            }
        }
        gameState.eventTimer++;
    }

    let loopCount = 0;
    
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;
        loopCount++;

        if (loopCount % 100 === 0) {
            gameState.time++; 
            const currentProfile = LOAD_PROFILE[currentLoadProfileIndex];
            
            if (currentProfile && gameState.time > currentProfile.duration) {
                gameState.time = 0;
                currentLoadProfileIndex++;
                updateTargetPower();
            }
        }
        
        handleRandomEvents(loopCount);

        const rodValues = gameState.rods.map(val => parseInt(val));
        const totalOpenness = rodValues.reduce((sum, val) => sum + (100 - val), 0);
        const avgOpenness = totalOpenness / 300; 
        const multiplier = gameState.fuel === 'plutonium' ? 1.2 : 1.0; 

        const maxRod = Math.max(...rodValues);
        const minRod = Math.min(...rodValues);
        const genericInstabilityFactor = (maxRod - minRod) / 100; 
        
        const targetProximity = (
            rodValues[0] >= TARGET_RODS.R1_MIN && rodValues[0] <= TARGET_RODS.R1_MAX &&
            rodValues[1] >= TARGET_RODS.R2_MIN && rodValues[1] <= TARGET_RODS.R2_MAX &&
            rodValues[2] >= TARGET_RODS.R3_MIN && rodValues[2] <= TARGET_RODS.R3_MAX
        );

        let effectiveInstabilityFactor = genericInstabilityFactor;
        
        if (gameState.power >= CRITICAL_POWER_WIN) {
            if (targetProximity) {
                effectiveInstabilityFactor = 0.05; 
                if(loopCount % 100 === 0) log("KRİTİK DENGE KONUMU! Optimum sıcaklık kontrolü sağlandı.", false); 
            } else {
                gameState.temp += 5 * multiplier; 
                if(loopCount % 50 === 0) log("KRİTİK DENGE YOK! 1500+ MW'TA DENGE SAĞLANMALI! HIZLI ISINMA!", true);
            }
        }
        
        let baseTargetTemp = 25 + (avgOpenness * MAX_TEMP_FROM_RODS * multiplier);
        let hotspotBoost = effectiveInstabilityFactor * 300 * multiplier; 
        let targetTemp = baseTargetTemp + hotspotBoost;

        let coolingEffect = (gameState.coolingRate / 100) * MAX_COOLING_EFFECT;
        
        if (gameState.eventActive && gameState.eventActive.type === 'cooling') {
            coolingEffect *= (1 - gameState.eventActive.penalty); 
        }
        
        targetTemp -= (targetTemp * coolingEffect * 0.1); 

        let changeRate = (targetTemp - gameState.temp) * 0.03;
        gameState.temp += changeRate;
        if (gameState.temp > 1000) {
            gameState.temp += (gameState.temp - 1000) * 0.005 * multiplier; 
        }
        if (gameState.temp < 25) gameState.temp = 25;

        let powerFactor = gameState.powerFactorBase;
        
        if (gameState.temp > 300) {
            let basePower = (gameState.temp - 300) * powerFactor;
            let efficiencyPenalty = 1 - (effectiveInstabilityFactor * 0.25); 
            gameState.power = Math.floor(basePower * efficiencyPenalty);
        } else {
            gameState.power = 0;
        }
        
        let consumedPower = Math.floor((gameState.coolingRate / 100) * 200); 
        gameState.power -= consumedPower;
        if (gameState.power < 0) gameState.power = 0;

        if (gameState.power > 0 && gameState.fuelLevel > 0) {
            let fuelBurn = (gameState.power / 1000) * FUEL_CONSUMPTION_RATE * multiplier;
            gameState.fuelLevel -= fuelBurn;
        }
        
        if (gameState.fuelLevel < 0) gameState.fuelLevel = 0;

        if (gameState.fuelLevel <= 5) {
            gameState.power *= (gameState.fuelLevel / 5); 
            
            if (gameState.fuelLevel < 1) { 
                 refuelBtn.disabled = false;
                 if(loopCount % 100 === 0) log("UYARI: Yakıt BİTMEK ÜZERE! İkmal için reaktörü durdurun.", true);
            }
        } else {
             refuelBtn.disabled = true; 
        }
        
        if (gameState.power < 0) gameState.power = 0;

        updateUI();
        checkGameStatus(genericInstabilityFactor); 

        requestAnimationFrame(gameLoop);
    }
    
    function updateUI() {
        let tempPct = (gameState.temp / MELTDOWN_TEMP) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C`;
        
        if (gameState.temp < 800) tempBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.temp < 1100) tempBar.style.backgroundColor = "#ffcc00"; 
        else tempBar.style.backgroundColor = "#ff0000"; 
        
        powerDisplay.innerText = `${gameState.power} MW`;

        fuelVal.innerText = `${Math.floor(gameState.fuelLevel)}%`;
        fuelBar.style.width = `${Math.min(gameState.fuelLevel, 100)}%`;
        if (gameState.fuelLevel > 20) fuelBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.fuelLevel > 5) fuelBar.style.backgroundColor = "#ffcc00"; 
        else fuelBar.style.backgroundColor = "#ff0000"; 
        
        coolingVal.innerText = `${gameState.coolingRate}%`;

        let powerPerHouse = CRITICAL_POWER_WIN / TOTAL_HOUSES; 
        let litCount = Math.floor(gameState.power / powerPerHouse);
        if (litCount > TOTAL_HOUSES) litCount = TOTAL_HOUSES;
        gameState.housesLit = litCount;
        
        for (let i = 0; i < TOTAL_HOUSES; i++) {
            const house = document.getElementById(`house-${i}`);
            if (i < litCount) house.classList.add('lit');
            else house.classList.remove('lit');
        }
        gridPercentage.innerText = `${Math.floor((litCount / TOTAL_HOUSES) * 100)}%`;
    }

    let warningCount = 0;
    function checkGameStatus(genericInstabilityFactor) {
        if (gameState.gameOver) return; 

        if (gameState.temp >= MELTDOWN_TEMP) {
            endGame(false, `KRİTİK BAŞARISIZLIK: ÇEKİRDEK ERİMESİ BAŞLADI (${Math.floor(gameState.temp)}°C). Sıcaklığı 1200°C altında tutmalıydınız!`);
            return;
        }

        if (gameState.fuelLevel <= 0 && gameState.power <= 0 && !refuelBtn.disabled) {
             endGame(false, `YAKIT BİTTİ: Reaksiyon durdu ve şehir elektriksiz kaldı. Yakıt ikmalini zamanında yapmalısınız.`);
             return;
        }

        if (genericInstabilityFactor > 0.4 && gameState.power > 500 && warningCount % 50 === 0) {
             log(`TEHLİKELİ DENGE! Çubuklar arasında büyük fark var (${Math.floor(genericInstabilityFactor * 100)}%). Hotspot riski artıyor.`, true);
        }
        warningCount++;
        
        if (loopCount % 100 === 0 && gameState.power > 0) {
             const diff = gameState.power - gameState.targetPower;
             if (Math.abs(diff) > gameState.targetPower * 0.2) { 
                if (diff > 0) {
                    log(`ŞEBEKE AŞIRI YÜKLENDİ! Gücü azaltın. Hedef: ${gameState.targetPower} MW`, true);
                    gameState.temp += (diff / 100);
                } else {
                    log(`GÜÇ YETERSİZ! Gücü artırın. Hedef: ${gameState.targetPower} MW`, true);
                }
             }
        }
    }

    function endGame(victory, msg) {
        if (gameState.gameOver) return; 

        gameState.gameOver = true;
        gameState.active = false;
        loopCount = 0; 
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        
        endScreen.classList.add('active');
        if(title) {
            title.innerText = victory ? "GÖREV BAŞARILI" : "KRİTİK HATA";
            title.style.color = victory ? "#00cc66" : "red";
        }
        if(message) message.innerText = msg;
    }

    scramBtn.addEventListener('click', () => {
        if (!gameState.active || gameState.gameOver) return;
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        updateRodInputs();
        log("!!! SCRAM TETİKLENDİ !!! Reaksiyon durduruluyor.");
    });

    function updateRodInputs() {
        gameState.rods[0] = parseInt(rod1.value);
        gameState.rods[1] = parseInt(rod2.value);
        gameState.rods[2] = parseInt(rod3.value);

        rodDisplays[0].innerText = gameState.rods[0] + '%';
        rodDisplays[1].innerText = gameState.rods[1] + '%';
        rodDisplays[2].innerText = gameState.rods[2] + '%';
    }

    [rod1, rod2, rod3].forEach(rod => {
        rod.addEventListener('input', updateRodInputs);
    });

    coolingSlider.addEventListener('input', () => {
        gameState.coolingRate = parseInt(coolingSlider.value);
        coolingVal.innerText = gameState.coolingRate + '%';
    });

    refuelBtn.addEventListener('click', () => {
        if (refuelBtn.disabled) return;
        
        if (gameState.power > 50) {
             log("!!! İKMAL İÇİN REAKTÖR KAPATILMALI !!! Gücü 50 MW altına indirin veya SCRAM yapın.", true);
             return;
        }
        gameState.fuelLevel = 100;
        refuelBtn.disabled = true;
        log("YAKIT İKMALİ TAMAMLANDI. Sisteme %100 yakıt yüklendi.", false);
    });

    updateRodInputs();
    
    // Popup Kodları
    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    infoPoints.forEach(p => {
        p.addEventListener('click', () => {
            const key = p.getAttribute('data-info');
            const data = infoData[key];
            if(data){
                modalTitle.innerText = data.title;
                modalText.innerText = data.text;
                modal.classList.add('active');
            }
        });
    });
    
    if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    window.onclick = (e) => { if(e.target == modal) modal.classList.remove('active'); };

});
