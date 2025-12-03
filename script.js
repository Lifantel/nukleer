document.addEventListener('DOMContentLoaded', () => {
    // --- UI Referansları ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const shopModal = document.getElementById('shopModal');
    const bankModal = document.getElementById('bankModal'); // YENİ
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
    const satisfactionVal = document.getElementById('satisfaction-val');
    
    const fuelBar = document.getElementById('fuel-bar');
    const fuelVal = document.getElementById('fuel-val');
    const moneyVal = document.getElementById('money-val');
    const stabilityWarning = document.getElementById('stability-warning');

    // Borç UI (YENİ)
    const debtReadout = document.getElementById('debt-readout');
    const debtTimerDisplay = document.getElementById('debt-timer-display');
    const activeLoanInfo = document.getElementById('active-loan-info');
    const loanOptionsDiv = document.getElementById('loan-options');
    const currentDebtVal = document.getElementById('current-debt-val');
    const loanTimerModal = document.getElementById('loan-timer-modal');
    const repayBtn = document.getElementById('repay-btn');

    // Arıza Sistemi UI
    const malfunctionBar = document.getElementById('malfunction-bar');
    const malfunctionVal = document.getElementById('malfunction-val');
    const malfunctionList = document.getElementById('active-malfunctions-list');

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
    
    // YENİ BUTONLAR
    const openBankBtn = document.getElementById('open-bank-btn');
    const closeBankBtn = document.querySelector('.bank-close');

    // --- Oyun Durumu ---
    let gameState = {
        active: false,
        fuel: 'uranium',
        temp: 25,
        targetTemp: 25, 
        power: 0,
        money: 500, 
        rods: [100, 100, 100],
        fuelLevel: 100, 
        coolingRate: 50, 
        targetPower: 800, 
        time: 0, 
        dayTime: 0,
        powerFactorBase: 2.2,
        maxSafeTemp: 1200, 
        gameOver: false,
        malfunctionLevel: 0, 
        activeMalfunctions: [], 
        satisfaction: 100,
        // YENİ: Borç Sistemi State
        loan: {
            active: false,
            amount: 0,
            timer: 0, // saniye cinsinden
            maxTime: 0
        },
        upgrades: {
            turbine: false,
            cooling: false,
            containment: false,
            maintenance: false,
            pr: false,
            banker: false // YENİ UPGRADE
        }
    };

    // --- Sabitler ---
    const TOTAL_HOUSES = 15;
    const MAX_TEMP_FROM_RODS = 1800; 
    const FUEL_CONSUMPTION_RATE = 0.003; 
    const REFUEL_COST = 2000;
    const BASE_INTEREST = 1000; // Sabit Faiz

    const MALFUNCTION_TYPES = [
        { name: "Pompa Valfi Sıkışması", baseCost: 1500, damage: 15 },
        { name: "Türbin Dişlisi Kırığı", baseCost: 2500, damage: 20 },
        { name: "Soğutma Sızıntısı", baseCost: 3000, damage: 25 },
        { name: "Kontrol Çubuğu Hatası", baseCost: 4000, damage: 30 },
        { name: "Ana Devre Yanığı", baseCost: 5000, damage: 35 }
    ];

    const LOAD_PROFILE = [
        { name: "GECE (Düşük Tüketim)", duration: 60, target: 800, overlay: "overlay-night", hourStart: 0 },
        { name: "SABAH (Yüksek Tüketim)", duration: 90, target: 1400, overlay: "overlay-morning", hourStart: 6 },
        { name: "ÖĞLE (Endüstriyel Yük)", duration: 90, target: 1200, overlay: "", hourStart: 12 },
        { name: "AKŞAM (Kritik Zirve)", duration: 120, target: 1600, overlay: "overlay-evening", hourStart: 18 }
    ];
    let currentProfileIndex = 0;

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
        
        gameState.malfunctionLevel = 0;
        gameState.activeMalfunctions = [];
        gameState.satisfaction = 100;

        // Borç Reset
        gameState.loan = { active: false, amount: 0, timer: 0, maxTime: 0 };
        debtReadout.style.display = 'none';

        gameState.upgrades = { turbine: false, cooling: false, containment: false, maintenance: false, pr: false, banker: false };
        currentProfileIndex = 0;

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
        log(`Sistem başlatıldı. Yakıt: ${fuel}.`, false);
        updateTargetPower(true); 
        gameLoop();
    };

    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    function updateTargetPower(isInitial = false) {
        const profile = LOAD_PROFILE[currentProfileIndex];
        if (!profile) {
            currentProfileIndex = 0;
            updateTargetPower();
            return;
        }
        gameState.targetPower = profile.target;
        targetPowerDisplay.innerText = `${profile.target} MW`;
        dayNightOverlay.className = "overlay-layer " + profile.overlay;
        if (!isInitial) log(`YENİ VARDİYA: ${profile.name}`, true);
    }

    // --- Market & Borç Fonksiyonları ---

    window.buyUpgrade = (type, cost) => {
        if(gameState.money >= cost && !gameState.upgrades[type]) {
            gameState.money -= cost;
            gameState.upgrades[type] = true;
            
            const item = document.getElementById(`item-${type}`);
            item.classList.add('purchased');
            item.querySelector('button').innerText = "SATIN ALINDI";
            item.querySelector('button').disabled = true;

            if(type === 'containment') {
                gameState.maxSafeTemp = 1500;
                log("SİSTEM: Koruma kabı güçlendirildi.", false);
            } else if(type === 'cooling') {
                log("SİSTEM: Yapay Zeka soğutma aktif.", false);
            } else if(type === 'maintenance') {
                log("SİSTEM: Acil Bakım Ekibi göreve hazır.", false);
            } else if(type === 'pr') {
                log("SİSTEM: Medya merkezi kuruldu.", false);
            } else if(type === 'banker') {
                log("ANLAŞMA: Bankacı ile anlaşıldı. Faizler düşük.", false);
            } else {
                log("SİSTEM: Türbin verimliliği artırıldı.", false);
            }
            updateUI();
        } else {
            if(gameState.money < cost) alert("Yetersiz bakiye!");
        }
    };

    // YENİ: Borç Alma
    window.takeLoan = (amount, duration) => {
        if(gameState.loan.active) {
            alert("Zaten aktif bir borcun var! Önce onu öde.");
            return;
        }

        let interest = BASE_INTEREST;
        if(gameState.upgrades.banker) interest = 250; // Bankacı upgrade varsa faiz düşer

        gameState.money += amount;
        gameState.loan.active = true;
        gameState.loan.amount = amount + interest;
        gameState.loan.timer = duration;
        gameState.loan.maxTime = duration;

        log(`BANKA: ${amount}$ kredi çekildi. Geri ödeme: ${gameState.loan.amount}$`, true);
        
        bankModal.classList.remove('active');
        updateBankUI();
        updateUI();
    };

    repayBtn.addEventListener('click', () => {
        if(gameState.money >= gameState.loan.amount) {
            gameState.money -= gameState.loan.amount;
            gameState.loan.active = false;
            gameState.loan.amount = 0;
            gameState.loan.timer = 0;
            log("BANKA: Borç başarıyla ödendi. Temizsin.", false);
            updateBankUI();
            updateUI();
        } else {
            log(`BANKA: Yetersiz bakiye! ${gameState.loan.amount}$ gerekli.`, true);
        }
    });

    function updateBankUI() {
        if(gameState.loan.active) {
            activeLoanInfo.style.display = 'block';
            loanOptionsDiv.style.display = 'none';
            debtReadout.style.display = 'block';
            
            currentDebtVal.innerText = gameState.loan.amount;
            loanTimerModal.innerText = gameState.loan.timer;
            
            let minutes = Math.floor(gameState.loan.timer / 60);
            let seconds = gameState.loan.timer % 60;
            debtTimerDisplay.innerText = `${minutes}:${seconds < 10 ? '0'+seconds : seconds}`;

        } else {
            activeLoanInfo.style.display = 'none';
            loanOptionsDiv.style.display = 'grid';
            debtReadout.style.display = 'none';
        }
    }

    // --- Arıza Yönetimi ---
    function triggerRandomMalfunction() {
        if (gameState.gameOver) return;
        if (gameState.malfunctionLevel >= 100) return;

        const type = MALFUNCTION_TYPES[Math.floor(Math.random() * MALFUNCTION_TYPES.length)];
        
        const fault = {
            id: Date.now(),
            name: type.name,
            cost: type.baseCost,
            damage: type.damage
        };

        gameState.activeMalfunctions.push(fault);
        gameState.malfunctionLevel = Math.min(100, gameState.malfunctionLevel + fault.damage);

        log(`ALARM: ${fault.name} tespit edildi! Hasar: +%${fault.damage}`, true);
        updateMalfunctionUI();
    }

    function updateMalfunctionUI() {
        malfunctionBar.style.width = `${gameState.malfunctionLevel}%`;
        malfunctionVal.innerText = `${gameState.malfunctionLevel}%`;
        
        if(gameState.malfunctionLevel > 80) malfunctionBar.style.backgroundColor = "red";
        else malfunctionBar.style.backgroundColor = "#ff3366";

        malfunctionList.innerHTML = '';
        if (gameState.activeMalfunctions.length === 0) {
            malfunctionList.innerHTML = '<p style="color:#666; font-size:0.8rem; text-align:center;">Sistem Stabil...</p>';
            return;
        }

        gameState.activeMalfunctions.forEach(fault => {
            const div = document.createElement('div');
            div.className = 'malfunction-item';
            
            let actualCost = fault.cost;
            if (gameState.upgrades.maintenance) actualCost = Math.floor(fault.cost / 2);

            div.innerHTML = `
                <div class="malfunction-info">
                    ${fault.name}<br>
                    <span style="color:#fff;">Etki: %${fault.damage}</span>
                </div>
                <button class="repair-btn" onclick="repairMalfunction(${fault.id}, ${actualCost}, ${fault.damage})">
                    TAMİR ET (${actualCost}$)
                </button>
            `;
            malfunctionList.appendChild(div);
        });
    }

    window.repairMalfunction = (id, cost, damage) => {
        if (gameState.money >= cost) {
            gameState.money -= cost;
            gameState.activeMalfunctions = gameState.activeMalfunctions.filter(m => m.id !== id);
            gameState.malfunctionLevel = Math.max(0, gameState.malfunctionLevel - damage);
            log(`ONARIM: Arıza giderildi. Sistem rahatladı.`, false);
            updateMalfunctionUI();
            updateUI(); 
        } else {
            log(`YETERSİZ FON: Tamir için ${cost}$ gerekli!`, true);
        }
    };

    let loopCount = 0;
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;
        loopCount++;

        // 1. Zamanlayıcı İşlemleri (Saniyede bir)
        if (loopCount % 60 === 0) { 
            gameState.time++;
            
            // Borç Sayacı Kontrolü
            if(gameState.loan.active) {
                gameState.loan.timer--;
                updateBankUI(); // Sayacı güncelle
                if(gameState.loan.timer <= 10) {
                    debtTimerDisplay.style.color = (gameState.loan.timer % 2 === 0) ? "red" : "yellow"; // Son 10sn yanıp sönme
                }
            }

            // Para Kazanma
            if(gameState.power > 0) {
                let earnings = gameState.power * 0.05;
                if(gameState.upgrades.turbine) earnings *= 1.2;
                gameState.money += earnings;
            }

            // Arıza Tetikleme Şansı
            let chance = 0.005;
            if (gameState.temp > 800) chance = 0.02;
            if (Math.random() < chance) {
                triggerRandomMalfunction();
            }

            // Memnuniyet Hesaplama
            let gridPct = Math.min(100, Math.floor((gameState.power / gameState.targetPower) * 100));
            
            if (gridPct >= 100) {
                gameState.satisfaction += 1;
            } else {
                let dropAmount = (100 - gridPct) / 10;
                if (gameState.upgrades.pr) dropAmount *= 0.5;
                gameState.satisfaction -= dropAmount;
            }
            if (gameState.satisfaction > 100) gameState.satisfaction = 100;
            if (gameState.satisfaction < 0) gameState.satisfaction = 0;

            // Zaman İlerletme
            const currentProfile = LOAD_PROFILE[currentProfileIndex];
            if (gameState.time > currentProfile.duration) {
                gameState.time = 0;
                currentProfileIndex++;
                updateTargetPower();
            }

            let hour = (currentProfile.hourStart + Math.floor((gameState.time / currentProfile.duration) * 6)) % 24;
            timeDisplay.innerText = `${hour < 10 ? '0'+hour : hour}:00`;
        }

        // 2. Fizik Hesaplamaları
        const rodValues = gameState.rods.map(val => parseInt(val));
        const rodOpenness = rodValues.map(v => 100 - v); 
        const avgOpenness = rodOpenness.reduce((a,b)=>a+b,0) / 300; 
        
        const maxRod = Math.max(...rodOpenness);
        const minRod = Math.min(...rodOpenness);
        const instability = (maxRod - minRod) / 100; 
        
        const fuelMult = gameState.fuel === 'plutonium' ? 1.3 : 1.0;
        let heatGen = (avgOpenness * MAX_TEMP_FROM_RODS * fuelMult);
        heatGen += (instability * 500);

        let coolingEffect = (gameState.coolingRate / 100) * 1.5; 
        if(gameState.upgrades.cooling) coolingEffect *= 1.25; 
        
        let equilibriumTemp = 25 + (heatGen * (1.0 - (coolingEffect * 0.6))); 
        const diff = equilibriumTemp - gameState.temp;
        gameState.temp += diff * 0.02; 

        if (gameState.temp > 200) {
            let efficientTemp = Math.min(gameState.temp, 1000); 
            gameState.power = Math.floor((efficientTemp - 200) * gameState.powerFactorBase);
        } else {
            gameState.power = 0;
        }

        if (gameState.power > 0 && gameState.fuelLevel > 0) {
            gameState.fuelLevel -= (gameState.power / 1000) * FUEL_CONSUMPTION_RATE;
        }

        if(instability > 0.3) {
            stabilityWarning.innerText = "DİKKAT: ÇUBUK DENGESİZLİĞİ!";
            stabilityWarning.classList.add('danger');
        } else {
            stabilityWarning.innerText = "Stabilite: Normal";
            stabilityWarning.classList.remove('danger');
        }

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

        // Isı Kontrolü
        if (gameState.temp >= gameState.maxSafeTemp) {
            endGame(false, `ÇEKİRDEK ERİDİ! (${Math.floor(gameState.temp)}°C). Radyasyon sızıntısı.`);
        }

        // Arıza Kontrolü
        if (gameState.malfunctionLevel >= 100) {
            endGame(false, "SİSTEM ÇÖKTÜ! Kritik arızalar nedeniyle kontrol kaybedildi.");
        }

        // Halk Memnuniyeti Kontrolü
        if (gameState.satisfaction <= 0) {
            endGame(false, "HALK AYAKLANMASI! Şehir elektriksiz kaldığı için isyan çıktı.");
        }

        // YENİ: Borç Süresi Kontrolü
        if (gameState.loan.active && gameState.loan.timer <= 0) {
            endGame(false, "İFLAS! Borcunu ödeyemedin, banka santrale el koydu.");
        }
    }

    function updateUI() {
        let tempPct = (gameState.temp / gameState.maxSafeTemp) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C / Max ${gameState.maxSafeTemp}`;
        
        if (gameState.temp < gameState.maxSafeTemp * 0.7) tempBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.temp < gameState.maxSafeTemp * 0.9) tempBar.style.backgroundColor = "#ffcc00"; 
        else tempBar.style.backgroundColor = "#ff0000"; 

        powerDisplay.innerText = `${gameState.power} MW`;
        moneyVal.innerText = Math.floor(gameState.money).toLocaleString();
        
        fuelBar.style.width = `${Math.max(0, gameState.fuelLevel)}%`;
        fuelVal.innerText = `${Math.floor(gameState.fuelLevel)}%`;
        
        coolingVal.innerText = `${gameState.coolingRate}%`;

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

        satisfactionVal.innerText = `${Math.floor(gameState.satisfaction)}%`;
        if(gameState.satisfaction > 70) satisfactionVal.style.color = "#00ffcc";
        else if(gameState.satisfaction > 30) satisfactionVal.style.color = "#ffcc00";
        else satisfactionVal.style.color = "#ff0000";
    }

    function endGame(victory, msg) {
        gameState.gameOver = true;
        gameState.active = false;
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        endScreen.classList.add('active');
        
        title.innerText = victory ? "GÖREV BAŞARILI" : "OYUN BİTTİ";
        title.style.color = victory ? "#00cc66" : "red";
        message.innerText = msg;
    }

    // --- Etkileşimler ---

    function updateRodInputs() {
        gameState.rods[0] = parseInt(rod1.value);
        gameState.rods[1] = parseInt(rod2.value);
        gameState.rods[2] = parseInt(rod3.value);
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

    openShopBtn.addEventListener('click', () => shopModal.classList.add('active'));
    closeShopBtn.addEventListener('click', () => shopModal.classList.remove('active'));

    // YENİ BANKA EVENTLERİ
    openBankBtn.addEventListener('click', () => {
        updateBankUI(); // Modal açılmadan güncel durumu işle
        bankModal.classList.add('active');
    });
    closeBankBtn.addEventListener('click', () => bankModal.classList.remove('active'));

    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const infoClose = modal.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    const infoData = {
        "sogutma": { title: "Soğutma Kuleleri", text: "Sıcak suyu buharlaştırarak soğutan sistem." },
        "reaktor": { title: "Reaktör Kalbi", text: "Fisyonun gerçekleştiği yer. Sıcaklığı sürekli kontrol altında tutmalısın." },
        "turbin": { title: "Buhar Türbini", text: "Isıyı elektriğe çevirir." },
        "su_kaynagi": { title: "Su Pompaları", text: "Sisteme soğuk su basar." },
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
    
    window.onclick = (e) => {
        if(e.target == modal) modal.classList.remove('active');
        if(e.target == shopModal) shopModal.classList.remove('active');
        if(e.target == bankModal) bankModal.classList.remove('active');
    };
});