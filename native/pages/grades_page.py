"""
GradesPage — Notes et moyennes par période.
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

import threading


class GradesPage(Gtk.ScrolledWindow):
    def __init__(self) -> None:
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add_css_class("page")

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24)
        outer.set_margin_end(24)
        outer.set_margin_top(24)
        outer.set_margin_bottom(24)

        title = Gtk.Label(label="Notes")
        title.add_css_class("page-title")
        title.set_xalign(0)
        outer.append(title)

        # Sélecteur de période
        period_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        period_lbl = Gtk.Label(label="Période :")
        self._period_combo = Gtk.DropDown.new_from_strings(["Chargement…"])
        self._period_combo.connect("notify::selected", self._on_period_changed)
        period_box.append(period_lbl)
        period_box.append(self._period_combo)
        outer.append(period_box)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._grades_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        outer.append(self._grades_box)

        self.set_child(outer)
        self._periods = []

    def load_data(self, app_state) -> None:
        self._app_state = app_state
        self._spinner.start()
        self._spinner.set_visible(True)
        thread = threading.Thread(target=self._fetch_periods, daemon=True)
        thread.start()

    def _fetch_periods(self) -> None:
        if not hasattr(self, '_app_state') or not self._app_state.is_logged_in:
            return
        try:
            self._periods = self._app_state.client.periods
            names = [p.name for p in self._periods]
            GLib.idle_add(self._update_periods, names)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop)
            GLib.idle_add(self._spinner.set_visible, False)

    def _update_periods(self, names: list) -> None:
        model = Gtk.StringList.new(names)
        self._period_combo.set_model(model)
        if names:
            self._period_combo.set_selected(0)
            self._load_grades_for_period(0)

    def _on_period_changed(self, combo, _param) -> None:
        idx = combo.get_selected()
        self._load_grades_for_period(idx)

    def _load_grades_for_period(self, idx: int) -> None:
        if idx < 0 or idx >= len(self._periods):
            return
        self._spinner.start()
        self._spinner.set_visible(True)
        period = self._periods[idx]
        thread = threading.Thread(
            target=self._fetch_grades,
            args=(period,),
            daemon=True,
        )
        thread.start()

    def _fetch_grades(self, period) -> None:
        try:
            grades = period.grades
            averages = period.averages
            GLib.idle_add(self._render_grades, grades, averages)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop)
            GLib.idle_add(self._spinner.set_visible, False)

    def _render_grades(self, grades, averages) -> None:
        child = self._grades_box.get_first_child()
        while child:
            nxt = child.get_next_sibling()
            self._grades_box.remove(child)
            child = nxt

        # Moyennes
        if averages:
            avg_title = Gtk.Label(label="Moyennes par matière")
            avg_title.add_css_class("section-title")
            avg_title.set_xalign(0)
            self._grades_box.append(avg_title)

            for avg in averages:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                row.add_css_class("list-row")
                subj = Gtk.Label(label=avg.subject.name if avg.subject else "—")
                subj.set_hexpand(True)
                subj.set_xalign(0)
                val = Gtk.Label(label=str(avg.student) if avg.student else "—")
                val.add_css_class("grade-value")
                row.append(subj)
                row.append(val)
                self._grades_box.append(row)

        # Notes récentes
        grades_title = Gtk.Label(label="Notes récentes")
        grades_title.add_css_class("section-title")
        grades_title.set_xalign(0)
        self._grades_box.append(grades_title)

        for grade in sorted(grades, key=lambda g: g.date, reverse=True)[:20]:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.add_css_class("list-row")

            date_lbl = Gtk.Label(label=grade.date.strftime("%d/%m") if grade.date else "—")
            date_lbl.set_size_request(50, -1)

            subj = Gtk.Label(label=grade.subject.name if grade.subject else "—")
            subj.set_hexpand(True)
            subj.set_xalign(0)

            val = Gtk.Label(label=f"{grade.grade}/{grade.out_of}")
            val.add_css_class("grade-value")

            row.append(date_lbl)
            row.append(subj)
            row.append(val)
            self._grades_box.append(row)

    def _show_error(self, msg: str) -> None:
        lbl = Gtk.Label(label=f"Erreur : {msg}")
        lbl.add_css_class("error-label")
        self._grades_box.append(lbl)
