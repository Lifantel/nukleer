document.addEventListener('DOMContentLoaded', () => {

    // HTML elementlerini seçme
    const tempDisplay = document.getElementById('temperature');
    const energyDisplay = document.getElementById('energy');
    const statusDisplay = document.getElementById('status');
    const raiseButton = document.getElementById('raiseRods');
    const lowerButton = document.getElementById('lowerRods');
    const tempFill = document.getElementById('temp-fill');

    // Oyun Değişkenleri
    let temperature = 20;
    let energy = 0;
    let rodPosition = 5; // 0 (en düşük) ile 10 (en yüksek) arası
    let gameRunning = true;

    // Oyun Döngüsü (saniyede bir kez çalışır)
    const gameLoop = setInterval(() => {
        if (!gameRunning) {
            clearInterval(gameLoop);
            return;
        }

        // 1. Sıcaklığı Hesapla
        // Çubuklar yükseldikçe (rodPosition artar) reaksiyon hızlanır ve daha çok ısınır
        // Çubuklar alçaldıkça (rodPosition azalır) reaksiyon yavaşlar ve soğur
        let heatGenerated = rodPosition * 1.5; // Çubuklardan gelen ısı
        let heatLost = (temperature / 100) * 2;  // Ortama kaybedilen soğuma
        
        temperature += (heatGenerated - heatLost);

        // 2. Enerjiyi Hesapla
        // Enerji sadece belirli bir sıcaklık aralığında verimli üretilir
        if (temperature > 100 && temperature < 800) {
            energy += Math.floor(temperature / 20);
        }

        // 3. Kazanma/Kaybetme Koşulları
        if (temperature >= 900) {
            endGame("TEHLİKE: REAKTÖR ERİMESİ!", "status-danger");
        } else if (temperature <= 50) {
            endGame("DURUM: REAKTÖR DURDU! (Çok soğuk)", "status-shutdown");
        } else if (energy >= 10000) {
            endGame("TEBRİKLER! Enerji hedefine ulaştınız!", "status-stable");
        }

        // 4. Ekranı Güncelle
        updateDisplay();

    }, 1000); // Her 1000ms = 1 saniyede bir

    // Ekran Güncelleme Fonksiyonu
    function updateDisplay() {
        // Sıcaklık
        tempDisplay.textContent = `${temperature.toFixed(1)} °C`;
        
        // Sıcaklık çubuğu (Bar)
        let tempPercent = (temperature / 1000) * 100;
        tempFill.style.width = `${Math.min(tempPercent, 100)}%`;

        // Çubuk rengini değiştirme
        if (temperature < 600) {
            tempFill.style.backgroundColor = "#2ecc71"; // Yeşil
        } else if (temperature < 800) {
            tempFill.style.backgroundColor = "#f39c12"; // Turuncu
        } else {
            tempFill.style.backgroundColor = "#e74c3c"; // Kırmızı
        }

        // Enerji
        energyDisplay.textContent = `${energy} MW`;

        // Durum Mesajı
        if (gameRunning) {
            if (temperature > 800) {
                setStatus("UYARI: Sıcaklık Kritik!", "status-warning");
            } else if (temperature < 100) {
                setStatus("Durum: Reaktör çok soğuk, enerji üretimi yok.", "status-shutdown");
            } else {
                setStatus("Durum: Reaktör stabil, enerji üretiliyor.", "status-stable");
            }
        }
    }

    // Durum mesajını ayarla
    function setStatus(message, className) {
        statusDisplay.textContent = message;
        statusDisplay.className = `status-message ${className}`;
    }

    // Oyunu bitir
    function endGame(message, className) {
        gameRunning = false;
        setStatus(message, className);
        raiseButton.disabled = true;
        lowerButton.disabled = true;
    }

    // Düğme Olayları
    raiseButton.addEventListener('click', () => {
        if (gameRunning && rodPosition < 10) {
            rodPosition++;
            console.log("Çubuk Pozisyonu:", rodPosition);
        }
    });

    lowerButton.addEventListener('click', () => {
        if (gameRunning && rodPosition > 0) {
            rodPosition--;
            console.log("Çubuk Pozisyonu:", rodPosition);
        }
    });

    // Başlangıç durumu
    setStatus("Durum: Reaktör devrede.", "status-stable");
});
