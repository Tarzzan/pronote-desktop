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
    def __init__(
        self,
        *,
        login_result=True,
        logged_in=False,
        lessons=None,
        periods=None,
        discussions=None,
        informations=None,
    ):
        self._login_result = login_result
        self._logged_in = logged_in
        self._lessons = lessons or []
        self._periods = periods or []
        self._discussions = discussions or []
        self._informations = informations or []
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
        return list(self._discussions)

    def get_informations(self):
        return list(self._informations)


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
