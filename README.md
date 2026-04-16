# Cousinade_V3
Adresse de la page web : https://mathieus1666.github.io/Cousinade_V3/

Cousinade Bob 2026

Cette application est une plateforme collaborative de gestion d'événement conçue pour organiser une réunion familiale. Elle permet de centraliser les inscriptions et la logistique du buffet sans nécessiter de serveur complexe, en utilisant Google Sheets comme base de données.
🧩 Les 3 Piliers du Projet
1. L'Interface Utilisateur (HTML/CSS)

L'application offre une expérience visuelle immersive et "responsive" :

    Design Thématique : Un style "Ardoise & Terroir" avec un menu traiteur élégant sur fond noir.

    Tableau de Bord : Un bandeau de statistiques en temps réel (nombre de présents le midi/soir, total de parts de desserts, etc.).

    Navigation Fluide : Un formulaire fixe à gauche (sur PC) qui permet de s'inscrire ou d'ajouter un plat tout en gardant un œil sur la liste globale.

2. La Logistique Intelligente (JavaScript)

Le code gère toute la complexité de manière transparente :

    Reconnaissance Automatique : Grâce au browserId, l'app reconnaît l'utilisateur. S'il est déjà inscrit, elle verrouille son prénom et lui permet de modifier ses propres informations.

    Gestion de Buffet : Tri automatique des plats par catégories (Apéro, Entrée, Plat, Dessert) avec calcul des portions.

    Santé & Sécurité : Une section dédiée aux allergies alimentaires est mise en avant pour alerter les cuisiniers.

3. Le Backend (Google Apps Script / Sheets)

Pas besoin d'hébergement SQL coûteux :

    Les données sont stockées dans un tableur Google Sheets.

    Le script fait le pont entre le site web et la feuille de calcul pour enregistrer, modifier ou supprimer des entrées en temps réel.

🛠 Fonctions "Admin"

L'application inclut un accès sécurisé pour les organisateurs permettant d'accéder directement à la source des données pour effectuer une maintenance ou un export des listes.
