// Extended Spell Slots Module for Foundry VTT
// Extends spell slots beyond 9th level up to 20th level

const MAX_SPELL_SLOT_LEVEL = 20;

Hooks.once("dnd5e.init", () => {
  console.log("[Extended Spell Slots] dnd5e.init fired");
  
  if (!CONFIG.DND5E) {
    console.error("[Extended Spell Slots] ERROR: DND5E system not found");
    return;
  }

  const maxLevel = Math.max(20, Object.keys(CONFIG.DND5E.spellLevels || {}).length - 1);
  CONFIG.DND5E.maxSpellSlotLevel = maxLevel;

  console.log("[Extended Spell Slots] maxSpellSlotLevel set to", maxLevel);

  for (let i = 10; i <= maxLevel; i++) {
    const suffix = i === 11 || i === 12 || i === 13 ? "th" : i % 10 === 1 ? "st" : i % 10 === 2 ? "nd" : i % 10 === 3 ? "rd" : "th";
    CONFIG.DND5E.spellLevels[i] = `DND5E.SpellLevel${i}`;
    if (!CONFIG.DND5E.spellcasting) CONFIG.DND5E.spellcasting = {};
    if (!CONFIG.DND5E.spellcasting.slots) CONFIG.DND5E.spellcasting.slots = {};
    CONFIG.DND5E.spellcasting.slots[`spell${i}`] = `${i}${suffix} Level`;
    
    console.log(`[Extended Spell Slots] spellLevels[${i}] = '${CONFIG.DND5E.spellLevels[i]}', spellcasting.slots.spell${i} = '${CONFIG.DND5E.spellcasting.slots[`spell${i}`]}'`);
  }

  CONFIG.DND5E.spellSlotLevels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  if (!CONFIG.DND5E.spellScaling) CONFIG.DND5E.spellScaling = {};
  for (let i = 10; i <= maxLevel; i++) {
    if (!CONFIG.DND5E.spellScaling[i]) {
      CONFIG.DND5E.spellScaling[i] = `Slot ${i}`;
    }
  }

  if (CONFIG.DND5E.SPELL_SLOT_TABLE && CONFIG.DND5E.SPELL_SLOT_TABLE.length < 20) {
    while (CONFIG.DND5E.SPELL_SLOT_TABLE.length < 20) {
      CONFIG.DND5E.SPELL_SLOT_TABLE.push([4, 3, 3, 3, 3, 2, 2, 2, 1]);
    }
    console.log(`[Extended Spell Slots] SPELL_SLOT_TABLE extended to ${CONFIG.DND5E.SPELL_SLOT_TABLE.length} levels`);
  }

  if (!CONFIG.DND5E.spellSlotTable && CONFIG.DND5E.SPELL_SLOT_TABLE) {
    CONFIG.DND5E.spellSlotTable = CONFIG.DND5E.SPELL_SLOT_TABLE;
  }

  console.log(`[Extended Spell Slots] Max level: ${maxLevel}`);

  game.settings.register("extended-spell-slots", "maxSlotLevel", {
    name: "Maximum Spell Slot Level",
    hint: "The highest spell slot level to allow (10-20)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 10, max: 20, step: 1 },
    default: 20,
    onChange: () => {
      window.location.reload();
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

  game.settings.register("extended-spell-slots", "openManager", {
    name: "Open Spell Slot Manager",
    hint: "Click to open the Spell Slot Manager",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

class SpellSlotManager extends FormApplication {
  constructor(...args) {
    super(...args);
    this.selectedActorId = null;
  }

  static get defaultOptions() {
    return {
      title: "Spell Slot Manager",
      id: "extended-spell-slot-manager",
      template: "modules/extended-spell-slots/templates/spellSlotManager.html",
      width: 500,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false
    };
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

    html.find(".slot-value-increase").on("click", async (e) => {
      e.preventDefault();
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor"]').val();
      const actor = game.actors.get(actorId);
      if (actor) {
        const current = actor.system.spells?.[`spell${level}`] || {};
        await actor.update({ [`system.spells.spell${level}.value`]: (current.value || 0) + 1 });
        this.render();
      }
    });

    html.find(".slot-value-decrease").on("click", async (e) => {
      e.preventDefault();
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor"]').val();
      const actor = game.actors.get(actorId);
      if (actor) {
        const current = actor.system.spells?.[`spell${level}`] || {};
        await actor.update({ [`system.spells.spell${level}.value`]: Math.max(0, (current.value || 0) - 1) });
        this.render();
      }
    });

    html.find(".slot-max-increase").on("click", async (e) => {
      e.preventDefault();
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor"]').val();
      const actor = game.actors.get(actorId);
      if (actor) {
        const current = actor.system.spells?.[`spell${level}`] || {};
        await actor.update({ [`system.spells.spell${level}.max`]: (current.max || 0) + 1 });
        this.render();
      }
    });

    html.find(".slot-max-decrease").on("click", async (e) => {
      e.preventDefault();
      const level = parseInt($(e.currentTarget).data("level"));
      const actorId = html.find('select[name="actor"]').val();
      const actor = game.actors.get(actorId);
      if (actor) {
        const current = actor.system.spells?.[`spell${level}`] || {};
        await actor.update({ [`system.spells.spell${level}.max`]: Math.max(0, (current.max || 0) - 1) });
        this.render();
      }
    });

    html.find(".add-extended").on("click", async (e) => {
      e.preventDefault();
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
      e.preventDefault();
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

Hooks.on("ready", () => {
  console.log("[Extended Spell Slots] ready hook fired");
  
  if (!CONFIG.DND5E) {
    console.error("[Extended Spell Slots] ERROR: CONFIG.DND5E not available!");
    return;
  }
  
  if (!CONFIG.DND5E.maxSpellSlotLevel) {
    CONFIG.DND5E.maxSpellSlotLevel = 20;
    
    for (let i = 10; i <= 20; i++) {
      if (!CONFIG.DND5E.spellLevels[i]) {
        CONFIG.DND5E.spellLevels[i] = `DND5E.SpellLevel${i}`;
      }
      if (!CONFIG.DND5E.spellcasting) CONFIG.DND5E.spellcasting = {};
      if (!CONFIG.DND5E.spellcasting.slots) CONFIG.DND5E.spellcasting.slots = {};
      if (!CONFIG.DND5E.spellcasting.slots[`spell${i}`]) {
        const suffix = i === 11 || i === 12 || i === 13 ? "th" : i % 10 === 1 ? "st" : i % 10 === 2 ? "nd" : i % 10 === 3 ? "rd" : "th";
        CONFIG.DND5E.spellcasting.slots[`spell${i}`] = `${i}${suffix} Level`;
      }
    }
    
    CONFIG.DND5E.spellSlotLevels = Array.from({ length: 20 }, (_, i) => i + 1);
    
    if (!CONFIG.DND5E.spellScaling) CONFIG.DND5E.spellScaling = {};
    for (let i = 10; i <= 20; i++) {
      if (!CONFIG.DND5E.spellScaling[i]) {
        CONFIG.DND5E.spellScaling[i] = `Slot ${i}`;
      }
    }
    
    console.log("[Extended Spell Slots] maxSpellSlotLevel set to 20");
  }
  
  console.log("[Extended Spell Slots] spellcasting.slots:", CONFIG.DND5E.spellcasting?.slots);
  
  const storedOpen = game.settings.get("extended-spell-slots", "openManager");
  if (storedOpen) {
    game.settings.set("extended-spell-slots", "openManager", false);
    new SpellSlotManager().render(true);
  }

  registerSpellSlotHooks();
  extendSpellSlotUI();
  extendActorSheets();
  
  if (game.settings.get("extended-spell-slots", "showControls")) {
    addSheetControls();
  }

  console.log("[Extended Spell Slots] Module v1.8.9 active");
  
  window.ExtendedSpellSlotsDebug = {
    verify: () => {
      console.log("=== Extended Spell Slots Debug ===");
      console.log("maxSpellSlotLevel:", CONFIG.DND5E.maxSpellSlotLevel);
      console.log("spellLevels[10-20]:");
      for (let i = 10; i <= 20; i++) {
        console.log(`  [${i}] = '${CONFIG.DND5E.spellLevels?.[i]}'`);
      }
      console.log("spellcasting.slots[spell10-20]:");
      for (let i = 10; i <= 20; i++) {
        console.log(`  spell${i} = '${CONFIG.DND5E.spellcasting?.slots?.[`spell${i}`]}'`);
      }
      console.log("=================================");
    },
    addSlots: async (actorId) => {
      const actor = game.actors.get(actorId);
      if (!actor) { console.error("Actor not found:", actorId); return; }
      const updates = {};
      for (let i = 10; i <= 20; i++) {
        updates[`system.spells.spell${i}.max`] = 1;
        updates[`system.spells.spell${i}.value`] = 1;
      }
      await actor.update(updates);
      console.log("[Extended Spell Slots] Added slots to", actor.name);
    }
  };
  
  setTimeout(() => {
    console.log("[Extended Spell Slots] Running verification...");
    window.ExtendedSpellSlotsDebug.verify();
  }, 2000);
});

function registerSpellSlotHooks() {
  Hooks.on("dnd5e.computeSpellProgression", (progression, actor, cls, spellcasting, count) => {
    if (!actor) return;
    const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
    if (maxLevel <= 9) return;
    
    const totalLevels = Object.values(actor.classes || {}).reduce((sum, c) => sum + (c.system?.levels || 0), 0);
    console.log(`[Extended Spell Slots] computeSpellProgression totalLevels=${totalLevels}`);
    
    if (totalLevels >= 17) {
      const extraSlots = Math.min(maxLevel - 9, totalLevels - 16);
      progression.spell = (progression.spell || 0) + extraSlots;
      console.log(`[Extended Spell Slots] Added ${extraSlots} extra slots`);
    }
  });
  
  Hooks.on("dnd5e.prepareSpellSlots", (spells, actor, progression) => {
    const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
    console.log(`[Extended Spell Slots] prepareSpellSlots for ${actor?.name}, maxLevel=${maxLevel}`);
    
    for (let i = 10; i <= maxLevel; i++) {
      const spellKey = `spell${i}`;
      if (!spells[spellKey]) {
        spells[spellKey] = { value: 0, max: 0 };
      }
      
      const slot = spells[spellKey];
      const suffix = i === 11 || i === 12 || i === 13 ? "th" : i % 10 === 1 ? "st" : i % 10 === 2 ? "nd" : i % 10 === 3 ? "rd" : "th";
      slot.label = `${i}${suffix} Level`;
      slot.level = i;
      slot.type = "leveled";
      
      if (slot.max === undefined || slot.max === 0) {
        slot.max = 1;
        slot.value = 1;
      }
      
      console.log(`[Extended Spell Slots] spell${i}: label='${slot.label}'`);
    }
  });
}

function extendSpellSlotUI() {
  Hooks.on("renderDialog", (dialog, html) => {
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
    
    html.find('select[name="level"], select[name="slot"], select[name="spellLevel"], select.spell-level, select[name*="spellLevel"]').each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      if (currentMax < maxLevel) {
        for (let i = 10; i <= maxLevel; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            const suffix = i === 11 || i === 12 || i === 13 ? "th" : i % 10 === 1 ? "st" : i % 10 === 2 ? "nd" : i % 10 === 3 ? "rd" : "th";
            $select.append(`<option value="${i}">${i}${suffix} Level</option>`);
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
    extendSheetSpellSlots(sheet, html);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    extendSheetSpellSlots(sheet, html);
  });
}

function extendSheetSpellSlots(sheet, html) {
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
  const actor = sheet.actor;
  
  if (!actor) return;
  
  const spells = actor.system.spells || {};
  let needsUpdate = false;
  const updates = {};
  
  for (let i = 10; i <= maxLevel; i++) {
    const spellKey = `spell${i}`;
    if (!spells[spellKey] || spells[spellKey].max === undefined) {
      updates[`system.spells.${spellKey}`] = { value: 0, max: 0 };
      needsUpdate = true;
    }
  }
  
  if (needsUpdate) {
    actor.update(updates);
    console.log(`[Extended Spell Slots] Added extended spell slot entries to ${actor.name}`);
  }

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
        <button type="button" class="add-extended-slots-btn" data-actor-id="${actor.id}">
          <i class="fas fa-plus"></i> Add Extended Slots
        </button>
        <button type="button" class="remove-extended-slots-btn" data-actor-id="${actor.id}">
          <i class="fas fa-minus"></i> Remove Extended Slots
        </button>
        <button type="button" class="open-slot-manager-btn">
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
    new SpellSlotManager().render(true);
  });
}
