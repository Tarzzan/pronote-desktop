#!/usr/bin/env python3
"""
Pronote Desktop — Serveur API Python (proxy pronotepy)
Version: 1.7.9
Ce serveur Flask fait le pont entre l'interface React et l'API Pronote
via la bibliothèque pronotepy.
"""

import pronotepy
import datetime
import json
import os
import subprocess
import traceback
from typing import Any, List, Optional, Tuple
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
# DIST_DIR : répertoire du build Vite (dist/ en dev, BASE_DIR en production installée)
# En production (.deb), les assets sont copiés directement dans BASE_DIR (index.html + assets/)
# En développement, ils sont dans BASE_DIR/dist/
DIST_DIR = os.path.join(BASE_DIR, 'dist') if os.path.isdir(os.path.join(BASE_DIR, 'dist')) else BASE_DIR
app = Flask(__name__, static_folder=os.path.join(DIST_DIR, 'assets'), static_url_path='/assets')
CORS(app, origins=["*"])

# ─── Backend Adapter (V2 spike foundation) ────────────────────────────────────
class AdapterError(Exception):
    """Erreur remontée par la couche d'adaptation backend."""


class PronoteBackendAdapter:
    """Contrat minimal d'un backend Pronote.

    Cette couche isole Flask des détails de l'implémentation cliente.
    Objectif du spike: pouvoir brancher une implémentation alternative sans
    toucher les routes (ex: pronotepy refonte, async, cache, retry custom).
    """

    def login(self, pronote_url: str, username: str, password: str) -> bool:
        raise NotImplementedError

    def logout(self) -> None:
        raise NotImplementedError

    def is_logged_in(self) -> bool:
        raise NotImplementedError

    def get_client(self) -> Any:
        raise NotImplementedError

    def get_lessons(self, date_from: datetime.date, date_to: datetime.date) -> list[Any]:
        raise NotImplementedError

    def get_homework(self, date_from: datetime.date, date_to: datetime.date) -> list[Any]:
        raise NotImplementedError

    def get_periods(self) -> list[Any]:
        raise NotImplementedError

    def get_discussions(self) -> list[Any]:
        raise NotImplementedError

    def get_informations(self) -> list[Any]:
        raise NotImplementedError


class PronotepySyncAdapter(PronoteBackendAdapter):
    """Implémentation actuelle basée sur pronotepy synchrone."""

    def __init__(self) -> None:
        self._client: Optional[pronotepy.Client] = None

    def login(self, pronote_url: str, username: str, password: str) -> bool:
        self._client = pronotepy.Client(pronote_url, username=username, password=password)
        return bool(self._client and self._client.logged_in)

    def logout(self) -> None:
        self._client = None

    def is_logged_in(self) -> bool:
        return bool(self._client and self._client.logged_in)

    def get_client(self) -> Any:
        if not self.is_logged_in():
            raise AdapterError("Non connecté")
        return self._client

    def get_lessons(self, date_from: datetime.date, date_to: datetime.date) -> list[Any]:
        client = self.get_client()
        return list(client.lessons(date_from, date_to))

    def get_homework(self, date_from: datetime.date, date_to: datetime.date) -> list[Any]:
        client = self.get_client()
        return list(client.homework(date_from, date_to))

    def get_periods(self) -> list[Any]:
        client = self.get_client()
        return list(client.periods)

    def get_discussions(self) -> list[Any]:
        client = self.get_client()
        return list(client.discussions())

    def get_informations(self) -> list[Any]:
        client = self.get_client()
        return list(client.information_and_surveys())


class PronotepyRefonteAdapter(PronotepySyncAdapter):
    """Spike adapter pour préparer une refonte pronotepy sans casser l'existant.

    La connexion tente d'abord `TeacherClient` (si disponible), puis bascule
    automatiquement sur `Client` pour rester compatible avec les versions
    historiques de la librairie.
    """

    def __init__(self) -> None:
        super().__init__()
        raw_preference = os.environ.get("PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT", "1").strip().lower()
        self._prefer_teacher_client = raw_preference not in ("0", "false", "no", "off")
        self._client_kind = "none"

    def _build_client_candidates(self) -> List[Tuple[str, Any]]:
        teacher_cls = getattr(pronotepy, "TeacherClient", None)
        ordered_candidates: List[Tuple[str, Any]] = []

        if self._prefer_teacher_client and teacher_cls is not None:
            ordered_candidates.append(("pronotepy.TeacherClient", teacher_cls))
        ordered_candidates.append(("pronotepy.Client", pronotepy.Client))
        if (not self._prefer_teacher_client) and teacher_cls is not None:
            ordered_candidates.append(("pronotepy.TeacherClient", teacher_cls))

        # Évite un doublon si TeacherClient pointe déjà vers Client.
        deduplicated: List[Tuple[str, Any]] = []
        seen = set()
        for name, cls in ordered_candidates:
            marker = id(cls)
            if marker in seen:
                continue
            seen.add(marker)
            deduplicated.append((name, cls))
        return deduplicated

    def login(self, pronote_url: str, username: str, password: str) -> bool:
        last_error: Optional[Exception] = None
        self._client = None
        self._client_kind = "none"

        for candidate_name, candidate_cls in self._build_client_candidates():
            self._client_kind = candidate_name
            try:
                candidate_client = candidate_cls(pronote_url, username=username, password=password)
            except Exception as exc:
                last_error = exc
                continue

            if bool(getattr(candidate_client, "logged_in", False)):
                self._client = candidate_client
                self._client_kind = candidate_name
                return True

        if last_error is not None:
            raise AdapterError(f"Échec de connexion backend ({self._client_kind}): {last_error}")
        return False


