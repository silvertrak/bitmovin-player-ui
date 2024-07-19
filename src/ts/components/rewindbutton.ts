import { ToggleButton, ToggleButtonConfig } from './togglebutton';
import { UIInstanceManager } from '../uimanager';
import { FrameAccurateUtils } from '../frameaccurateutils';
import { PlayerAPI, WarningEvent } from 'bitmovin-player';
import { i18n } from '../localization/i18n';

export interface RewindButtonConfig extends ToggleButtonConfig {
  /**
   * seek interval in seconds/frames
   * Default is 1.
   */
  forwardRewindInterval?: number;
}

/**
 * A button that toggles between playback and pause.
 */
export class RewindButton extends ToggleButton<RewindButtonConfig> {
  // private static readonly CLASS_STOPTOGGLE = 'stoptoggle';
  protected isPlayInitiated: boolean;

  constructor(config: RewindButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-rewindbutton',
        text: i18n.getLocalizer('rewind'),
      },
      this.config,
    );

    this.isPlayInitiated = false;
  }

  configure(
    player: PlayerAPI,
    uimanager: UIInstanceManager,
    handleClickEvent: boolean = true,
  ): void {
    super.configure(player, uimanager);

    // Set forwardRewindInterval if set in the uimanager config
    if (typeof uimanager.getConfig().forwardRewindInterval === 'number') {
      this.config.forwardRewindInterval = uimanager.getConfig().forwardRewindInterval;
    }

    let isSeeking = false;
    // let firstPlay = true;

    // Handler to update button state based on player state
    let playbackStateHandler = () => {
      // If the UI is currently seeking, playback is temporarily stopped but the buttons should
      // not reflect that and stay as-is (e.g indicate playback while seeking).
      if (isSeeking) {
        return;
      }

      /* if (player.isPlaying() || this.isPlayInitiated) {
        this.on();
      } else {
        this.off();
      } */
    };

    /*     // Call handler upon these events
    player.on(player.exports.PlayerEvent.Play, (e) => {
      this.isPlayInitiated = true;
      firstPlay = false;
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Paused, (e) => {
      this.isPlayInitiated = false;
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Playing, (e) => {
      this.isPlayInitiated = false;
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
    }); */

    /* const updateLiveState = () => {
      const showStopToggle = player.isLive() && !PlayerUtils.isTimeShiftAvailable(player);

      if (showStopToggle) {
        this.getDomElement().addClass(this.prefixCss(RewindButton.CLASS_STOPTOGGLE));
      } else {
        this.getDomElement().removeClass(this.prefixCss(RewindButton.CLASS_STOPTOGGLE));
      }
    }; */

    /* // Detect absence of timeshifting on live streams and add tagging class to convert button icons to play/stop
    let timeShiftDetector = new PlayerUtils.TimeShiftAvailabilityDetector(player);
    let liveStreamDetector = new PlayerUtils.LiveStreamDetector(player, uimanager); */

    /* timeShiftDetector.onTimeShiftAvailabilityChanged.subscribe(() => updateLiveState());
    liveStreamDetector.onLiveChanged.subscribe(() => updateLiveState()); */

    /* timeShiftDetector.detect(); // Initial detection
    liveStreamDetector.detect(); */

    if (handleClickEvent) {
      // Control player by button events
      // When a button event triggers a player API call, events are fired which in turn call the event handler
      // above that updated the button state.
      this.onClick.subscribe(() => {
        if (player.isPlaying() || this.isPlayInitiated) {
          player.pause('ui');
        }

        if (!player.isPlaying() && !player.isPaused()) {
          player.setPosterImage(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            false,
          );
        }

        uimanager.getConfig().metadata?.frameRate
          ? player.seek(FrameAccurateUtils.adjustedTimeByFrame(player.getCurrentTime(), uimanager.getConfig().metadata.frameRate, -(this.config?.forwardRewindInterval ?? 1)))
          : player.seek(Math.max(0, player.getCurrentTime() - (this.config?.forwardRewindInterval ?? 1)));
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
