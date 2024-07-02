import {
  InternalUIConfig,
  PlayerWrapper,
  UIInstanceManager,
  UIManager,
  UIVariant,
} from '../src/ts/uimanager';
import { PlayerAPI } from 'bitmovin-player';
import { MockHelper, TestingPlayerAPI } from './helper/MockHelper';
import { MobileV3PlayerEvent } from '../src/ts/mobilev3playerapi';
import { UIContainer } from '../src/ts/components/uicontainer';
import { Container } from '../src/ts/components/container';

jest.mock('../src/ts/dom');

// This just simulates a Class that can be wrapped by our PlayerWrapper.
// To enable this simple class structure we need a lot of any casts in the tests.
class A {
  private value?: object = undefined;

  get a() {
    return this.value;
  }

  // This is needed to change the actual value of the property
  giveValueAValue() {
    this.value = { foo: 'bar' };
  }
}

class B extends A {
  get b() {
    return {};
  }
}

class C extends B {
  get c() {
    return {};
  }
}

describe('UIManager', () => {
  describe('PlayerWrapper', () => {
    let playerWrapper: PlayerWrapper;

    describe('without inheritance', () => {
      let superClassInstance: A;

      beforeEach(() => {
        const testInstance: PlayerAPI = new A() as any as PlayerAPI;
        playerWrapper = new PlayerWrapper(testInstance);
        (testInstance as any).giveValueAValue(); // Change the value of the actual property to simulate async loaded module
        superClassInstance = playerWrapper.getPlayer() as any as A;
      });

      it('wraps functions', () => {
        expect(superClassInstance.a).not.toBeUndefined();
      });
    });

    describe('with inheritance', () => {
      let inheritedClassInstance: C;

      beforeEach(() => {
        const testInstance: PlayerAPI = new C() as any as PlayerAPI;
        playerWrapper = new PlayerWrapper(testInstance);
        (testInstance as any).giveValueAValue(); // Change the value of the actual property to simulate async loaded module
        inheritedClassInstance = playerWrapper.getPlayer() as any as C;
      });

      it('wraps functions of super class', () => {
        expect(inheritedClassInstance.a).not.toBeUndefined();
      });
    });
  });

  describe('switchToUiVariant', () => {
    let firstUi: UIVariant, secondUI: UIVariant, defaultUI: UIVariant;
    let playerMock: TestingPlayerAPI;

    beforeEach(() => {
      playerMock = MockHelper.getPlayerMock();
      firstUi = {
        ui: new UIContainer({ components: [new Container({})]}),
        condition: (context) => context.isPlaying,
      };
      secondUI = {
        ui: new UIContainer({ components: [new Container({})]}),
        condition: (context) => context.isAd,
      }
      defaultUI = {
        ui: new UIContainer({ components: [new Container({})]}),
      }

    });

    it('should mark invisible UIs as hidden', () => {
      new UIManager(playerMock, [firstUi, secondUI, defaultUI]);

      expect(firstUi.ui.isHidden()).toBeTruthy()
      expect(secondUI.ui.isHidden()).toBeTruthy()
      expect(defaultUI.ui.isHidden()).toBeFalsy()
    });

    it('should switch to the corresponding ui when a play event is fired', () => {
      new UIManager(playerMock, [firstUi, secondUI, defaultUI]);

      (playerMock.isPlaying as jest.Mock).mockReturnValue(true);
      playerMock.eventEmitter.firePlayEvent();

      expect(firstUi.ui.isHidden()).toBeFalsy()
      expect(secondUI.ui.isHidden()).toBeTruthy()
      expect(defaultUI.ui.isHidden()).toBeTruthy()
    });

    it('should dispatch the onActiveUiChanged event', () => {
      const onUiChanged = jest.fn();
      const uiManager = new UIManager(playerMock, [firstUi, secondUI, defaultUI]);

      uiManager.switchToUiVariant(firstUi);
      uiManager.onActiveUiChanged.subscribe(onUiChanged);
      uiManager.switchToUiVariant(secondUI);

      expect(onUiChanged).toHaveBeenCalledWith(
        uiManager,
        {
          previousUi: uiManager['uiInstanceManagers'][0],
          currentUi: uiManager['uiInstanceManagers'][1],
        },
      );
    });

    it('should not dispatch the onActiveUiChanged event if the selected variant is already active', () => {
      const onUiChanged = jest.fn();
      const uiManager = new UIManager(playerMock, [firstUi, secondUI, defaultUI]);

      uiManager.switchToUiVariant(firstUi);
      uiManager.onActiveUiChanged.subscribe(onUiChanged);
      uiManager.switchToUiVariant(firstUi);

      expect(onUiChanged).not.toHaveBeenCalled();
    });

    it('should not dispatch the onActiveUiChanged event if the selected variant is not yet set up', () => {
      const onUiChanged = jest.fn();
      const uiManager = new UIManager(playerMock, [firstUi, defaultUI]);

      uiManager.switchToUiVariant(firstUi);
      uiManager.onActiveUiChanged.subscribe(onUiChanged);
      uiManager.switchToUiVariant(secondUI);

      expect(onUiChanged).not.toHaveBeenCalled();
    });
  });

  describe('activeUi', () => {
    it('should return the active UI instance manager', () => {
      const playerMock = MockHelper.getPlayerMock();
      const uiVariant = { ui: new UIContainer({ components: [new Container({})]}) };
      const uiManager = new UIManager(playerMock, [uiVariant]);

      expect(uiManager.activeUi).toBeInstanceOf(UIInstanceManager);
    });
  });

  describe('mobile v3 handling', () => {
    let playerMock: TestingPlayerAPI;
    beforeEach(() => {
      playerMock = MockHelper.getPlayerMock();

      // disable HTML element interactions
      UIManager.prototype.switchToUiVariant = jest.fn();
    });
    describe('when a PlaylistTransition event is part of PlayerEvent', () => {
      beforeEach(() => {
        (playerMock.exports.PlayerEvent as any).SourceError = MobileV3PlayerEvent.SourceError;
        (playerMock.exports.PlayerEvent as any).PlayerError = MobileV3PlayerEvent.PlayerError;
        (playerMock.exports.PlayerEvent as any).PlaylistTransition = MobileV3PlayerEvent.PlaylistTransition;
      });
      it('attaches the listener', () => {
        const onSpy = jest.spyOn(playerMock, 'on');

        const uiContainer = new UIContainer({ components: [new Container({})] });
        new UIManager(playerMock, uiContainer);
        expect(onSpy).toHaveBeenCalledWith('playlisttransition', expect.any(Function));
      });
      describe('and a PlaylistTransition event occurs', () => {
        it('dispatches onUpdated', () => {
          const uiContainer = new UIContainer({ components: [new Container({})] });
          const uiManager = new UIManager(playerMock, uiContainer);
          let onUpdatedSpy = jest.fn();
          (uiManager.getConfig() as InternalUIConfig).events.onUpdated.subscribe(onUpdatedSpy);

          playerMock.eventEmitter.firePlaylistTransitionEvent();
          expect(onUpdatedSpy).toHaveBeenCalled();
        });
      });
    });
    describe('when no PlaylistTransition event is part of PlayerEvent', () => {
      beforeEach(() => {
        delete (playerMock.exports.PlayerEvent as any).PlaylistTransition;
      });
      it('does not attach a listener', () => {
        const onSpy = jest.spyOn(playerMock, 'on');

        const uiContainer = new UIContainer({ components: [new Container({})] });
        new UIManager(playerMock, uiContainer);
        expect(onSpy).not.toHaveBeenCalledWith('playlisttransition', expect.any(Function));
      });
    });
  });
});
