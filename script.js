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
    const MAX_POWER = 1600; // Kazanmak için gereken max güç civarı
    const MELTDOWN_TEMP = 1200;

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
    function log(msg) {
        const p = document.createElement('p');
        p.innerText = `> ${msg}`;
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
        
        log(`Yakıt yüklendi: ${fuel.toUpperCase()}`);
        log("Türbinler dönmeye hazır.");
        log("HEDEF: 3 Çubuğu kontrol ederek 1500 MW güce ulaş.");
        
        gameLoop();
    };

    document.getElementById('uraniumBtn').addEventListener('click', () => window.startGame('uranium'));
    document.getElementById('plutoniumBtn').addEventListener('click', () => window.startGame('plutonium'));

    // --- Simülasyon Döngüsü ---
    function gameLoop() {
        if (!gameState.active || gameState.gameOver) return;

        // 1. Reaktivite Hesabı (3 çubuğun ortalaması)
        // 100 = Kapalı, 0 = Tam açık
        let totalRodOpenness = 0;
        gameState.rods.forEach(val => totalRodOpenness += (100 - val));
        let avgOpenness = totalRodOpenness / 3;

        // Yakıt çarpanı
        let multiplier = gameState.fuel === 'plutonium' ? 1.5 : 1.0;

        // 2. Sıcaklık Değişimi
        // Çubuklar açıksa ısınılır, kapalıysa soğunur
        let targetTemp = 25 + (avgOpenness * 15 * multiplier); 
        
        // Isınma/Soğuma hızı (Plütonyum daha hızlı ısınır)
        let changeRate = (targetTemp - gameState.temp) * 0.05;
        gameState.temp += changeRate;

        // Rastgele dalgalanma (Çubuklar dengesizse artar)
        let instability = Math.abs(gameState.rods[0] - gameState.rods[2]) / 100;
        gameState.temp += (Math.random() - 0.5) * (instability * 20);

        if (gameState.temp < 25) gameState.temp = 25;

        // 3. Güç Üretimi (300 dereceden sonra başlar)
        if (gameState.temp > 300) {
            gameState.power = Math.floor((gameState.temp - 300) * 1.5);
        } else {
            gameState.power = 0;
        }

        updateUI();
        checkGameStatus();

        requestAnimationFrame(gameLoop);
    }

    function updateUI() {
        // Sıcaklık Barı
        let tempPct = (gameState.temp / MELTDOWN_TEMP) * 100;
        tempBar.style.width = `${Math.min(tempPct, 100)}%`;
        tempVal.innerText = `${Math.floor(gameState.temp)}°C`;

        // Güç Göstergesi
        powerDisplay.innerText = `${gameState.power} MW`;

        // Şehir Işıkları Mantığı
        // Her 150 MW bir evi yakar
        let litCount = Math.floor(gameState.power / 150);
        if (litCount > TOTAL_HOUSES) litCount = TOTAL_HOUSES;
        gameState.housesLit = litCount;

        // Evleri görsel olarak güncelle
        for (let i = 0; i < TOTAL_HOUSES; i++) {
            const house = document.getElementById(`house-${i}`);
            if (i < litCount) house.classList.add('lit');
            else house.classList.remove('lit');
        }

        gridPercentage.innerText = `${(litCount / TOTAL_HOUSES) * 100}%`;
    }

    function checkGameStatus() {
        // Kaybetme Koşulu: Erime
        if (gameState.temp >= MELTDOWN_TEMP) {
            endGame(false, "ÇEKİRDEK ERİMESİ! Santral patladı ve şehir radyasyona maruz kaldı.");
        }

        // Kazanma Koşulu: Tüm evler yandı
        if (gameState.housesLit === TOTAL_HOUSES) {
            // Hemen kazanmak yerine 1 saniye bekletilebilir ama basitlik için hemen bitirelim
            endGame(true, "TEBRİKLER! Şehrin tüm enerji ihtiyacını güvenle karşıladınız.");
        }
    }

    function endGame(victory, msg) {
        gameState.gameOver = true;
        gameState.active = false;
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        
        endScreen.classList.add('active');
        title.innerText = victory ? "GÖREV BAŞARILI" : "KRİTİK HATA";
        title.style.color = victory ? "green" : "red";
        message.innerText = msg;
    }

    // SCRAM (Acil Durdurma)
    scramBtn.addEventListener('click', () => {
        rod1.value = 100; rod2.value = 100; rod3.value = 100;
        updateRodInputs();
        log("SCRAM tetiklendi! Tüm çubuklar kapatıldı.");
        // Scram ile oyunu kaybetmezsiniz, sadece soğutursunuz, ama güç düşer.
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
    
    // Bilgi Pop-up Kodları (Mevcut koddan devam)
    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    const infoData = {
        "sogutma": { title: "Soğutma Kuleleri", text: "Su buharı çıkaran dev bacalar." },
        "reaktor": { title: "Reaktör Binası", text: "Çekirdeğin bulunduğu korunaklı alan." },
        "turbin": { title: "Türbin Odası", text: "Elektriğin üretildiği jeneratörlerin yeri." }
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
