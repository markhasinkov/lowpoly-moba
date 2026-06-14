# Low-Poly ARPG — Design Document

Pivot from MOBA to a Diablo-style action RPG. Reuses the existing Three.js engine, KayKit characters/skeletons, nature props, glTF animation system, HP bars, floating damage numbers, and the effect system.

## Core Loop
Explore dungeon → fight mobs → kill bosses → collect graded loot → equip & grow stronger → descend deeper / take quests → repeat.

## Camera & Control
Top-down / isometric (reuse current follow cam, tightened). Click-to-move + click-to-attack. Abilities on Q/W/E/R. Pick up loot by walking over it or clicking.

## Item Rarity Grades
Color-coded, ascending power & affix count:
- **Common** (white) — base item, 0 affixes
- **Rare** (green) — 1 affix
- **Magic** (blue) — 2 affixes
- **Epic** (purple) — 3 affixes
- **Legendary** (orange) — 4 affixes + unique bonus

Affix pool: +damage, +HP, +armor, +crit chance, +crit dmg, +attack speed, +move speed, +lifesteal, +mana, +cooldown reduction, +spell power, +XP gain.
Item slots: Weapon, Helmet, Armor, Boots, Ring x2, Amulet.
Item level scales affix magnitude; higher dungeon depth → higher item level & rarity odds.

## Mobs
Grades: trash → elite → champion. Types via KayKit skeleton variants (minion/warrior/mage/rogue) + future packs. Elites/champions have buffs (fast, tanky, exploding, healer) and better drops.

## Bosses (graded, leveled, unique mechanics)
Each boss = inflated model + mechanics + guaranteed rare+ drop:
- **Rare boss** — single telegraphed slam (AoE circle to dodge).
- **Magic boss** — ranged projectile barrage + summon adds.
- **Epic boss** — ground-fire zones + charge dash + enrage at 30% HP.
- **Legendary boss** — multi-phase: phase 1 melee, phase 2 projectile storm + adds, phase 3 enrage with arena hazards; drops guaranteed Legendary.

## Dungeons
Sequential levels (depth N). Each: arena with mob packs, a mini-boss, exit portal to depth N+1. Difficulty (mob HP/dmg, item level, rarity odds) scales with depth. Later: room-based layouts.

## Quests
- Kill quests (kill N of type / kill the boss)
- Collect quests (gather drops)
- Depth quests (reach depth N)
Quest log UI; rewards = gold + XP + guaranteed item.

## Progression
Character level (XP from kills/quests), per-level stat growth, skill points for abilities. Optionally attributes (STR/INT/DEX) later.

## UI
- Inventory grid + equipment panel (drag/click to equip)
- Item tooltips with rarity color + affix list + compare
- Boss health bar (top), quest tracker (side), minimap
- Loot beams on ground colored by rarity

## Roadmap
- **Phase 1 (MVP foundation):** top-down control, one dungeon arena, mobs spawn/fight/die, loot drop with rarity, ground pickup, inventory + equip + stat aggregation, item tooltips, one mini-boss. *(playable vertical slice)*
- **Phase 2 (depth):** multiple dungeon depths + portals, more mob types/grades, full affix pool, graded bosses with distinct mechanics, character leveling & stats.
- **Phase 3 (content):** quest system + log + rewards, skill tree / more abilities, town hub + vendor + stash, sound.

## Tech Notes
- Same no-build stack (ES modules + importmap, Three r160 via unpkg).
- Push via GitHub Git Data API (git CLI broken in sandbox). Validate JS with acorn.
- Reuse assets/characters (heroes + skeletons), assets/nature. Add more KayKit packs for mob/boss variety.
- Keep MOBA code intact in a separate folder; build RPG as a new entry (decision pending).
