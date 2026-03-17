import requests
import firebase_admin
from firebase_admin import credentials, db
import time
import os
import json

# Конфиг берется из секретов GitHub
service_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
cred = credentials.Certificate(service_info)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://crypto-terminal-aac58-default-rtdb.asia-southeast1.firebasedatabase.app'
    })

def run():
    url = 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT'
    data = requests.get(url).json()
    price = float(data['result']['list'][0]['lastPrice'])
    
    ref = db.reference('history')
    ref.child(str(int(time.time() * 1000))).set({
        'price': price,
        'time': time.strftime("%H:%M:%S", time.localtime())
    })
    print(f"Робот записал цену: {price}")

run()
