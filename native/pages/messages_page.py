"""MessagesPage — Messagerie Pronote."""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib
import threading


class MessagesPage(Gtk.ScrolledWindow):
    def __init__(self) -> None:
        super().__init__()
        self.add_css_class("page")
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24); outer.set_margin_end(24)
        outer.set_margin_top(24); outer.set_margin_bottom(24)

        title = Gtk.Label(label="Messagerie")
        title.add_css_class("page-title"); title.set_xalign(0)
        outer.append(title)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._list = Gtk.ListBox()
        self._list.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self._list.add_css_class("messages-list")
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
            discussions = self._app_state.client.discussions()
            GLib.idle_add(self._render, discussions)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop); GLib.idle_add(self._spinner.set_visible, False)

    def _render(self, discussions) -> None:
        while self._list.get_row_at_index(0):
            self._list.remove(self._list.get_row_at_index(0))
        for disc in discussions:
            row = Gtk.ListBoxRow()
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            box.set_margin_start(12); box.set_margin_end(12)
            box.set_margin_top(8); box.set_margin_bottom(8)

            unread = Gtk.Label(label="●" if not disc.read else " ")
            unread.add_css_class("unread-dot" if not disc.read else "read-dot")

            subject = Gtk.Label(label=disc.subject or "(Sans objet)")
            subject.set_hexpand(True); subject.set_xalign(0)
            subject.set_ellipsize(3)

            creator = Gtk.Label(label=disc.creator if hasattr(disc, 'creator') else "")
            creator.add_css_class("msg-creator")

            box.append(unread); box.append(subject); box.append(creator)
            row.set_child(box)
            self._list.append(row)

    def _show_error(self, msg: str) -> None:
        row = Gtk.ListBoxRow()
        row.set_child(Gtk.Label(label=f"Erreur : {msg}"))
        self._list.append(row)
