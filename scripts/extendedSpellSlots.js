// Debug log to confirm the module script is loading
console.log("🔮 Extended Spell Slots module script loaded!");

const MAX_SPELL_SLOT_LEVEL = 20;

Hooks.once("init", () => {
  if (!CONFIG.DND5E) return;

  game.settings.register("extended-spell-slots", "maxSlotLevel", {
    name: "Maximum Spell Slot Level",
    hint: "The highest spell slot level to allow (10-20)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 10, max: 20, step: 1 },
    default: 20,
    onChange: value => {
      CONFIG.DND5E.maxSpellSlotLevel = value;
      ui.notifications.info(`Extended Spell Slots: Max level set to ${value}`);
    }
  });

  game.settings.register("extended-spell-slots", "showControls", {
    name: "Show Add Spell Slot Button on Sheets",
    hint: "Add a button to character sheets to add/remove spell slots",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      window.location.reload();
    }
  });

  game.settings.register("extended-spell-slots", "openManager", {
    name: "Spell Slot Manager",
    hint: "Open the Spell Slot Manager to add/remove spell slots for actors",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (value) {
        new ExtendedSpellSlotManager().render(true);
        game.settings.set("extended-spell-slots", "openManager", false);
      }
    }
  });

  CONFIG.DND5E.maxSpellSlotLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;

  CONFIG.DND5E.spellSlotLevels = Array.from({ length: CONFIG.DND5E.maxSpellSlotLevel }, (_, i) => i + 1);

  CONFIG.DND5E.spellScaling = {
    ...CONFIG.DND5E.spellScaling,
    [CONFIG.DND5E.maxSpellSlotLevel]: `Slot ${CONFIG.DND5E.maxSpellSlotLevel}`
  };

  console.log(`🔮 CONFIG.DND5E.spellSlotLevels extended to ${CONFIG.DND5E.maxSpellSlotLevel} levels`);
});

class ExtendedSpellSlotManager extends FormApplication {
  constructor(...args) {
    super(...args);
    this.selectedActorId = null;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Spell Slot Manager",
      id: "extended-spell-slot-manager",
      template: "modules/extended-spell-slots/templates/spellSlotManager.html",
      width: 500,
      height: 600,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }

  async getData() {
    const actors = game.actors.filter(a => a.type === "character" || a.type === "npc");
    const selectedActor = this.selectedActorId ? actors.find(a => a.id === this.selectedActorId) : actors[0];
    
    return {
      actors: actors.map(a => ({ id: a.id, name: a.name, selected: a.id === selectedActor?.id })),
      selectedActor: selectedActor,
      spellSlots: selectedActor ? this.getActorSpellSlots(selectedActor) : [],
      maxLevel: CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL
    };
  }

  getActorSpellSlots(actor) {
    const slots = [];
    const spells = actor.system.spells || {};
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;

    for (let i = 1; i <= maxLevel; i++) {
      const spellData = spells[`spell${i}`] || {};
      slots.push({
        level: i,
        max: spellData.max || 0,
        value: spellData.value || 0,
        override: spellData.override || null
      });
    }

    return slots;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('select[name="actor-select"]').on("change", async (e) => {
      this.selectedActorId = e.target.value;
      this.render();
    });

    html.find(".slot-increase").on("click", async (e) => {
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.modifySlot(actor, level, 1);
    });

    html.find(".slot-decrease").on("click", async (e) => {
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.modifySlot(actor, level, -1);
    });

    html.find(".slot-max-increase").on("click", async (e) => {
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.modifySlotMax(actor, level, 1);
    });

    html.find(".slot-max-decrease").on("click", async (e) => {
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.modifySlotMax(actor, level, -1);
    });

    html.find(".add-all-slots").on("click", async (e) => {
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.addAllSlots(actor);
    });

    html.find(".remove-all-slots").on("click", async (e) => {
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) await this.removeAllSlots(actor);
    });

    html.find(".open-sheet").on("click", async (e) => {
      const actorId = html.find('select[name="actor-select"]').val();
      const actor = game.actors.get(actorId);
      if (actor) {
        actor.sheet.render(true);
        this.close();
      }
    });
  }

  async modifySlot(actor, level, amount) {
    const key = `system.spells.spell${level}.value`;
    const current = actor.system.spells?.[`spell${level}`]?.value || 0;
    const newValue = Math.max(0, current + amount);
    
    await actor.update({ [key]: newValue });
    this.render();
  }

  async modifySlotMax(actor, level, amount) {
    const key = `system.spells.spell${level}.max`;
    const current = actor.system.spells?.[`spell${level}`]?.max || 0;
    const newMax = Math.max(0, current + amount);
    
    await actor.update({ [key]: newMax });
    this.render();
  }

  async addAllSlots(actor) {
    const updates = {};
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;
    
    for (let i = 10; i <= maxLevel; i++) {
      updates[`system.spells.spell${i}.max`] = 1;
      updates[`system.spells.spell${i}.value`] = 1;
    }
    
    await actor.update(updates);
    this.render();
    ui.notifications.info(`Added spell slots 10-${maxLevel} to ${actor.name}`);
  }

  async removeAllSlots(actor) {
    const updates = {};
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;
    
    for (let i = 10; i <= maxLevel; i++) {
      updates[`system.spells.spell${i}.max`] = 0;
      updates[`system.spells.spell${i}.value`] = 0;
    }
    
    await actor.update(updates);
    this.render();
    ui.notifications.info(`Removed spell slots 10-${maxLevel} from ${actor.name}`);
  }
}

