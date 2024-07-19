import { SettingsPanelPage } from './settingspanelpage';
import { SettingsPanel } from './settingspanel';
import { ContainerConfig } from './container';
import { Component, ComponentConfig } from './component';
import { UIInstanceManager } from '../uimanager';
import { SettingsPanelPageBackButton } from './settingspanelpagebackbutton';
import { SettingsPanelItem } from './settingspanelitem';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../localization/i18n';
import { Label, LabelConfig } from './label';
import { Spacer } from './spacer';
import { SettingsToggleButton } from './settingstogglebutton';

export interface KeyboardShortcutsSettingsPanelPageConfig extends ContainerConfig {
  settingsPanel: SettingsPanel;
}

export class KeyboardShortcutsSettingsPanelPage extends SettingsPanelPage {
  private readonly settingsPanel: SettingsPanel;

  constructor(config: KeyboardShortcutsSettingsPanelPageConfig) {
    super(config);

    this.settingsPanel = config.settingsPanel;

    this.config = this.mergeConfig(
      config,
      {
        components: <Component<ComponentConfig>[]>[
          new SettingsPanelItem(
            new Label<LabelConfig>({
              text: i18n.getLocalizer('settings.keyboardShortcuts'),
              cssClass: 'my-1',
            }),
            new SettingsToggleButton({
              settingsPanel: this.settingsPanel,
              text: i18n.getLocalizer('close'),
            }),
            { cssClasses: ['text-center'] },
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('playPause'),
            new Label<LabelConfig>({
              text: 'Space',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.fullscreen'),
            new Label<LabelConfig>({
              text: 'F',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.volume.mute'),
            new Label<LabelConfig>({
              text: 'M',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.volume.reduce'),
            new Label<LabelConfig>({
              text: '↓',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.volume.increase'),
            new Label<LabelConfig>({
              text: '↑',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.minus.one.frame'),
            new Label<LabelConfig>({
              text: '←',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.minus.one.sec'),
            new Label<LabelConfig>({
              text: 'Shift + ←',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.minus.one.min'),
            new Label<LabelConfig>({
              text: 'Alt + ←',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.plus.one.frame'),
            new Label<LabelConfig>({
              text: '→',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.plus.one.sec'),
            new Label<LabelConfig>({
              text: 'Shift + →',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            i18n.getLocalizer('settings.keyboardShortcuts.seek.plus.one.min'),
            new Label<LabelConfig>({
              text: 'Alt + →',
              cssClasses: ['text-center'],
            }),
          ),
          new SettingsPanelItem(
            new SettingsPanelPageBackButton({
              container: this.settingsPanel,
              text: i18n.getLocalizer('back'),
            }),
            new SettingsToggleButton({
              settingsPanel: this.settingsPanel,
              text: i18n.getLocalizer('close'),
            }),
            {
              role: 'menubar',
            },
          ),
        ],
        cssClasses: ['ui-keyboard-shortcuts-view-pannel'],
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);
  }
}
