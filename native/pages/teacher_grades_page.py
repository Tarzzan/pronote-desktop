"""
TeacherGradesPage — Page "Notes de classe" pour le profil Professeur.

Affiche :
  - Un sélecteur de classe et de période
  - Le relevé de notes de la classe sous forme de tableau GTK
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Pango

import threading
from app_state import AppState


class TeacherGradesPage(Gtk.Box):
    """Vue du relevé de notes de classe pour le profil Professeur."""

    def __init__(self, app_state: AppState) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.app_state = app_state
        self._selected_class = None
        self._selected_period = None
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

        title = Gtk.Label(label="📝  Notes de classe")
        title.add_css_class("page-title")
        title.set_xalign(0)
        title.set_hexpand(True)

        self._spinner = Gtk.Spinner()
        self._spinner.set_visible(False)

        header.append(title)
        header.append(self._spinner)
        self.append(header)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

        # ── Barre de filtres ──────────────────────────────────────────────
        filters_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        filters_box.set_margin_start(24)
        filters_box.set_margin_end(24)
        filters_box.set_margin_top(12)
        filters_box.set_margin_bottom(12)
        filters_box.add_css_class("filters-bar")

        # Sélecteur de classe
        class_label = Gtk.Label(label="Classe :")
        class_label.add_css_class("filter-label")

        self._class_combo = Gtk.ComboBoxText()
        self._class_combo.add_css_class("filter-combo")
        self._populate_class_combo()
        self._class_combo.connect("changed", self._on_filter_changed)

        # Sélecteur de période
        period_label = Gtk.Label(label="Période :")
        period_label.add_css_class("filter-label")

        self._period_combo = Gtk.ComboBoxText()
        self._period_combo.add_css_class("filter-combo")
        self._period_combo.connect("changed", self._on_filter_changed)

        # Bouton charger
        load_btn = Gtk.Button(label="Charger les notes")
        load_btn.add_css_class("suggested-action")
        load_btn.connect("clicked", self._on_load_clicked)

        filters_box.append(class_label)
        filters_box.append(self._class_combo)
        filters_box.append(period_label)
        filters_box.append(self._period_combo)
        filters_box.append(load_btn)
        self.append(filters_box)
        self.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

        # ── Zone de contenu (tableau des notes) ───────────────────────────
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.set_vexpand(True)
        scroll.set_hexpand(True)
        scroll.set_margin_start(24)
        scroll.set_margin_end(24)
        scroll.set_margin_top(12)
        scroll.set_margin_bottom(12)

        self._grades_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)

        self._empty_label = Gtk.Label(
            label="Sélectionnez une classe et une période, puis cliquez sur 'Charger les notes'."
        )
        self._empty_label.add_css_class("empty-state")
        self._empty_label.set_wrap(True)
        self._empty_label.set_justify(Gtk.Justification.CENTER)
        self._grades_box.append(self._empty_label)

        scroll.set_child(self._grades_box)
        self.append(scroll)

    def _populate_class_combo(self) -> None:
        """Remplit le ComboBox des classes depuis l'état global."""
        self._class_combo.remove_all()
        classes = self.app_state.classes or []
        for cls in classes:
            name = getattr(cls, "name", str(cls))
            self._class_combo.append_text(name)
        if classes:
            self._class_combo.set_active(0)
            self._selected_class = classes[0]

    def _on_filter_changed(self, combo: Gtk.ComboBoxText) -> None:
        """Met à jour les sélections internes lors du changement de filtre."""
        class_idx = self._class_combo.get_active()
        classes = self.app_state.classes or []
        if 0 <= class_idx < len(classes):
            self._selected_class = classes[class_idx]
            # Charger les périodes pour cette classe
            self._load_periods_for_class(self._selected_class)

    def _load_periods_for_class(self, cls_obj) -> None:
        """Charge les périodes disponibles pour la classe sélectionnée."""
        thread = threading.Thread(
            target=self._fetch_periods,
            args=(cls_obj,),
            daemon=True,
        )
        thread.start()

    def _fetch_periods(self, cls_obj) -> None:
        """Récupère les périodes dans un thread secondaire."""
        try:
            client = self.app_state.client
            periods = client.periods if hasattr(client, "periods") else []
            GLib.idle_add(self._populate_period_combo, list(periods))
        except Exception:
            GLib.idle_add(self._populate_period_combo, [])

    def _populate_period_combo(self, periods: list) -> None:
        """Remplit le ComboBox des périodes."""
        self._period_combo.remove_all()
        self._periods = periods
        for period in periods:
            name = getattr(period, "name", str(period))
            self._period_combo.append_text(name)
        if periods:
            self._period_combo.set_active(0)
            self._selected_period = periods[0]

    def _on_load_clicked(self, _btn) -> None:
        """Lance le chargement des notes."""
        period_idx = self._period_combo.get_active()
        periods = getattr(self, "_periods", [])
        if 0 <= period_idx < len(periods):
            self._selected_period = periods[period_idx]

        if not self._selected_class or not self._selected_period:
            return

        self._spinner.set_visible(True)
        self._spinner.start()
        self._empty_label.set_label("Chargement des notes...")
        thread = threading.Thread(
            target=self._fetch_grades,
            daemon=True,
        )
        thread.start()

    def _fetch_grades(self) -> None:
        """Récupère les notes de la classe dans un thread secondaire."""
        try:
            client = self.app_state.client
            if hasattr(client, "class_grades"):
                grades = client.class_grades(self._selected_class, self._selected_period)
            else:
                grades = self._selected_period.grades
            GLib.idle_add(self._display_grades, list(grades))
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))

    def _display_grades(self, grades: list) -> None:
        """Affiche les notes dans un tableau GTK."""
        self._spinner.stop()
        self._spinner.set_visible(False)

        # Vider le contenu précédent
        child = self._grades_box.get_first_child()
        while child:
            next_child = child.get_next_sibling()
            self._grades_box.remove(child)
            child = next_child

        if not grades:
            empty = Gtk.Label(label="Aucune note disponible pour cette sélection.")
            empty.add_css_class("empty-state")
            self._grades_box.append(empty)
            return

        # Tableau des notes
        grid = Gtk.Grid()
        grid.set_column_spacing(16)
        grid.set_row_spacing(4)
        grid.add_css_class("grades-grid")

        # En-têtes
        headers = ["Élève", "Matière", "Note", "Sur", "Commentaire"]
        for col, header in enumerate(headers):
            lbl = Gtk.Label(label=header)
            lbl.add_css_class("grade-header")
            lbl.set_xalign(0)
            grid.attach(lbl, col, 0, 1, 1)

        # Séparateur
        sep = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        grid.attach(sep, 0, 1, len(headers), 1)

        for row_idx, grade in enumerate(grades, start=2):
            student_name = getattr(grade, "student", {})
            if hasattr(student_name, "name"):
                student_name = student_name.name
            elif isinstance(student_name, dict):
                student_name = student_name.get("name", "—")
            else:
                student_name = str(student_name) if student_name else "—"

            subject = getattr(grade, "subject", None)
            subject_name = getattr(subject, "name", str(subject)) if subject else "—"

            note_val = getattr(grade, "grade", "—")
            out_of = getattr(grade, "out_of", "20")
            comment = getattr(grade, "comment", "") or ""

            row_data = [student_name, subject_name, str(note_val), str(out_of), comment]
            for col, value in enumerate(row_data):
                lbl = Gtk.Label(label=value)
                lbl.set_xalign(0)
                lbl.set_ellipsize(Pango.EllipsizeMode.END)
                lbl.add_css_class("grade-cell")
                if col == 2:  # Note
                    lbl.add_css_class("grade-value")
                grid.attach(lbl, col, row_idx, 1, 1)

        self._grades_box.append(grid)

    def _show_error(self, message: str) -> None:
        self._spinner.stop()
        self._spinner.set_visible(False)
        self._empty_label.set_label(f"Erreur : {message}")
        self._empty_label.set_visible(True)
