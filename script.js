const API_URL = 'https://bival-graph.onrender.com'; 

let orders = [];
let priceHistory = []; // Для хранения реальных цен
const ctx = document.getElementById('dualChart');

// Инициализация графика
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [] 
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    displayFormats: { minute: 'HH:mm' }
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
                beginAtZero: false, 
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    callback: function(value) {
                        return '$' + value;
                    }
                }
            }
        },
        plugins: {
            legend: { display: true, labels: { color: '#aaa' } }
        }
    }
});

// 1. Загрузка ордеров
async function loadOrders() {
    try {
        updateStatus('Загрузка данных...');
        const response = await fetch(`${API_URL}/orders`);
        orders = await response.json();
        updateChart();
        updateStatus(`Загружено ${orders.length} сделок.`);
    } catch (error) {
        updateStatus('Ошибка связи с сервером.');
        console.error(error);
    }
}

// 2. Получение текущей цены с Bybit (чтобы видеть рынок)
async function fetchCurrentPrice() {
    try {
        const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT");
        const result = await response.json();
        const currentPrice = parseFloat(result.result.list[0].lastPrice);
        const now = Date.now();

        // Храним последние 50 точек цены
        priceHistory.push({ x: now, y: currentPrice });
        if (priceHistory.length > 50) priceHistory.shift();

        updateChart();
    } catch (e) { console.error("Ошибка Bybit:", e); }
}

// 3. Обновление графика
function updateChart() {
    const datasets = [];

    // Добавляем линию реальной цены (основная)
    datasets.push({
        label: 'ETH Live Price',
        data: priceHistory,
        borderColor: '#00ff88',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3
    });

    // Добавляем линии твоих ордеров
    orders.forEach((order, index) => {
        const start = new Date(order.timestamp).getTime();
        const end = new Date(order.expiryDate).getTime();
        const color = order.type === 'buy' ? '#00e5ff' : '#ff4444';

        datasets.push({
            label: `Ордер #${index + 1} (${order.strikePrice}$)`,
            data: [
                { x: start, y: order.strikePrice },
                { x: end, y: order.strikePrice }
            ],
            borderColor: color,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2,
            fill: false
        });
    });

    chart.data.datasets = datasets;
    chart.update('none'); // 'none' чтобы не дергалась анимация при обновлении цены
}

// 4. Добавление ордера
async function addOrderToServer(orderData) {
    try {
        updateStatus('Сохранение...');
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        await loadOrders();
    } catch (error) {
        updateStatus('Ошибка сохранения.');
    }
}

// 5. Очистка
async function clearHistoryOnServer() {
    if (!confirm('Удалить все сделки?')) return;
    try {
        await fetch(`${API_URL}/orders`, { method: 'DELETE' });
        orders = [];
        updateChart();
    } catch (error) { updateStatus('Ошибка очистки.'); }
}

function updateStatus(msg) {
    document.getElementById('status').innerText = msg;
}

// Кнопки
document.getElementById('addOrderBtn').onclick = () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const strikePrice = parseFloat(document.getElementById('strikePrice').value);
    const expiryDate = document.getElementById('expiryDate').value;

    if (!strikePrice || !expiryDate) {
        alert('Заполни все поля!');
        return;
    }

    addOrderToServer({
        timestamp: new Date().toISOString(),
        type: type,
        strikePrice: strikePrice,
        expiryDate: expiryDate
    });
};

document.getElementById('clearOrdersBtn').onclick = clearHistoryOnServer;

// Инициализация
loadOrders();
setInterval(fetchCurrentPrice, 5000); // Обновляем цену каждые 5 сек

// Стартовая загрузка при открытии страницы
loadOrders();
