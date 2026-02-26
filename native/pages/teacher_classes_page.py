"""
TeacherClassesPage — Page "Mes classes" pour le profil Professeur.

Affiche :
  - La liste des classes du professeur (Gtk.ListBox à gauche)
  - La liste des élèves de la classe sélectionnée (Gtk.ListBox à droite)
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Pango

import threading
from app_state import AppState


class TeacherClassesPage(Gtk.Box):
    """Vue des classes et élèves pour le profil Professeur."""

    def __init__(self, app_state: AppState) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.app_state = app_state
        self.set_hexpand(True)
        self.set_vexpand(True)
        self.add_css_class("page-container")

        self._build_ui()

    def _build_ui(self) -> None:
        # ── En-tête ───────────────────────────────────────────────────────
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        header.set_margin_start(24)
        header.set_margin_end(24)
        header.set_margin_top(20)
        header.set_margin_bottom(16)

        title = Gtk.Label(label="📚  Mes classes")
        title.add_css_class("page-title")
        title.set_xalign(0)
        title.set_hexpand(True)

        self._spinner = Gtk.Spinner()
        self._spinner.set_visible(False)

        header.append(title)
        header.append(self._spinner)
        self.append(header)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

        # ── Corps : panneau gauche (classes) + panneau droit (élèves) ─────
        paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
        paned.set_vexpand(True)
        paned.set_hexpand(True)
        paned.set_position(280)

        # Panneau gauche — liste des classes
        left_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        left_box.set_size_request(240, -1)

        classes_header = Gtk.Label(label="Classes")
        classes_header.add_css_class("panel-header")
        classes_header.set_margin_start(12)
        classes_header.set_margin_top(8)
        classes_header.set_margin_bottom(8)
        classes_header.set_xalign(0)

        classes_scroll = Gtk.ScrolledWindow()
        classes_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        classes_scroll.set_vexpand(True)

        self._classes_listbox = Gtk.ListBox()
        self._classes_listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self._classes_listbox.add_css_class("content-listbox")
        self._classes_listbox.connect("row-selected", self._on_class_selected)

        classes_scroll.set_child(self._classes_listbox)
        left_box.append(classes_header)
        left_box.append(classes_scroll)

        # Panneau droit — liste des élèves
        right_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)

        self._students_header = Gtk.Label(label="Sélectionnez une classe")
        self._students_header.add_css_class("panel-header")
        self._students_header.set_margin_start(12)
        self._students_header.set_margin_top(8)
        self._students_header.set_margin_bottom(8)
        self._students_header.set_xalign(0)

        students_scroll = Gtk.ScrolledWindow()
        students_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        students_scroll.set_vexpand(True)
        students_scroll.set_hexpand(True)

        self._students_listbox = Gtk.ListBox()
        self._students_listbox.set_selection_mode(Gtk.SelectionMode.NONE)
        self._students_listbox.add_css_class("content-listbox")

        students_scroll.set_child(self._students_listbox)
        right_box.append(self._students_header)
        right_box.append(students_scroll)

        paned.set_start_child(left_box)
        paned.set_end_child(right_box)
        self.append(paned)

        # Message d'état vide
        self._empty_label = Gtk.Label(label="Chargement des classes...")
        self._empty_label.add_css_class("empty-state")
        self._empty_label.set_visible(False)

        # Charger les données
        self.load_data()

    def load_data(self) -> None:
        """Charge les classes du professeur dans un thread."""
        self._spinner.set_visible(True)
        self._spinner.start()
        thread = threading.Thread(target=self._fetch_classes, daemon=True)
        thread.start()

    def _fetch_classes(self) -> None:
        """Récupère les classes depuis pronotepy dans un thread secondaire."""
        try:
            client = self.app_state.client
            classes = getattr(client, "classes", []) or []
            GLib.idle_add(self._populate_classes, classes)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))

    def _populate_classes(self, classes: list) -> None:
        """Remplit la ListBox des classes dans le thread principal."""
        self._spinner.stop()
        self._spinner.set_visible(False)

        # Vider la liste
        while self._classes_listbox.get_row_at_index(0):
            self._classes_listbox.remove(self._classes_listbox.get_row_at_index(0))

        if not classes:
            self._empty_label.set_label("Aucune classe disponible.")
            self._empty_label.set_visible(True)
            return

        for cls in classes:
            row = Gtk.ListBoxRow()
            row._class_obj = cls
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            box.set_margin_start(12)
            box.set_margin_end(12)
            box.set_margin_top(8)
            box.set_margin_bottom(8)

            icon = Gtk.Image.new_from_icon_name("system-users-symbolic")
            icon.set_pixel_size(16)

            name = getattr(cls, "name", str(cls))
            label = Gtk.Label(label=name)
            label.set_xalign(0)
            label.set_hexpand(True)
            label.set_ellipsize(Pango.EllipsizeMode.END)

            box.append(icon)
            box.append(label)
            row.set_child(box)
            self._classes_listbox.append(row)

    def _on_class_selected(self, listbox: Gtk.ListBox, row) -> None:
        """Charge les élèves de la classe sélectionnée."""
        if row is None:
            return
        cls_obj = getattr(row, "_class_obj", None)
        if cls_obj is None:
            return

        cls_name = getattr(cls_obj, "name", str(cls_obj))
        self._students_header.set_label(f"Élèves — {cls_name}")

        # Vider la liste des élèves
        while self._students_listbox.get_row_at_index(0):
            self._students_listbox.remove(self._students_listbox.get_row_at_index(0))

        self._spinner.set_visible(True)
        self._spinner.start()
        thread = threading.Thread(
            target=self._fetch_students,
            args=(cls_obj,),
            daemon=True,
        )
        thread.start()

    def _fetch_students(self, cls_obj) -> None:
        """Récupère les élèves d'une classe dans un thread secondaire."""
        try:
            client = self.app_state.client
            students = client.students(cls_obj) if hasattr(client, "students") else []
            GLib.idle_add(self._populate_students, students)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))

    def _populate_students(self, students: list) -> None:
        """Remplit la ListBox des élèves dans le thread principal."""
        self._spinner.stop()
        self._spinner.set_visible(False)

        if not students:
            row = Gtk.ListBoxRow()
            label = Gtk.Label(label="Aucun élève trouvé.")
            label.set_margin_start(12)
            label.set_margin_top(8)
            label.set_margin_bottom(8)
            label.set_xalign(0)
            row.set_child(label)
            self._students_listbox.append(row)
            return

        for student in students:
            row = Gtk.ListBoxRow()
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            box.set_margin_start(12)
            box.set_margin_end(12)
            box.set_margin_top(8)
            box.set_margin_bottom(8)

            avatar = Gtk.Label(label="🎓")
            avatar.add_css_class("student-avatar")

            name = getattr(student, "name", str(student))
            name_label = Gtk.Label(label=name)
            name_label.set_xalign(0)
            name_label.set_hexpand(True)
            name_label.add_css_class("student-name")

            box.append(avatar)
            box.append(name_label)
            row.set_child(box)
            self._students_listbox.append(row)

    def _show_error(self, message: str) -> None:
        self._spinner.stop()
        self._spinner.set_visible(False)
        self._empty_label.set_label(f"Erreur : {message}")
        self._empty_label.set_visible(True)
