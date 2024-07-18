/****************************************************************************
 * Copyright (C) 2017, Bitmovin, Inc., All Rights Reserved
 *
 * This source code and its use and distribution, is subject to the terms
 * and conditions of the applicable license agreement.
 ****************************************************************************/
/**
 * Default implementation of the KeyMap to Control the player
 */
class DefaultPlayerKeymap implements PlayerKeyMap {
  toggle_play = <KeyToFunctionBinding>{
    keyBinding: 'space',
    callback: (player: SupportedPlayerTypes) => {
      if (player.isPlaying()) {
        player.pause();
      } else {
        player.play();
      }
    },
  };
  toggle_mute = <KeyToFunctionBinding>{
    keyBinding: 'm',
    callback: (player: SupportedPlayerTypes) => {
      if (player.isMuted()) {
        player.unmute();
      } else {
        player.mute();
      }
    },
  };
  enter_fullscreen = <KeyToFunctionBinding>{
    keyBinding: 'f',
    callback: (player: SupportedPlayerTypes) => {
      if (player.getViewMode() !== 'fullscreen') {
        player.setViewMode('fullscreen');
      }
      if (player.getViewMode() === 'fullscreen') {
        player.setViewMode('inline');
      }
    },
  };
  exit_fullscreen = <KeyToFunctionBinding>{
    keyBinding: 'esc',
    callback: (player: SupportedPlayerTypes) => {
      if (player.getViewMode() === 'fullscreen') {
        player.setViewMode('inline');
      }
    },
  };
  seek_plus5_sec = <KeyToFunctionBinding>{
    keyBinding: 'right',
    callback: (player: SupportedPlayerTypes) => {
      player.seek(Math.min(player.getDuration(), player.getCurrentTime() + 5));
    },
  };
  seek_plus10_sec = <KeyToFunctionBinding>{
    keyBinding: 'ctrl+right / command+right',
    callback: (player: SupportedPlayerTypes) => {
      player.seek(Math.min(player.getDuration(), player.getCurrentTime() + 10));
    },
  };
  seek_minus5_sec = <KeyToFunctionBinding>{
    keyBinding: 'left',
    callback: (player: SupportedPlayerTypes) => {
      player.seek(Math.max(0, player.getCurrentTime() - 5));
    },
  };
  seek_minus10_sec = <KeyToFunctionBinding>{
    keyBinding: 'ctrl+left / command+left',
    callback: (player: SupportedPlayerTypes) => {
      player.seek(Math.max(0, player.getCurrentTime() - 10));
    },
  };
  volume_plus5 = <KeyToFunctionBinding>{
    keyBinding: 'up',
    callback: (player: SupportedPlayerTypes) => {
      player.setVolume(Math.min(100, player.getVolume() + 5));
    },
  };
  volume_plus10 = <KeyToFunctionBinding>{
    keyBinding: 'ctrl+up / command+up',
    callback: (player: SupportedPlayerTypes) => {
      player.setVolume(Math.min(100, player.getVolume() + 10));
    },
  };
  volume_minus5 = <KeyToFunctionBinding>{
    keyBinding: 'down',
    callback: (player: SupportedPlayerTypes) => {
      player.setVolume(Math.max(0, player.getVolume() - 5));
    },
  };
  volume_minus10 = <KeyToFunctionBinding>{
    keyBinding: 'ctrl+down / command+down',
    callback: (player: SupportedPlayerTypes) => {
      player.setVolume(Math.max(0, player.getVolume() - 10));
    },
  };

  getAllBindings(): KeyToFunctionBinding[] {
    let retVal: any[] = [];

    // collect all objects of this keymap
    // Do not use a static approach here as everything can be overwritten / extended
    for (let attr in this) {
      if (typeof this[attr] === 'object') {
        retVal.push(this[attr]);
      }
    }

    return retVal;
  }

  getAllBindingsForKey(keyRepresentation: string): KeyToFunctionBinding[] {
    let retVal: KeyToFunctionBinding[] = [];
    let allBindings = this.getAllBindings();
    // split the key command by + and check all parts seperatly so we have the same behavior with ctrl+alt as with alt+ctrl
    let allNeededKeys = keyRepresentation.split(KeyboardEventMapper.KeyCommandSeparator);
    allBindings.forEach((element: KeyToFunctionBinding) => {
      element.keyBinding.split(KeyboardEventMapper.KeyBindingSeparator).forEach((singleBinding: string) => {
        let containsAllParts = true;
        // make sure that the same amount of keys is needed and then make sure that all keys are contained
        let singleBindingParts = singleBinding.split(KeyboardEventMapper.KeyCommandSeparator);
        if (allNeededKeys.length === singleBindingParts.length) {
          allNeededKeys.forEach((keyCommandPart: string) => {
            if (singleBindingParts.indexOf(keyCommandPart) < 0) {
              containsAllParts = false;
            }
          });
          if (containsAllParts) {
            retVal.push(element);
          }
        }
      });
    });
    return retVal;
  }
}

