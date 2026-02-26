"""
AppState — État global de l'application (remplace le store Zustand).
Stocke le client pronotepy actif, le profil détecté et les informations utilisateur.

Profils supportés :
  - "student"  → pronotepy.Client
  - "parent"   → pronotepy.ParentClient
  - "teacher"  → pronotepy.TeachingStaff

Signaux GObject émis :
  - "logout-requested" : émis lors de la déconnexion pour notifier la fenêtre principale.
"""

from typing import Optional, Union, List
import pronotepy

import gi
gi.require_version('GObject', '2.0')
from gi.repository import GObject


# Type union pour tous les clients supportés
AnyClient = Union[pronotepy.Client, pronotepy.ParentClient, pronotepy.TeachingStaff]


class AppState(GObject.Object):
    """
    Conteneur d'état global avec signaux GObject.
    Hérite de GObject.Object pour pouvoir émettre des signaux.
    """

    # ── Déclaration des signaux GObject ───────────────────────────────────
    __gsignals__ = {
        # Émis lors de la déconnexion pour notifier la fenêtre principale
        "logout-requested": (GObject.SignalFlags.RUN_FIRST, None, ()),
    }
    """
    Conteneur d'état global partagé entre tous les widgets.

    Attributes:
        client:       Instance du client pronotepy actif.
        profile:      Type de profil détecté ("student", "parent", "teacher").
        user_name:    Nom complet de l'utilisateur connecté.
        establishment: Nom de l'établissement.
        class_name:   Nom de la classe (élève uniquement).
        children:     Liste des enfants (parent uniquement).
        active_child: Enfant sélectionné (parent uniquement).
        subjects:     Matières enseignées (professeur uniquement).
        classes:      Classes du professeur (professeur uniquement).
    """

    def __init__(self) -> None:
        # IMPORTANT : appeler super().__init__() en premier pour initialiser GObject
        super().__init__()
        # ── Client et profil ──────────────────────────────────────────────
        self.client: Optional[AnyClient] = None
        self.profile: str = ""          # "student" | "parent" | "teacher"

        # ── Informations communes ─────────────────────────────────────────
        self.user_name: str = ""
        self.establishment: str = ""

        # ── Informations spécifiques au profil Élève ──────────────────────
        self.class_name: str = ""

        # ── Informations spécifiques au profil Parent ─────────────────────
        self.children: List = []        # liste de pronotepy.ClientInfo
        self.active_child: Optional[object] = None

        # ── Informations spécifiques au profil Professeur ─────────────────
        self.subjects: List[str] = []   # matières enseignées
        self.classes: List = []         # classes accessibles

    # ── Méthode principale de configuration ──────────────────────────────

    def set_client(self, client: AnyClient) -> None:
        """
        Enregistre le client pronotepy après une connexion réussie.
        Détecte automatiquement le profil via isinstance() et extrait
        les informations pertinentes pour chaque type de profil.
        """
        self.client = client

        # ── Détection du profil ───────────────────────────────────────────
        if isinstance(client, pronotepy.ParentClient):
            self.profile = "parent"
            self._extract_parent_info(client)
        elif isinstance(client, pronotepy.TeachingStaff):
            self.profile = "teacher"
            self._extract_teacher_info(client)
        else:
            # pronotepy.Client (élève) — cas par défaut
            self.profile = "student"
            self._extract_student_info(client)

        # ── Informations communes ─────────────────────────────────────────
        info = client.info
        self.user_name = getattr(info, "name", "") or ""
        self.establishment = getattr(info, "establishment_name", "") or ""

    # ── Extracteurs par profil ────────────────────────────────────────────

    def _extract_student_info(self, client: pronotepy.Client) -> None:
        """Extrait les informations spécifiques au profil Élève."""
        info = client.info
        self.class_name = getattr(info, "class_name", "") or ""
        # Réinitialise les champs des autres profils
        self.children = []
        self.active_child = None
        self.subjects = []
        self.classes = []

    def _extract_parent_info(self, client: pronotepy.ParentClient) -> None:
        """Extrait les informations spécifiques au profil Parent."""
        try:
            self.children = client.children
            # Sélectionner le premier enfant par défaut
            if self.children:
                self.active_child = self.children[0]
                client.set_child(self.active_child)
                # Mettre à jour le nom avec celui de l'enfant actif
                child_info = client.info
                self.class_name = getattr(child_info, "class_name", "") or ""
        except Exception:
            self.children = []
            self.active_child = None
        # Réinitialise les champs des autres profils
        self.subjects = []
        self.classes = []

    def _extract_teacher_info(self, client: pronotepy.TeachingStaff) -> None:
        """Extrait les informations spécifiques au profil Professeur."""
        self.subjects = getattr(client, "subjects", []) or []
        self.classes = getattr(client, "classes", []) or []
        # Réinitialise les champs des autres profils
        self.class_name = ""
        self.children = []
        self.active_child = None

    # ── Méthode de changement d'enfant (Parent) ───────────────────────────

    def switch_child(self, child) -> None:
        """
        Change l'enfant actif pour un compte Parent.
        Met à jour active_child et appelle client.set_child().
        """
        if self.profile != "parent" or not isinstance(self.client, pronotepy.ParentClient):
            return
        try:
            self.client.set_child(child)
            self.active_child = child
            child_info = self.client.info
            self.class_name = getattr(child_info, "class_name", "") or ""
        except Exception:
            pass

    # ── Déconnexion ───────────────────────────────────────────────────────

    def logout(self) -> None:
        """Réinitialise complètement l'état après déconnexion et émet le signal."""
        self.client = None
        self.profile = ""
        self.user_name = ""
        self.establishment = ""
        self.class_name = ""
        self.children = []
        self.active_child = None
        self.subjects = []
        self.classes = []
        # Notifier la fenêtre principale pour réinitialiser l'UI
        self.emit("logout-requested")

    # ── Propriétés utilitaires ────────────────────────────────────────────

    @property
    def is_logged_in(self) -> bool:
        """Retourne True si un client est actif et connecté."""
        return self.client is not None and self.client.logged_in

    @property
    def is_student(self) -> bool:
        return self.profile == "student"

    @property
    def is_parent(self) -> bool:
        return self.profile == "parent"

    @property
    def is_teacher(self) -> bool:
        return self.profile == "teacher"

    @property
    def profile_label(self) -> str:
        """Retourne un label lisible du profil pour l'affichage dans l'UI."""
        labels = {
            "student": "Élève",
            "parent": "Parent",
            "teacher": "Professeur",
        }
        return labels.get(self.profile, "Utilisateur")

    @property
    def profile_icon(self) -> str:
        """Retourne une icône emoji pour le profil."""
        icons = {
            "student": "🎓",
            "parent": "👨‍👩‍👧",
            "teacher": "📚",
        }
        return icons.get(self.profile, "👤")
