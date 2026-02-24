#!/usr/bin/env python3
"""
Pronote Desktop — Serveur API Python (proxy pronotepy)
Version: 1.6.1
Ce serveur Flask fait le pont entre l'interface React et l'API Pronote
via la bibliothèque pronotepy.
"""

import pronotepy
import datetime
import json
import os
import subprocess
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# --- Configuration ---
CONFIG_PATH = os.environ.get('PRONOTE_CONFIG', '/etc/pronote-desktop/config.json')

def load_config():
    """Charge la configuration depuis config.json, avec valeurs par défaut."""
    defaults = {"api_port": 5174, "check_updates": True, "theme": "light"}
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH) as f:
                data = json.load(f)
                defaults.update(data)
    except Exception:
        pass
    return defaults

CONFIG = load_config()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'assets'), static_url_path='/assets')
CORS(app, origins=["*"])

# Session Pronote en mémoire
_client: pronotepy.Client | None = None

def client_to_dict(client: pronotepy.Client) -> dict:
    return {
        "name": client.info.name if client.info else "Professeur",
        "establishment": client.info.establishment if client.info else "",
        "class_name": getattr(client.info, 'class_name', None),
        "profile_picture_url": None,
    }

def lesson_to_dict(l: pronotepy.Lesson) -> dict:
    return {
        "id": str(l.id) if hasattr(l, 'id') else str(id(l)),
        "subject": {"id": l.subject.id if l.subject else "", "name": l.subject.name if l.subject else "Cours", "groups": l.subject.groups if l.subject else False} if l.subject else None,
        "teacher_name": l.teacher_name if hasattr(l, 'teacher_name') else None,
        "classroom": l.classroom if hasattr(l, 'classroom') else None,
        "start": l.start.isoformat(),
        "end": l.end.isoformat(),
        "is_cancelled": l.canceled if hasattr(l, 'canceled') else False,
        "is_outing": l.outing if hasattr(l, 'outing') else False,
        "is_detention": l.detention if hasattr(l, 'detention') else False,
        "is_exempted": l.exempted if hasattr(l, 'exempted') else False,
        "background_color": l.background_color if hasattr(l, 'background_color') else None,
        "status": l.status if hasattr(l, 'status') else None,
        "group_name": l.group_name if hasattr(l, 'group_name') else None,
        "memo": l.memo if hasattr(l, 'memo') else None,
    }

def homework_to_dict(h: pronotepy.Homework) -> dict:
    return {
        "id": str(h.id) if hasattr(h, 'id') else str(id(h)),
        "subject": {"id": h.subject.id if h.subject else "", "name": h.subject.name if h.subject else "Matière", "groups": False} if h.subject else {"id": "", "name": "Matière", "groups": False},
        "description": h.description if hasattr(h, 'description') else "",
        "done": h.done if hasattr(h, 'done') else False,
        "date": h.date.isoformat() if hasattr(h, 'date') and h.date else datetime.date.today().isoformat(),
        "files": [],
    }

def grade_to_dict(g: pronotepy.Grade, period_dict: dict) -> dict:
    return {
        "id": str(g.id) if hasattr(g, 'id') else str(id(g)),
        "grade": str(g.grade) if hasattr(g, 'grade') else "—",
        "out_of": str(g.out_of) if hasattr(g, 'out_of') else "20",
        "default_out_of": str(g.default_out_of) if hasattr(g, 'default_out_of') else "20",
        "date": g.date.isoformat() if hasattr(g, 'date') and g.date else datetime.date.today().isoformat(),
        "subject": {"id": g.subject.id if g.subject else "", "name": g.subject.name if g.subject else "Matière", "groups": False} if g.subject else {"id": "", "name": "Matière", "groups": False},
        "period": period_dict,
        "average": str(g.average) if hasattr(g, 'average') else "",
        "max": str(g.max) if hasattr(g, 'max') else "",
        "min": str(g.min) if hasattr(g, 'min') else "",
        "coefficient": str(g.coefficient) if hasattr(g, 'coefficient') else "1",
        "comment": str(g.comment) if hasattr(g, 'comment') else "",
        "is_bonus": bool(g.is_bonus) if hasattr(g, 'is_bonus') else False,
        "is_optionnal": bool(g.is_optionnal) if hasattr(g, 'is_optionnal') else False,
        "is_out_of_20": bool(g.is_out_of_20) if hasattr(g, 'is_out_of_20') else True,
    }

