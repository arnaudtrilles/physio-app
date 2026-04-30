# Politique de gestion des cookies et traceurs

> Document à publier en libre accès et lié dans le footer / la bannière de
> consentement de l'application.
>
> Conforme à l'**art. 82 de la loi Informatique et Libertés** (transposition
> de l'art. 5(3) de la directive ePrivacy 2002/58/CE) et aux lignes
> directrices CNIL du 17 septembre 2020.
>
> Version : `1.0` — 2026-04-30.

---

## 1. Qu'est-ce qu'un cookie ou un traceur ?

Un **cookie** ou **traceur** est une donnée déposée par un site web ou une
application sur le terminal de l'utilisateur (navigateur, téléphone) afin de
mémoriser une information ou de tracer un comportement. La législation
européenne distingue :

- les **traceurs strictement nécessaires** au fonctionnement du service
  demandé par l'utilisateur — qui ne nécessitent **pas de consentement** ;
- les **traceurs non strictement nécessaires** (analytics, publicité,
  réseaux sociaux, cross-site tracking, etc.) — qui nécessitent un
  **consentement explicite, préalable et libre**.

---

## 2. L'application n'utilise QUE des traceurs strictement nécessaires

Notre choix éditorial est clair : **aucune publicité, aucun marketing,
aucun analytics tiers, aucun pixel social, aucun cross-site tracking**.

Cela signifie qu'**aucune bannière de consentement n'est légalement requise**,
et nous n'en affichons pas. Nous appliquons cependant une transparence
maximale sur les traceurs effectivement utilisés.

---

## 3. Liste exhaustive des traceurs utilisés

| Nom | Type | Origine | Finalité | Durée | Consentement requis ? |
|---|---|---|---|---|---|
| `sb-<projectref>-auth-token` | Cookie / `localStorage` | Supabase | Maintenir la session du Praticien après connexion | Session + 7 jours (rolling refresh) | Non — strictement nécessaire (art. 82 al. 2 LIL) |
| `sb-<projectref>-auth-token-code-verifier` | `localStorage` | Supabase | Échange OAuth/Magic Link sécurisé (PKCE) | Quelques minutes (effacé après échange) | Non — strictement nécessaire |
| `physio-app-version-finale-{state}` | IndexedDB | Application | Stockage local hors-ligne du dossier patient (chiffré au repos par le navigateur) | Tant que le compte est actif | Non — strictement nécessaire au service demandé |
| `physio-app-prefs` | `localStorage` | Application | Préférences UI (mode sombre, vue préférée, dernier patient ouvert) | Permanent (jusqu'à effacement) | Non — strictement nécessaire (préférence directement liée au service) |
| `__vercel_live_token` | Cookie technique | Vercel (hébergeur) | Routage vers le serveur le plus proche, anti-DDoS | Session | Non — strictement nécessaire |

> **Aucun cookie tiers** n'est déposé : pas de Google Analytics, pas de
> Meta Pixel, pas de TikTok Pixel, pas de Hotjar, pas de Mixpanel, pas
> d'Amplitude, pas de Segment, pas de Sentry tracking, pas de carte
> tierce embarquée.

---

## 4. Pas de finalité de profilage

Aucun traceur de cette application ne sert à :
- profiler le Praticien ou le patient à des fins commerciales,
- mesurer l'audience à des fins statistiques tierces,
- afficher des publicités personnalisées,
- partager les comportements de navigation avec des partenaires.

---

## 5. Comment refuser ou effacer ces traceurs ?

### 5.1 Refus

Le refus des traceurs strictement nécessaires entraîne **l'impossibilité
d'utiliser l'application** (pas de session, pas de stockage local du
dossier patient). Il n'y a donc pas de mécanisme de refus en application
— le refus passe par la non-utilisation du service.

### 5.2 Effacement

L'utilisateur peut à tout moment effacer ces traceurs via :

- **Sur ordinateur** :
  - Chrome : `chrome://settings/cookies` → « Voir tous les cookies » → rechercher le domaine
  - Firefox : `about:preferences#privacy` → « Cookies et données de site »
  - Safari : Préférences → Confidentialité → Gérer les données de site web
  - Edge : `edge://settings/privacy` → « Cookies et autorisations de site »

- **Sur mobile (Android/iOS)** :
  - Application installée (PWA) : Paramètres → Applications → `[À COMPLÉTER : nom]` → Stockage → Effacer les données
  - Navigateur : équivalent web ci-dessus

L'effacement entraîne la **déconnexion** et la **perte des données locales
non synchronisées** avec le serveur (les données serveur sont préservées
si la dernière synchronisation est passée).

### 5.3 Opt-out global

Le navigateur peut être configuré pour refuser tous les cookies (mode
strict ou navigation privée). L'application ne fonctionnera alors pas.

---

## 6. Et si une nouvelle fonctionnalité nécessitait un consentement ?

Si l'Éditeur introduit à l'avenir un traceur non strictement nécessaire
(par exemple un outil d'analyse de fréquentation tiers), il :

1. Mettra à jour la présente politique en indiquant la nature et la
   finalité du nouveau traceur ;
2. Affichera une **bannière de consentement** conforme à la CNIL
   (boutons « Accepter » / « Refuser » de **même visibilité**, possibilité
   de paramétrer en couches) **avant** tout dépôt ;
3. Ne déposera le traceur **qu'après acceptation** explicite ;
4. Conservera la **preuve du consentement** pendant 13 mois minimum.

À ce jour (2026-04-30), aucun tel traceur n'est utilisé.

---

## 7. Données techniques traitées sans cookie

Comme tout serveur web, notre infrastructure (Vercel + Supabase) journalise
techniquement :

- adresse IP de la requête (anonymisée à 24 h pour les logs Vercel) ;
- user-agent du navigateur ;
- horodatage et URL appelée ;
- code de réponse HTTP.

Ces journaux servent à la **sécurité** (détection d'intrusion, prévention
des attaques) et à la **résolution d'incidents techniques**. Ils sont
conservés **30 jours maximum** (Vercel) puis purgés automatiquement.

La base légale est **l'intérêt légitime** de l'Éditeur à sécuriser le
service (art. 6.1.f RGPD).

---

## 8. Contact

Pour toute question relative à cette politique :

- **DPO de l'Éditeur** : `[À COMPLÉTER : nom DPO]`
- **Email** : `[À COMPLÉTER : dpo@…]`

Vous pouvez également vous référer à la
[Politique de confidentialité](politique-confidentialite.md) globale qui
détaille l'ensemble des traitements.

---

## 9. Recours auprès de la CNIL

Vous disposez du droit de saisir la **CNIL** si vous estimez qu'un traceur
non autorisé a été déposé :

**CNIL** — `cnil.fr/fr/plaintes`
3 place de Fontenoy, 75007 Paris.

---

> Politique des cookies établie en application de l'art. 82 LIL et des
> lignes directrices CNIL « cookies et autres traceurs » du 17/09/2020.
> Date de dernière mise à jour : 2026-04-30.
