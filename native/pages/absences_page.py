"""AbsencesPage — Liste des absences et retards."""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib
import threading


class AbsencesPage(Gtk.ScrolledWindow):
    def __init__(self) -> None:
        super().__init__()
        self.add_css_class("page")
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24); outer.set_margin_end(24)
        outer.set_margin_top(24); outer.set_margin_bottom(24)

        title = Gtk.Label(label="Absences & Retards")
        title.add_css_class("page-title"); title.set_xalign(0)
        outer.append(title)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        outer.append(self._content)
        self.set_child(outer)

    def load_data(self, app_state) -> None:
        self._app_state = app_state
        self._spinner.start(); self._spinner.set_visible(True)
        threading.Thread(target=self._fetch, daemon=True).start()

    def _fetch(self) -> None:
        if not hasattr(self, '_app_state') or not self._app_state.is_logged_in:
            return
        try:
            period = self._app_state.client.current_period
            absences = period.absences
            delays = period.delays
            GLib.idle_add(self._render, absences, delays)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop); GLib.idle_add(self._spinner.set_visible, False)

    def _render(self, absences, delays) -> None:
        child = self._content.get_first_child()
        while child:
            nxt = child.get_next_sibling(); self._content.remove(child); child = nxt

        sec = Gtk.Label(label=f"Absences ({len(absences)})")
        sec.add_css_class("section-title"); sec.set_xalign(0)
        self._content.append(sec)

        for ab in absences:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.add_css_class("list-row")
            date = Gtk.Label(label=ab.from_date.strftime("%d/%m/%Y") if ab.from_date else "—")
            date.set_size_request(90, -1)
            reason = Gtk.Label(label=ab.reasons[0] if ab.reasons else "Non justifiée")
            reason.set_hexpand(True); reason.set_xalign(0)
            justified = Gtk.Label(label="✓ Justifiée" if ab.justified else "✗ Non justifiée")
            justified.add_css_class("justified" if ab.justified else "not-justified")
            row.append(date); row.append(reason); row.append(justified)
            self._content.append(row)

        sec2 = Gtk.Label(label=f"Retards ({len(delays)})")
        sec2.add_css_class("section-title"); sec2.set_xalign(0)
        self._content.append(sec2)

        for dl in delays:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.add_css_class("list-row")
            date = Gtk.Label(label=dl.date.strftime("%d/%m/%Y") if dl.date else "—")
            date.set_size_request(90, -1)
            mins = Gtk.Label(label=f"{dl.minutes} min" if dl.minutes else "—")
            mins.set_hexpand(True); mins.set_xalign(0)
            row.append(date); row.append(mins)
            self._content.append(row)

    def _show_error(self, msg: str) -> None:
        self._content.append(Gtk.Label(label=f"Erreur : {msg}"))
