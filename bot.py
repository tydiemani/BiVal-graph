import requests
import firebase_admin
from firebase_admin import credentials, db
import time
import os
import json

# Загружаем ключи из переменных окружения (для безопасности на GitHub)
service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
cred = credentials.Certificate(service_account_info)

# Инициализируем Firebase (замени URL на свой из настроек)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://crypto-terminal-aac58-default-rtdb.asia-southeast1.firebasedatabase.app'
    })

def collect_data():
    try:
        url = 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT'
        resp = requests.get(url).json()
        current_price = float(resp['result']['list'][0]['lastPrice'])
        
        ref = db.reference('history')
        timestamp = int(time.time() * 1000)
        
        ref.child(str(timestamp)).set({
            'price': current_price,
            'time': time.strftime("%H:%M:%S", time.localtime())
        })
        print(f"Записано: {current_price}")
    except Exception as e:
        print(f"Ошибка: {e}")

collect_data()
