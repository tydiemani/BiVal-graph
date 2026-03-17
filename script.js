const API_URL = 'https://bival-graph.onrender.com'; 

let orders = [];
let priceHistory = []; 
const ctx = document.getElementById('dualChart');

// Инициализация графика
const chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
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
                    callback: (value) => '$' + value
                }
            }
        },
        plugins: {
            legend: { display: true, labels: { color: '#aaa' } }
        }
    }
});

// 1. Загрузка ордеров с сервера
async function loadOrders() {
    try {
        updateStatus('Синхронизация...');
        const response = await fetch(`${API_URL}/orders`, { mode: 'cors' });
        orders = await response.json();
        updateChart();
        updateStatus(`Активно сделок: ${orders.length}`);
    } catch (error) {
        updateStatus('Сервер не отвечает.');
        console.error('Ошибка загрузки:', error);
    }
}

// 2. Живая цена с Bybit
async function fetchCurrentPrice() {
    try {
        const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT");
        const result = await response.json();
        const currentPrice = parseFloat(result.result.list[0].lastPrice);
        const now = Date.now();

        priceHistory.push({ x: now, y: currentPrice });
        if (priceHistory.length > 60) priceHistory.shift(); // Храним последние 5 минут

        updateChart();
    } catch (e) { console.error("Ошибка Bybit:", e); }
}

// 3. Отрисовка всего на графике
function updateChart() {
    const datasets = [];

    // Реальная цена ETH
    datasets.push({
        label: 'ETH Live',
        data: priceHistory,
        borderColor: '#00ff88',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3
    });

    // Твои ордера из базы
    orders.forEach((order, index) => {
        const start = new Date(order.timestamp).getTime();
        const end = new Date(order.expiryDate).getTime();
        const color = order.type === 'buy' ? '#00e5ff' : '#ff4444';

        datasets.push({
            label: `Ордер ${index + 1} ($${order.strikePrice})`,
            data: [
                { x: start, y: order.strikePrice },
                { x: end, y: order.strikePrice }
            ],
            borderColor: color,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2
        });
    });

    chart.data.datasets = datasets;
    chart.update('none');
}

// 4. Отправка ордера на сервер (Исправлено для CORB/CORS)
async function addOrderToServer(orderData) {
    try {
        updateStatus('Сохранение...');
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) throw new Error('Ошибка записи');
        await loadOrders();
    } catch (error) {
        updateStatus('Ошибка сохранения.');
        console.error(error);
    }
}

// 5. Очистка истории
async function clearHistoryOnServer() {
    if (!confirm('Удалить всю историю сделок?')) return;
    try {
        await fetch(`${API_URL}/orders`, { method: 'DELETE', mode: 'cors' });
        orders = [];
        updateChart();
        updateStatus('История очищена.');
    } catch (error) { updateStatus('Ошибка очистки.'); }
}

function updateStatus(msg) {
    document.getElementById('status').innerText = msg;
}

// Обработчики кнопок
document.getElementById('addOrderBtn').onclick = () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const strikePrice = parseFloat(document.getElementById('strikePrice').value);
    const expiryDate = document.getElementById('expiryDate').value;

    if (!strikePrice || !expiryDate) {
        alert('Заполни все данные!');
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

// Старт
loadOrders();
setInterval(fetchCurrentPrice, 5000);
