# foundry-extended-spell-slots

Extends D&D 5e spell slots beyond 9th level, up to 20th level.

## About

This module allows players and game masters to use spell slots of 10th level and higher, enabling homebrew content that requires high-level spell slots such as epic magic and custom high-level class features.

### Features

- Extends spell slot selection UI to include levels 10-20
- Compatible with spell preparation and casting interfaces
- Works with both character sheets and NPC sheets
- Updates spell slot configuration dialogs
- Extends scroll creation for higher-level spells
- Built-in Spell Slot Manager for easy slot management
- Add/Remove buttons on character sheets

### Requirements

- Foundry VTT v13 or v14
- D&D 5e System v5.0.0 or higher

## Usage

### Method 1: Character Sheet Buttons

When enabled (default), each character and NPC sheet will show a control panel under the spell slots section with three options:

1. **Add All Extended Slots** - Grants 1 slot at each level 10-20
2. **Remove All Extended Slots** - Removes all extended slots
3. **Slot Manager** - Opens the detailed spell slot manager

### Method 2: Spell Slot Manager

Access via the module settings menu or the button on character sheets.

The Spell Slot Manager allows you to:
- Select any actor in your world
- View current spell slots at all levels
- Increment/decrement slot values individually
- Increment/decrement slot maximums individually
- Add or remove all extended slots at once

### Method 3: Module Settings

Access via the Foundry VTT "Configure Modules" settings:

1. **Maximum Spell Slot Level** - Set the highest allowed slot level (10-20, default: 20)
2. **Show Add Spell Slot Button** - Toggle the control buttons on character sheets

### Method 4: Direct Editing

You can also manually edit spell slots by:
1. Opening the character sheet
2. Clicking the gear icon next to spell slots
3. Setting the level to 10+ in the dropdown

## Installation

### Automatic Installation (Recommended)

Paste the following manifest URL into Foundry's "Install Module" dialog:

```
https://raw.githubusercontent.com/Null8Void/foundry-extended-spell-slots/main/module.json
```

### Manual Installation

1. Download the module from GitHub
2. Extract to your `Data/modules` folder
3. Restart Foundry VTT
4. Enable the module in your world

## Known Limitations

- High-level spell slots (10+) do not have default progression defined by the rules
- Some UI elements may require a refresh after changing settings
- Epic-level spell slots are primarily for homebrew/optional rule content

## License

MIT License
