"""
TimetablePage — Emploi du temps de la semaine.
Affiche les cours sous forme de liste groupée par jour.
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

import threading
import datetime


class TimetablePage(Gtk.ScrolledWindow):
    """Page emploi du temps avec navigation par semaine."""

    def __init__(self) -> None:
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add_css_class("page")

        self._current_date = datetime.date.today()

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24)
        outer.set_margin_end(24)
        outer.set_margin_top(24)
        outer.set_margin_bottom(24)

        # En-tête avec navigation
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        title = Gtk.Label(label="Emploi du temps")
        title.add_css_class("page-title")
        title.set_hexpand(True)
        title.set_xalign(0)

        prev_btn = Gtk.Button(label="◀ Semaine précédente")
        prev_btn.connect("clicked", self._on_prev_week)
        next_btn = Gtk.Button(label="Semaine suivante ▶")
        next_btn.connect("clicked", self._on_next_week)

        header.append(prev_btn)
        header.append(title)
        header.append(next_btn)
        outer.append(header)

        # Zone de contenu des cours
        self._content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        outer.append(self._content)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self.set_child(outer)

    def load_data(self, app_state) -> None:
        self._app_state = app_state
        self._load_week(self._current_date)

    def _load_week(self, date: datetime.date) -> None:
        # Trouver le lundi de la semaine
        monday = date - datetime.timedelta(days=date.weekday())
        friday = monday + datetime.timedelta(days=4)

        self._spinner.start()
        self._spinner.set_visible(True)

        thread = threading.Thread(
            target=self._fetch_lessons,
            args=(monday, friday),
            daemon=True,
        )
        thread.start()

    def _fetch_lessons(self, start: datetime.date, end: datetime.date) -> None:
        if not hasattr(self, '_app_state') or not self._app_state.is_logged_in:
            GLib.idle_add(self._spinner.stop)
            return
        try:
            lessons = self._app_state.client.lessons(start, end)
            GLib.idle_add(self._render_lessons, lessons, start)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop)
            GLib.idle_add(self._spinner.set_visible, False)

    def _render_lessons(self, lessons, week_start: datetime.date) -> None:
        # Vider le contenu
        child = self._content.get_first_child()
        while child:
            nxt = child.get_next_sibling()
            self._content.remove(child)
            child = nxt

        # Grouper par jour
        days = {}
        for lesson in lessons:
            if lesson.start:
                day = lesson.start.date()
                days.setdefault(day, []).append(lesson)

        day_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
        for i in range(5):
            day = week_start + datetime.timedelta(days=i)
            day_lessons = sorted(days.get(day, []), key=lambda l: l.start)

            day_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
            day_box.add_css_class("day-group")

            day_label = Gtk.Label(label=f"{day_names[i]} {day.strftime('%d/%m')}")
            day_label.add_css_class("day-header")
            day_label.set_xalign(0)
            day_box.append(day_label)

            if not day_lessons:
                empty = Gtk.Label(label="Pas de cours")
                empty.add_css_class("empty-day")
                empty.set_xalign(0)
                day_box.append(empty)
            else:
                for lesson in day_lessons:
                    if lesson.canceled:
                        continue
                    row = self._make_lesson_row(lesson)
                    day_box.append(row)

            self._content.append(day_box)

    def _make_lesson_row(self, lesson) -> Gtk.Box:
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        row.add_css_class("lesson-row")

        time_str = f"{lesson.start.strftime('%H:%M')} – {lesson.end.strftime('%H:%M')}" if lesson.start and lesson.end else "—"
        time_lbl = Gtk.Label(label=time_str)
        time_lbl.add_css_class("lesson-time")
        time_lbl.set_size_request(110, -1)

        subject = lesson.subject.name if lesson.subject else "—"
        subj_lbl = Gtk.Label(label=subject)
        subj_lbl.set_xalign(0)
        subj_lbl.set_hexpand(True)
        subj_lbl.add_css_class("lesson-subject")

        teacher = lesson.teacher_name if hasattr(lesson, 'teacher_name') and lesson.teacher_name else ""
        teacher_lbl = Gtk.Label(label=teacher)
        teacher_lbl.add_css_class("lesson-teacher")

        room = lesson.classroom if lesson.classroom else ""
        room_lbl = Gtk.Label(label=room)
        room_lbl.add_css_class("lesson-room")

        row.append(time_lbl)
        row.append(subj_lbl)
        row.append(teacher_lbl)
        row.append(room_lbl)
        return row

    def _show_error(self, msg: str) -> None:
        error = Gtk.Label(label=f"Erreur : {msg}")
        error.add_css_class("error-label")
        self._content.append(error)

    def _on_prev_week(self, _btn) -> None:
        self._current_date -= datetime.timedelta(weeks=1)
        self._load_week(self._current_date)

    def _on_next_week(self, _btn) -> None:
        self._current_date += datetime.timedelta(weeks=1)
        self._load_week(self._current_date)