/**
 * Definition of a Keyboard -> PlayerControl binding.
 * the player Method signals what should happen on the player, but the actual behaviour is completely controlled by
 * the callback.
 * If you wish to overwrite the default behavior you can overwrite the default listeners in the config. Any Binding defined
 * there will overwrite the default config.
 */
interface KeyToFunctionBinding {
  /**
   * the actual functionality of the binding, gets the player as a parameter
   */
  callback: Function;
  /**
   * The keycode to listen to. Multiple bindings can listen to the same key.
   */
  keyBinding: string;
}

/**
 * Definition of all player functions which are bound to a keystroke by default.
 * It is possible to configure any number of unknown KeyToFunctionBindings via the player configuration
 */
interface PlayerKeyMap {
  toggle_play: KeyToFunctionBinding;
  toggle_mute: KeyToFunctionBinding;
  enter_fullscreen: KeyToFunctionBinding;
  exit_fullscreen: KeyToFunctionBinding;
  seek_plus5_sec: KeyToFunctionBinding;
  seek_plus10_sec: KeyToFunctionBinding;
  seek_minus5_sec: KeyToFunctionBinding;
  seek_minus10_sec: KeyToFunctionBinding;
  volume_plus5: KeyToFunctionBinding;
  volume_plus10: KeyToFunctionBinding;
  volume_minus5: KeyToFunctionBinding;
  volume_minus10: KeyToFunctionBinding;

  /**
   * Retrieves a collection of all bindings of this KeyMap
   */
  getAllBindings(): KeyToFunctionBinding[];

  /**
   * Filters all bindings of this KeyMap to find the bindings which have a matching keyBinding
   * @param keyRepresentation the string representation of the desired keyStroke
   */
  getAllBindingsForKey(keyRepresentation: string): KeyToFunctionBinding[];
}

/**
 * All Player types which are supported by this class
 */
type SupportedPlayerTypes = any;

/**
 * Class to control a given player instance via the keyboard
 */
export class PlayerKeyboardControl {
  private keyMap: PlayerKeyMap;
  private isEnabled: boolean;
  private player: SupportedPlayerTypes;
  private shouldPreventScrolling: boolean;

  constructor(wrappedPlayer: SupportedPlayerTypes, preventPageScroll = true, config?: PlayerKeyMap) {
    this.player = wrappedPlayer;
    this.shouldPreventScrolling = preventPageScroll;
    let paramKeyMap: PlayerKeyMap | undefined;
    if (config) {
      paramKeyMap = config;
    }

    this.keyMap = new DefaultPlayerKeymap();

    // default to enabled
    // this also registers the event listeners
    this.isEnabled = true;
    this.enable(true);

    // destroy this together with the player
    this.player.on('Destroy', () => {
      this.destroy();
    });
  }

  public enable(shouldBeEnabled: boolean = true) {
    this.isEnabled = shouldBeEnabled;
    // depending if we are enabled register or remove the keyListener
    // we cannot use the keypress event as that event does not work with modifiers
    // only add the keyUp listener as we do not expect users holding buttons to control the player
    if (this.isEnabled) {
      // in order to stop the browser from scrolling we have to add an additional onKeyDown listener
      // because the browser would scroll on that one already
      if (this.shouldPreventScrolling) {
        document.addEventListener('keydown', this.preventScrolling, false);
      }
      document.addEventListener('keyup', this.handleKeyEvent, false);
    } else {
      // document.addEventListener('keypress', this.handleKeyEvent, false);
      document.removeEventListener('keydown', this.preventScrolling, false);
      document.removeEventListener('keyup', this.handleKeyEvent, false);
    }
  }

  public disable(shouldBeDisabled: boolean = true) {
    this.enable(!shouldBeDisabled);
  }

  /**
   * Use this method to prevent the browser from scrolling via keyboard
   * @param preventScrolling true if keyboard scrolling should be prevented, false if nots
   */
  public setPreventScrolling(preventScrolling: boolean): void {
    this.shouldPreventScrolling = preventScrolling;

    // set up or remove the listener if necessary
    if (this.isEnabled) {
      if (preventScrolling) {
        document.addEventListener('keydown', this.preventScrolling, false);
      } else {
        document.removeEventListener('keydown', this.preventScrolling, false);
      }
    }
  }

