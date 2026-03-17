const firebaseConfig = {
    apiKey: "AIzaSyB3S4lJ0Ru_MYfcNcqnAv1wbKEh2fVKPPU",
    authDomain: "crypto-terminal-aac58.firebaseapp.com",
    databaseURL: "https://crypto-terminal-aac58-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "crypto-terminal-aac58",
    storageBucket: "crypto-terminal-aac58.firebasestorage.app",
    messagingSenderId: "672546034356",
    appId: "1:672546034356:web:ba4748a0da492dee72bde1"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const ctx = document.getElementById('myChart');

// Инициализация графика
const chart = new Chart(ctx, {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            label: 'ETH Price', 
            data: [], 
            borderColor: '#00ff88', 
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            fill: true,
            tension: 0.3
        }] 
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            annotation: {
                annotations: {
                    orderLine: { // Горизонталь (Цена)
                        type: 'line', yMin: null, yMax: null,
                        borderColor: '#7dff00', borderWidth: 2, borderDash: [6, 6],
                        label: { display: false, position: 'end', backgroundColor: 'rgba(0,0,0,0.8)' }
                    },
                    expiryLine: { // Вертикаль (Время)
                        type: 'line', xMin: null, xMax: null,
                        borderColor: '#ff4444', borderWidth: 2, borderDash: [3, 3],
                        label: { display: false, content: 'Экспирация', position: 'start', backgroundColor: 'rgba(255, 68, 68, 0.8)' }
                    }
                }
            }
        },
        scales: { y: { beginAtZero: false } }
    }
});

// ЛОГИКА ПРОВЕРКИ РЕЗУЛЬТАТА
function checkTradeResult(currentPrice, orderData) {
    const now = new Date().toLocaleTimeString();
    
    // Если текущее время совпало или перевалило за время экспирации
    if (orderData && now >= orderData.expiryTime) {
        let message = "";
        if (currentPrice <= orderData.price) {
            message = `🎯 Сделка закрыта: Вы купили ETH по ${orderData.price}! (Цена упала)`;
        } else {
            message = `💰 Сделка закрыта: Вы остались в USDT + % доходности! (Цена выше страйка)`;
        }
        
        alert(message);
        database.ref('activeOrder').set(null); // Сбрасываем ордер
    }
}

// СЛУШАЕМ ЦЕНЫ
database.ref('history').limitToLast(40).on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    chart.data.labels = [];
    chart.data.datasets[0].data = [];

    let lastPrice = 0;
    for (let id in data) {
        chart.data.labels.push(data[id].time);
        chart.data.datasets[0].data.push(data[id].price);
        lastPrice = data[id].price;
    }
    chart.update();

    // Проверяем результат, если есть активный ордер
    database.ref('activeOrder').once('value', (snap) => {
        const order = snap.val();
        if (order) checkTradeResult(lastPrice, order);
    });
});

// СЛУШАЕМ ОРДЕР (Отрисовка линий)
database.ref('activeOrder').on('value', (snapshot) => {
    const order = snapshot.val();
    const ann = chart.options.plugins.annotation.annotations;

    if (order) {
        ann.orderLine.yMin = ann.orderLine.yMax = order.price;
        ann.orderLine.label.display = true;
        ann.orderLine.label.content = `Страйк: ${order.price}`;

        ann.expiryLine.xMin = ann.expiryLine.xMax = order.expiryTime;
        ann.expiryLine.label.display = true;
    } else {
        ann.orderLine.yMin = ann.orderLine.label.display = false;
        ann.expiryLine.xMin = ann.expiryLine.label.display = false;
    }
    chart.update();
});

// КНОПКИ
document.querySelector('.btn-buy').onclick = async () => {
    const price = prompt("Цена страйка (Strike Price):", chart.data.datasets[0].data.slice(-1)[0]);
    const mins = prompt("Срок сделки (через сколько минут):", "5");

    if (price && mins) {
        const expiryDate = new Date(Date.now() + parseInt(mins) * 60000);
        database.ref('activeOrder').set({
            price: parseFloat(price),
            expiryTime: expiryDate.toLocaleTimeString()
        });
    }
};

document.querySelector('.btn-sell').onclick = () => {
    if(confirm("Отменить текущий ордер?")) database.ref('activeOrder').set(null);
};

// Запись в базу ( Bybit -> Firebase )
async function updatePrice() {
    const r = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT");
    const d = await r.json();
    const p = parseFloat(d.result.list[0].lastPrice);
    database.ref('history/' + Date.now()).set({ price: p, time: new Date().toLocaleTimeString() });
}
setInterval(updatePrice, 5000);
