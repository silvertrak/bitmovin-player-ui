import { Button, ButtonConfig } from './button';
import { UIInstanceManager } from '../uimanager';
import LiveStreamDetectorEventArgs = PlayerUtils.LiveStreamDetectorEventArgs;
import { PlayerUtils } from '../playerutils';
import { StringUtils } from '../stringutils';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../localization/i18n';

export interface PlaybackCurrentTimeButtonConfig extends ButtonConfig {
  /**
   * Boolean if the label should be hidden in live playback
   */
  hideInLivePlayback?: boolean;
}

/**
 * A button that display the current playback time through {@link PlaybackCurrentTimeButton#setTime setTime}
 * or any string through {@link PlaybackCurrentTimeButton setText}.
 */
export class PlaybackCurrentTimeButton extends Button<PlaybackCurrentTimeButtonConfig> {
  private timeFormat: string;
  private frameRate: number | undefined;

  constructor(config: PlaybackCurrentTimeButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      <PlaybackCurrentTimeButtonConfig>{
        cssClass: 'ui-playbackcurrenttimebutton',
        hideInLivePlayback: false,
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let config = this.getConfig();
    let live = false;
    let liveCssClass = this.prefixCss('ui-playbacktimelabel-live');
    let liveEdgeCssClass = this.prefixCss('ui-playbacktimelabel-live-edge');
    let minWidth = 0;
    this.frameRate = uimanager.getConfig().metadata?.frameRate;

    this.onClick.subscribe(() => this.copyCurrentTime(PlayerUtils.getCurrentTimeRelativeToSeekableRange(player)));

    let liveClickHandler = () => {
      player.timeShift(0);
    };

    let updateLiveState = () => {
      // Player is playing a live stream when the duration is infinite
      live = player.isLive();

      // Attach/detach live marker class
      if (live) {
        this.getDomElement().addClass(liveCssClass);
        this.setText(i18n.getLocalizer('live'));
        if (config.hideInLivePlayback) {
          this.hide();
        }
        this.onClick.subscribe(liveClickHandler);
        updateLiveTimeshiftState();
      } else {
        this.getDomElement().removeClass(liveCssClass);
        this.getDomElement().removeClass(liveEdgeCssClass);
        this.show();
        this.onClick.unsubscribe(liveClickHandler);
      }
    };

    let updateLiveTimeshiftState = () => {
      if (!live) {
        return;
      }

      // The player is only at the live edge iff the stream is not shifted and it is actually playing or playback has
      // never been started (meaning it isn't paused). A player that is paused is always behind the live edge.
      // An exception is made for live streams without a timeshift window, because here we "stop" playback instead
      // of pausing it (from a UI perspective), so we keep the live edge indicator on because a play would always
      // resume at the live edge.
      const isTimeshifted = player.getTimeShift() < 0;
      const isTimeshiftAvailable = player.getMaxTimeShift() < 0;
      if (!isTimeshifted && (!player.isPaused() || !isTimeshiftAvailable)) {
        this.getDomElement().addClass(liveEdgeCssClass);
      } else {
        this.getDomElement().removeClass(liveEdgeCssClass);
      }
    };

    let liveStreamDetector = new PlayerUtils.LiveStreamDetector(player, uimanager);
    liveStreamDetector.onLiveChanged.subscribe((sender, args: LiveStreamDetectorEventArgs) => {
      live = args.live;
      updateLiveState();
    });
    liveStreamDetector.detect(); // Initial detection

    let playbackTimeHandler = () => {
      if (!live && player.getDuration() !== Infinity) {
        this.setTime(PlayerUtils.getCurrentTimeRelativeToSeekableRange(player));
      }

      // To avoid 'jumping' in the UI by varying label sizes due to non-monospaced fonts,
      // we gradually increase the min-width with the content to reach a stable size.
      let width = this.getDomElement().width();
      if (width > minWidth) {
        minWidth = width;
        this.getDomElement().css({
          'min-width': minWidth + 'px',
        });
      }
    };

    let updateTimeFormatBasedOnDuration = () => {
      // Set time format depending on frame rate existing
      this.timeFormat = this.frameRate ? StringUtils.FORMAT_HHMMSSFF : StringUtils.FORMAT_HHMMSS;
      playbackTimeHandler();
    };

    player.on(player.exports.PlayerEvent.TimeChanged, playbackTimeHandler);
    player.on(player.exports.PlayerEvent.Ready, updateTimeFormatBasedOnDuration);
    player.on(player.exports.PlayerEvent.Seeked, playbackTimeHandler);

    player.on(player.exports.PlayerEvent.TimeShift, updateLiveTimeshiftState);
    player.on(player.exports.PlayerEvent.TimeShifted, updateLiveTimeshiftState);
    player.on(player.exports.PlayerEvent.Playing, updateLiveTimeshiftState);
    player.on(player.exports.PlayerEvent.Paused, updateLiveTimeshiftState);
    player.on(player.exports.PlayerEvent.StallStarted, updateLiveTimeshiftState);
    player.on(player.exports.PlayerEvent.StallEnded, updateLiveTimeshiftState);

    let init = () => {
      // Reset min-width when a new source is ready (especially for switching VOD/Live modes where the button content
      // changes)
      minWidth = 0;
      this.getDomElement()?.removeCss('min-width');

      updateTimeFormatBasedOnDuration();
    };
    uimanager.getConfig().events.onUpdated.subscribe(init);

    init();
  }

  /**
   * Sets the current playback time and total duration.
   * @param playbackSeconds the current playback time in seconds
   */
  setTime(playbackSeconds: number) {
    let currentTime = StringUtils.secondsToTime(playbackSeconds, this.timeFormat, this.frameRate);

    this.setText(`${currentTime}`);
  }

  /**
   * Copy the current time to the clipboard
   * @param playbackSeconds
   */
  copyCurrentTime(playbackSeconds: number) {
    let currentTime = StringUtils.secondsToTime(playbackSeconds, this.timeFormat, this.frameRate);
    navigator.clipboard.writeText(currentTime);
  }

  /**
   * Sets the current time format
   * @param timeFormat the time format
   */
  protected setTimeFormat(timeFormat: string): void {
    this.timeFormat = timeFormat;
  }
}