  public destroy() {
    // removes the listener
    this.disable(true);
  }

  /* protected static mergeConfigWithDefault(
        paramKeyMap: PlayerKeyMap | undefined
    ): PlayerKeyMap {
        let retVal: PlayerKeyMap = new DefaultPlayerKeymap()
        if (paramKeyMap) {
            // allow overwrites to the default player keymap as well as new listeners
            for (let attr in paramKeyMap) {
                if (attr && paramKeyMap[attr as keyof PlayerKeyMap]) {
                    let toCheck = paramKeyMap[attr as keyof PlayerKeyMap]
                    // avoid wrong configs and check for elements being real keyListeners
                    if (toCheck['keyBinding'] && toCheck['callback']) {
                        retVal[attr as keyof PlayerKeyMap] =
                            paramKeyMap[attr as keyof PlayerKeyMap]
                    } else {
                        console.log(
                            'Invalid Key Listener at params[' + attr + ']'
                        )
                    }
                }
            }
        }
        return retVal
    } */

  public preventScrolling = (event: KeyboardEvent) => {
    const code = event.code;
    // prevent scrolling with arrow keys, space, pageUp and pageDown
    if (KeyboardEventMapper.isScrollKey(code)) {
      // maybe we should check here if we actually have a keybinding for the code and only prevent
      // the scrolling if we actually handle the event
      event.preventDefault();
    }
  };

  public handleKeyEvent = (event: KeyboardEvent) => {
    if (this.isEnabled) {
      let keyStringRepresentation = KeyboardEventMapper.convertKeyboardEventToString(event);

      let bindings = this.keyMap.getAllBindingsForKey(keyStringRepresentation);
      bindings.forEach((singleBinding: KeyToFunctionBinding) => {
        singleBinding.callback(this.player);
      });
    }
  };
}

/**
 * Class to handle mappings from KeyboardEvent.code to a string representation
 */
class KeyboardEventMapper {
  public static KeyBindingSeparator = ' / ';
  public static KeyCommandSeparator = '+';

  /**
   * Keys which will be represented as a modifier
   */
  public static ModifyerKeys = {
    ShiftLeft: 'shift',
    ShiftRight: 'shift',
    ControlLeft: 'ctrl',
    ControlRight: 'ctrl',
    AltLeft: 'alt',
    AltRight: 'alt',
    CapsLock: 'capslock',
    MetaLeft: 'meta',
    MetaRight: 'meta',
  };

  /**
   * Special keys on the keyboard which are not modifiers
   */
  public static ControlKeys = {
    Backspace: 'backspace',
    Tab: 'tab',
    Enter: 'enter',
    Pause: 'pause',
    Escape: 'esc',
    Space: 'space',
    PageUp: 'pageup',
    PageDown: 'pagedown',
    End: 'end',
    Home: 'home',
    ArrowLeft: 'left',
    ArrowUp: 'up',
    ArrowRight: 'right',
    ArrowDown: 'down',
    PrintScreen: 'print',
    Insert: 'ins',
    Delete: 'del',
    ScrollLock: 'scrolllock',
    Semicolon: ';',
    Equal: '=',
    Comma: ',',
    Minus: '-',
    Period: '.',
    Slash: '/',
    Backquote: '`',
    BracketLeft: '[',
    Backslash: '\\',
    BracketRight: ']',
    // Quote: "'",
  };

  /**
   * Keys which normally move the page
   */
  public static ScrollingKeys = {
    Space: 'space',
    PageUp: 'pageup',
    PageDown: 'pagedown',
    End: 'end',
    Home: 'home',
    ArrowLeft: 'left',
    ArrowUp: 'up',
    ArrowRight: 'right',
    ArrowDown: 'down',
  };

  /**
   * All numbers on the numpad and the keys surrounding it
   */
  public static NumblockKeys = {
    Numpad0: '0',
    Numpad1: '1',
    Numpad2: '2',
    Numpad3: '3',
    Numpad4: '4',
    Numpad5: '5',
    Numpad6: '6',
    Numpad7: '7',
    Numpad8: '8',
    Numpad9: '9',
    NumpadMultiply: '*',
    NumpadAdd: '+',
    NumpadSubtract: '-',
    NumpadDecimal: '.',
    NumpadDivide: '/',
    NumLock: 'numlock',
  };

