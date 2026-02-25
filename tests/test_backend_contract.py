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


def _import_pronote_api(adapter_name: str = "pronotepy-sync"):
    fake_pronotepy = _build_fake_pronotepy_module()
    fake_flask_cors = _build_fake_flask_cors_module()
    with mock.patch.dict(sys.modules, {"pronotepy": fake_pronotepy, "flask_cors": fake_flask_cors}):
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": adapter_name}, clear=False):
            if "pronote_api" in sys.modules:
                del sys.modules["pronote_api"]
            module = importlib.import_module("pronote_api")
            return importlib.reload(module)


class DummyAdapter:
    def __init__(self, *, login_result=True, logged_in=False, lessons=None, periods=None):
        self._login_result = login_result
        self._logged_in = logged_in
        self._lessons = lessons or []
        self._periods = periods or []
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
        return []

    def get_periods(self):
        return list(self._periods)

    def get_discussions(self):
        return []

    def get_informations(self):
        return []


class BackendFactoryContractTests(unittest.TestCase):
    def test_build_backend_adapter_defaults_to_sync(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {}, clear=True):
            adapter = api.build_backend_adapter()
        self.assertIsInstance(adapter, api.PronotepySyncAdapter)

    def test_build_backend_adapter_supports_refonte(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": "pronotepy-refonte"}, clear=False):
            adapter = api.build_backend_adapter()
        self.assertIsInstance(adapter, api.PronotepyRefonteAdapter)

    def test_build_backend_adapter_rejects_unknown_value(self):
        api = _import_pronote_api("pronotepy-sync")
        with mock.patch.dict(os.environ, {"PRONOTE_BACKEND_ADAPTER": "unknown-adapter"}, clear=False):
            with self.assertRaises(RuntimeError):
                api.build_backend_adapter()


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

    def test_get_selected_period_prefers_id_then_fallback(self):
        period_a = types.SimpleNamespace(id="p1", name="Trimestre 1", start=None, end=None)
        period_b = types.SimpleNamespace(id="p2", name="Trimestre 2", start=None, end=None)
        self.api._adapter = DummyAdapter(logged_in=True, periods=[period_a, period_b])

        picked = self.api.get_selected_period("p2")
        self.assertEqual(picked.id, "p2")

        fallback = self.api.get_selected_period("missing")
        self.assertEqual(fallback.id, "p1")


if __name__ == "__main__":
    unittest.main()
