// Extended Spell Slots Module for Foundry VTT
// Extends spell slots beyond 9th level up to 20th level

const MAX_SPELL_SLOT_LEVEL = 20;

Hooks.once("init", () => {
  if (!CONFIG.DND5E) {
    console.error("Extended Spell Slots: DND5E system not found");
    return;
  }

  game.settings.register("extended-spell-slots", "maxSlotLevel", {
    name: "Maximum Spell Slot Level",
    hint: "The highest spell slot level to allow (10-20)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 10, max: 20, step: 1 },
    default: 20,
    onChange: () => {
      ui.notifications.info("Extended Spell Slots: Please reload the page for changes to take full effect.");
    }
  });

  game.settings.register("extended-spell-slots", "showControls", {
    name: "Show Controls on Character Sheets",
    hint: "Add 'Add Extended Slots' and 'Remove Extended Slots' buttons on actor sheets",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.registerMenu("extended-spell-slots", "spellSlotManagerMenu", {
    name: "Spell Slot Manager",
    hint: "Open the Spell Slot Manager to add/remove spell slots for any actor",
    scope: "world",
    type: class SpellSlotManagerMenu extends FormApplication {
      constructor(...args) {
        super(...args);
        this.actors = null;
      }

      static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
          title: "Spell Slot Manager",
          id: "extended-spell-slot-manager",
          template: "modules/extended-spell-slots/templates/spellSlotManager.html",
          width: 500,
          height: "auto",
          closeOnSubmit: false,
          submitOnClose: false
        });
      }

      async getData() {
        const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
        const actors = game.actors.filter(a => a.type === "character" || a.type === "npc");
        
        let selectedActor = actors[0];
        if (this.selectedActorId) {
          const found = actors.find(a => a.id === this.selectedActorId);
          if (found) selectedActor = found;
        }

        const spellSlots = [];
        if (selectedActor) {
          const spells = selectedActor.system.spells || {};
          for (let i = 1; i <= maxLevel; i++) {
            const spellData = spells[`spell${i}`] || {};
            spellSlots.push({
              level: i,
              max: spellData.max || 0,
              value: spellData.value || 0,
              isExtended: i > 9
            });
          }
        }

        return {
          actors: actors.map(a => ({ id: a.id, name: a.name, selected: a.id === selectedActor?.id })),
          selectedActor: selectedActor,
          spellSlots: spellSlots,
          maxLevel: maxLevel
        };
      }

      activateListeners(html) {
        super.activateListeners(html);

        html.find('select[name="actor"]').on("change", (e) => {
          this.selectedActorId = e.target.value;
          this.render();
        });

        html.find(".slot-value").on("click", async (e) => {
          const level = parseInt($(e.currentTarget).data("level"));
          const action = $(e.currentTarget).data("action");
          const actorId = html.find('select[name="actor"]').val();
          const actor = game.actors.get(actorId);
          if (actor) {
            const key = `system.spells.spell${level}`;
            const current = actor.system.spells?.[`spell${level}`] || {};
            let newValue = current.value || 0;
            
            if (action === "increase") newValue++;
            else if (action === "decrease") newValue = Math.max(0, newValue - 1);
            else {
              const input = prompt(`Enter new value for Level ${level} slots:`, newValue);
              if (input !== null) newValue = Math.max(0, parseInt(input) || 0);
            }
            
            await actor.update({ [`${key}.value`]: newValue });
            this.render();
          }
        });

        html.find(".slot-max").on("click", async (e) => {
          const level = parseInt($(e.currentTarget).data("level"));
          const action = $(e.currentTarget).data("action");
          const actorId = html.find('select[name="actor"]').val();
          const actor = game.actors.get(actorId);
          if (actor) {
            const key = `system.spells.spell${level}`;
            const current = actor.system.spells?.[`spell${level}`] || {};
            let newMax = current.max || 0;
            
            if (action === "increase") newMax++;
            else if (action === "decrease") newMax = Math.max(0, newMax - 1);
            else {
              const input = prompt(`Enter new max for Level ${level} slots:`, newMax);
              if (input !== null) newMax = Math.max(0, parseInt(input) || 0);
            }
            
            await actor.update({ [`${key}.max`]: newMax });
            this.render();
          }
        });

        html.find(".add-extended").on("click", async (e) => {
          const actorId = html.find('select[name="actor"]').val();
          const actor = game.actors.get(actorId);
          const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
          
          if (actor) {
            const updates = {};
            for (let i = 10; i <= maxLevel; i++) {
              updates[`system.spells.spell${i}.max`] = 1;
              updates[`system.spells.spell${i}.value`] = 1;
            }
            await actor.update(updates);
            ui.notifications.info(`Added spell slots 10-${maxLevel} to ${actor.name}`);
            this.render();
          }
        });

        html.find(".remove-extended").on("click", async (e) => {
          const actorId = html.find('select[name="actor"]').val();
          const actor = game.actors.get(actorId);
          const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
          
          if (actor) {
            const updates = {};
            for (let i = 10; i <= maxLevel; i++) {
              updates[`system.spells.spell${i}.max`] = 0;
              updates[`system.spells.spell${i}.value`] = 0;
            }
            await actor.update(updates);
            ui.notifications.info(`Removed spell slots 10-${maxLevel} from ${actor.name}`);
            this.render();
          }
        });
      }
    }
  });

  CONFIG.DND5E.maxSpellSlotLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;

  if (!CONFIG.DND5E.spellLevels) CONFIG.DND5E.spellLevels = {};
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
  for (let i = 10; i <= maxLevel; i++) {
    CONFIG.DND5E.spellLevels[i] = `DND5E.SpellLevel${i}`;
  }

  CONFIG.DND5E.spellSlotLevels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  if (!CONFIG.DND5E.spellScaling) CONFIG.DND5E.spellScaling = {};
  for (let i = 10; i <= maxLevel; i++) {
    CONFIG.DND5E.spellScaling[i] = `Slot ${i}`;
  }

  console.log(`🔮 Extended Spell Slots: Max level set to ${maxLevel}`);
});