  /**
   * F1 - F19
   */
  public static F_Keys = {
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    F13: 'F13',
    F14: 'F14',
    F15: 'F15',
    F16: 'F16',
    F17: 'F17',
    F18: 'F18',
    F19: 'F19',
  };

  /**
   * Alphabet keys a-z
   */
  public static AlphabetKeys = {
    KeyA: 'a',
    KeyB: 'b',
    KeyC: 'c',
    KeyD: 'd',
    KeyE: 'e',
    KeyF: 'f',
    KeyG: 'g',
    KeyH: 'h',
    KeyI: 'i',
    KeyJ: 'j',
    KeyK: 'k',
    KeyL: 'l',
    KeyM: 'm',
    KeyN: 'n',
    KeyO: 'o',
    KeyP: 'p',
    KeyQ: 'q',
    KeyR: 'r',
    KeyS: 's',
    KeyT: 't',
    KeyU: 'u',
    KeyV: 'v',
    KeyW: 'w',
    KeyX: 'x',
    KeyY: 'y',
    KeyZ: 'z',
  };

  /**
   * Converts a Keyboard Event to something like shit+alt+g depending on the character code of the event and the modifiers
   * @param event the event to be converted into a string
   * @returns {string} the representation of the all keys which were pressed
   */
  public static convertKeyboardEventToString(event: KeyboardEvent): string {
    let retVal = '';
    let needsConcat: boolean = false;

    if (event.shiftKey) {
      retVal += 'shift';
      needsConcat = true;
    }
    if (event.altKey) {
      if (needsConcat) {
        retVal += KeyboardEventMapper.KeyCommandSeparator;
      } else {
        needsConcat = true;
      }
      retVal += 'alt';
    }
    if (event.ctrlKey || event.metaKey) {
      if (needsConcat) {
        retVal += KeyboardEventMapper.KeyCommandSeparator;
      } else {
        needsConcat = true;
      }
      retVal += 'ctrl';
    }

    let convertedCode = KeyboardEventMapper.convertKeyCodeToString(event);
    if (convertedCode) {
      if (needsConcat) {
        retVal += KeyboardEventMapper.KeyCommandSeparator;
      }
      retVal += convertedCode;
    } else {
      console.log('No conversion for the code: ' + event.code);
    }

    return retVal;
  }

  /**
   * Tries to convert a given code to a string representation of the key
   * @param event the event which contains the code
   * @returns {string} the string representation of the code (eg.: 'left', 'esc', 'space', 'a', '1' ...)
   */
  public static convertKeyCodeToString(event: KeyboardEvent): string {
    let code = event.code;

    let retVal: string;
    if (KeyboardEventMapper.isModifierKey(code)) {
      retVal = KeyboardEventMapper.ModifyerKeys[code as keyof typeof KeyboardEventMapper.ModifyerKeys];
    } else if (KeyboardEventMapper.isControlKey(code)) {
      retVal = KeyboardEventMapper.ControlKeys[code as keyof typeof KeyboardEventMapper.ControlKeys];
    } else if (KeyboardEventMapper.isNumblockKey(code)) {
      retVal = KeyboardEventMapper.NumblockKeys[code as keyof typeof KeyboardEventMapper.NumblockKeys];
    } else if (KeyboardEventMapper.isFKey(code)) {
      retVal = KeyboardEventMapper.F_Keys[code as keyof typeof KeyboardEventMapper.F_Keys];
    } else if (KeyboardEventMapper.isAlphabetKeys(code)) {
      // try and convert a unicode character
      retVal = KeyboardEventMapper.AlphabetKeys[code as keyof typeof KeyboardEventMapper.AlphabetKeys];
    } else {
      // try and convert a unicode character
      retVal = code.toLowerCase();
    }

    return retVal;
  }

  public static isModifierKey(code: string): boolean {
    return KeyboardEventMapper.ModifyerKeys.hasOwnProperty(code);
  }

  public static isControlKey(code: string): boolean {
    return KeyboardEventMapper.ControlKeys.hasOwnProperty(code);
  }

  public static isNumblockKey(code: string): boolean {
    return KeyboardEventMapper.NumblockKeys.hasOwnProperty(code);
  }

  public static isFKey(code: string): boolean {
    return KeyboardEventMapper.F_Keys.hasOwnProperty(code);
  }

  public static isScrollKey(code: string): boolean {
    return KeyboardEventMapper.ScrollingKeys.hasOwnProperty(code);
  }

  public static isAlphabetKeys(code: string): boolean {
    return KeyboardEventMapper.AlphabetKeys.hasOwnProperty(code);
  }
}