def build_backend_adapter() -> PronoteBackendAdapter:
    """Factory de backend.

    Le nom est piloté par PRONOTE_BACKEND_ADAPTER pour faciliter les spikes.
    Valeurs supportées:
    - pronotepy-sync (défaut)
    - pronotepy-refonte
    """
    adapter_name = os.environ.get("PRONOTE_BACKEND_ADAPTER", "pronotepy-sync").strip().lower()
    if adapter_name in ("", "pronotepy-sync"):
        return PronotepySyncAdapter()
    if adapter_name in ("pronotepy-refonte", "refonte-pronotepy"):
        return PronotepyRefonteAdapter()
    raise RuntimeError(f"Backend adapter non supporté: {adapter_name}")


_adapter = build_backend_adapter()

def client_to_dict(client: pronotepy.Client) -> dict:
    return {
        "name": client.info.name if client.info else "Professeur",
        "establishment": client.info.establishment if client.info else "",
        "class_name": getattr(client.info, 'class_name', None),
        "profile_picture_url": None,
    }

def lesson_to_dict(l: pronotepy.Lesson) -> dict:
    group_names = []
    if hasattr(l, 'group_names') and isinstance(l.group_names, list):
        group_names = [str(g) for g in l.group_names if g]
    teacher_names = []
    if hasattr(l, 'teacher_names') and isinstance(l.teacher_names, list):
        teacher_names = [str(t) for t in l.teacher_names if t]
    classrooms = []
    if hasattr(l, 'classrooms') and isinstance(l.classrooms, list):
        classrooms = [str(c) for c in l.classrooms if c]

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
        "group_names": group_names,
        "teacher_names": teacher_names,
        "classrooms": classrooms,
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


def get_selected_period(period_id: Optional[str]) -> Any:
    periods = _adapter.get_periods()
    if not periods:
        return None
    return next((p for p in periods if str(getattr(p, 'id', '')) == str(period_id)), periods[0])


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Sert le frontend React (SPA)."""
    return send_from_directory(DIST_DIR, 'index.html')

@app.route('/<path:path>')
def spa_fallback(path):
    """Fallback SPA : sert les fichiers statiques existants, sinon renvoie index.html."""
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    # Servir les fichiers statiques existants (JS, CSS, images, fonts…)
    full_path = os.path.join(DIST_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(DIST_DIR, path)
    # Fallback SPA : toutes les routes React renvoient index.html
    return send_from_directory(DIST_DIR, 'index.html')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "1.7.9"})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    url = data.get('pronote_url', '')
    username = data.get('username', '')
    password = data.get('password', '')
    try:
        logged = _adapter.login(url, username, password)
        if logged:
            return jsonify({"success": True, "client_info": client_to_dict(_adapter.get_client())})
        return jsonify({"success": False, "error": "Connexion échouée"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    _adapter.logout()
    return jsonify({"success": True})

@app.route('/api/timetable', methods=['GET'])
def timetable():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        date_from_str = request.args.get('from')
        date_to_str = request.args.get('to')
        date_from = datetime.date.fromisoformat(date_from_str) if date_from_str else datetime.date.today()
        date_to = datetime.date.fromisoformat(date_to_str) if date_to_str else date_from + datetime.timedelta(days=6)
        lessons = _adapter.get_lessons(date_from, date_to)
        return jsonify([lesson_to_dict(l) for l in lessons])
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/homework', methods=['GET'])
def homework():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        date_from_str = request.args.get('from')
        date_to_str = request.args.get('to')
        date_from = datetime.date.fromisoformat(date_from_str) if date_from_str else datetime.date.today()
        date_to = datetime.date.fromisoformat(date_to_str) if date_to_str else date_from + datetime.timedelta(days=14)
        hw = _adapter.get_homework(date_from, date_to)
        return jsonify([homework_to_dict(h) for h in hw])
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/periods', methods=['GET'])
def periods():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        ps = _adapter.get_periods()
        return jsonify([period_to_dict(p) for p in ps])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/grades', methods=['GET'])
def grades():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        period = get_selected_period(period_id)
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
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        period = get_selected_period(period_id)
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
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        ds = _adapter.get_discussions()
        return jsonify([discussion_to_dict(d) for d in ds])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/informations', methods=['GET'])
def informations():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        infos = _adapter.get_informations()
        return jsonify([info_to_dict(i) for i in infos])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/absences', methods=['GET'])
def absences():
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        period = get_selected_period(period_id)
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
    if not _adapter.is_logged_in():
        return jsonify({"error": "Non connecté"}), 401
    try:
        period_id = request.args.get('period_id')
        period = get_selected_period(period_id)
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
    # api_host configurable dans /etc/pronote-desktop/config.json
    # Valeur par défaut : 127.0.0.1 (local uniquement)
    # Pour accès LAN/WAN : définir "api_host": "0.0.0.0"
    host = CONFIG.get('api_host', '127.0.0.1')
    print(f"Pronote Desktop API v1.7.9 — http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
