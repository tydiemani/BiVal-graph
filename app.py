from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
# Полная поддержка CORS для всех путей и доменов, чтобы избежать CORB/CORS ошибок
CORS(app, resources={r"/*": {"origins": "*"}})

DB_FILE = 'orders_db.json'

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_db(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

@app.route('/orders', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def handle_orders():
    # Ответ на предварительный запрос браузера (Preflight), исправляет CORB
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
        
    if request.method == 'GET':
        return jsonify(load_db())
    
    if request.method == 'POST':
        order = request.json
        db_data = load_db()
        db_data.append(order)
        save_db(db_data)
        return jsonify({"status": "success"}), 201
    
    if request.method == 'DELETE':
        save_db([])
        return jsonify({"status": "cleared"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
