"""
Sidebar — Barre latérale de navigation GTK4 multi-profils.

Les items de menu sont filtrés dynamiquement selon le profil connecté :
  - Élève   : tableau de bord, emploi du temps, devoirs, notes,
               messagerie, absences, informations, menus
  - Parent  : tableau de bord, emploi du temps, devoirs, notes,
               messagerie, absences, informations + sélecteur d'enfant
  - Professeur : tableau de bord, emploi du temps, classes,
                 notes de classe, messagerie, informations
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GObject, Pango

from app_state import AppState
from update_manager import check_for_updates


# ── Définition complète des items ────────────────────────────────────────────
# "profiles" liste les profils autorisés. Si None → visible pour tous.
ALL_MENU_ITEMS = [
    {
        "id": "dashboard",
        "label": "Tableau de bord",
        "icon": "view-grid-symbolic",
        "profiles": None,                           # Tous les profils
    },
    {
        "id": "timetable",
        "label": "Emploi du temps",
        "icon": "x-office-calendar-symbolic",
        "profiles": None,
    },
    {
        "id": "homework",
        "label": "Devoirs",
        "icon": "document-edit-symbolic",
        "profiles": ["student", "parent"],          # Pas pour les profs
    },
    {
        "id": "grades",
        "label": "Notes",
        "icon": "starred-symbolic",
        "profiles": ["student", "parent"],
    },
    {
        "id": "teacher_classes",
        "label": "Mes classes",
        "icon": "system-users-symbolic",
        "profiles": ["teacher"],                    # Professeur uniquement
    },
    {
        "id": "teacher_grades",
        "label": "Notes de classe",
        "icon": "accessories-text-editor-symbolic",
        "profiles": ["teacher"],
    },
    {
        "id": "messages",
        "label": "Messagerie",
        "icon": "mail-unread-symbolic",
        "profiles": None,
    },
    {
        "id": "absences",
        "label": "Absences",
        "icon": "dialog-warning-symbolic",
        "profiles": ["student", "parent"],
    },
    {
        "id": "information",
        "label": "Informations",
        "icon": "dialog-information-symbolic",
        "profiles": None,
    },
    {
        "id": "menus",
        "label": "Menus de cantine",
        "icon": "emblem-favorite-symbolic",
        "profiles": ["student", "parent"],
    },
]


class SidebarRow(Gtk.ListBoxRow):
    """Une ligne de la sidebar avec icône et label."""

    def __init__(self, item: dict) -> None:
        super().__init__()
        self.page_id = item["id"]

        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        box.set_margin_start(12)
        box.set_margin_end(12)
        box.set_margin_top(8)
        box.set_margin_bottom(8)

        icon = Gtk.Image.new_from_icon_name(item["icon"])
        icon.set_pixel_size(18)
        icon.add_css_class("sidebar-icon")

        label = Gtk.Label(label=item["label"])
        label.set_xalign(0)
        label.set_hexpand(True)
        label.set_ellipsize(Pango.EllipsizeMode.END)

        box.append(icon)
        box.append(label)
        self.set_child(box)


class Sidebar(Gtk.Box):
    """
    Barre latérale de navigation adaptée au profil connecté.

    Émet le signal 'page-changed' lorsque l'utilisateur change de page.
    """

    __gsignals__ = {
        "page-changed": (GObject.SignalFlags.RUN_FIRST, None, (str,)),
    }

    def __init__(self, app_state: AppState, content_area) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.app_state = app_state
        self.content_area = content_area

        self.set_size_request(240, -1)
        self.add_css_class("sidebar")

        self._build_header()
        self._build_user_profile()
        self._build_child_selector()   # Masqué par défaut, visible pour Parent
        self._build_nav_list()
        self._build_footer()

    # ── Construction ─────────────────────────────────────────────────────

    def _build_header(self) -> None:
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        header.set_margin_start(12)
        header.set_margin_end(12)
        header.set_margin_top(16)
        header.set_margin_bottom(16)

        logo_label = Gtk.Label(label="P")
        logo_label.add_css_class("sidebar-logo")

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        title = Gtk.Label(label="PRONOTE")
        title.add_css_class("sidebar-title")
        title.set_xalign(0)

        from main import APP_VERSION
        version = Gtk.Label(label=f"v{APP_VERSION}")
        version.add_css_class("sidebar-version")
        version.set_xalign(0)

        title_box.append(title)
        title_box.append(version)
        header.append(logo_label)
        header.append(title_box)

        self.append(header)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

    def _build_user_profile(self) -> None:
        """Zone de profil utilisateur avec badge de rôle."""
        self._profile_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self._profile_box.set_margin_start(12)
        self._profile_box.set_margin_end(12)
        self._profile_box.set_margin_top(12)
        self._profile_box.set_margin_bottom(4)

        self._avatar_label = Gtk.Label(label=self.app_state.profile_icon or "👤")
        self._avatar_label.add_css_class("sidebar-avatar")

        info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)

        self._name_label = Gtk.Label(label=self.app_state.user_name or "Utilisateur")
        self._name_label.set_xalign(0)
        self._name_label.add_css_class("sidebar-user-name")
        self._name_label.set_ellipsize(Pango.EllipsizeMode.END)

        self._estab_label = Gtk.Label(label=self.app_state.establishment or "")
        self._estab_label.set_xalign(0)
        self._estab_label.add_css_class("sidebar-user-estab")
        self._estab_label.set_ellipsize(Pango.EllipsizeMode.END)

        # Badge de profil (Élève / Parent / Professeur)
        self._role_badge = Gtk.Label(label=self.app_state.profile_label or "")
        self._role_badge.set_xalign(0)
        self._role_badge.add_css_class("sidebar-role-badge")
        self._role_badge.add_css_class(f"role-{self.app_state.profile or 'student'}")

        info_box.append(self._name_label)
        info_box.append(self._estab_label)
        info_box.append(self._role_badge)

        self._profile_box.append(self._avatar_label)
        self._profile_box.append(info_box)

        self.append(self._profile_box)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

    def _build_child_selector(self) -> None:
        """
        Sélecteur d'enfant pour le profil Parent.
        Masqué par défaut, affiché uniquement si profile == 'parent'.
        """
        self._child_selector_revealer = Gtk.Revealer()
        self._child_selector_revealer.set_transition_type(
            Gtk.RevealerTransitionType.SLIDE_DOWN
        )

        child_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        child_box.set_margin_start(12)
        child_box.set_margin_end(12)
        child_box.set_margin_top(8)
        child_box.set_margin_bottom(8)

        child_title = Gtk.Label(label="Enfant sélectionné")
        child_title.set_xalign(0)
        child_title.add_css_class("form-label")

        self._child_combo = Gtk.ComboBoxText()
        self._child_combo.add_css_class("child-combo")
        self._child_combo.connect("changed", self._on_child_changed)

        child_box.append(child_title)
        child_box.append(self._child_combo)

        self._child_selector_revealer.set_child(child_box)
        self.append(self._child_selector_revealer)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

    def _build_nav_list(self) -> None:
        """Construit la ListBox de navigation filtrée selon le profil."""
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scrolled.set_vexpand(True)

        self._listbox = Gtk.ListBox()
        self._listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self._listbox.add_css_class("sidebar-listbox")
        self._listbox.connect("row-selected", self._on_row_selected)

        self._populate_nav_list()

        scrolled.set_child(self._listbox)
        self.append(scrolled)

    def _populate_nav_list(self) -> None:
        """Remplit la ListBox avec les items filtrés pour le profil actuel."""
        # Vider la liste existante
        while True:
            row = self._listbox.get_row_at_index(0)
            if row is None:
                break
            self._listbox.remove(row)

        profile = self.app_state.profile or "student"
        visible_items = [
            item for item in ALL_MENU_ITEMS
            if item["profiles"] is None or profile in item["profiles"]
        ]

        for item in visible_items:
            row = SidebarRow(item)
            self._listbox.append(row)

        # Sélectionner le tableau de bord par défaut
        first_row = self._listbox.get_row_at_index(0)
        if first_row:
            self._listbox.select_row(first_row)

    def _build_footer(self) -> None:
        """Boutons en bas de la sidebar."""
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

        footer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        footer.set_margin_start(8)
        footer.set_margin_end(8)
        footer.set_margin_top(8)
        footer.set_margin_bottom(8)

        update_btn = Gtk.Button(label="🔄  Vérifier les mises à jour")
        update_btn.add_css_class("flat")
        update_btn.add_css_class("sidebar-footer-btn")
        update_btn.connect("clicked", self._on_check_updates)

        logout_btn = Gtk.Button(label="⏻  Se déconnecter")
        logout_btn.add_css_class("flat")
        logout_btn.add_css_class("sidebar-footer-btn")
        logout_btn.add_css_class("destructive-action")
        logout_btn.connect("clicked", self._on_logout)

        footer.append(update_btn)
        footer.append(logout_btn)
        self.append(footer)

    # ── Callbacks ────────────────────────────────────────────────────────

    def _on_row_selected(self, listbox: Gtk.ListBox, row) -> None:
        if row is not None:
            self.content_area.show_page(row.page_id)
            self.emit("page-changed", row.page_id)

    def _on_child_changed(self, combo: Gtk.ComboBoxText) -> None:
        """Change l'enfant actif et rafraîchit toutes les vues."""
        idx = combo.get_active()
        if idx >= 0 and self.app_state.children:
            child = self.app_state.children[idx]
            self.app_state.switch_child(child)
            # Rafraîchir le nom affiché
            self._name_label.set_label(self.app_state.user_name)
            # Demander au ContentArea de recharger la page courante
            self.content_area.refresh_current_page()

    def _on_check_updates(self, _btn) -> None:
        check_for_updates(parent_window=self.get_root())

    def _on_logout(self, _btn) -> None:
        self.app_state.logout()
        root = self.get_root()
        if hasattr(root, '_stack'):
            root._stack.set_visible_child_name("login")

    # ── Méthodes publiques ────────────────────────────────────────────────

    def refresh_after_login(self) -> None:
        """
        Appelé par main.py après une connexion réussie.
        Met à jour le profil, les labels et reconstruit la navigation.
        """
        # Mettre à jour les labels du profil
        self._avatar_label.set_label(self.app_state.profile_icon)
        self._name_label.set_label(self.app_state.user_name)
        self._estab_label.set_label(self.app_state.establishment)
        self._role_badge.set_label(self.app_state.profile_label)

        # Mettre à jour la classe CSS du badge de rôle
        for css_class in ["role-student", "role-parent", "role-teacher"]:
            self._role_badge.remove_css_class(css_class)
        self._role_badge.add_css_class(f"role-{self.app_state.profile}")

        # Afficher le sélecteur d'enfant si profil Parent
        if self.app_state.is_parent and self.app_state.children:
            self._child_combo.remove_all()
            for child in self.app_state.children:
                name = getattr(child, "name", str(child))
                self._child_combo.append_text(name)
            self._child_combo.set_active(0)
            self._child_selector_revealer.set_reveal_child(True)
        else:
            self._child_selector_revealer.set_reveal_child(False)

        # Reconstruire la liste de navigation selon le nouveau profil
        self._populate_nav_list()
