"""MenusPage — Menus de la cantine scolaire."""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib
import threading
import datetime


class MenusPage(Gtk.ScrolledWindow):
    def __init__(self) -> None:
        super().__init__()
        self.add_css_class("page")
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        outer.set_margin_start(24); outer.set_margin_end(24)
        outer.set_margin_top(24); outer.set_margin_bottom(24)

        title = Gtk.Label(label="Menus de la cantine")
        title.add_css_class("page-title"); title.set_xalign(0)
        outer.append(title)

        self._spinner = Gtk.Spinner()
        self._spinner.set_halign(Gtk.Align.CENTER)
        outer.append(self._spinner)

        self._content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
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
            today = datetime.date.today()
            monday = today - datetime.timedelta(days=today.weekday())
            friday = monday + datetime.timedelta(days=4)
            menus = self._app_state.client.menus(monday, friday)
            GLib.idle_add(self._render, menus)
        except Exception as e:
            GLib.idle_add(self._show_error, str(e))
        finally:
            GLib.idle_add(self._spinner.stop); GLib.idle_add(self._spinner.set_visible, False)

    def _render(self, menus) -> None:
        child = self._content.get_first_child()
        while child:
            nxt = child.get_next_sibling(); self._content.remove(child); child = nxt

        for menu in menus:
            day_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
            day_box.add_css_class("menu-day")

            date_str = menu.date.strftime("%A %d %B") if menu.date else "—"
            day_lbl = Gtk.Label(label=date_str.capitalize())
            day_lbl.add_css_class("day-header"); day_lbl.set_xalign(0)
            day_box.append(day_lbl)

            for meal in menu.meals:
                meal_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                meal_box.add_css_class("meal-box")
                meal_box.set_margin_start(12)

                meal_name = Gtk.Label(label=meal.name if hasattr(meal, 'name') else "Repas")
                meal_name.add_css_class("meal-name"); meal_name.set_xalign(0)
                meal_box.append(meal_name)

                if hasattr(meal, 'food_list'):
                    for food in meal.food_list:
                        food_lbl = Gtk.Label(label=f"• {food.name}")
                        food_lbl.set_xalign(0)
                        food_lbl.add_css_class("food-item")
                        meal_box.append(food_lbl)

                day_box.append(meal_box)

            self._content.append(day_box)

    def _show_error(self, msg: str) -> None:
        self._content.append(Gtk.Label(label=f"Erreur : {msg}"))
