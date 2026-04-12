// Debug log to confirm the module script is loading
console.log("🔮 Extended Spell Slots module script loaded!");

const MAX_SPELL_SLOT_LEVEL = 20;

Hooks.once("init", () => {
  if (!CONFIG.DND5E) return;

  CONFIG.DND5E.spellSlotLevels = Array.from({ length: MAX_SPELL_SLOT_LEVEL }, (_, i) => i + 1);

  CONFIG.DND5E.spellScaling = {
    ...CONFIG.DND5E.spellScaling,
    [MAX_SPELL_SLOT_LEVEL]: `Slot ${MAX_SPELL_SLOT_LEVEL}`
  };

  console.log(`🔮 CONFIG.DND5E.spellSlotLevels extended to ${MAX_SPELL_SLOT_LEVEL} levels`);
});

Hooks.once("ready", () => {
  extendSpellSlotUI();
  extendActorSheetSpellSlots();
  extendSpellItemSheet();

  console.log(`🔮 Extended Spell Slots (5e) active. Spell slots extended to level ${MAX_SPELL_SLOT_LEVEL}`);
});

function extendSpellSlotUI() {
  const originalCreateDialog = Dialog.prototype.render;
  Dialog.prototype.render = function(force, options) {
    const result = originalCreateDialog.call(this, force, options);
    extendSpellSlotDropdowns(this);
    return result;
  };

  Hooks.on("renderDialog", (dialog, html) => {
    extendSpellSlotDropdowns(dialog);
  });
}

function extendSpellSlotDropdowns(dialog) {
  const html = dialog.element || dialog;
  const $html = typeof html === "string" ? $(html) : html;

  $html.find('select[name="slot"], select[name="level"], select[name="spellLevel"]').each(function() {
    const $select = $(this);
    const currentMax = parseInt($select.find("option:last-child").val()) || 9;
    
    if (currentMax < MAX_SPELL_SLOT_LEVEL) {
      for (let i = 10; i <= MAX_SPELL_SLOT_LEVEL; i++) {
        if (!$select.find(`option[value="${i}"]`).length) {
          $select.append(`<option value="${i}">${ordinal(i)} Level</option>`);
        }
      }
    }
  });

  $html.find('input[type="number"][name*="level"], input[type="number"][name*="slot"]').each(function() {
    const $input = $(this);
    const max = parseInt($input.attr("max")) || 9;
    
    if (max < MAX_SPELL_SLOT_LEVEL) {
      $input.attr("max", MAX_SPELL_SLOT_LEVEL);
      $input.attr("min", "0");
    }
  });
}

function extendActorSheetSpellSlots() {
  Hooks.on("renderActorSheet5eCharacter", (sheet, html) => {
    extendSpellSlotInputs(html);
    extendSpellSlotUses(html);
  });

  Hooks.on("renderActorSheet5eNPC", (sheet, html) => {
    extendSpellSlotInputs(html);
    extendSpellSlotUses(html);
  });
}

function extendSpellSlotInputs(html) {
  html.find('.spell-slots input[type="number"], .spell-slot-input input').each(function() {
    const $input = $(this);
    const max = parseInt($input.attr("max")) || 9;
    
    if (max < MAX_SPELL_SLOT_LEVEL) {
      $input.attr("max", MAX_SPELL_SLOT_LEVEL);
    }
  });

  html.find('.spell-level-input, .slot-level-input').each(function() {
    const $container = $(this);
    const $select = $container.find("select, input");
    
    if ($select.length) {
      const max = parseInt($select.attr("max")) || 9;
      
      if (max < MAX_SPELL_SLOT_LEVEL) {
        if ($select.is("select")) {
          for (let i = 10; i <= MAX_SPELL_SLOT_LEVEL; i++) {
            if (!$select.find(`option[value="${i}"]`).length) {
              $select.append(`<option value="${i}">${ordinal(i)}</option>`);
            }
          }
        } else {
          $select.attr("max", MAX_SPELL_SLOT_LEVEL);
        }
      }
    }
  });
}

function extendSpellSlotUses(html) {
  html.find(".spell-slot-uses, .slot-uses").each(function() {
    const $container = $(this);
    const $buttons = $container.find("button");

    if ($buttons.length) {
      const maxSlotLevel = $buttons.length;
      
      if (maxSlotLevel < MAX_SPELL_SLOT_LEVEL) {
        const $lastButton = $buttons.last();
        const $parent = $container.find(".slot-max-override, .spell-slots .info, .slots-header");
        
        for (let i = maxSlotLevel + 1; i <= MAX_SPELL_SLOT_LEVEL; i++) {
          const $newButton = $lastButton.clone();
          $newButton.attr("data-slot", i);
          $newButton.find(".slot-level").text(i);
          $newButton.find(".slot-value").text("0");
          $newButton.find(".slot-max").text("0");
          $newButton.addClass("empty");
          
          if ($parent.length) {
            $parent.after($newButton);
          } else {
            $container.append($newButton);
          }
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
    extendSpellSlotDropdowns(app);
    
    html.find("input[name='max']").each(function() {
      const $input = $(this);
      const max = parseInt($input.attr("max")) || 9;
      
      if (max < MAX_SPELL_SLOT_LEVEL) {
        $input.attr("max", MAX_SPELL_SLOT_LEVEL);
      }
    });

    html.find("select[name='level']").each(function() {
      const $select = $(this);
      const currentMax = parseInt($select.find("option:last-child").val()) || 9;
      
      if (currentMax < MAX_SPELL_SLOT_LEVEL) {
        for (let i = 10; i <= MAX_SPELL_SLOT_LEVEL; i++) {
          if (!$select.find(`option[value="${i}"]`).length) {
            $select.append(`<option value="${i}">${ordinal(i)} Level</option>`);
          }
        }
      }
    });
  });
}

function extendSpellLevelSelect(html, selector) {
  html.find(selector).each(function() {
    const $select = $(this);
    const currentMax = parseInt($select.find("option:last-child").val()) || 9;
    
    if (currentMax < MAX_SPELL_SLOT_LEVEL) {
      for (let i = 10; i <= MAX_SPELL_SLOT_LEVEL; i++) {
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

libWrapper && libWrapper.register("extended-spell-slots", "CONFIG.Actor.documentClass.prototype._update", async function(wrapped, formData, ...args) {
  if (typeof formData === "object" && !Array.isArray(formData)) {
    if (formData["system.spells?.spell1?.level"]) {
      let level = parseInt(formData["system.spells?.spell1?.level"]);
      if (level > MAX_SPELL_SLOT_LEVEL) {
        formData["system.spells?.spell1?.level"] = MAX_SPELL_SLOT_LEVEL;
      }
    }
    
    for (let i = 1; i <= MAX_SPELL_SLOT_LEVEL; i++) {
      const levelKey = `system.spells.spell${i}.max`;
      if (formData[levelKey] !== undefined) {
        let max = parseInt(formData[levelKey]);
        if (max > 99) {
          formData[levelKey] = 99;
        }
      }
    }
  }
  
  return wrapped(formData, ...args);
}, "WRAPPER");
