"""InformationPage — Informations et sondages de l'établissement."""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib
import threading


class InformationPage(Gtk.ScrolledWindow):
    def __init__(self) -> None:
        super().__init__()
        self.add_css_class("page")
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24); outer.set_margin_end(24)
        outer.set_margin_top(24); outer.set_margin_bottom(24)

        title = Gtk.Label(label="Informations")
        title.add_css_class("page-title"); title.set_xalign(0)
        outer.append(title)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._list = Gtk.ListBox()
        self._list.set_selection_mode(Gtk.SelectionMode.NONE)
        outer.append(self._list)
        self.set_child(outer)

    def load_data(self, app_state) -> None:
        self._app_state = app_state
        self._spinner.start(); self._spinner.set_visible(True)
        threading.Thread(target=self._fetch, daemon=True).start()

    def _fetch(self) -> None:
        if not hasattr(self, '_app_state') or not self._app_state.is_logged_in:
            return
        try:
            infos = self._app_state.client.information_and_surveys()
            GLib.idle_add(self._render, infos)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop); GLib.idle_add(self._spinner.set_visible, False)

    def _render(self, infos) -> None:
        while self._list.get_row_at_index(0):
            self._list.remove(self._list.get_row_at_index(0))
        for info in infos:
            row = Gtk.ListBoxRow()
            box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
            box.set_margin_start(12); box.set_margin_end(12)
            box.set_margin_top(10); box.set_margin_bottom(10)

            title = Gtk.Label(label=info.title or "(Sans titre)")
            title.add_css_class("info-title"); title.set_xalign(0)

            author = Gtk.Label(label=f"De : {info.author}" if hasattr(info, 'author') and info.author else "")
            author.add_css_class("info-author"); author.set_xalign(0)

            box.append(title); box.append(author)
            row.set_child(box)
            self._list.append(row)

    def _show_error(self, msg: str) -> None:
        row = Gtk.ListBoxRow()
        row.set_child(Gtk.Label(label=f"Erreur : {msg}"))
        self._list.append(row)
