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

### Requirements

- Foundry VTT v13 or v14
- D&D 5e System v5.0.0 or higher

### Installation

1. Download the module from GitHub
2. Install via Foundry VTT's module manager
3. Enable the module in your world

### Manual Installation

Paste the following manifest URL into Foundry's "Install Module" dialog:

```
https://raw.githubusercontent.com/Null8Void/foundry-extended-spell-slots/main/module.json
```

### Usage

Once enabled, spell slot selectors throughout the D&D 5e system interface will include options for levels 10-20. This affects:

- Spell preparation panels
- Spell slot configuration
- Scroll creation
- Spell casting dialogs

### Known Limitations

- High-level spell slots (10+) do not have default progression defined by the rules
- You may need to manually configure slot availability through class features or the character sheet
- Some UI elements may require a refresh after changing settings

## License

MIT License