def average_to_dict(a: pronotepy.Average) -> dict:
    return {
        "student": str(a.student) if hasattr(a, 'student') else "—",
        "class_average": str(a.class_average) if hasattr(a, 'class_average') else "—",
        "max": str(a.max) if hasattr(a, 'max') else "—",
        "min": str(a.min) if hasattr(a, 'min') else "—",
        "out_of": str(a.out_of) if hasattr(a, 'out_of') else "20",
        "default_out_of": str(a.default_out_of) if hasattr(a, 'default_out_of') else "20",
        "subject": {"id": a.subject.id if a.subject else "", "name": a.subject.name if a.subject else "Matière", "groups": False} if a.subject else {"id": "", "name": "Matière", "groups": False},
        "background_color": str(a.background_color) if hasattr(a, 'background_color') else "#4a90d9",
    }

def period_to_dict(p: pronotepy.Period) -> dict:
    return {
        "id": str(p.id),
        "name": str(p.name),
        "start": p.start.isoformat() if hasattr(p, 'start') and p.start else "",
        "end": p.end.isoformat() if hasattr(p, 'end') and p.end else "",
    }

def discussion_to_dict(d) -> dict:
    messages = []
    try:
        for m in d.messages:
            messages.append({
                "id": str(m.id) if hasattr(m, 'id') else str(id(m)),
                "author": str(m.author) if m.author else "Inconnu",
                "content": str(m.content) if m.content else "",
                "date": m.date.isoformat() if hasattr(m, 'date') and m.date else "",
                "seen": bool(m.seen) if hasattr(m, 'seen') else False,
            })
    except Exception:
        pass
    return {
        "id": str(d.id) if hasattr(d, 'id') else str(id(d)),
        "subject": str(d.subject) if d.subject else "Sans objet",
        "creator": str(d.creator) if d.creator else "Inconnu",
        "unread": bool(d.unread) if hasattr(d, 'unread') else False,
        "date": d.date.isoformat() if hasattr(d, 'date') and d.date else "",
        "messages": messages,
        "participants": [],
    }

