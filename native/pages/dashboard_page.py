"""
DashboardPage — Tableau de bord avec résumé des données Pronote.
Affiche : prochains cours, devoirs à rendre, dernières notes.
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

import threading
import datetime


class DashboardPage(Gtk.ScrolledWindow):
    """Page tableau de bord avec résumé des informations clés."""

    def __init__(self) -> None:
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add_css_class("page")

        self._box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=20)
        self._box.set_margin_start(24)
        self._box.set_margin_end(24)
        self._box.set_margin_top(24)
        self._box.set_margin_bottom(24)

        # En-tête
        title = Gtk.Label(label="Tableau de bord")
        title.add_css_class("page-title")
        title.set_xalign(0)
        self._box.append(title)

        # Cartes de résumé
        cards_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        cards_row.set_homogeneous(True)

        self._card_homework = self._make_summary_card("📚", "Devoirs", "—")
        self._card_grades = self._make_summary_card("⭐", "Nouvelles notes", "—")
        self._card_messages = self._make_summary_card("✉️", "Messages non lus", "—")
        self._card_absences = self._make_summary_card("⚠️", "Absences", "—")

        cards_row.append(self._card_homework)
        cards_row.append(self._card_grades)
        cards_row.append(self._card_messages)
        cards_row.append(self._card_absences)
        self._box.append(cards_row)

        # Prochains cours
        next_label = Gtk.Label(label="Prochains cours")
        next_label.add_css_class("section-title")
        next_label.set_xalign(0)
        self._box.append(next_label)

        self._timetable_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self._box.append(self._timetable_list)

        # Devoirs à venir
        hw_label = Gtk.Label(label="Devoirs à rendre")
        hw_label.add_css_class("section-title")
        hw_label.set_xalign(0)
        self._box.append(hw_label)

        self._homework_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self._box.append(self._homework_list)

        self.set_child(self._box)

    def _make_summary_card(self, emoji: str, label: str, value: str) -> Gtk.Box:
        """Crée une carte de résumé avec emoji, label et valeur."""
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        card.add_css_class("summary-card")
        card.set_margin_start(4)
        card.set_margin_end(4)
        card.set_margin_top(4)
        card.set_margin_bottom(4)

        emoji_lbl = Gtk.Label(label=emoji)
        emoji_lbl.add_css_class("card-emoji")

        val_lbl = Gtk.Label(label=value)
        val_lbl.add_css_class("card-value")
        val_lbl.set_name(f"card-val-{label}")

        text_lbl = Gtk.Label(label=label)
        text_lbl.add_css_class("card-label")

        card.append(emoji_lbl)
        card.append(val_lbl)
        card.append(text_lbl)
        return card

    def load_data(self, app_state) -> None:
        """Charge les données depuis pronotepy dans un thread secondaire."""
        thread = threading.Thread(
            target=self._fetch_data,
            args=(app_state,),
            daemon=True,
        )
        thread.start()

    def _fetch_data(self, app_state) -> None:
        """Récupère les données depuis pronotepy."""
        if not app_state.is_logged_in:
            return
        client = app_state.client
        today = datetime.date.today()

        try:
            # Devoirs
            homework = client.homework(today)
            GLib.idle_add(self._update_homework, homework[:5])
            GLib.idle_add(self._update_card_value, self._card_homework, str(len(homework)))

            # Notes (via la période courante)
            try:
                period = client.current_period
                grades = period.grades
                recent = sorted(grades, key=lambda g: g.date, reverse=True)[:3]
                GLib.idle_add(self._update_card_value, self._card_grades, str(len(grades)))
            except Exception:
                pass

            # Emploi du temps du jour
            lessons = client.lessons(today, today + datetime.timedelta(days=1))
            upcoming = [l for l in lessons if not l.canceled]
            GLib.idle_add(self._update_timetable, upcoming[:4])

        except Exception as e:
            print(f"[Dashboard] Erreur chargement données : {e}")

    def _update_homework(self, homework_list) -> None:
        """Met à jour la liste des devoirs dans l'UI."""
        # Vider la liste
        child = self._homework_list.get_first_child()
        while child:
            next_child = child.get_next_sibling()
            self._homework_list.remove(child)
            child = next_child

        for hw in homework_list:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.add_css_class("list-row")

            subject = Gtk.Label(label=hw.subject.name if hw.subject else "—")
            subject.add_css_class("hw-subject")
            subject.set_size_request(140, -1)
            subject.set_xalign(0)

            desc = Gtk.Label(label=hw.description[:80] + "…" if len(hw.description) > 80 else hw.description)
            desc.set_xalign(0)
            desc.set_hexpand(True)
            desc.set_ellipsize(3)  # PANGO_ELLIPSIZE_END

            due = Gtk.Label(label=hw.date.strftime("%d/%m") if hw.date else "")
            due.add_css_class("hw-date")

            row.append(subject)
            row.append(desc)
            row.append(due)
            self._homework_list.append(row)

    def _update_timetable(self, lessons) -> None:
        """Met à jour la liste des prochains cours."""
        child = self._timetable_list.get_first_child()
        while child:
            next_child = child.get_next_sibling()
            self._timetable_list.remove(child)
            child = next_child

        for lesson in lessons:
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            row.add_css_class("list-row")

            time_str = lesson.start.strftime("%H:%M") if lesson.start else "—"
            time_lbl = Gtk.Label(label=time_str)
            time_lbl.add_css_class("lesson-time")
            time_lbl.set_size_request(60, -1)

            subject = lesson.subject.name if lesson.subject else "—"
            subj_lbl = Gtk.Label(label=subject)
            subj_lbl.set_xalign(0)
            subj_lbl.set_hexpand(True)

            room = lesson.classroom if lesson.classroom else ""
            room_lbl = Gtk.Label(label=room)
            room_lbl.add_css_class("lesson-room")

            row.append(time_lbl)
            row.append(subj_lbl)
            row.append(room_lbl)
            self._timetable_list.append(row)

    def _update_card_value(self, card: Gtk.Box, value: str) -> None:
        """Met à jour la valeur d'une carte de résumé."""
        child = card.get_first_child()
        while child:
            if child.get_css_classes() and "card-value" in child.get_css_classes():
                child.set_label(value)
                return
            child = child.get_next_sibling()
