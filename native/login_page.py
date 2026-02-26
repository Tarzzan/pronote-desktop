"""
LoginPage — Page de connexion GTK4 multi-profils.

Fonctionnalités :
  - Détection automatique du profil (Élève, Parent, Professeur)
    via l'URL de connexion (eleve.html / parent.html / professeur.html)
  - Sélecteur d'enfant pour le profil Parent (Gtk.ComboBoxText)
  - Reconnexion automatique par token (credentials.json)
  - Signal GObject 'login-successful' émis après connexion réussie
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, GObject, GLib

import threading
import json
from pathlib import Path
import pronotepy

from app_state import AppState

CREDENTIALS_FILE = Path.home() / ".config" / "pronote-desktop" / "credentials.json"

# Correspondance entre le suffixe de l'URL et le client pronotepy
PROFILE_URL_MAP = {
    "eleve.html":      ("student",  pronotepy.Client),
    "parent.html":     ("parent",   pronotepy.ParentClient),
    "professeur.html": ("teacher",  pronotepy.TeacherClient),
}


def _detect_profile_from_url(url: str):
    """
    Détecte le type de profil et la classe client à partir de l'URL.
    Retourne (profile_name: str, client_class: type).
    Par défaut, retourne ("student", pronotepy.Client).
    """
    url_lower = url.lower()
    for suffix, (profile, cls) in PROFILE_URL_MAP.items():
        if url_lower.endswith(suffix) or suffix in url_lower:
            return profile, cls
    return "student", pronotepy.Client


class LoginPage(Gtk.Box):
    """
    Page de connexion multi-profils.

    Signaux :
        login-successful : émis après connexion et configuration du profil.
    """

    __gsignals__ = {
        "login-successful": (GObject.SignalFlags.RUN_FIRST, None, ()),
    }

    def __init__(self, app_state: AppState) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.app_state = app_state
        self._pending_client = None     # client temporaire avant sélection d'enfant
        self.set_halign(Gtk.Align.FILL)
        self.set_valign(Gtk.Align.FILL)
        self.set_hexpand(True)
        self.set_vexpand(True)
        self.add_css_class("login-page")

        self._build_ui()

        # Tentative de reconnexion automatique par token
        if CREDENTIALS_FILE.exists():
            GLib.idle_add(self._try_token_login)

    # ── Construction de l'UI ──────────────────────────────────────────────

    def _build_ui(self) -> None:
        """Construit le formulaire de connexion centré."""
        spacer_top = Gtk.Box()
        spacer_top.set_vexpand(True)
        spacer_bottom = Gtk.Box()
        spacer_bottom.set_vexpand(True)

        # Carte centrale
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=20)
        card.set_halign(Gtk.Align.CENTER)
        card.set_valign(Gtk.Align.CENTER)
        card.set_size_request(420, -1)
        card.add_css_class("login-card")
        card.set_margin_start(24)
        card.set_margin_end(24)
        card.set_margin_top(24)
        card.set_margin_bottom(24)

        # En-tête
        logo = Gtk.Label(label="P")
        logo.add_css_class("login-logo")
        logo.set_halign(Gtk.Align.CENTER)

        title = Gtk.Label(label="PRONOTE Desktop")
        title.add_css_class("login-title")
        title.set_halign(Gtk.Align.CENTER)

        subtitle = Gtk.Label(label="Connectez-vous à votre espace")
        subtitle.add_css_class("login-subtitle")
        subtitle.set_halign(Gtk.Align.CENTER)

        # ── Formulaire principal ──────────────────────────────────────────
        self._form_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self._build_form_fields(self._form_box)

        # ── Sélecteur d'enfant (Parent) — masqué par défaut ──────────────
        self._child_selector_box = self._build_child_selector()
        self._child_selector_box.set_visible(False)

        card.append(logo)
        card.append(title)
        card.append(subtitle)
        card.append(self._form_box)
        card.append(self._child_selector_box)

        self.append(spacer_top)
        self.append(card)
        self.append(spacer_bottom)

    def _build_form_fields(self, parent: Gtk.Box) -> None:
        """Ajoute les champs URL, identifiant, mot de passe et bouton."""
        # URL de l'établissement
        url_label = Gtk.Label(label="URL de l'établissement")
        url_label.set_xalign(0)
        url_label.add_css_class("form-label")
        self._url_entry = Gtk.Entry()
        self._url_entry.set_placeholder_text(
            "https://0000000a.index-education.net/pronote/eleve.html"
        )
        self._url_entry.add_css_class("form-entry")

        # Astuce profil
        hint = Gtk.Label(
            label="💡 L'URL se termine par eleve.html, parent.html ou professeur.html"
        )
        hint.add_css_class("login-hint")
        hint.set_wrap(True)
        hint.set_xalign(0)

        # Identifiant
        user_label = Gtk.Label(label="Identifiant")
        user_label.set_xalign(0)
        user_label.add_css_class("form-label")
        self._user_entry = Gtk.Entry()
        self._user_entry.set_placeholder_text("prenom.nom")
        self._user_entry.add_css_class("form-entry")

        # Mot de passe
        pass_label = Gtk.Label(label="Mot de passe")
        pass_label.set_xalign(0)
        pass_label.add_css_class("form-label")
        self._pass_entry = Gtk.PasswordEntry()
        self._pass_entry.set_show_peek_icon(True)
        self._pass_entry.add_css_class("form-entry")
        # Connexion via Entrée
        self._pass_entry.connect("activate", self._on_login_clicked)

        # Badge de profil détecté (mis à jour dynamiquement)
        self._profile_badge = Gtk.Label(label="")
        self._profile_badge.add_css_class("profile-badge")
        self._profile_badge.set_visible(False)
        self._url_entry.connect("changed", self._on_url_changed)

        # Message d'erreur
        self._error_label = Gtk.Label(label="")
        self._error_label.add_css_class("login-error")
        self._error_label.set_visible(False)
        self._error_label.set_wrap(True)

        # Bouton de connexion
        self._login_btn = Gtk.Button(label="Se connecter")
        self._login_btn.add_css_class("suggested-action")
        self._login_btn.add_css_class("login-btn")
        self._login_btn.connect("clicked", self._on_login_clicked)

        # Spinner
        self._spinner = Gtk.Spinner()
        self._spinner.set_visible(False)
        self._spinner.set_halign(Gtk.Align.CENTER)

        parent.append(url_label)
        parent.append(self._url_entry)
        parent.append(hint)
        parent.append(self._profile_badge)
        parent.append(user_label)
        parent.append(self._user_entry)
        parent.append(pass_label)
        parent.append(self._pass_entry)
        parent.append(self._error_label)
        parent.append(self._login_btn)
        parent.append(self._spinner)

    def _build_child_selector(self) -> Gtk.Box:
        """Construit le sélecteur d'enfant pour le profil Parent."""
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.add_css_class("child-selector-box")

        separator = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)

        title = Gtk.Label(label="👨‍👩‍👧  Sélectionnez un enfant")
        title.add_css_class("child-selector-title")
        title.set_halign(Gtk.Align.CENTER)

        subtitle = Gtk.Label(label="Votre compte Parent a accès à plusieurs enfants.")
        subtitle.add_css_class("login-subtitle")
        subtitle.set_wrap(True)
        subtitle.set_halign(Gtk.Align.CENTER)

        self._child_combo = Gtk.ComboBoxText()
        self._child_combo.add_css_class("child-combo")

        confirm_btn = Gtk.Button(label="Continuer →")
        confirm_btn.add_css_class("suggested-action")
        confirm_btn.connect("clicked", self._on_child_selected)

        box.append(separator)
        box.append(title)
        box.append(subtitle)
        box.append(self._child_combo)
        box.append(confirm_btn)
        return box

    # ── Callbacks UI ──────────────────────────────────────────────────────

    def _on_url_changed(self, entry: Gtk.Entry) -> None:
        """Met à jour le badge de profil détecté en temps réel."""
        url = entry.get_text().strip()
        if not url:
            self._profile_badge.set_visible(False)
            return
        profile, _ = _detect_profile_from_url(url)
        labels = {
            "student": "🎓  Profil détecté : Élève",
            "parent":  "👨‍👩‍👧  Profil détecté : Parent",
            "teacher": "📚  Profil détecté : Professeur",
        }
        self._profile_badge.set_label(labels.get(profile, ""))
        self._profile_badge.set_visible(True)

    def _on_login_clicked(self, _widget) -> None:
        """Lance la connexion dans un thread pour ne pas bloquer l'UI."""
        url = self._url_entry.get_text().strip()
        username = self._user_entry.get_text().strip()
        password = self._pass_entry.get_text()

        if not url or not username or not password:
            self._show_error("Veuillez remplir tous les champs.")
            return

        self._set_loading(True)
        thread = threading.Thread(
            target=self._do_login,
            args=(url, username, password),
            daemon=True,
        )
        thread.start()

    def _on_child_selected(self, _btn) -> None:
        """Valide la sélection de l'enfant et finalise la connexion."""
        idx = self._child_combo.get_active()
        if idx < 0 or not self.app_state.children:
            self._show_error("Veuillez sélectionner un enfant.")
            return

        selected_child = self.app_state.children[idx]
        self.app_state.switch_child(selected_child)
        GLib.idle_add(self._finalize_login)

    # ── Logique de connexion ──────────────────────────────────────────────

    def _do_login(self, url: str, username: str, password: str) -> None:
        """Effectue la connexion pronotepy dans un thread secondaire."""
        try:
            profile, client_class = _detect_profile_from_url(url)

            # Instanciation du bon client selon le profil détecté
            client = client_class(
                pronote_url=url,
                username=username,
                password=password,
            )

            if not client.logged_in:
                GLib.idle_add(
                    self._show_error,
                    "Connexion échouée. Vérifiez vos identifiants."
                )
                GLib.idle_add(self._set_loading, False)
                return

            # Enregistrer le client dans l'état global
            self.app_state.set_client(client)
            self._save_credentials(client)

            # Si profil Parent avec plusieurs enfants → afficher le sélecteur
            if profile == "parent" and len(self.app_state.children) > 1:
                GLib.idle_add(self._show_child_selector)
            else:
                GLib.idle_add(self._finalize_login)

        except pronotepy.exceptions.PronoteAPIError as e:
            GLib.idle_add(self._show_error, f"Erreur Pronote : {e}")
            GLib.idle_add(self._set_loading, False)
        except Exception as e:
            GLib.idle_add(self._show_error, f"Erreur de connexion : {e}")
            GLib.idle_add(self._set_loading, False)

    def _show_child_selector(self) -> None:
        """Affiche le sélecteur d'enfant pour le profil Parent."""
        self._set_loading(False)
        # Remplir le ComboBox avec les noms des enfants
        self._child_combo.remove_all()
        for child in self.app_state.children:
            name = getattr(child, "name", str(child))
            self._child_combo.append_text(name)
        self._child_combo.set_active(0)
        # Masquer le formulaire, afficher le sélecteur
        self._form_box.set_visible(False)
        self._child_selector_box.set_visible(True)

    def _finalize_login(self) -> None:
        """Finalise la connexion et émet le signal login-successful."""
        self._set_loading(False)
        self._form_box.set_visible(True)
        self._child_selector_box.set_visible(False)
        self.emit("login-successful")

    # ── Reconnexion par token ─────────────────────────────────────────────

    def _try_token_login(self) -> bool:
        """Tente une reconnexion automatique via le token sauvegardé."""
        try:
            credentials = json.loads(CREDENTIALS_FILE.read_text())
            self._set_loading(True)
            thread = threading.Thread(
                target=self._do_token_login,
                args=(credentials,),
                daemon=True,
            )
            thread.start()
        except Exception:
            pass
        return False

    def _do_token_login(self, credentials: dict) -> None:
        """Reconnexion par token dans un thread secondaire."""
        try:
            # Détecter le profil depuis l'URL sauvegardée
            url = credentials.get("pronote_url", "")
            profile, client_class = _detect_profile_from_url(url)

            client = client_class.token_login(**credentials)
            if client.logged_in:
                self.app_state.set_client(client)
                self._save_credentials(client)
                if profile == "parent" and len(self.app_state.children) > 1:
                    GLib.idle_add(self._show_child_selector)
                else:
                    GLib.idle_add(self._finalize_login)
            else:
                GLib.idle_add(self._set_loading, False)
        except Exception:
            GLib.idle_add(self._set_loading, False)

    def _save_credentials(self, client) -> None:
        """Sauvegarde les credentials pour la reconnexion automatique."""
        try:
            CREDENTIALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            creds = client.export_credentials()
            CREDENTIALS_FILE.write_text(json.dumps(creds))
        except Exception:
            pass

    # ── Helpers UI ────────────────────────────────────────────────────────

    def _set_loading(self, loading: bool) -> None:
        self._login_btn.set_sensitive(not loading)
        self._spinner.set_visible(loading)
        if loading:
            self._spinner.start()
            self._error_label.set_visible(False)
        else:
            self._spinner.stop()

    def _show_error(self, message: str) -> None:
        self._error_label.set_label(message)
        self._error_label.set_visible(True)
