"""
Pronote Desktop — Application native GTK4
Point d'entrée principal de l'application.

Architecture :
  - LoginPage       : page de connexion avec détection automatique du profil
  - ContentArea     : zone de contenu avec Lazy Loading des pages
  - Sidebar         : navigation adaptée au profil connecté
  - AppState        : état global partagé (singleton)
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, GLib

from sidebar import Sidebar
from content_area import ContentArea
from login_page import LoginPage
from app_state import AppState


APP_VERSION = "2.0.0-native"
APP_ID = "fr.pronote.desktop.native"


class PronoteWindow(Adw.ApplicationWindow):
    """Fenêtre principale de l'application Pronote Desktop."""

    def __init__(self, app: Adw.Application) -> None:
        super().__init__(application=app)
        self.set_default_size(1280, 800)
        self.set_size_request(900, 600)
        self.set_title(f"PRONOTE Desktop v{APP_VERSION}")

        # ── État global ───────────────────────────────────────────────────
        self.app_state = AppState()
        # Écouter l'événement de déconnexion pour réinitialiser l'UI
        self.app_state.connect("logout-requested", self._on_logout_requested)

        # ── Stack principal (connexion ↔ application) ─────────────────────
        self._stack = Gtk.Stack()
        self._stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
        self._stack.set_transition_duration(200)

        # Page de connexion
        self._login_page = LoginPage(self.app_state)
        self._login_page.connect("login-successful", self._on_login_successful)
        self._stack.add_named(self._login_page, "login")

        # Vue principale (sidebar + contenu) — construite une seule fois
        # ContentArea reçoit app_state pour le Lazy Loading et le contrôle d'accès
        self._content_area = ContentArea(self.app_state)
        self._sidebar = Sidebar(self.app_state, self._content_area)

        main_view = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        main_view.append(self._sidebar)
        main_view.append(self._content_area)
        self._stack.add_named(main_view, "main")

        # Afficher la page de connexion au démarrage
        self._stack.set_visible_child_name("login")
        self.set_content(self._stack)

        # ── Chargement du CSS ─────────────────────────────────────────────
        self._load_css()

    def _load_css(self) -> None:
        """Charge la feuille de style CSS de l'application."""
        import os
        css_path = os.path.join(os.path.dirname(__file__), "style.css")
        if os.path.exists(css_path):
            css_provider = Gtk.CssProvider()
            css_provider.load_from_path(css_path)
            Gtk.StyleContext.add_provider_for_display(
                self.get_display(),
                css_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
            )

    def _on_login_successful(self, _widget) -> None:
        """
        Appelé quand la connexion réussit.
        1. Met à jour la sidebar (profil, navigation filtrée, sélecteur d'enfant).
        2. Bascule vers la vue principale.
        3. Navigue vers le tableau de bord (première page chargée paresseusement).
        """
        # Mettre à jour la sidebar avec les infos du profil connecté
        self._sidebar.refresh_after_login()

        # Basculer vers la vue principale
        self._stack.set_visible_child_name("main")

        # Naviguer vers le tableau de bord (déclenche le Lazy Loading)
        GLib.idle_add(self._content_area.show_page, "dashboard")

    def _on_logout_requested(self, _app_state) -> None:
        """
        Appelé lors de la déconnexion.
        1. Réinitialise toutes les pages instanciées (libère la mémoire).
        2. Retourne à la page de connexion.
        """
        # Détruire toutes les instances de pages pour libérer la mémoire
        self._content_area.reset_pages()

        # Retourner à la page de connexion
        self._stack.set_visible_child_name("login")

        # Réinitialiser le formulaire de connexion
        if hasattr(self._login_page, "reset_form"):
            self._login_page.reset_form()


class PronoteApp(Adw.Application):
    """Application GTK4/Libadwaita pour Pronote Desktop."""

    def __init__(self) -> None:
        super().__init__(application_id=APP_ID)
        self.connect("activate", self._on_activate)

    def _on_activate(self, app: Adw.Application) -> None:
        win = PronoteWindow(app)
        win.present()


def main() -> None:
    app = PronoteApp()
    app.run(None)


if __name__ == "__main__":
    main()
