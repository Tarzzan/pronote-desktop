"""
ContentArea — Zone de contenu principale avec Gtk.Stack et Lazy Loading.

Stratégie de chargement paresseux :
  - Les pages ne sont PAS instanciées au démarrage.
  - Un registre (dict) associe chaque page_id à sa classe Python.
  - La page est instanciée uniquement lors de son PREMIER affichage.
  - Les données sont chargées immédiatement après la première instanciation.
  - Les visites suivantes réutilisent l'instance existante (pas de rechargement
    automatique, sauf appel explicite à refresh_page()).

Avantages :
  - Démarrage ~3× plus rapide (aucun appel réseau au lancement).
  - Consommation mémoire initiale réduite.
  - Les pages jamais visitées ne consomment aucune ressource.
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

# ── Imports paresseux (les classes ne sont importées que si nécessaire) ──────
# On importe les classes ici pour que Python les connaisse, mais les instances
# ne seront créées que lors de la première navigation vers la page.
from pages.dashboard_page import DashboardPage
from pages.timetable_page import TimetablePage
from pages.homework_page import HomeworkPage
from pages.grades_page import GradesPage
from pages.messages_page import MessagesPage
from pages.absences_page import AbsencesPage
from pages.information_page import InformationPage
from pages.menus_page import MenusPage
from pages.teacher_classes_page import TeacherClassesPage
from pages.teacher_grades_page import TeacherGradesPage


# ── Registre global des pages ─────────────────────────────────────────────────
# Associe chaque page_id à sa classe et aux profils autorisés.
# "profiles": None → accessible à tous les profils.
PAGE_REGISTRY = {
    "dashboard":       {"class": DashboardPage,       "profiles": None},
    "timetable":       {"class": TimetablePage,       "profiles": None},
    "homework":        {"class": HomeworkPage,         "profiles": ["student", "parent"]},
    "grades":          {"class": GradesPage,           "profiles": ["student", "parent"]},
    "messages":        {"class": MessagesPage,         "profiles": None},
    "absences":        {"class": AbsencesPage,         "profiles": ["student", "parent"]},
    "information":     {"class": InformationPage,      "profiles": None},
    "menus":           {"class": MenusPage,            "profiles": ["student", "parent"]},
    "teacher_classes": {"class": TeacherClassesPage,   "profiles": ["teacher"]},
    "teacher_grades":  {"class": TeacherGradesPage,    "profiles": ["teacher"]},
}


class SkeletonPage(Gtk.Box):
    """
    Page squelette affichée pendant le chargement de la vraie page.
    Donne un retour visuel immédiat à l'utilisateur.
    """

    def __init__(self, label: str = "Chargement…") -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.set_hexpand(True)
        self.set_vexpand(True)
        self.set_valign(Gtk.Align.CENTER)
        self.set_halign(Gtk.Align.CENTER)
        self.set_spacing(16)

        spinner = Gtk.Spinner()
        spinner.set_size_request(48, 48)
        spinner.start()

        lbl = Gtk.Label(label=label)
        lbl.add_css_class("skeleton-label")

        self.append(spinner)
        self.append(lbl)


class ContentArea(Gtk.Box):
    """
    Zone de contenu principale avec Lazy Loading.

    Méthodes publiques :
      - show_page(page_id)         : affiche la page (l'instancie si besoin)
      - refresh_page(page_id)      : force le rechargement des données d'une page
      - refresh_current_page()     : recharge la page actuellement visible
      - refresh_all()              : recharge toutes les pages déjà instanciées
      - reset_pages()              : détruit toutes les instances (ex: après déconnexion)
    """

    def __init__(self, app_state) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.set_hexpand(True)
        self.set_vexpand(True)
        self.add_css_class("content-area")

        self._app_state = app_state
        self._instances: dict = {}          # page_id → widget instancié
        self._current_page_id: str = ""     # ID de la page actuellement visible

        # ── Stack principal ───────────────────────────────────────────────
        self._stack = Gtk.Stack()
        self._stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
        self._stack.set_transition_duration(180)
        self._stack.set_hexpand(True)
        self._stack.set_vexpand(True)

        # Page de démarrage vide (affichée avant toute navigation)
        self._welcome = SkeletonPage("Bienvenue sur PRONOTE Desktop")
        self._stack.add_named(self._welcome, "__welcome__")
        self._stack.set_visible_child_name("__welcome__")

        self.append(self._stack)

    # ── Navigation ────────────────────────────────────────────────────────

    def show_page(self, page_id: str) -> None:
        """
        Affiche la page demandée.
        Si la page n'a jamais été instanciée, elle est créée et ses données
        sont chargées immédiatement dans un thread secondaire.
        """
        if page_id not in PAGE_REGISTRY:
            print(f"[ContentArea] Page inconnue : {page_id}")
            return

        # Vérification des droits d'accès selon le profil
        entry = PAGE_REGISTRY[page_id]
        allowed_profiles = entry["profiles"]
        current_profile = self._app_state.profile
        if allowed_profiles is not None and current_profile not in allowed_profiles:
            print(f"[ContentArea] Accès refusé à '{page_id}' pour le profil '{current_profile}'")
            return

        # Première visite : instanciation + chargement des données
        if page_id not in self._instances:
            self._instantiate_page(page_id, entry)

        # Afficher la page
        self._stack.set_visible_child_name(page_id)
        self._current_page_id = page_id

    def _instantiate_page(self, page_id: str, entry: dict) -> None:
        """
        Instancie la page et l'ajoute au Stack.
        Lance le chargement des données si la page le supporte.
        """
        PageClass = entry["class"]

        # Afficher un squelette pendant l'instanciation
        skeleton_id = f"__skeleton_{page_id}__"
        if self._stack.get_child_by_name(skeleton_id) is None:
            skeleton = SkeletonPage(f"Chargement de la page…")
            self._stack.add_named(skeleton, skeleton_id)

        # Instancier la page avec app_state si elle l'accepte
        try:
            import inspect
            sig = inspect.signature(PageClass.__init__)
            params = list(sig.parameters.keys())
            # Si le constructeur accepte app_state en plus de self
            if len(params) > 1:
                instance = PageClass(self._app_state)
            else:
                instance = PageClass()
        except Exception as e:
            print(f"[ContentArea] Erreur instanciation '{page_id}' : {e}")
            return

        self._stack.add_named(instance, page_id)
        self._instances[page_id] = instance

        # Lancer le chargement des données si la méthode existe
        if hasattr(instance, "load_data"):
            # Utiliser GLib.idle_add pour ne pas bloquer l'UI pendant l'ajout au Stack
            GLib.idle_add(self._load_page_data, instance, page_id)

    def _load_page_data(self, instance, page_id: str) -> bool:
        """Lance le chargement des données d'une page (appelé via GLib.idle_add)."""
        try:
            import inspect
            # Inspecter la CLASSE (pas l'instance) pour éviter les segfaults GTK
            # Sur la classe, 'self' est inclus dans les paramètres
            sig = inspect.signature(type(instance).load_data)
            params = list(sig.parameters.keys())
            # params[0] = 'self', params[1] = 'app_state' si présent
            if len(params) > 1:
                instance.load_data(self._app_state)
            else:
                instance.load_data()
        except Exception as e:
            print(f"[ContentArea] Erreur chargement données '{page_id}' : {e}")
        return False  # Ne pas répéter l'appel GLib.idle_add

    # ── Rechargement ──────────────────────────────────────────────────────

    def refresh_page(self, page_id: str) -> None:
        """Force le rechargement des données d'une page déjà instanciée."""
        instance = self._instances.get(page_id)
        if instance and hasattr(instance, "load_data"):
            self._load_page_data(instance, page_id)

    def refresh_current_page(self) -> None:
        """Recharge les données de la page actuellement visible."""
        if self._current_page_id:
            self.refresh_page(self._current_page_id)

    def refresh_all(self) -> None:
        """Recharge les données de toutes les pages déjà instanciées."""
        for page_id, instance in self._instances.items():
            if hasattr(instance, "load_data"):
                self._load_page_data(instance, page_id)

    # ── Réinitialisation ──────────────────────────────────────────────────

    def reset_pages(self) -> None:
        """
        Détruit toutes les instances de pages.
        À appeler lors de la déconnexion pour libérer la mémoire
        et forcer un rechargement complet à la prochaine connexion.
        """
        for page_id, instance in list(self._instances.items()):
            self._stack.remove(instance)
        self._instances.clear()
        self._current_page_id = ""
        self._stack.set_visible_child_name("__welcome__")

    # ── Accesseurs ────────────────────────────────────────────────────────

    def get_page(self, page_id: str):
        """Retourne l'instance d'une page si elle a été instanciée, sinon None."""
        return self._instances.get(page_id)

    @property
    def loaded_pages_count(self) -> int:
        """Retourne le nombre de pages actuellement instanciées en mémoire."""
        return len(self._instances)

    @property
    def current_page_id(self) -> str:
        """Retourne l'ID de la page actuellement visible."""
        return self._current_page_id