def info_to_dict(i) -> dict:
    return {
        "id": str(i.id) if hasattr(i, 'id') else str(id(i)),
        "title": str(i.title) if hasattr(i, 'title') else "Information",
        "author": str(i.author) if hasattr(i, 'author') and i.author else "Administration",
        "content": str(i.content) if hasattr(i, 'content') and i.content else "",
        "date": i.creation_date.isoformat() if hasattr(i, 'creation_date') and i.creation_date else "",
        "read": bool(i.read) if hasattr(i, 'read') else False,
        "category": str(i.category) if hasattr(i, 'category') and i.category else "Général",
    }

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Sert le frontend React (SPA)."""
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>')
def spa_fallback(path):
    """Fallback SPA : toutes les routes non-API renvoient index.html."""
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "1.6.1"})

@app.route('/api/login', methods=['POST'])
def login():
    global _client
    data = request.json
    url = data.get('pronote_url', '')
    username = data.get('username', '')
    password = data.get('password', '')
    try:
        _client = pronotepy.Client(url, username=username, password=password)
        if _client.logged_in:
            return jsonify({"success": True, "client_info": client_to_dict(_client)})
        return jsonify({"success": False, "error": "Connexion échouée"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    global _client
    _client = None
    return jsonify({"success": True})

@app.route('/api/timetable', methods=['GET'])
def timetable():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        date_from_str = request.args.get('from')
        date_to_str = request.args.get('to')
        date_from = datetime.date.fromisoformat(date_from_str) if date_from_str else datetime.date.today()
        date_to = datetime.date.fromisoformat(date_to_str) if date_to_str else date_from + datetime.timedelta(days=6)
        lessons = _client.lessons(date_from, date_to)
        return jsonify([lesson_to_dict(l) for l in lessons])
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/homework', methods=['GET'])
def homework():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        date_from_str = request.args.get('from')
        date_to_str = request.args.get('to')
        date_from = datetime.date.fromisoformat(date_from_str) if date_from_str else datetime.date.today()
        date_to = datetime.date.fromisoformat(date_to_str) if date_to_str else date_from + datetime.timedelta(days=14)
        hw = _client.homework(date_from, date_to)
        return jsonify([homework_to_dict(h) for h in hw])
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/periods', methods=['GET'])
def periods():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        ps = list(_client.periods)
        return jsonify([period_to_dict(p) for p in ps])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/grades', methods=['GET'])
def grades():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        period_name = request.args.get('period_name', '')
        ps = list(_client.periods)
        period = next((p for p in ps if str(p.id) == period_id), ps[0] if ps else None)
        if not period:
            return jsonify([])
        p_dict = period_to_dict(period)
        try:
            gs = period.grades
            return jsonify([grade_to_dict(g, p_dict) for g in gs])
        except Exception:
            return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/averages', methods=['GET'])
def averages():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        ps = list(_client.periods)
        period = next((p for p in ps if str(p.id) == period_id), ps[0] if ps else None)
        if not period:
            return jsonify([])
        try:
            avgs = period.averages
            return jsonify([average_to_dict(a) for a in avgs])
        except Exception:
            return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/discussions', methods=['GET'])
def discussions():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        ds = _client.discussions()
        return jsonify([discussion_to_dict(d) for d in ds])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/informations', methods=['GET'])
def informations():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        infos = list(_client.information_and_surveys())
        return jsonify([info_to_dict(i) for i in infos])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/absences', methods=['GET'])
def absences():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        ps = list(_client.periods)
        period = next((p for p in ps if str(p.id) == period_id), ps[0] if ps else None)
        if not period:
            return jsonify([])
        try:
            abs_list = period.absences
            result = []
            for a in abs_list:
                result.append({
                    "id": str(a.id) if hasattr(a, 'id') else str(id(a)),
                    "from_date": a.from_date.isoformat() if hasattr(a, 'from_date') and a.from_date else "",
                    "to_date": a.to_date.isoformat() if hasattr(a, 'to_date') and a.to_date else "",
                    "justified": bool(a.justified) if hasattr(a, 'justified') else False,
                    "hours": str(a.hours) if hasattr(a, 'hours') else "0",
                    "days": int(a.days) if hasattr(a, 'days') else 0,
                    "reasons": list(a.reasons) if hasattr(a, 'reasons') else [],
                })
            return jsonify(result)
        except Exception:
            return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delays', methods=['GET'])
def delays():
    global _client
    if not _client or not _client.logged_in:
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        ps = list(_client.periods)
        period = next((p for p in ps if str(p.id) == period_id), ps[0] if ps else None)
        if not period:
            return jsonify([])
        try:
            dl = period.delays
            result = []
            for d in dl:
                result.append({
                    "id": str(d.id) if hasattr(d, 'id') else str(id(d)),
                    "date": d.date.isoformat() if hasattr(d, 'date') and d.date else "",
                    "minutes": int(d.minutes) if hasattr(d, 'minutes') else 0,
                    "justified": bool(d.justified) if hasattr(d, 'justified') else False,
                    "justification": str(d.justification) if hasattr(d, 'justification') else "",
                    "reasons": list(d.reasons) if hasattr(d, 'reasons') else [],
                })
            return jsonify(result)
        except Exception:
            return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notify', methods=['POST'])
def notify():
    """Envoie une notification desktop via libnotify (notify-send)."""
    try:
        data = request.get_json() or {}
        title = str(data.get('title', 'Pronote Desktop'))[:100]
        body = str(data.get('body', ''))[:300]
        urgency = data.get('urgency', 'normal')
        if urgency not in ('low', 'normal', 'critical'):
            urgency = 'normal'
        result = subprocess.run(
            ['notify-send', '-a', 'Pronote Desktop', '-u', urgency, '--', title, body],
            capture_output=True, timeout=5
        )
        return jsonify({"sent": result.returncode == 0})
    except FileNotFoundError:
        return jsonify({"sent": False, "error": "notify-send not available"}), 200
    except Exception as e:
        return jsonify({"sent": False, "error": str(e)}), 200


@app.route('/api/config', methods=['GET'])
def get_config():
    """Retourne la configuration publique (sans secrets)."""
    cfg = load_config()
    return jsonify({"api_port": cfg.get('api_port', 5174), "theme": cfg.get('theme', 'light')})


@app.route('/api/config', methods=['PATCH'])
def patch_config():
    """Met à jour des clés de configuration (theme uniquement via API)."""
    try:
        updates = request.get_json() or {}
        allowed = {'theme'}
        cfg = load_config()
        for k, v in updates.items():
            if k in allowed:
                cfg[k] = v
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, 'w') as f:
            json.dump(cfg, f, indent=2)
        return jsonify({"updated": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = CONFIG.get('api_port', 5174)
    app.run(host='127.0.0.1', port=port, debug=False)
