import datetime as dt
import importlib
import os
import sys
import types
import unittest
from unittest import mock


def _build_fake_pronotepy_module() -> types.ModuleType:
    """Build a minimal pronotepy module so backend tests are deterministic."""
    module = types.ModuleType("pronotepy")

    class _BaseClient:
        def __init__(self, pronote_url: str, username: str = "", password: str = ""):
            self.pronote_url = pronote_url
            self.username = username
            self.password = password
            self.logged_in = bool(password and password != "bad")
            self.info = types.SimpleNamespace(
                name="Professeur Démo",
                establishment="Établissement Démo",
                class_name="3A",
            )
            self.periods = []

        def lessons(self, date_from, date_to):
            return []

        def homework(self, date_from, date_to):
            return []

        def discussions(self):
            return []

        def information_and_surveys(self):
            return []

    class Client(_BaseClient):
        pass

    class TeacherClient(_BaseClient):
        pass

    module.Client = Client
    module.TeacherClient = TeacherClient
    module.Lesson = type("Lesson", (), {})
    module.Homework = type("Homework", (), {})
    module.Grade = type("Grade", (), {})
    module.Average = type("Average", (), {})
    module.Period = type("Period", (), {})
    return module


def _build_fake_flask_cors_module() -> types.ModuleType:
    module = types.ModuleType("flask_cors")

    def _cors_noop(*args, **kwargs):
        return None

    module.CORS = _cors_noop
    return module


def _import_pronote_api(adapter_name: str = "pronotepy-refonte"):
    fake_pronotepy = _build_fake_pronotepy_module()
    fake_flask_cors = _build_fake_flask_cors_module()
    with mock.patch.dict(sys.modules, {"pronotepy": fake_pronotepy, "flask_cors": fake_flask_cors}):
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": adapter_name}, clear=False):
            if "pronote_api" in sys.modules:
                del sys.modules["pronote_api"]
            module = importlib.import_module("pronote_api")
            return importlib.reload(module)


class DummyAdapter:
    def __init__(
        self,
        *,
        login_result=True,
        logged_in=False,
        lessons=None,
        periods=None,
        discussions=None,
        informations=None,
        homeworks=None,
        recipients=None,
        menus=None,
        ical_payload="BEGIN:VCALENDAR\nEND:VCALENDAR\n",
    ):
        self._login_result = login_result
        self._logged_in = logged_in
        self._lessons = lessons or []
        self._periods = periods or []
        self._discussions = discussions or []
        self._informations = informations or []
        self._homeworks = homeworks or []
        self._recipients = recipients or []
        self._menus = menus or []
        self._ical_payload = ical_payload
        self.login_calls = []

    def login(self, pronote_url, username, password):
        self.login_calls.append((pronote_url, username, password))
        self._logged_in = self._login_result
        return self._login_result

    def logout(self):
        self._logged_in = False

    def is_logged_in(self):
        return self._logged_in

    def get_client(self):
        if not self._logged_in:
            raise RuntimeError("Not logged in")
        return types.SimpleNamespace(
            info=types.SimpleNamespace(name="Prof Démo", establishment="Lycée Démo", class_name="TSTI2D")
        )

    def get_lessons(self, date_from, date_to):
        return list(self._lessons)

    def get_homework(self, date_from, date_to):
        return list(self._homeworks)

    def get_periods(self):
        return list(self._periods)

    def get_discussions(self):
        return list(self._discussions)

    def get_informations(self):
        return list(self._informations)

    def set_homework_done(self, homework_id, done):
        for homework in self._homeworks:
            if str(getattr(homework, "id", "")) == str(homework_id):
                setattr(homework, "done", bool(done))
                return True
        return False

    def get_lesson_content(self, lesson_id, date_from, date_to):
        for lesson in self._lessons:
            if str(getattr(lesson, "id", "")) == str(lesson_id):
                return getattr(lesson, "content", None)
        return None

    def get_recipients(self):
        return list(self._recipients)

    def create_discussion(self, recipient_ids, subject, content):
        if not recipient_ids:
            raise RuntimeError("no recipients")
        discussion = types.SimpleNamespace(
            id="new-discussion-id",
            subject=subject,
            creator="Moi",
            unread=False,
            date=dt.datetime(2026, 2, 14, 8, 0),
            messages=[types.SimpleNamespace(id="msg-1", author="Moi", content=content, date=dt.datetime(2026, 2, 14, 8, 0), seen=True)],
        )
        self._discussions.append(discussion)
        return discussion

    def reply_discussion(self, discussion_id, content):
        for discussion in self._discussions:
            if str(getattr(discussion, "id", "")) == str(discussion_id):
                messages = list(getattr(discussion, "messages", []))
                messages.append(
                    types.SimpleNamespace(
                        id=f"reply-{len(messages)+1}",
                        author="Moi",
                        content=content,
                        date=dt.datetime(2026, 2, 14, 8, 5),
                        seen=True,
                    )
                )
                setattr(discussion, "messages", messages)
                return True
        return False

    def mark_discussion(self, discussion_id, mark_as):
        for discussion in self._discussions:
            if str(getattr(discussion, "id", "")) == str(discussion_id):
                setattr(discussion, "unread", mark_as == "unread")
                return True
        return False

    def delete_discussion(self, discussion_id):
        before = len(self._discussions)
        self._discussions = [d for d in self._discussions if str(getattr(d, "id", "")) != str(discussion_id)]
        return len(self._discussions) < before

    def mark_information_read(self, information_id):
        for info in self._informations:
            if str(getattr(info, "id", "")) == str(information_id):
                setattr(info, "read", True)
                return True
        return False

    def get_menus(self, date_from, date_to):
        return list(self._menus)

    def export_ical(self, date_from, date_to):
        return self._ical_payload


