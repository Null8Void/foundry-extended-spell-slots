// Extended Spell Slots Module for Foundry VTT
// Extends spell slots beyond 9th level up to 20th level

const MAX_SPELL_SLOT_LEVEL = 20;

function getOrdinalSuffix(num) {
  const lastTwoDigits = num % 100;
  if (lastTwoDigits === 11 || lastTwoDigits === 12 || lastTwoDigits === 13) return "th";
  const lastDigit = num % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}

function getSpellSlotLabel(level) {
  const suffix = getOrdinalSuffix(level);
  return `${level}${suffix} Level`;
}

Hooks.once("dnd5e.init", () => {
  console.log("|========================================|");
  console.log("| Extended Spell Slots: dnd5e.init fired  |");
  console.log("|========================================|");
  
  if (!CONFIG.DND5E) {
    console.error("Extended Spell Slots: ERROR - DND5E system not found!");
    return;
  }

  const maxLevel = Math.max(20, Object.keys(CONFIG.DND5E.spellLevels || {}).length - 1);
  CONFIG.DND5E.maxSpellSlotLevel = maxLevel;

  console.log("Extended Spell Slots: maxSpellSlotLevel set to", maxLevel);

  for (let i = 10; i <= maxLevel; i++) {
    const suffix = getOrdinalSuffix(i);
    CONFIG.DND5E.spellLevels[i] = `DND5E.SpellLevel${i}`;
    if (!CONFIG.DND5E.spellcasting) CONFIG.DND5E.spellcasting = {};
    if (!CONFIG.DND5E.spellcasting.slots) CONFIG.DND5E.spellcasting.slots = {};
    CONFIG.DND5E.spellcasting.slots[`spell${i}`] = getSpellSlotLabel(i);
    
    console.log(`Extended Spell Slots: [CONFIG] spellLevels[${i}] = '${CONFIG.DND5E.spellLevels[i]}', spellcasting.slots.spell${i} = '${CONFIG.DND5E.spellcasting.slots[`spell${i}`]}'`);
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
    console.log(`Extended Spell Slots: Extended SPELL_SLOT_TABLE to ${CONFIG.DND5E.SPELL_SLOT_TABLE.length} levels`);
  }

  if (!CONFIG.DND5E.spellSlotTable && CONFIG.DND5E.SPELL_SLOT_TABLE) {
    CONFIG.DND5E.spellSlotTable = CONFIG.DND5E.SPELL_SLOT_TABLE;
  }

  console.log(`Extended Spell Slots: [INIT] Configuration complete. Max level: ${maxLevel}`);

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
  
  game.settings.register("extended-spell-slots", "debugMode", {
    name: "Enable Debug Mode",
    hint: "Enable detailed debug logging to console",
    scope: "world",
    config: true,
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
          label: getSpellSlotLabel(i),
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

function debugLog(...args) {
  if (game.settings.get("extended-spell-slots", "debugMode")) {
    console.log("[Extended Spell Slots DEBUG]", ...args);
  }
}

Hooks.on("ready", () => {
  console.log(" ");
  console.log("+========================================+");
  console.log("| Extended Spell Slots: ready hook fired |");
  console.log("+========================================+");
  
  if (!CONFIG.DND5E) {
    console.error("Extended Spell Slots: FATAL - CONFIG.DND5E not available!");
    return;
  }
  
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

  if (!CONFIG.DND5E.maxSpellSlotLevel) {
    CONFIG.DND5E.maxSpellSlotLevel = 20;
    console.warn("Extended Spell Slots: maxSpellSlotLevel was missing, set to 20");
  }
  
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel;
  
  for (let i = 10; i <= maxLevel; i++) {
    if (!CONFIG.DND5E.spellLevels[i]) {
      CONFIG.DND5E.spellLevels[i] = `DND5E.SpellLevel${i}`;
      console.log(`Extended Spell Slots: [READY] Added spellLevels[${i}] = '${CONFIG.DND5E.spellLevels[i]}'`);
    }
    if (!CONFIG.DND5E.spellcasting) CONFIG.DND5E.spellcasting = {};
    if (!CONFIG.DND5E.spellcasting.slots) CONFIG.DND5E.spellcasting.slots = {};
    if (!CONFIG.DND5E.spellcasting.slots[`spell${i}`]) {
      CONFIG.DND5E.spellcasting.slots[`spell${i}`] = getSpellSlotLabel(i);
      console.log(`Extended Spell Slots: [READY] Added spellcasting.slots.spell${i} = '${CONFIG.DND5E.spellcasting.slots[`spell${i}`]}'`);
    }
  }
  
  CONFIG.DND5E.spellSlotLevels = Array.from({ length: 20 }, (_, i) => i + 1);
  
  if (!CONFIG.DND5E.spellScaling) CONFIG.DND5E.spellScaling = {};
  for (let i = 10; i <= maxLevel; i++) {
    if (!CONFIG.DND5E.spellScaling[i]) {
      CONFIG.DND5E.spellScaling[i] = `Slot ${i}`;
    }
  }
  
  console.log(" ");
  console.log("===========================================");
  console.log("  Extended Spell Slots (5e) v1.9.0");
  console.log("  Debug mode:", game.settings.get("extended-spell-slots", "debugMode") ? "ENABLED" : "disabled");
  console.log("  Max slot level:", maxLevel);
  console.log("===========================================");
  console.log(" ");
  
  window.ExtendedSpellSlotsDebug = {
    verify: () => {
      console.group("===========================================");
      console.group("  EXTENDED SPELL SLOTS DEBUG VERIFICATION");
      console.group("===========================================");
      
      const results = {
        config: {},
        labels: {},
        issues: []
      };
      
      const configuredMaxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
      console.log("Max configured level:", configuredMaxLevel);
      
      for (let i = 1; i <= configuredMaxLevel; i++) {
        const spellLevelKey = CONFIG.DND5E.spellLevels?.[i];
        const slotKey = CONFIG.DND5E.spellcasting?.slots?.[`spell${i}`];
        
        results.config[i] = {
          spellLevelsKey: spellLevelKey,
          slotKey: slotKey
        };
        
        if (i >= 10) {
          const label = getSpellSlotLabel(i);
          const localizedLabel = game.i18n.localize(label);
          
          results.labels[i] = {
            generatedLabel: label,
            localizedLabel: localizedLabel,
            configSlotKey: slotKey,
            isLocalized: localizedLabel !== label
          };
          
          if (slotKey === `DND5E.Spellcasting.Slots.Spell${i}`) {
            results.issues.push(`Level ${i}: Using raw config key instead of localized label`);
          }
          
          console.log(`Level ${i}:`);
          console.log(`  - Generated label: "${label}"`);
          console.log(`  - Localized: "${localizedLabel}"`);
          console.log(`  - Config slot key: "${slotKey}"`);
        }
      }
      
      console.groupEnd();
      
      if (results.issues.length > 0) {
        console.warn("Issues found:", results.issues);
        ui.notifications.warn(`Extended Spell Slots: ${results.issues.length} issue(s) - check console`);
      } else {
        console.log("All spell slot labels verified successfully!");
        ui.notifications.info("Extended Spell Slots: Debug verification complete - no issues!");
      }
      
      console.groupEnd();
      
      return results;
    },
    
    logConfig: () => {
      console.group("Extended Spell Slots - Current CONFIG");
      console.log("maxSpellSlotLevel:", CONFIG.DND5E.maxSpellSlotLevel);
      console.log("spellLevels:", CONFIG.DND5E.spellLevels);
      console.log("spellcasting.slots:", CONFIG.DND5E.spellcasting?.slots);
      console.log("spellSlotLevels:", CONFIG.DND5E.spellSlotLevels);
      console.groupEnd();
    },
    
    addSlotsToActor: async (actorId) => {
      const actor = game.actors.get(actorId);
      if (!actor) {
        console.error("Actor not found:", actorId);
        return;
      }
      
      const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
      const updates = {};
      for (let i = 10; i <= maxLevel; i++) {
        updates[`system.spells.spell${i}.max`] = 1;
        updates[`system.spells.spell${i}.value`] = 1;
      }
      await actor.update(updates);
      console.log(`Added slots 10-${maxLevel} to ${actor.name}`);
    },
    
    removeSlotsFromActor: async (actorId) => {
      const actor = game.actors.get(actorId);
      if (!actor) {
        console.error("Actor not found:", actorId);
        return;
      }
      
      const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
      const updates = {};
      for (let i = 10; i <= maxLevel; i++) {
        updates[`system.spells.spell${i}.max`] = 0;
        updates[`system.spells.spell${i}.value`] = 0;
      }
      await actor.update(updates);
      console.log(`Removed slots 10-${maxLevel} from ${actor.name}`);
    }
  };
  
  console.log("%cExtended Spell Slots Debug Helper available!%c", "background: #7a2519; color: white; padding: 4px 8px; border-radius: 4px;", "");
  console.log("Commands:");
  console.log("  window.ExtendedSpellSlotsDebug.verify() - Verify all spell slot labels");
  console.log("  window.ExtendedSpellSlotsDebug.logConfig() - Log current configuration");
  console.log("  window.ExtendedSpellSlotsDebug.addSlotsToActor('actor-id') - Add slots to actor");
  console.log("  window.ExtendedSpellSlotsDebug.removeSlotsFromActor('actor-id') - Remove slots from actor");
  
  setTimeout(() => {
    if (game.settings.get("extended-spell-slots", "debugMode")) {
      console.log("%c[Extended Spell Slots] Running automatic verification...", "color: #7a2519;");
      window.ExtendedSpellSlotsDebug.verify();
    }
  }, 2000);
});

function registerSpellSlotHooks() {
  Hooks.on("dnd5e.computeSpellProgression", (progression, actor, cls, spellcasting, count) => {
    if (!actor) return;
    const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
    if (maxLevel <= 9) return;
    
    const totalLevels = Object.values(actor.classes || {}).reduce((sum, c) => sum + (c.system?.levels || 0), 0);
    debugLog(`computeSpellProgression - totalLevels=${totalLevels}, progression.spell=${progression.spell}`);
    
    if (totalLevels >= 17) {
      const extraSlots = Math.min(maxLevel - 9, totalLevels - 16);
      progression.spell = (progression.spell || 0) + extraSlots;
      debugLog(`Added ${extraSlots} extra slots, new progression.spell=${progression.spell}`);
    }
  });
  
  Hooks.on("dnd5e.prepareSpellSlots", (spells, actor, progression) => {
    const maxLevel = game.settings.get("extended-spell-slots", "maxSlotLevel") || MAX_SPELL_SLOT_LEVEL;
    debugLog(`prepareSpellSlots called for ${actor?.name}, maxLevel=${maxLevel}`);
    
    for (let i = 10; i <= maxLevel; i++) {
      const spellKey = `spell${i}`;
      if (!spells[spellKey]) {
        spells[spellKey] = { value: 0, max: 0 };
      }
      
      const slot = spells[spellKey];
      const label = getSpellSlotLabel(i);
      
      slot.label = label;
      slot.level = i;
      slot.type = "leveled";
      slot.max = slot.max ?? 0;
      slot.value = slot.value ?? 0;
      
      if (slot.max === 0) {
        slot.max = 1;
        slot.value = 1;
      }
      
      debugLog(`Level ${i}: label="${slot.label}", max=${slot.max}, value=${slot.value}`);
    }
  });
}

function extendSpellSlotUI() {
  Hooks.on("renderDialog", (dialog, html) => {
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
    const dialogTitle = dialog.options.title || "";
    
    debugLog(`Dialog rendered: "${dialogTitle}"`);
    
    const spellSlotSelects = html.find('select[name="level"], select[name="slot"], select[name="spellLevel"], select[name="system.spells.spellLevel"], select.spell-level, select[data-name*="spellLevel"]');
    
    spellSlotSelects.each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      debugLog(`Found spell slot select. Current max: ${currentMax}, Target max: ${maxLevel}`);
      
      if (currentMax < maxLevel) {
        for (let i = 10; i <= maxLevel; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            const label = getSpellSlotLabel(i);
            $select.append(`<option value="${i}">${label}</option>`);
            debugLog(`Added option: ${i} = ${label}`);
          }
        }
      }
    });

    html.find('input[type="number"][max]').each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      if (max < maxLevel) {
        $input.attr("max", maxLevel);
        debugLog(`Extended input max from ${max} to ${maxLevel}`);
      }
    });
  });
  
  Hooks.on("renderActorSheet5e", (sheet, html) => {
    const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
    
    html.find('select[name*="spellLevel"], select.spell-level, select[data-level]').each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      if (currentMax < maxLevel) {
        for (let i = 10; i <= maxLevel; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            const label = getSpellSlotLabel(i);
            $select.append(`<option value="${i}">${label}</option>`);
          }
        }
      }
    });
    
    html.find('input[type="number"][max]').each(function() {
      const $input = $(this);
      const $closestSlot = $input.closest(".spell-slot, .slot");
      if ($closestSlot.length || $input.attr("name")?.includes("spell")) {
        const max = parseInt($input.attr("max")) || 9;
        if (max < maxLevel) {
          $input.attr("max", maxLevel);
        }
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
  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
  debugLog("Extending actor sheet spell slots, maxLevel:", maxLevel);

  html.find(".spell-slots .slots, .spell-slots .slot-uses, .spell-slot, .slot-value").each(function() {
    const $container = $(this);
    
    $container.find("input, select").each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      if (max < maxLevel && (max === 9 || !max || max === 0)) {
        $input.attr("max", maxLevel);
        debugLog(`Extended input max to ${maxLevel}`);
      }
    });
  });
  
  const spellSlotMaxOverrides = html.find(".slot-max-override, .spell-max[data-level]");
  if (spellSlotMaxOverrides.length) {
    debugLog(`Found ${spellSlotMaxOverrides.length} spell slot max override elements`);
  }
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

  const maxLevel = CONFIG.DND5E.maxSpellSlotLevel || 20;
  const actor = sheet.actor;

  const controlsHtml = `
    <div class="extended-spell-slots-panel" style="margin: 10px; padding: 10px; background: rgba(122, 37, 25, 0.1); border: 1px solid #7a2519; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; color: #7a2519;">
        <i class="fas fa-magic"></i>
        Extended Spell Slots (10-${maxLevel})
      </h3>
      <div class="extended-slots-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="add-extended-slots-btn" data-actor-id="${actor.id}" style="flex: 1; padding: 8px; cursor: pointer;">
          <i class="fas fa-plus"></i> Add Extended Slots
        </button>
        <button type="button" class="remove-extended-slots-btn" data-actor-id="${actor.id}" style="flex: 1; padding: 8px; cursor: pointer;">
          <i class="fas fa-minus"></i> Remove Extended Slots
        </button>
        <button type="button" class="open-slot-manager-btn" style="flex: 1; padding: 8px; cursor: pointer;">
          <i class="fas fa-cog"></i> Slot Manager
        </button>
      </div>
    </div>
  `;

  const spellSlotsSection = html.find(".spell-slots, .spellbook, .tab[data-tab='spells']");
  if (spellSlotsSection.length > 0) {
    spellSlotsSection.first().after(controlsHtml);
  } else {
    html.find(".sheet-content, .primary-body, .tab-content").first().prepend(controlsHtml);
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
      debugLog(`Added extended slots to actor: ${targetActor.name}`);
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
      debugLog(`Removed extended slots from actor: ${targetActor.name}`);
    }
  });

  html.find(".open-slot-manager-btn").on("click", (e) => {
    e.preventDefault();
    new SpellSlotManager().render(true);
    debugLog("Opened Spell Slot Manager");
  });
}
