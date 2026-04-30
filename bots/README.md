# 🤖 Bots — Audit & simulation système

Infrastructure d'audit pour faire chasser les bugs par des agents IA, calquée sur le pattern Vercel BugBot.

## Deux tiers

### Tier 1 — Audit code (agents lecteurs)
Des agents IA lisent le codebase et raisonnent par concern. Chaque charter (`charters/*.md`) cadre un domaine d'analyse.

### Tier 2 — Personas Playwright (agents simulateurs)
Des scripts Playwright pilotent l'app comme un thérapeute réel, capturent screenshots/erreurs/timing. L'IA évalue ensuite les artefacts pour signaler bugs UX et frictions.

---

## Comment Claude Code orchestre l'audit

Quand l'utilisateur dit « lance l'audit » :

### Étape 1 — Tier 1 (parallélisé)
Spawn **un Agent par charter** dans un seul tour, en parallèle :

```
Pour chaque fichier dans bots/charters/*.md :
  Agent({
    description: "<charter title>",
    subagent_type: "code-reviewer",
    prompt: "<contenu du charter>"
  })
```

Chaque agent retourne un rapport en markdown : bugs trouvés (sévérité), recommandations.

### Étape 2 — Tier 2 (séquentiel)
```bash
npm run bots:personas
```

Tourne tous les Playwright specs dans `bots/personas/`. Artefacts → `bots/reports/{timestamp}/`.

### Étape 3 — Synthèse
Spawn un dernier agent qui agrège les rapports Tier 1 + artefacts Tier 2 et produit un **rapport unique trié par priorité** :
- 🔴 Critiques (bug bloquant, perte de données, risque RGPD)
- 🟠 Importants (bug UX, comportement inattendu)
- 🟡 Améliorations (UX suggestion, accessibilité)

### Étape 4 — Présentation utilisateur
Claude Code affiche le rapport synthétique à l'utilisateur, qui choisit ce qu'il veut faire fixer.

---

## Run manuel

```bash
# Tier 2 seulement (Playwright)
npm run bots:personas

# Tout (futur — pour l'instant Claude Code orchestre)
npm run bots:audit
```

---

## Convention de nommage

- `charters/NN-<slug>.md` — domaines d'audit (numérotés pour ordre)
- `personas/NN-<persona-slug>.spec.ts` — un thérapeute fictif, un workflow réel
- `reports/YYYY-MM-DDTHH-MM-SS/` — outputs horodatés (gitignored)

## Coût indicatif

- Tier 1 (6 agents) : ~30k-50k tokens × 6 = **~$1-3 par run**
- Tier 2 (1 persona Playwright + 1 eval Claude vision) : **~$0.50-2 par persona**
- Un audit complet : **~$5-15**

Cadence recommandée pendant phase "bug rush" : toutes les 4-6h. En régime stable : hebdo.
