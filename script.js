document.addEventListener('DOMContentLoaded', () => {
    // --- Elementler ---
    const selectionScreen = document.getElementById('selection-screen');
    const endScreen = document.getElementById('end-screen');
    const gameContainer = document.getElementById('game-container');
    const logContent = document.getElementById('log-content');
    const housesGrid = document.getElementById('houses-grid');
    
    // Göstergeler
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

    const TOTAL_HOUSES = 10;
    const MAX_POWER_IDEAL = 1600; // İdealde ulaşılabilecek max güç
    const MELTDOWN_TEMP = 1200; // Kritik Erime Sıcaklığı

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
        
        log(`Yakıt yüklendi: ${fuel.toUpperCase()}. Sistem Aktif.`);
        log("HEDEF: Çubukları dengede tutarak 1500 MW güce ulaş.");
        
        gameLoop();
    };

    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    // --- Simülasyon Döngüsü ---
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;

        // 1. Reaktivite ve Dengesizlik Hesapları
        const rodValues = gameState.rods.map(val => parseInt(val));
        
        // Ortalamanın açılması (Ne kadar güç istediğimiz)
        const totalOpenness = rodValues.reduce((sum, val) => sum + (100 - val), 0);
        const avgOpenness = totalOpenness / 300; // 0.0 ile 1.0 arası

        // Dengesizlik (Instability) Hesabı: En açık çubuk ile en kapalı çubuk arasındaki fark.
        const maxRod = Math.max(...rodValues);
        const minRod = Math.min(...rodValues);
        const instabilityFactor = (maxRod - minRod) / 100; // 0.0 (dengeli) ile 1.0 (tamamen dengesiz) arası
        
        // Yakıt çarpanı (Plütonyum daha sıcak ve hızlı tepki verir)
        const multiplier = gameState.fuel === 'plutonium' ? 1.5 : 1.0;

        // 2. Yeni Sıcaklık Hedefi (Target Temperature)
        // Temel ısı (ortalama reaktiviteden)
        let baseTargetTemp = 25 + (avgOpenness * 1200 * multiplier);
        
        // Dengesizlikten kaynaklanan ekstra ısı (Hotspot)
        let hotspotBoost = instabilityFactor * 400 * multiplier; 
        
        let targetTemp = baseTargetTemp + hotspotBoost;

        // 3. Sıcaklık Değişimi
        // Sıcaklık, hedefe doğru hareket eder.
        let changeRate = (targetTemp - gameState.temp) * 0.02;
        gameState.temp += changeRate;

        // Sıcaklık 1000°C'nin üstündeyse daha hızlı artar (gerçek reaktör geri beslemesi)
        if (gameState.temp > 1000) {
            gameState.temp += 0.5 * multiplier;
        }

        if (gameState.temp < 25) gameState.temp = 25;

        // 4. Güç Üretimi (Power Output)
        // Güç üretimi ortalama reaktiviteye bağlıdır, ancak dengesizlik verimi düşürür.
        if (gameState.temp > 300) {
            // Ortalama reaktiviteden potansiyel güç
            let potentialPower = avgOpenness * MAX_POWER_IDEAL;
            
            // Dengesizliği cezalandırma: Instability arttıkça verim düşer
            let efficiencyPenalty = 1 - (instabilityFactor * 0.5); // %50'ye kadar verim kaybı
            
            gameState.power = Math.floor(potentialPower * efficiencyPenalty);
        } else {
            gameState.power = 0;
        }
        if (gameState.power < 0) gameState.power = 0;


        updateUI();
        checkGameStatus(instabilityFactor);

        requestAnimationFrame(gameLoop);
    }

    // --- Güncelleme ve Kontroller ---

    function updateUI() {
        // Sıcaklık Barı
        let tempPct = (gameState.temp / MELTDOWN_TEMP) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C`;

        // Renk Değişimi
        if (gameState.temp < 800) tempBar.style.backgroundColor = "#00cc66"; 
        else if (gameState.temp < 1100) tempBar.style.backgroundColor = "#ffcc00"; 
        else tempBar.style.backgroundColor = "#ff0000"; 
        
        powerDisplay.innerText = `${gameState.power} MW`;

        // Şehir Işıkları Mantığı
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
    function checkGameStatus(instabilityFactor) {
        // Erime Kontrolü
        if (gameState.temp >= MELTDOWN_TEMP) {
            endGame(false, `KRİTİK BAŞARISIZLIK: ÇEKİRDEK ERİMESİ BAŞLADI (${Math.floor(gameState.temp)}°C). Dengesizlik: ${Math.floor(instabilityFactor * 100)}%`);
        }

        // Dengesizlik Uyarısı
        if (instabilityFactor > 0.4 && gameState.power > 500 && warningCount % 50 === 0) {
             log(`TEHLİKELİ DENGE! Çubuklar arasında büyük fark var (${Math.floor(instabilityFactor * 100)}%). Hotspot riski!`, true);
        }
        warningCount++;
        
        // Kazanma Koşulu
        if (gameState.housesLit === TOTAL_HOUSES && gameState.temp < MELTDOWN_TEMP) {
            endGame(true, "TEBRİKLER! En yüksek güç seviyesinde bile reaktörünüzü mükemmel dengede tuttunuz.");
        }
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

    // Başlangıçta değerleri bir kere güncelle
    updateRodInputs();
    
    // Bilgi Pop-up Kodları (Mevcut koddan devam)
    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    const infoData = {
        "sogutma": { title: "Soğutma Kuleleri", text: "Su buharı çıkaran dev bacalar. Bu kuleler reaktörden gelen sıcak suyu soğutarak çevrime geri gönderir. Verimliliği korumak için hayati öneme sahiptir." },
        "reaktor": { title: "Reaktör Binası", text: "Çekirdeğin bulunduğu korunaklı alan. Burası kalın beton ve çelikten yapılmış çok katmanlı bir koruma kabıdır. Çekirdek ısıtma ve fisyon (bölünme) işlemleri burada gerçekleşir." },
        "turbin": { title: "Türbin Odası", text: "Elektriğin üretildiği jeneratörlerin yeri. Reaktörde üretilen buharın basınçla türbinleri döndürmesi sonucu elektrik enerjisi elde edilir." }
    };

    infoPoints.forEach(p => {
        p.addEventListener('click', () => {
            const key = p.getAttribute('data-info');
            modalTitle.innerText = infoData[key].title;
            modalText.innerText = infoData[key].text;
            modal.classList.add('active');
        });
    });
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    window.onclick = (e) => { if(e.target == modal) modal.classList.remove('active'); };
});
