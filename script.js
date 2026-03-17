// URL твоего бэкенд сервера на Render (пока оставляем пустым)
const API_URL = 'https://bival-graph.onrender.com'; 

let orders = [];
const ctx = document.getElementById('dualChart');

// Инициализация графика с улучшенным масштабом по оси X (time)
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [] // Данные будем загружать динамически
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
            // Это растянет график по времени
        },
        y: {
            // Убираем фиксированные 0 и 1. 
            // График сам подстроится под цену ордера (например, 2200-2400)
            beginAtZero: false, 
            ticks: {
                callback: function(value) {
                    return '$' + value; // Добавим значок доллара для красоты
                }
            }
        }
    }
        plugins: {
            legend: { display: false }
        }
    }
});

// ФУНКЦИИ ДЛЯ РАБОТЫ С СЕРВЕРОМ

// 1. Загрузить все ордера из базы
async function loadOrders() {
    if (!API_URL) return;
    try {
        updateStatus('Загрузка сделок...');
        const response = await fetch(`${API_URL}/orders`);
        orders = await response.json();
        updateChart();
        updateStatus(`Загружено ${orders.length} сделок из базы.`);
    } catch (error) {
        updateStatus('Ошибка загрузки данных с сервера.');
        console.error(error);
    }
}

// 2. Добавить новый ордер на сервер
async function addOrderToServer(orderData) {
    if (!API_URL) {
        // Если сервера нет, сохраняем локально (для теста)
        orders.push(orderData);
        updateChart();
        return;
    }
    try {
        updateStatus('Сохранение сделки на сервере...');
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        loadOrders(); // Перезагружаем все данные
    } catch (error) {
        updateStatus('Ошибка сохранения сделки.');
    }
}

// 3. Очистить всю историю на сервере
async function clearHistoryOnServer() {
    if (!API_URL || !confirm('Точно очистить всю историю сделок?')) return;
    try {
        await fetch(`${API_URL}/orders`, { method: 'DELETE' });
        loadOrders();
    } catch (error) {
        updateStatus('Ошибка очистки истории.');
    }
}

// ФУНКЦИИ ОТРИСОВКИ

function updateChart() {
    const datasets = orders.map(order => {
        const start = new Date(order.timestamp).getTime();
        const end = new Date(order.expiryDate).getTime();
        const color = order.type === 'buy' ? '#00ff88' : '#ff4444'; // Зеленый для покупки, красный для продажи

        return {
            label: `${order.type.toUpperCase()}: ${order.strikePrice}`,
            data: [
                { x: start, y: order.strikePrice },
                { x: end, y: order.strikePrice }
            ],
            borderColor: color,
            borderWidth: 2,
            borderDash: [6, 6], // Делаем пунктир
            pointRadius: 0, // Скрываем точки
            fill: false,
            tension: 0 // Прямая линия
        };
    });

    chart.data.datasets = datasets;
    chart.update();
}

function updateStatus(msg) {
    document.getElementById('status').innerText = msg;
}

// ОБРАБОТЧИКИ КНОПОК

document.getElementById('addOrderBtn').onclick = () => {
    const type = document.querySelector('input[name="type"]:checked').value;
    const strikePrice = parseFloat(document.getElementById('strikePrice').value);
    const expiryDate = document.getElementById('expiryDate').value;

    if (!strikePrice || !expiryDate) {
        alert('Пожалуйста, заполни цену и дату экспирации.');
        return;
    }

    const orderData = {
        timestamp: new Date().toISOString(), // Время создания (сейчас)
        type: type,
        strikePrice: strikePrice,
        expiryDate: expiryDate
    };

    addOrderToServer(orderData);
};

document.getElementById('clearOrdersBtn').onclick = clearHistoryOnServer;

// Стартовая загрузка при открытии страницы
loadOrders();