Hooks.once("ready", () => {
  extendSpellSlotUI();
  extendActorSheetSpellSlots();
  extendSpellItemSheet();

  if (game.settings.get("extended-spell-slots", "showControls")) {
    addSpellSlotButtonToSheets();
  }

  console.log(`🔮 Extended Spell Slots (5e) active. Spell slots extended to level ${CONFIG.DND5E.maxSpellSlotLevel}`);
});

function addSpellSlotButtonToSheets() {
  Hooks.on("renderActorSheet5eCharacter", (sheet, html) => {
    addSpellSlotControls(html, sheet.actor);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    addSpellSlotControls(html, sheet.actor);
  });
}

function addSpellSlotControls(html, actor) {
  if (html.find(".extended-spell-slots-controls").length) return;

  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;
  
  const controlsHtml = `
    <div class="extended-spell-slots-controls" style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">Extended Spell Slots (10-${maxLevel})</h3>
      <button class="add-extended-slots" data-actor-id="${actor.id}" style="margin-right: 5px;">
        <i class="fas fa-plus"></i> Add All Extended Slots
      </button>
      <button class="remove-extended-slots" data-actor-id="${actor.id}" style="margin-right: 5px;">
        <i class="fas fa-minus"></i> Remove All Extended Slots
      </button>
      <button class="open-slot-manager-btn" style="margin-right: 5px;">
        <i class="fas fa-cog"></i> Slot Manager
      </button>
    </div>
  `;

  const spellSlotsSection = html.find(".spell-slots, .spellbook, .tab[data-tab='spells'], .inventory .item[data-type='spell']").closest(".tab, .sheet-body");
  
  if (spellSlotsSection.length) {
    spellSlotsSection.first().append(controlsHtml);
  } else {
    html.find(".sheet-content, .tab-group, .primary-body").first().append(controlsHtml);
  }

  html.find(".add-extended-slots").on("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      targetActor.sheet.render();
    }
  });

  html.find(".remove-extended-slots").on("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      targetActor.sheet.render();
    }
  });

  html.find(".open-slot-manager-btn").on("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    new ExtendedSpellSlotManager().render(true);
  });
}

function extendSpellSlotUI() {
  Hooks.on("renderDialog", (dialog, html) => {
    extendSpellSlotDropdowns(html);
  });
}

function extendSpellSlotDropdowns(html) {
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;

  html.find('select[name="slot"], select[name="level"], select[name="spellLevel"]').each(function() {
    const $select = $(this);
    const currentMax = parseInt($select.find("option:last-child").val()) || 9;
    
    if (currentMax < maxLevel) {
      for (let i = 10; i <= maxLevel; i++) {
        if (!$select.find(`option[value="${i}"]`).length) {
          $select.append(`<option value="${i}">${ordinal(i)} Level</option>`);
        }
      }
    }
  });

  html.find('input[type="number"][name*="level"], input[type="number"][name*="slot"]').each(function() {
    const $input = $(this);
    const max = parseInt($input.attr("max")) || 9;
    
    if (max < maxLevel) {
      $input.attr("max", maxLevel);
      $input.attr("min", "0");
    }
  });
}

function extendActorSheetSpellSlots() {
  Hooks.on("renderActorSheet5eCharacter", (sheet, html) => {
    extendSpellSlotInputs(html);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    extendSpellSlotInputs(html);
  });
}

function extendSpellSlotInputs(html) {
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;

  html.find('.spell-slots input[type="number"], .spell-slot-input input').each(function() {
    const $input = $(this);
    const max = parseInt($input.attr("max")) || 9;
    
    if (max < maxLevel) {
      $input.attr("max", maxLevel);
    }
  });

  html.find('.spell-level-input, .slot-level-input').each(function() {
    const $container = $(this);
    const $select = $container.find("select, input");
    
    if ($select.length) {
      const max = parseInt($select.attr("max")) || 9;
      
      if (max < maxLevel) {
        if ($select.is("select")) {
          for (let i = 10; i <= maxLevel; i++) {
            if (!$select.find(`option[value="${i}"]`).length) {
              $select.append(`<option value="${i}">${ordinal(i)}</option>`);
            }
          }
        } else {
          $select.attr("max", maxLevel);
        }
      }
    }
  });
}

function extendSpellItemSheet() {
  Hooks.on("renderItemSheet5e", (sheet, html) => {
    const isSpell = sheet.item.type === "spell";
    const isConsumable = sheet.item.type === "consumable" && sheet.item.system.consumableType === "scroll";

    if (isSpell || isConsumable) {
      extendSpellLevelSelect(html, ".level-select, select[name*='level']");
    }
  });

  Hooks.on("renderItemSheet5eSpell", (sheet, html) => {
    extendSpellLevelSelect(html, "select[name='system.level']");
    extendSpellLevelSelect(html, ".spell-level-select");
  });

  Hooks.on("renderSpellSlotConfig", (app, html) => {
    extendSpellSlotDropdowns(html);
    
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;
    
    html.find("input[name='max']").each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      
      if (max < maxLevel) {
        $input.attr("max", maxLevel);
      }
    });

    html.find("select[name='level']").each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      if (currentMax < maxLevel) {
        for (let i = 10; i <= maxLevel; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            $select.append(`<option value="${i}">${ordinal(i)} Level</option>`);
          }
        }
      }
    });
  });
}

function extendSpellLevelSelect(html, selector) {
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || MAX_SPELL_SLOT_LEVEL;
  
  html.find(selector).each(function() {
    const $select = $(this);
    const currentMax = parseInt($select.find("option:last-child").val()) || 9;
    
    if (currentMax < maxLevel) {
      for (let i = 10; i <= maxLevel; i++) {
        if (!$select.find(`option[value="${i}"]`).length) {
          $select.append(`<option value="${i}">${ordinal(i)} Level</option>`);
        }
      }
    }
  });
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
