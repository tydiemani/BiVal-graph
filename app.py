from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Разрешаем сайту обращаться к серверу

DB_FILE = 'orders_db.json'

# Загрузка данных из файла
def load_db():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Сохранение данных в файл
def save_db(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

@app.route('/orders', methods=['GET'])
def get_orders():
    return jsonify(load_db())

@app.route('/orders', methods=['POST'])
def add_order():
    new_order = request.json
    db_data = load_db()
    db_data.append(new_order)
    save_db(db_data)
    return jsonify({"status": "success"}), 201

@app.route('/orders', methods=['DELETE'])
def clear_orders():
    save_db([])
    return jsonify({"status": "cleared"}), 200

if __name__ == '__main__':
    # Порт для Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
