document.addEventListener('DOMContentLoaded', () => {
    // --- Element Seçimleri ---
    const selectionScreen = document.getElementById('selection-screen');
    const gameContainer = document.getElementById('game-container');
    const uraniumBtn = document.getElementById('uraniumBtn');
    const plutoniumBtn = document.getElementById('plutoniumBtn');
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const closeBtn = document.querySelector('.close-btn');
    const logContent = document.getElementById('log-content');
    
    // Simülasyon Elementleri
    const fuelStatus = document.getElementById('fuel-status');
    const systemStatus = document.getElementById('system-status');
    const tempBar = document.getElementById('temp-bar');
    const tempVal = document.getElementById('temp-val');
    const powerBar = document.getElementById('power-bar');
    const powerVal = document.getElementById('power-val');
    const controlRodInput = document.getElementById('control-rods');
    const scramBtn = document.getElementById('scram-btn');

    // --- Değişkenler ---
    let selectedFuel = '';
    let simulationActive = false;
    let coreTemp = 25; // Başlangıç sıcaklığı
    let powerOutput = 0;
    let controlRodLevel = 100; // %100 = Tam kapalı (reaksiyon yok)
    let meltdownThreshold = 1200; // Tehlike sınırı

    // --- Veri Tabanı (Geliştirilmiş) ---
    const infoData = {
        "sogutma": {
            title: "Doğal Çekişli Soğutma Kuleleri",
            text: "Bu hiperbolik yapılar santralin en ikonik parçalarıdır. <br><br><strong>Görevi:</strong> Türbinlerden çıkan sıcak suyu, hava akımıyla soğutarak tekrar sisteme kazandırmaktır. <br><strong>Bilgi:</strong> Kulelerin tepesinden çıkan beyaz bulut duman değil, temiz su buharıdır. Radyasyon içermez."
        },
        "reaktor": {
            title: "Reaktör Binası (Containment)",
            text: "Güçlendirilmiş beton ve çelikten yapılmış bu kubbe, santralin kalbidir.",
            uranium: "<strong>Uranyum-235:</strong> Şu an hafif su reaktöründe zenginleştirilmiş uranyum kullanıyorsunuz. Nötronlar uranyum atomlarına çarparak fisyon (bölünme) yaratır ve muazzam ısı açığa çıkar.",
            plutonium: "<strong>Plütonyum-239:</strong> MOX (Karışık Oksit) yakıtı veya hızlı üretken reaktör teknolojisi kullanıyorsunuz. Plütonyum fisyonu daha yüksek enerji yoğunluğuna sahiptir ancak kontrolü daha hassas süreçler gerektirebilir."
        },
        "turbin": {
            title: "Türbin ve Jeneratör Salonu",
            text: "Reaktörde üretilen ısı suyu buhara dönüştürür. Yüksek basınçlı buhar bu binaya gelir. <br><br><strong>İşleyiş:</strong> Buhar, dev pervaneleri (türbinleri) dakikada 3000 devirle döndürür. Bu mekanik hareket, jeneratörde elektriğe dönüşür."
        },
        "guvenlik": {
            title: "Şalt Sahası ve Güvenlik Sistemleri",
            text: "Üretilen elektrik burada voltajı yükseltilerek şehirlere gönderilir. Ayrıca santralin acil durum dizel jeneratörleri de genellikle bu bölgelere yakın konumlandırılır; şebeke elektriği kesilse bile soğutma pompalarını çalıştırırlar."
        }
    };

    // --- Fonksiyonlar ---

    function log(message) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        p.innerText = `[${time}] ${message}`;
        logContent.prepend(p); // En üste ekle
        
        // Log çok şişmesin
        if (logContent.children.length > 20) {
            logContent.lastChild.remove();
        }
    }

    function startGame(fuel) {
        selectedFuel = fuel;
        selectionScreen.classList.remove('active');
        gameContainer.style.display = 'block';
        
        fuelStatus.innerText = `Yakıt: ${fuel === 'uranium' ? 'Uranyum-235' : 'Plütonyum-239'}`;
        systemStatus.innerText = "Sistem: AKTİF";
        systemStatus.style.color = "#00ff00";
        
        log(`Sistem başlatıldı. Yakıt türü: ${fuel.toUpperCase()}.`);
        log("Soğutma pompaları devrede.");
        log("Operatör kontrolü bekleniyor. Kontrol çubuklarını çekin.");
        
        simulationActive = true;
        gameLoop();
    }

    // Simülasyon Döngüsü (Her 500ms'de bir çalışır)
    function gameLoop() {
        if (!simulationActive) return;

        // Mantık: Çubuklar (Rod) ne kadar yukarıda ise (%0), reaksiyon o kadar artar.
        // Rod Level 100 = Kapalı, Rod Level 0 = Tam açık.
        const reactivity = (100 - controlRodLevel) / 100; // 0.0 ile 1.0 arası
        
        // Isınma Formülü
        let targetTemp = 25 + (reactivity * 1500); // Max 1525 derece hedefler
        
        // Sıcaklığın yavaşça hedefe gitmesi (Simülasyon hissi)
        if (coreTemp < targetTemp) {
            coreTemp += (Math.random() * 10) + 5; 
        } else if (coreTemp > targetTemp) {
            coreTemp -= (Math.random() * 10) + 5;
        }

        // Alt sınır kontrolü
        if (coreTemp < 25) coreTemp = 25;

        // Güç Üretimi (Sıcaklığa bağlı ama gecikmeli)
        // Sıcaklık 300'ü geçince buhar oluşur ve güç üretimi başlar
        if (coreTemp > 300) {
            powerOutput = Math.floor((coreTemp - 300) * 1.2); 
        } else {
            powerOutput = 0;
        }

        updateDashboard();
        checkSafety();

        requestAnimationFrame(() => {
            setTimeout(gameLoop, 200); // Hızı ayarlar
        });
    }

    function updateDashboard() {
        // Sıcaklık Barı
        const tempPercent = Math.min((coreTemp / 1500) * 100, 100);
        tempBar.style.width = `${tempPercent}%`;
        tempVal.innerText = `${Math.floor(coreTemp)}°C`;
        
        // Renk Değişimi
        if (coreTemp < 800) tempBar.style.backgroundColor = "#00cc66"; // Yeşil
        else if (coreTemp < 1100) tempBar.style.backgroundColor = "#ffcc00"; // Sarı
        else tempBar.style.backgroundColor = "#ff0000"; // Kırmızı

        // Güç Barı
        const powerPercent = Math.min((powerOutput / 1500) * 100, 100);
        powerBar.style.width = `${powerPercent}%`;
        powerVal.innerText = `${powerOutput} MW`;
    }

    function checkSafety() {
        if (coreTemp > 1000 && Math.random() > 0.95) {
            log("UYARI: Çekirdek sıcaklığı yükseliyor!");
        }
        if (coreTemp >= meltdownThreshold) {
            alert("KRİTİK HATA: ÇEKİRDEK ERİMESİ BAŞLADI! SİSTEM KAPATILIYOR.");
            scram();
        }
    }

    function scram() {
        controlRodInput.value = 100;
        controlRodLevel = 100;
        log("!!! SCRAM TETİKLENDİ !!!");
        log("Kontrol çubukları yerçekimi ile düşürüldü.");
        log("Reaksiyon durduruluyor...");
        
        // Görsel efekt için butonu devre dışı bırak
        scramBtn.disabled = true;
        scramBtn.innerText = "SİSTEM KİLİTLENDİ";
        scramBtn.style.backgroundColor = "#555";
        scramBtn.style.animation = "none";
        
        systemStatus.innerText = "Sistem: ACİL DURDURULDU";
        systemStatus.style.color = "red";
    }

    // --- Olay Dinleyicileri ---

    uraniumBtn.addEventListener('click', () => startGame('uranium'));
    plutoniumBtn.addEventListener('click', () => startGame('plutonium'));

    // Kontrol Çubuğu Hareketi
    controlRodInput.addEventListener('input', (e) => {
        controlRodLevel = e.target.value;
        if (controlRodLevel < 20) {
            log("DİKKAT: Kontrol çubukları kritik seviyede çekildi.");
        } else if (controlRodLevel > 80) {
            log("Güç azaltılıyor...");
        }
    });

    // SCRAM Butonu
    scramBtn.addEventListener('click', scram);

    // Bilgi Noktaları (Geliştirilmiş seçim)
    document.querySelectorAll('.info-point').forEach(point => {
        point.addEventListener('click', () => {
            const infoKey = point.getAttribute('data-info');
            const data = infoData[infoKey];
            
            modalTitle.textContent = data.title;
            let content = data.text;
            
            // Yakıta özel bilgi varsa ekle
            if (selectedFuel === 'uranium' && data.uranium) {
                content += "<br><br>" + data.uranium;
            } else if (selectedFuel === 'plutonium' && data.plutonium) {
                content += "<br><br>" + data.plutonium;
            }

            modalText.innerHTML = content;
            modal.classList.add('active');
        });
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});
