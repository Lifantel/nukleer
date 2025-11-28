document.addEventListener('DOMContentLoaded', () => {
    // --- Elementler ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const gameContainer = document.getElementById('game-container');
    const logContent = document.getElementById('log-content');
    const housesGrid = document.getElementById('houses-grid');
    
    // Göstergeler
    const fuelStatus = document.getElementById('fuel-status'); // Yeni eklendi
    const tempBar = document.getElementById('temp-bar');
    const tempVal = document.getElementById('temp-val');
    const powerDisplay = document.getElementById('power-digital');
    const gridPercentage = document.getElementById('grid-percentage');

    // Kontroller
    const rod1 = document.getElementById('rod1');
    const rod2 = document.getElementById('rod2');
    const rod3 = document.getElementById('rod3');
    const rodDisplays = [document.getElementById('val-rod1'), document.getElementById('val-rod2'), document.getElementById('val-rod3')];
    const scramBtn = document.getElementById('scram-btn');

    // --- Oyun Değişkenleri ---
    let gameState = {
        active: false,
        fuel: 'uranium',
        temp: 25,
        power: 0,
        rods: [100, 100, 100], // 3 çubuk
        housesLit: 0,
        gameOver: false
    };

    // --- Sabitler ---
    const TOTAL_HOUSES = 10;
    const MELTDOWN_TEMP = 1200; 
    const POWER_FACTOR = 2.2; 
    const MAX_TEMP_FROM_RODS = 1800; 

    // Kazanmak için Gerekli Kritik Denge Pozisyonları
    const TARGET_RODS = {
        R1_MIN: 20, R1_MAX: 30, // Rod A
        R2_MIN: 50, R2_MAX: 60, // Rod B
        R3_MIN: 85, R3_MAX: 90  // Rod C
    };
    
    // Yeni: Bilgi Data Seti
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
        
        fuelStatus.innerText = `YAKIT: ${fuel.toUpperCase()}`; // Yakıt durumunu güncelle
        log(`Yakıt yüklendi: ${fuel.toUpperCase()}. Sistem Aktif.`);
        log("Göreviniz: Kritik denge noktasına ulaşın ve 1500 MW gücü güvenle sağlayın.");
        
        gameLoop();
    };

    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    // --- Simülasyon Döngüsü ---
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;

        const rodValues = gameState.rods.map(val => parseInt(val));
        const totalOpenness = rodValues.reduce((sum, val) => sum + (100 - val), 0);
        const avgOpenness = totalOpenness / 300; 
        const multiplier = gameState.fuel === 'plutonium' ? 1.2 : 1.0; 

        // 1. Dengesizlik ve Hedefe Yakınlık Kontrolü
        const maxRod = Math.max(...rodValues);
        const minRod = Math.min(...rodValues);
        const genericInstabilityFactor = (maxRod - minRod) / 100; 
        
        // KRİTİK DENGE KONTROLÜ
        const targetProximity = (
            rodValues[0] >= TARGET_RODS.R1_MIN && rodValues[0] <= TARGET_RODS.R1_MAX &&
            rodValues[1] >= TARGET_RODS.R2_MIN && rodValues[1] <= TARGET_RODS.R2_MAX &&
            rodValues[2] >= TARGET_RODS.R3_MIN && rodValues[2] <= TARGET_RODS.R3_MAX
        );

        let effectiveInstabilityFactor = genericInstabilityFactor;
        
        if (targetProximity) {
            effectiveInstabilityFactor = 0.05; 
            if (gameState.power > 1000) {
                 if(warningCount % 100 === 0) log("KRİTİK DENGE KONUMU! Optimum sıcaklık kontrolü sağlandı.", false); 
            }
        }
        
        // 2. Yeni Sıcaklık Hedefi (Target Temperature)
        let baseTargetTemp = 25 + (avgOpenness * MAX_TEMP_FROM_RODS * multiplier);
        let hotspotBoost = effectiveInstabilityFactor * 300 * multiplier; 
        let targetTemp = baseTargetTemp + hotspotBoost;

        // 3. Sıcaklık Değişimi
        let changeRate = (targetTemp - gameState.temp) * 0.03;
        gameState.temp += changeRate;
        if (gameState.temp > 1000) {
            gameState.temp += (gameState.temp - 1000) * 0.005 * multiplier; 
        }
        if (gameState.temp < 25) gameState.temp = 25;

        // 4. Güç Üretimi (Power Output)
        if (gameState.temp > 300) {
            let basePower = (gameState.temp - 300) * POWER_FACTOR;
            let efficiencyPenalty = 1 - (effectiveInstabilityFactor * 0.25); 
            gameState.power = Math.floor(basePower * efficiencyPenalty);
        } else {
            gameState.power = 0;
        }
        if (gameState.power < 0) gameState.power = 0;


        updateUI();
        checkGameStatus(genericInstabilityFactor); 

        requestAnimationFrame(gameLoop);
    }
    
    // --- Güncelleme ve Kontroller ---

    function updateUI() {
        // Sıcaklık Barı
        let tempPct = (gameState.temp / MELTDOWN_TEMP) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C`; // Hata alınan satır burası olabilir.
        
        if (gameState.temp < 800) tempBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.temp < 1100) tempBar.style.backgroundColor = "#ffcc00"; 
        else tempBar.style.backgroundColor = "#ff0000"; 
        
        powerDisplay.innerText = `${gameState.power} MW`;

        // Şehir Işıkları (150 MW / ev)
        let litCount = Math.floor(gameState.power / 150);
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
        // Erime Kontrolü (Kaybetme)
        if (gameState.temp >= MELTDOWN_TEMP) {
            endGame(false, `KRİTİK BAŞARISIZLIK: ÇEKİRDEK ERİMESİ BAŞLADI (${Math.floor(gameState.temp)}°C). Sıcaklığı 1200°C altında tutmalıydınız!`);
            return;
        }

        // Kazanma Koşulu: 1500 MW veya üzeri ve Güvenli Sıcaklık
        if (gameState.housesLit === TOTAL_HOUSES && gameState.temp < MELTDOWN_TEMP) {
            endGame(true, "GÖREV BAŞARILI! Çubukları KRİTİK DENGE NOKTASINDA tutarak şehrin tüm gücünü güvenle sağladınız (1500+ MW).");
            return;
        }

        // Dengesizlik Uyarısı (Genel loglama)
        if (genericInstabilityFactor > 0.4 && gameState.power > 500 && warningCount % 50 === 0) {
             log(`TEHLİKELİ DENGE! Çubuklar arasında büyük fark var (${Math.floor(genericInstabilityFactor * 100)}%). Hotspot riski artıyor. KRİTİK AYARLARA ULAŞIN: A(20-30), B(50-60), C(85-90)`, true);
        }
        warningCount++;
    }

    function endGame(victory, msg) {
        gameState.gameOver = true;
        gameState.active = false;
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        
        endScreen.classList.add('active');
        title.innerText = victory ? "GÖREV BAŞARILI" : "KRİTİK HATA";
        title.style.color = victory ? "#00cc66" : "red";
        message.innerText = msg;
    }

    // SCRAM (Acil Durdurma)
    scramBtn.addEventListener('click', () => {
        if (!gameState.active || gameState.gameOver) return;
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        updateRodInputs();
        log("!!! SCRAM TETİKLENDİ !!! Reaksiyon durduruluyor.");
    });

    // Slider Eventleri
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

    updateRodInputs();
    
    // Bilgi Pop-up Kodları
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
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    window.onclick = (e) => { if(e.target == modal) modal.classList.remove('active'); };
});
