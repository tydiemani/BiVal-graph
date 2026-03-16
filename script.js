// Твои настройки из Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB3S4lJ0Ru_MYfcNcqnAv1wbKEh2fVKPPU",
    authDomain: "crypto-terminal-aac58.firebaseapp.com",
    databaseURL: "https://crypto-terminal-aac58-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "crypto-terminal-aac58",
    storageBucket: "crypto-terminal-aac58.firebasestorage.app",
    messagingSenderId: "672546034356",
    appId: "1:672546034356:web:ba4748a0da492dee72bde1"
};

// Инициализация (совместимый режим)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Дальше идет твой код графика из предыдущих шагов ---
const ctx = document.getElementById('myChart');
const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'ETH Price', data: [], borderColor: '#00ff88', tension: 0.3 }] },
    options: { scales: { y: { beginAtZero: false } } }
});

// ФУНКЦИЯ 1: Берем цену с Bybit и ПИШЕМ в Firebase
async function updatePriceETH() {
    try {
        const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT");
        const result = await response.json();
        const currentPrice = parseFloat(result.result.list[0].lastPrice);
        const timestamp = Date.now();

        // Отправляем в облако
        database.ref('history/' + timestamp).set({
            price: currentPrice,
            time: new Date().toLocaleTimeString()
        });
    } catch (e) { console.error("Ошибка сети:", e); }
}

// ФУНКЦИЯ 2: СЛУШАЕМ Firebase и рисуем график
database.ref('history').limitToLast(30).on('value', (snapshot) => {
    const allData = snapshot.val();
    chart.data.labels = [];
    chart.data.datasets[0].data = [];

    for (let id in allData) {
        chart.data.labels.push(allData[id].time);
        chart.data.datasets[0].data.push(allData[id].price);
    }
    chart.update();
});

// Запускаем опрос Bybit каждые 5 сек
setInterval(updatePriceETH, 5000);