"""
HomeworkPage — Liste des devoirs à rendre.
Permet de marquer un devoir comme fait.
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

import threading
import datetime


class HomeworkPage(Gtk.ScrolledWindow):
    """Page des devoirs avec cases à cocher."""

    def __init__(self) -> None:
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add_css_class("page")

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24)
        outer.set_margin_end(24)
        outer.set_margin_top(24)
        outer.set_margin_bottom(24)

        title = Gtk.Label(label="Devoirs")
        title.add_css_class("page-title")
        title.set_xalign(0)
        outer.append(title)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._list_box = Gtk.ListBox()
        self._list_box.set_selection_mode(Gtk.SelectionMode.NONE)
        self._list_box.add_css_class("homework-list")
        outer.append(self._list_box)

        self.set_child(outer)

    def load_data(self, app_state) -> None:
        self._app_state = app_state
        self._spinner.start()
        self._spinner.set_visible(True)
        thread = threading.Thread(target=self._fetch, daemon=True)
        thread.start()

    def _fetch(self) -> None:
        if not hasattr(self, '_app_state') or not self._app_state.is_logged_in:
            GLib.idle_add(self._spinner.stop)
            return
        try:
            today = datetime.date.today()
            homework = self._app_state.client.homework(today)
            GLib.idle_add(self._render, homework)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop)
            GLib.idle_add(self._spinner.set_visible, False)

    def _render(self, homework_list) -> None:
        # Vider la liste
        while True:
            row = self._list_box.get_row_at_index(0)
            if row is None:
                break
            self._list_box.remove(row)

        # Grouper par date
        groups = {}
        for hw in homework_list:
            date_key = hw.date.strftime("%A %d %B") if hw.date else "Sans date"
            groups.setdefault(date_key, []).append(hw)

        for date_str, hws in sorted(groups.items()):
            # En-tête de date
            header_row = Gtk.ListBoxRow()
            header_row.set_selectable(False)
            header_lbl = Gtk.Label(label=date_str)
            header_lbl.add_css_class("hw-date-header")
            header_lbl.set_xalign(0)
            header_lbl.set_margin_start(12)
            header_lbl.set_margin_top(8)
            header_row.set_child(header_lbl)
            self._list_box.append(header_row)

            for hw in hws:
                row = Gtk.ListBoxRow()
                box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                box.set_margin_start(12)
                box.set_margin_end(12)
                box.set_margin_top(8)
                box.set_margin_bottom(8)

                check = Gtk.CheckButton()
                check.set_active(hw.done)
                check.connect("toggled", self._on_done_toggled, hw)

                subject = Gtk.Label(label=hw.subject.name if hw.subject else "—")
                subject.add_css_class("hw-subject")
                subject.set_size_request(140, -1)
                subject.set_xalign(0)

                desc = Gtk.Label(label=hw.description)
                desc.set_xalign(0)
                desc.set_hexpand(True)
                desc.set_wrap(True)

                box.append(check)
                box.append(subject)
                box.append(desc)
                row.set_child(box)
                self._list_box.append(row)

    def _on_done_toggled(self, check: Gtk.CheckButton, hw) -> None:
        """Marque/démarque un devoir comme fait via pronotepy."""
        done = check.get_active()
        thread = threading.Thread(
            target=self._set_done,
            args=(hw, done),
            daemon=True,
        )
        thread.start()

    def _set_done(self, hw, done: bool) -> None:
        try:
            hw.set_done(done)
        except Exception as e:
            print(f"[Homework] Erreur set_done : {e}")

    def _show_error(self, msg: str) -> None:
        row = Gtk.ListBoxRow()
        lbl = Gtk.Label(label=f"Erreur : {msg}")
        lbl.add_css_class("error-label")
        row.set_child(lbl)
        self._list_box.append(row)
