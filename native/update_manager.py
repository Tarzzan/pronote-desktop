"""
UpdateManager — Vérification des mises à jour via l'API GitHub Releases.
Remplace la logique de update-utils.cjs d'Electron.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, GLib

import threading
import subprocess
import tempfile
import os
import requests

GITHUB_REPO = "Tarzzan/pronote-desktop"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
LOCAL_VERSION = "2.0.0-native"  # À synchroniser avec APP_VERSION dans main.py


def _parse_version(version_str: str) -> tuple:
    """Convertit une chaîne de version en tuple comparable."""
    clean = version_str.lstrip("v").split("-")[0]
    try:
        return tuple(int(x) for x in clean.split("."))
    except ValueError:
        return (0, 0, 0)


def check_for_updates(parent_window=None) -> None:
    """
    Lance la vérification des mises à jour dans un thread secondaire.
    Affiche un Gtk.MessageDialog si une nouvelle version est disponible.
    """
    thread = threading.Thread(
        target=_do_check,
        args=(parent_window,),
        daemon=True,
    )
    thread.start()


def _do_check(parent_window) -> None:
    """Effectue la requête GitHub et compare les versions."""
    try:
        response = requests.get(
            GITHUB_API_URL,
            headers={"Accept": "application/vnd.github.v3+json"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        latest_version = data.get("tag_name", "").lstrip("v")
        release_name = data.get("name", latest_version)
        release_notes = data.get("body", "Aucune note de version disponible.")
        release_url = data.get("html_url", "")

        # Trouver le fichier .deb dans les assets
        deb_url = None
        deb_name = None
        for asset in data.get("assets", []):
            if asset["name"].endswith(".deb"):
                deb_url = asset["browser_download_url"]
                deb_name = asset["name"]
                break

        local_tuple = _parse_version(LOCAL_VERSION)
        latest_tuple = _parse_version(latest_version)

        if latest_tuple > local_tuple:
            GLib.idle_add(
                _show_update_dialog,
                parent_window,
                latest_version,
                release_name,
                release_notes[:500],
                deb_url,
                deb_name,
            )
        else:
            GLib.idle_add(
                _show_up_to_date_dialog,
                parent_window,
                LOCAL_VERSION,
            )

    except requests.exceptions.ConnectionError:
        GLib.idle_add(_show_error_dialog, parent_window, "Impossible de se connecter à GitHub. Vérifiez votre connexion internet.")
    except requests.exceptions.Timeout:
        GLib.idle_add(_show_error_dialog, parent_window, "La requête a expiré. Réessayez plus tard.")
    except Exception as e:
        GLib.idle_add(_show_error_dialog, parent_window, f"Erreur inattendue : {e}")


def _show_update_dialog(parent, version: str, name: str, notes: str, deb_url: str, deb_name: str) -> None:
    """Affiche un dialogue proposant de télécharger la mise à jour."""
    dialog = Gtk.MessageDialog(
        transient_for=parent,
        modal=True,
        message_type=Gtk.MessageType.INFO,
        buttons=Gtk.ButtonsType.NONE,
        text=f"Mise à jour disponible : v{version}",
    )
    dialog.format_secondary_text(
        f"{name}\n\n{notes}\n\nVersion actuelle : {LOCAL_VERSION}"
    )

    dialog.add_button("Plus tard", Gtk.ResponseType.CANCEL)
    if deb_url:
        dialog.add_button("Télécharger et installer", Gtk.ResponseType.ACCEPT)
        dialog.set_default_response(Gtk.ResponseType.ACCEPT)

    dialog.connect("response", _on_update_response, deb_url, deb_name, parent)
    dialog.present()


def _on_update_response(dialog, response: int, deb_url: str, deb_name: str, parent) -> None:
    """Gère la réponse de l'utilisateur au dialogue de mise à jour."""
    dialog.destroy()
    if response == Gtk.ResponseType.ACCEPT and deb_url:
        thread = threading.Thread(
            target=_download_and_install,
            args=(deb_url, deb_name, parent),
            daemon=True,
        )
        thread.start()


def _download_and_install(deb_url: str, deb_name: str, parent) -> None:
    """Télécharge le .deb et lance l'installation via pkexec."""
    try:
        GLib.idle_add(_show_progress_dialog, parent, f"Téléchargement de {deb_name}…")

        with tempfile.TemporaryDirectory() as tmpdir:
            deb_path = os.path.join(tmpdir, deb_name)

            # Téléchargement avec progression
            response = requests.get(deb_url, stream=True, timeout=120)
            response.raise_for_status()

            with open(deb_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Installation via pkexec (demande le mot de passe graphiquement)
            result = subprocess.run(
                ["pkexec", "dpkg", "-i", deb_path],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                GLib.idle_add(_show_install_success_dialog, parent)
            else:
                GLib.idle_add(_show_error_dialog, parent, f"Erreur d'installation :\n{result.stderr}")

    except Exception as e:
        GLib.idle_add(_show_error_dialog, parent, f"Erreur lors du téléchargement : {e}")


def _show_up_to_date_dialog(parent, version: str) -> None:
    dialog = Gtk.MessageDialog(
        transient_for=parent,
        modal=True,
        message_type=Gtk.MessageType.INFO,
        buttons=Gtk.ButtonsType.OK,
        text="Application à jour",
    )
    dialog.format_secondary_text(f"Vous utilisez déjà la dernière version (v{version}).")
    dialog.connect("response", lambda d, _: d.destroy())
    dialog.present()


def _show_error_dialog(parent, message: str) -> None:
    dialog = Gtk.MessageDialog(
        transient_for=parent,
        modal=True,
        message_type=Gtk.MessageType.ERROR,
        buttons=Gtk.ButtonsType.OK,
        text="Erreur de mise à jour",
    )
    dialog.format_secondary_text(message)
    dialog.connect("response", lambda d, _: d.destroy())
    dialog.present()


def _show_progress_dialog(parent, message: str) -> None:
    dialog = Gtk.MessageDialog(
        transient_for=parent,
        modal=True,
        message_type=Gtk.MessageType.INFO,
        buttons=Gtk.ButtonsType.NONE,
        text=message,
    )
    spinner = Gtk.Spinner()
    spinner.start()
    dialog.get_content_area().append(spinner)
    dialog.present()


def _show_install_success_dialog(parent) -> None:
    dialog = Gtk.MessageDialog(
        transient_for=parent,
        modal=True,
        message_type=Gtk.MessageType.INFO,
        buttons=Gtk.ButtonsType.OK,
        text="Installation réussie",
    )
    dialog.format_secondary_text("La mise à jour a été installée. Redémarrez l'application pour appliquer les changements.")
    dialog.connect("response", lambda d, _: d.destroy())
    dialog.present()
