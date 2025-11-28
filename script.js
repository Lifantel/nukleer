document.addEventListener('DOMContentLoaded', () => {

    // Gerekli HTML elementlerini seç
    const selectionScreen = document.getElementById('selection-screen');
    const gameContainer = document.getElementById('game-container');
    const uraniumBtn = document.getElementById('uraniumBtn');
    const plutoniumBtn = document.getElementById('plutoniumBtn');
    
    const infoPoints = document.querySelectorAll('.info-point');
    const modal = document.getElementById('infoModal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const closeBtn = document.querySelector('.close-btn');

    let selectedFuel = ''; // 'uranium' veya 'plutonium'

    // '?' işaretleri için bilgi veritabanı
    const infoData = {
        "k_kulesi": {
            title: "Soğutma Kulesi",
            text: "Bu dev yapı, bir göl değil, bir soğutma kulesidir. Reaktörde ve türbinde ısınan suyu soğutmak için kullanılır. Gördüğünüz duman, aslında su buharıdır (temiz buhardır, radyoaktif değildir). Santral, çevredeki bir nehir, göl veya denizden aldığı suyu bu kulelerde buharlaştırarak sistemi soğutur."
        },
        "r_binasi": {
            title: "Reaktör Binası (Koruma Kabı)",
            text: "Burası santralin kalbidir. Nükleer reaksiyonun gerçekleştiği 'reaktör çekirdeği' bu sağlam, kubbeli beton yapının içinde bulunur. Bu kalın beton ve çelik yapı, bir kaza anında bile radyasyonun dışarı sızmasını engellemek için tasarlanmıştır.",
            uranium: "Şu anda <strong>Uranyum-235</strong> yakıtı ile çalışan bir reaktörü inceliyorsunuz. Uranyum, fisyon (bölünme) yoluyla muazzam bir ısı enerjisi açığa çıkarır.",
            plutonium: "Şu anda <strong>Plütonyum-239</strong> yakıtı ile çalışan bir reaktörü inceliyorsunuz. Plütonyum, kullanılmış uranyum yakıtından elde edilebilir (yeniden işleme) veya hızlı üretken reaktörlerde kullanılabilir."
        },
        "t_binasi": {
            title: "Türbin Binası",
            text: "Reaktörde üretilen ısı, suyu kaynatarak yüksek basınçlı buhar oluşturur. Bu buhar, bu uzun binanın içindeki dev türbinleri döndürür. Türbinler, bir jeneratöre bağlıdır ve tıpkı bir bisiklet dinamosu gibi, hareket enerjisini elektrik enerjisine çevirir."
        },
        "s_sahasi": {
            title: "Şalt Sahası (Transformatör Alanı)",
            text: "Jeneratörde üretilen elektrik, bu alana gelir. Buradaki transformatörler (trafo), elektriğin voltajını (gerilimini) yükseltir. Voltajın yükseltilmesi, elektriğin uzun mesafelere (şehirlere) enerji kaybı olmadan taşınmasını sağlar. Elektrik buradan ulusal şebekeye verilir."
        }
    };

    // Oyunu başlatan fonksiyon
    function startGame(fuel) {
        selectedFuel = fuel;
        selectionScreen.classList.remove('active'); // Seçim ekranını gizle
        gameContainer.style.display = 'block'; // Oyun alanını göster
    }

    // Bilgi pop-up'ını gösteren fonksiyon
    function showModal(infoKey) {
        const data = infoData[infoKey];
        if (!data) return; // Veri bulunamazsa çık

        modalTitle.textContent = data.title;
        
        // Temel metni ve seçilen yakıta göre ekstra metni birleştir
        let fullText = data.text;
        if (selectedFuel === 'uranium' && data.uranium) {
            fullText += "<br><br>" + data.uranium;
        } else if (selectedFuel === 'plutonium' && data.plutonium) {
            fullText += "<br><br>" + data.plutonium;
        }
        
        modalText.innerHTML = fullText; // HTML olarak ekle (örn: <br>, <strong>)
        modal.classList.add('active'); // Modalı görünür yap
    }

    // Pop-up'ı kapatan fonksiyon
    function closeModal() {
        modal.classList.remove('active');
    }

    // --- Olay Dinleyicileri ---

    // Yakıt seçimi butonları
    uraniumBtn.addEventListener('click', () => startGame('uranium'));
    plutoniumBtn.addEventListener('click', () => startGame('plutonium'));

    // '?' işaretlerine tıklama
    infoPoints.forEach(point => {
        point.addEventListener('click', () => {
            const infoKey = point.getAttribute('data-info');
            showModal(infoKey);
        });
    });

    // Pop-up'ı kapatma (X butonu)
    closeBtn.addEventListener('click', closeModal);

    // Pop-up'ı kapatma (dışarı tıklama)
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Sadece dıştaki gri alana tıklanırsa...
            closeModal();
        }
    });

});
