import {ToggleButton, ToggleButtonConfig} from './togglebutton';
import {UIInstanceManager} from '../uimanager';
import {PlayerUtils} from '../playerutils';
import { PlayerAPI, WarningEvent } from 'bitmovin-player';
import { i18n } from '../localization/i18n';
import { FrameAccurateUtils } from '../frameaccurateutils';

export interface PlaybackToggleButtonConfig extends ToggleButtonConfig {
  /**
   * Specify whether the player should be set to enter fullscreen by clicking on the playback toggle button
   * when initiating the initial playback.
   * Default is false.
   */
  enterFullscreenOnInitialPlayback?: boolean;
}

/**
 * A button that toggles between playback and pause.
 */
export class PlaybackToggleButton extends ToggleButton<PlaybackToggleButtonConfig> {
  private static readonly CLASS_STOPTOGGLE = 'stoptoggle';
  protected isPlayInitiated: boolean;

  /**
   * Flag needed to detect playing -> pause transitions
   */
  protected hasBeenPlaying: boolean;

  constructor(config: PlaybackToggleButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-playbacktogglebutton',
      text: i18n.getLocalizer('play'),
      onAriaLabel: i18n.getLocalizer('pause'),
      offAriaLabel: i18n.getLocalizer('play'),
    }, this.config);

    this.isPlayInitiated = false;
    this.hasBeenPlaying = false;
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager, handleClickEvent: boolean = true): void {
    super.configure(player, uimanager);

    // Set enterFullscreenOnInitialPlayback if set in the uimanager config
    if (typeof uimanager.getConfig().enterFullscreenOnInitialPlayback === 'boolean') {
      this.config.enterFullscreenOnInitialPlayback = uimanager.getConfig().enterFullscreenOnInitialPlayback;
    }

    let isSeeking = false;
    let firstPlay = true;

    // Handler to update button state based on player state
    let playbackStateHandler = () => {
      // If the UI is currently seeking, playback is temporarily stopped but the buttons should
      // not reflect that and stay as-is (e.g indicate playback while seeking).
      if (isSeeking) {
        return;
      }

      if (player.isPlaying() || this.isPlayInitiated) {
        this.on();
      } else {
        this.off();
      }
    };

    // Call handler upon these events
    player.on(player.exports.PlayerEvent.Play, (e) => {
      this.isPlayInitiated = true;
      firstPlay = false;
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Paused, (e) => {
      this.isPlayInitiated = false;
      /**
       * When SMPTE is enabled, play + pause leads to an incorrect video.currentTime (off by 1 frame
       * most of the time) in some browsers. To reproduce try play + pause at some point in the video. Then save the current Time, seek
       * somewhere else and then back to the previous current time ... you will see a different Frame.
       * In order to avoid this mess, when we encounter play + pause we seek to the calculated SMPTE.
       */
      if (this.hasBeenPlaying && uimanager.getConfig().metadata?.frameRate) {
        this.hasBeenPlaying = false;
        player.seek(FrameAccurateUtils.adjustedTimeByFrame(player.getCurrentTime(), uimanager.getConfig().metadata.frameRate, 0));
      }
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Playing, (e) => {
      this.isPlayInitiated = false;
      this.hasBeenPlaying = true;
      playbackStateHandler();
    });
    // after unloading + loading a new source, the player might be in a different playing state (from playing into stopped)
    player.on(player.exports.PlayerEvent.SourceLoaded, playbackStateHandler);
    uimanager.getConfig().events.onUpdated.subscribe(playbackStateHandler);
    player.on(player.exports.PlayerEvent.SourceUnloaded, playbackStateHandler);
    // when playback finishes, player turns to paused mode
    player.on(player.exports.PlayerEvent.PlaybackFinished, playbackStateHandler);
    player.on(player.exports.PlayerEvent.CastStarted, playbackStateHandler);

    // When a playback attempt is rejected with warning 5008, we switch the button state back to off
    // This is required for blocked autoplay, because there is no Paused event in such case
    player.on(player.exports.PlayerEvent.Warning, (event: WarningEvent) => {
      if (event.code === player.exports.WarningCode.PLAYBACK_COULD_NOT_BE_STARTED) {
        this.isPlayInitiated = false;
        firstPlay = true;
        this.off();
      }
    });

    const updateLiveState = () => {
      const showStopToggle = player.isLive() && !PlayerUtils.isTimeShiftAvailable(player);

      if (showStopToggle) {
        this.getDomElement().addClass(this.prefixCss(PlaybackToggleButton.CLASS_STOPTOGGLE));
      } else {
        this.getDomElement().removeClass(this.prefixCss(PlaybackToggleButton.CLASS_STOPTOGGLE));
      }
    };

    // Detect absence of timeshifting on live streams and add tagging class to convert button icons to play/stop
    let timeShiftDetector = new PlayerUtils.TimeShiftAvailabilityDetector(player);
    let liveStreamDetector = new PlayerUtils.LiveStreamDetector(player, uimanager);

    timeShiftDetector.onTimeShiftAvailabilityChanged.subscribe(() => updateLiveState());
    liveStreamDetector.onLiveChanged.subscribe(() => updateLiveState());

    timeShiftDetector.detect(); // Initial detection
    liveStreamDetector.detect();

    if (handleClickEvent) {
      // Control player by button events
      // When a button event triggers a player API call, events are fired which in turn call the event handler
      // above that updated the button state.
      this.onClick.subscribe(() => {
        if (player.isPlaying() || this.isPlayInitiated) {
          player.pause('ui');
        } else {
          player.play('ui');

          if (firstPlay && this.config.enterFullscreenOnInitialPlayback) {
            player.setViewMode(player.exports.ViewMode.Fullscreen);
          }
        }
      });
    }

    // Track UI seeking status
    uimanager.onSeek.subscribe(() => {
      isSeeking = true;
    });
    uimanager.onSeeked.subscribe(() => {
      isSeeking = false;
    });

    // Startup init
    playbackStateHandler();
  }
}