class BackendFactoryContractTests(unittest.TestCase):
    def test_build_backend_adapter_defaults_to_refonte(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {}, clear=True):
            adapter = api.build_backend_adapter()
        self.assertIsInstance(adapter, api.PronotepyRefonteAdapter)

    def test_build_backend_adapter_supports_sync_override(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": "pronotepy-sync"}, clear=False):
            adapter = api.build_backend_adapter()
        self.assertIsInstance(adapter, api.PronotepySyncAdapter)

    def test_build_backend_adapter_supports_refonte_alias(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": "refonte-pronotepy"}, clear=False):
            adapter = api.build_backend_adapter()
        self.assertIsInstance(adapter, api.PronotepyRefonteAdapter)

    def test_build_backend_adapter_rejects_unknown_value(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": "unknown-adapter"}, clear=False):
            with self.assertRaises(RuntimeError):
                api.build_backend_adapter()


class RefonteAdapterBehaviorTests(unittest.TestCase):
    def setUp(self):
        self.api = _import_pronote_api("pronotepy-refonte")

    def test_refonte_prefers_teacher_client_by_default(self):
        calls = []

        class TeacherClientOk:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("teacher")
                self.logged_in = True

        class ClientShouldNotRun:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("client")
                self.logged_in = True

        with mock.patch.object(self.api.pronotepy, "TeacherClient", TeacherClientOk), mock.patch.object(
            self.api.pronotepy, "Client", ClientShouldNotRun
        ):
            with mock.patch.dict(os.environ, {"PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT": "1"}, clear=False):
                adapter = self.api.PronotepyRefonteAdapter()
                logged = adapter.login("https://demo.example/pronote", "demo", "ok")

        self.assertTrue(logged)
        self.assertEqual(calls, ["teacher"])
        self.assertEqual(adapter._client_kind, "pronotepy.TeacherClient")

    def test_refonte_falls_back_to_client_when_teacher_raises(self):
        calls = []

        class TeacherClientFail:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("teacher")
                raise RuntimeError("teacher failure")

        class ClientOk:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("client")
                self.logged_in = True

        with mock.patch.object(self.api.pronotepy, "TeacherClient", TeacherClientFail), mock.patch.object(
            self.api.pronotepy, "Client", ClientOk
        ):
            with mock.patch.dict(os.environ, {"PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT": "1"}, clear=False):
                adapter = self.api.PronotepyRefonteAdapter()
                logged = adapter.login("https://demo.example/pronote", "demo", "ok")

        self.assertTrue(logged)
        self.assertEqual(calls, ["teacher", "client"])
        self.assertEqual(adapter._client_kind, "pronotepy.Client")

    def test_refonte_can_prefer_client_when_flag_disabled(self):
        calls = []

        class TeacherClientOk:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("teacher")
                self.logged_in = True

        class ClientFail:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                calls.append("client")
                raise RuntimeError("client failure")

        with mock.patch.object(self.api.pronotepy, "TeacherClient", TeacherClientOk), mock.patch.object(
            self.api.pronotepy, "Client", ClientFail
        ):
            with mock.patch.dict(os.environ, {"PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT": "0"}, clear=False):
                adapter = self.api.PronotepyRefonteAdapter()
                logged = adapter.login("https://demo.example/pronote", "demo", "ok")

        self.assertTrue(logged)
        self.assertEqual(calls, ["client", "teacher"])
        self.assertEqual(adapter._client_kind, "pronotepy.TeacherClient")

    def test_refonte_raises_adapter_error_when_all_candidates_fail(self):
        class TeacherClientFail:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                raise RuntimeError("teacher failure")

        class ClientFail:
            def __init__(self, pronote_url: str, username: str = "", password: str = ""):
                raise RuntimeError("client failure")

        with mock.patch.object(self.api.pronotepy, "TeacherClient", TeacherClientFail), mock.patch.object(
            self.api.pronotepy, "Client", ClientFail
        ):
            with mock.patch.dict(os.environ, {"PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT": "1"}, clear=False):
                adapter = self.api.PronotepyRefonteAdapter()
                with self.assertRaises(self.api.AdapterError):
                    adapter.login("https://demo.example/pronote", "demo", "bad")


class BackendRoutesContractTests(unittest.TestCase):
    def setUp(self):
        self.api = _import_pronote_api("pronotepy-sync")
        self.client = self.api.app.test_client()

    def test_health_contract(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["status"], "ok")
        self.assertRegex(body["version"], r"^\d+\.\d+\.\d+")

    def test_timetable_requires_authentication(self):
        self.api._adapter = DummyAdapter(logged_in=False)

        response = self.client.get("/api/timetable")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": "Non connecté"})

    def test_login_success_contract(self):
        adapter = DummyAdapter(login_result=True, logged_in=False)
        self.api._adapter = adapter

        response = self.client.post(
            "/api/login",
            json={
                "pronote_url": "https://demo.index-education.net/pronote/professeur.html",
                "username": "demonstration",
                "password": "pronotevs",
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(body["client_info"]["name"], "Prof Démo")
        self.assertEqual(len(adapter.login_calls), 1)

    def test_login_failure_contract(self):
        self.api._adapter = DummyAdapter(login_result=False, logged_in=False)

        response = self.client.post(
            "/api/login",
            json={
                "pronote_url": "https://demo.index-education.net/pronote/professeur.html",
                "username": "demonstration",
                "password": "bad",
            },
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"success": False, "error": "Connexion échouée"})

    def test_timetable_serialization_contract(self):
        subject = types.SimpleNamespace(id="mat-001", name="Mathématiques", groups=True)
        lesson = types.SimpleNamespace(
            id="lesson-1",
            subject=subject,
            teacher_name="Mme Martin",
            classroom="B12",
            start=dt.datetime(2026, 2, 2, 9, 0),
            end=dt.datetime(2026, 2, 2, 10, 0),
            canceled=False,
            outing=False,
            detention=False,
            exempted=False,
            background_color="#3f87ff",
            status="planned",
            group_name="Groupe 1",
            group_names=["1G1", "1G2"],
            teacher_names=["Mme Martin"],
            classrooms=["B12"],
            memo="Chapitre 4",
        )
        self.api._adapter = DummyAdapter(logged_in=True, lessons=[lesson])

        response = self.client.get("/api/timetable?from=2026-02-02&to=2026-02-08")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["subject"]["name"], "Mathématiques")
        self.assertEqual(body[0]["group_names"], ["1G1", "1G2"])
        self.assertEqual(body[0]["classroom"], "B12")

    def test_extended_endpoints_require_authentication(self):
        self.api._adapter = DummyAdapter(logged_in=False)

        checks = [
            ("get", "/api/recipients"),
            ("get", "/api/menus"),
            ("get", "/api/export/ical"),
            ("patch", "/api/homework/h1/done"),
            ("get", "/api/lessons/l1/content"),
            ("post", "/api/discussions/new"),
            ("post", "/api/discussions/d1/reply"),
            ("patch", "/api/discussions/d1/status"),
            ("delete", "/api/discussions/d1"),
            ("patch", "/api/informations/i1/read"),
        ]

        for method, endpoint in checks:
            kwargs = {"json": {}} if method in ("post", "patch", "put") else {}
            response = getattr(self.client, method)(endpoint, **kwargs)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.get_json(), {"error": "Non connecté"})

    def test_homework_done_update_contract(self):
        homework = types.SimpleNamespace(id="h1", done=False)
        self.api._adapter = DummyAdapter(logged_in=True, homeworks=[homework])

        response = self.client.patch("/api/homework/h1/done", json={"done": True})
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body, {"updated": True, "id": "h1", "done": True})
        self.assertTrue(homework.done)

    def test_lesson_content_contract(self):
        lesson = types.SimpleNamespace(id="l1", content="<p>Contenu du cours</p>")
        self.api._adapter = DummyAdapter(logged_in=True, lessons=[lesson])

        response = self.client.get("/api/lessons/l1/content")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["id"], "l1")
        self.assertEqual(body["content"], "<p>Contenu du cours</p>")

    def test_recipients_contract(self):
        recipient = types.SimpleNamespace(id="r1", identity=types.SimpleNamespace(name="Direction"), kind="admin")
        self.api._adapter = DummyAdapter(logged_in=True, recipients=[recipient])

        response = self.client.get("/api/recipients")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "r1")
        self.assertEqual(body[0]["name"], "Direction")

    def test_create_discussion_contract(self):
        recipient = types.SimpleNamespace(id="r1", identity=types.SimpleNamespace(name="Direction"), kind="admin")
        self.api._adapter = DummyAdapter(logged_in=True, recipients=[recipient])

        response = self.client.post(
            "/api/discussions/new",
            json={"recipient_ids": ["r1"], "subject": "Objet test", "content": "Contenu test"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertTrue(body["created"])
        self.assertEqual(body["discussion"]["subject"], "Objet test")
        self.assertEqual(len(body["discussion"]["messages"]), 1)

    def test_reply_mark_delete_discussion_contract(self):
        discussion = types.SimpleNamespace(
            id="d1",
            subject="Sujet",
            creator="Direction",
            unread=True,
            date=dt.datetime(2026, 2, 12, 8, 30),
            messages=[],
        )
        self.api._adapter = DummyAdapter(logged_in=True, discussions=[discussion])

        reply_response = self.client.post("/api/discussions/d1/reply", json={"content": "Réponse"})
        self.assertEqual(reply_response.status_code, 200)
        self.assertEqual(reply_response.get_json()["replied"], True)

        mark_response = self.client.patch("/api/discussions/d1/status", json={"mark_as": "read"})
        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(mark_response.get_json()["updated"], True)
        self.assertFalse(discussion.unread)

        delete_response = self.client.delete("/api/discussions/d1")
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.get_json()["deleted"], True)

    def test_mark_information_read_contract(self):
        info = types.SimpleNamespace(
            id="i1",
            title="Info",
            author="Admin",
            content="Texte",
            creation_date=dt.datetime(2026, 2, 13, 9, 0),
            read=False,
            category="Général",
        )
        self.api._adapter = DummyAdapter(logged_in=True, informations=[info])

        response = self.client.patch("/api/informations/i1/read", json={})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["updated"], True)
        self.assertTrue(info.read)

    def test_menus_contract(self):
        menu = {"date": "2026-02-25", "lunch": ["salade", "poulet", "fruit"]}
        self.api._adapter = DummyAdapter(logged_in=True, menus=[menu])

        response = self.client.get("/api/menus?from=2026-02-25&to=2026-02-25")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["date"], "2026-02-25")

    def test_export_ical_contract(self):
        self.api._adapter = DummyAdapter(logged_in=True, ical_payload="BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n")
        response = self.client.get("/api/export/ical")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/calendar", response.content_type)
        self.assertIn("BEGIN:VCALENDAR", response.get_data(as_text=True))

    def test_get_selected_period_prefers_id_then_fallback(self):
        period_a = types.SimpleNamespace(id="p1", name="Trimestre 1", start=None, end=None)
        period_b = types.SimpleNamespace(id="p2", name="Trimestre 2", start=None, end=None)
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period_a, period_b])

        picked = self.api.get_selected_period("p2")
        self.assertEqual(picked.id, "p2")

        fallback = self.api.get_selected_period("missing")
        self.assertEqual(fallback.id, "p1")

    def test_grades_requires_authentication(self):
        self.api._adapter = DummyAdapter(logged_in=False)
        response = self.client.get("/api/grades")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": "Non connecté"})

    def test_period_endpoints_require_authentication(self):
        self.api._adapter = DummyAdapter(logged_in=False)
        for endpoint in ("/api/averages", "/api/absences", "/api/delays"):
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.get_json(), {"error": "Non connecté"})

    def test_grades_serialization_contract(self):
        subject = types.SimpleNamespace(id="mat-001", name="Mathématiques")
        grade = types.SimpleNamespace(
            id="g1",
            grade="15",
            out_of="20",
            default_out_of="20",
            date=dt.date(2026, 2, 3),
            subject=subject,
            average="13.2",
            max="19",
            min="6",
            coefficient="2",
            comment="Très bon travail",
            is_bonus=False,
            is_optionnal=False,
            is_out_of_20=True,
        )
        period = types.SimpleNamespace(
            id="p1",
            name="Trimestre 1",
            start=dt.date(2026, 1, 1),
            end=dt.date(2026, 3, 31),
            grades=[grade],
            averages=[],
            absences=[],
            delays=[],
        )
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period])

        response = self.client.get("/api/grades?period_id=p1")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "g1")
        self.assertEqual(body[0]["period"]["id"], "p1")
        self.assertEqual(body[0]["subject"]["name"], "Mathématiques")

    def test_averages_serialization_contract(self):
        subject = types.SimpleNamespace(id="mat-001", name="Mathématiques")
        average = types.SimpleNamespace(
            student="15.3",
            class_average="12.4",
            max="18.9",
            min="7.2",
            out_of="20",
            default_out_of="20",
            subject=subject,
            background_color="#2f7dea",
        )
        period = types.SimpleNamespace(
            id="p1",
            name="Trimestre 1",
            start=dt.date(2026, 1, 1),
            end=dt.date(2026, 3, 31),
            grades=[],
            averages=[average],
            absences=[],
            delays=[],
        )
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period])

        response = self.client.get("/api/averages?period_id=p1")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["student"], "15.3")
        self.assertEqual(body[0]["subject"]["name"], "Mathématiques")
        self.assertEqual(body[0]["background_color"], "#2f7dea")

    def test_absences_serialization_contract(self):
        absence = types.SimpleNamespace(
            id="a1",
            from_date=dt.date(2026, 2, 10),
            to_date=dt.date(2026, 2, 10),
            justified=True,
            hours="2",
            days=0,
            reasons=["Médical"],
        )
        period = types.SimpleNamespace(
            id="p1",
            name="Trimestre 1",
            start=dt.date(2026, 1, 1),
            end=dt.date(2026, 3, 31),
            grades=[],
            averages=[],
            absences=[absence],
            delays=[],
        )
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period])

        response = self.client.get("/api/absences?period_id=p1")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "a1")
        self.assertEqual(body[0]["justified"], True)
        self.assertEqual(body[0]["reasons"], ["Médical"])

    def test_delays_serialization_contract(self):
        delay = types.SimpleNamespace(
            id="d1",
            date=dt.date(2026, 2, 11),
            minutes=7,
            justified=False,
            justification="",
            reasons=["Transport"],
        )
        period = types.SimpleNamespace(
            id="p1",
            name="Trimestre 1",
            start=dt.date(2026, 1, 1),
            end=dt.date(2026, 3, 31),
            grades=[],
            averages=[],
            absences=[],
            delays=[delay],
        )
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period])

        response = self.client.get("/api/delays?period_id=p1")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "d1")
        self.assertEqual(body[0]["minutes"], 7)
        self.assertEqual(body[0]["reasons"], ["Transport"])

    def test_discussions_and_informations_require_authentication(self):
        self.api._adapter = DummyAdapter(logged_in=False)
        for endpoint in ("/api/discussions", "/api/informations"):
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.get_json(), {"error": "Non connecté"})

    def test_discussions_serialization_contract(self):
        message = types.SimpleNamespace(
            id="m1",
            author="Mme Martin",
            content="Rappel contrôle demain",
            date=dt.datetime(2026, 2, 12, 8, 45),
            seen=True,
        )
        discussion = types.SimpleNamespace(
            id="dsc-1",
            subject="Classe 1G1",
            creator="Direction",
            unread=False,
            date=dt.datetime(2026, 2, 12, 8, 30),
            messages=[message],
        )
        self.api._adapter = DummyAdapter(logged_in=True, discussions=[discussion])

        response = self.client.get("/api/discussions")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "dsc-1")
        self.assertEqual(body[0]["subject"], "Classe 1G1")
        self.assertEqual(len(body[0]["messages"]), 1)
        self.assertEqual(body[0]["messages"][0]["id"], "m1")
        self.assertEqual(body[0]["messages"][0]["author"], "Mme Martin")

    def test_informations_serialization_contract(self):
        info = types.SimpleNamespace(
            id="info-1",
            title="Sortie scolaire",
            author="Administration",
            content="Prévoir une autorisation parentale.",
            creation_date=dt.datetime(2026, 2, 13, 9, 0),
            read=False,
            category="Vie scolaire",
        )
        self.api._adapter = DummyAdapter(logged_in=True, informations=[info])

        response = self.client.get("/api/informations")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "info-1")
        self.assertEqual(body[0]["title"], "Sortie scolaire")
        self.assertEqual(body[0]["author"], "Administration")
        self.assertEqual(body[0]["read"], False)

    def test_grades_returns_empty_on_period_error(self):
        class BrokenPeriod:
            id = "p1"
            name = "Trimestre 1"
            start = None
            end = None

            @property
            def grades(self):
                raise RuntimeError("boom grades")

        self.api._adapter = DummyAdapter(logged_in=True, periods=[BrokenPeriod()])
        response = self.client.get("/api/grades?period_id=p1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_absences_returns_empty_on_period_error(self):
        class BrokenPeriod:
            id = "p1"
            name = "Trimestre 1"
            start = None
            end = None

            @property
            def absences(self):
                raise RuntimeError("boom absences")

        self.api._adapter = DummyAdapter(logged_in=True, periods=[BrokenPeriod()])
        response = self.client.get("/api/absences?period_id=p1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])

    def test_discussions_defaults_when_fields_are_missing(self):
        discussion = types.SimpleNamespace(id="dsc-2")
        self.api._adapter = DummyAdapter(logged_in=True, discussions=[discussion])

        response = self.client.get("/api/discussions")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "dsc-2")
        self.assertEqual(body[0]["subject"], "Sans objet")
        self.assertEqual(body[0]["creator"], "Inconnu")
        self.assertEqual(body[0]["messages"], [])

    def test_informations_defaults_when_fields_are_missing(self):
        info = types.SimpleNamespace(id="info-2")
        self.api._adapter = DummyAdapter(logged_in=True, informations=[info])

        response = self.client.get("/api/informations")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "info-2")
        self.assertEqual(body[0]["title"], "Information")
        self.assertEqual(body[0]["author"], "Administration")
        self.assertEqual(body[0]["category"], "Général")
        self.assertEqual(body[0]["read"], False)


if __name__ == "__main__":
    unittest.main()