Hooks.once("ready", () => {
  extendSpellSlotUI();
  extendActorSheets();
  
  if (game.settings.get("extended-spell-slots", "showControls")) {
    addSheetControls();
  }

  console.log(`🔮 Extended Spell Slots (5e) v1.4.0 active!`);
});

function extendSpellSlotUI() {
  Hooks.on("renderDialog", (dialog, html) => {
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
    
    html.find('select[name="level"], select[name="slot"], select[name="spellLevel"]').each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      if (currentMax < maxLevel) {
        for (let i = 10; i <= maxLevel; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            $select.append(`<option value="${i}">Level ${i}</option>`);
          }
        }
      }
    });

    html.find('input[type="number"][max]').each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      if (max < maxLevel) {
        $input.attr("max", maxLevel);
      }
    });
  });
}

function extendActorSheets() {
  Hooks.on("renderActorSheet5eCharacter", (sheet, html) => {
    extendSheetSpellSlots(html);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    extendSheetSpellSlots(html);
  });
}

function extendSheetSpellSlots(html) {
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;

  html.find(".spell-slots .slots, .spell-slots .slot-uses").each(function() {
    const $container = $(this);
    
    $container.find("input, select").each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      if (max < maxLevel && (max === 9 || !max)) {
        $input.attr("max", maxLevel);
      }
    });
  });
}

function addSheetControls() {
  Hooks.on("renderActorSheet5eCharacter", (sheet, html) => {
    injectSheetControls(sheet, html);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    injectSheetControls(sheet, html);
  });
}

function injectSheetControls(sheet, html) {
  if (html.find(".extended-spell-slots-panel").length > 0) return;

  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
  const actor = sheet.actor;

  const controlsHtml = `
    <div class="extended-spell-slots-panel" style="margin: 10px; padding: 10px; background: rgba(0,0,0,0.05); border: 1px solid #ccc; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-magic"></i>
        Extended Spell Slots (10-${maxLevel})
      </h3>
      <div class="extended-slots-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="add-extended-slots-btn" data-actor-id="${actor.id}" style="flex: 1; min-width: 150px;">
          <i class="fas fa-plus"></i> Add Extended Slots
        </button>
        <button type="button" class="remove-extended-slots-btn" data-actor-id="${actor.id}" style="flex: 1; min-width: 150px;">
          <i class="fas fa-minus"></i> Remove Extended Slots
        </button>
        <button type="button" class="open-slot-manager-btn" style="flex: 1; min-width: 150px;">
          <i class="fas fa-cog"></i> Slot Manager
        </button>
      </div>
    </div>
  `;

  const spellSlotsSection = html.find(".spell-slots, .spellbook, .tab[data-tab='spells']");
  if (spellSlotsSection.length > 0) {
    spellSlotsSection.first().after(controlsHtml);
  } else {
    html.find(".sheet-content, .primary-body").first().prepend(controlsHtml);
  }

  html.find(".add-extended-slots-btn").on("click", async (e) => {
    e.preventDefault();
    const actorId = $(e.currentTarget).data("actor-id");
    const targetActor = game.actors.get(actorId);
    if (targetActor) {
      const updates = {};
      for (let i = 10; i <= maxLevel; i++) {
        updates[`system.spells.spell${i}.max`] = 1;
        updates[`system.spells.spell${i}.value`] = 1;
      }
      await targetActor.update(updates);
      ui.notifications.info(`Added spell slots 10-${maxLevel} to ${targetActor.name}`);
    }
  });

  html.find(".remove-extended-slots-btn").on("click", async (e) => {
    e.preventDefault();
    const actorId = $(e.currentTarget).data("actor-id");
    const targetActor = game.actors.get(actorId);
    if (targetActor) {
      const updates = {};
      for (let i = 10; i <= maxLevel; i++) {
        updates[`system.spells.spell${i}.max`] = 0;
        updates[`system.spells.spell${i}.value`] = 0;
      }
      await targetActor.update(updates);
      ui.notifications.info(`Removed spell slots 10-${maxLevel} from ${targetActor.name}`);
    }
  });

  html.find(".open-slot-manager-btn").on("click", (e) => {
    e.preventDefault();
    new game.settings.menus.get("extended-spell-slots.spellSlotManagerMenu")?.object.render(true);
  });
}
