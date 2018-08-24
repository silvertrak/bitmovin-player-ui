import {ContainerConfig, Container} from './container';
import {Label, LabelConfig} from './label';
import {UIInstanceManager} from '../uimanager';
import ErrorEvent = bitmovin.PlayerAPI.ErrorEvent;
import {TvNoiseCanvas} from './tvnoisecanvas';
import PlayerEvent = bitmovin.PlayerAPI.PlayerEvent;
import {ErrorEventUtil} from '../erroreventutil';

export interface ErrorMessageTranslator {
  (description: string, error: ErrorEvent): string;
}

export interface ErrorMessageMap {
  [code: number]: string | ErrorMessageTranslator;
}

/**
 * Configuration interface for the {@link ErrorMessageOverlay}.
 */
export interface ErrorMessageOverlayConfig extends ContainerConfig {
  /**
   * Allows overwriting of the error messages displayed in the overlay for customization and localization.
   * This is either a function that receives a human readable error description and any {@link ErrorEvent}
   * as parameter and translates error description, or a map of error codes that overwrites specific error messages
   * with a plain string or a function that receives a human readable error description and the {@link ErrorEvent}
   * as parameter and returns a customized string.
   * The translation functions can be used to extract data (e.g. parameters) from the original error message.
   *
   * Example 1 (catch-all translation function):
   * <code>
   * errorMessageOverlayConfig = {
   *   messages: function(description, error) {
   *     switch (error.code) {
   *       // Overwrite error 1000 'Unknown error'
   *       case 1000:
   *         return 'Houston, we have a problem'
   *
   *       // Transform error 1201 'The downloaded manifest is invalid' to uppercase
   *       case 1201:
   *         return description.toUpperCase();
   *
   *       // Customize error 1207 'The manifest could not be loaded'
   *       case 1207:
   *         var statusCode = error.data.statusCode;
   *         return 'Manifest loading failed with HTTP error ' + statusCode;
   *     }
   *     // Return unmodified error message for all other errors
   *     return error.message;
   *   }
   * };
   * </code>
   *
   * Example 2 (translating specific errors):
   * <code>
   * errorMessageOverlayConfig = {
   *   messages: {
   *     // Overwrite error 1000 'Unknown error'
   *     1000: 'Houston, we have a problem',
   *
   *     // Transform error 1201 'Unsupported manifest format' to uppercase
   *     1201: function(description, error) {
   *       return description.toUpperCase();
   *     },
   *
   *     // Customize error 1207 'The manifest could not be loaded'
   *     1207: function(description, error) {
   *       var statusCode = error.data.statusCode;
   *       return 'Manifest loading failed with HTTP error ' + statusCode;
   *     }
   *   }
   * };
   * </code>
   */
  messages?: ErrorMessageMap | ErrorMessageTranslator;
}

/**
 * Overlays the player and displays error messages.
 */
export class ErrorMessageOverlay extends Container<ErrorMessageOverlayConfig> {

  private errorLabel: Label<LabelConfig>;
  private tvNoiseBackground: TvNoiseCanvas;

  constructor(config: ErrorMessageOverlayConfig = {}) {
    super(config);

    this.errorLabel = new Label<LabelConfig>({ cssClass: 'ui-errormessage-label' });
    this.tvNoiseBackground = new TvNoiseCanvas();

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-errormessage-overlay',
      components: [this.tvNoiseBackground, this.errorLabel],
      hidden: true,
    }, this.config);
  }

  configure(player: bitmovin.PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let config = <ErrorMessageOverlayConfig>this.getConfig();

    player.on(player.exports.Event.Error, (event: ErrorEvent) => {
      let description = ErrorEventUtil.defaultErrorMessagesMapping[event.code] as string;

      let name = event.name;
      let message = description + '\n(' + name + ')'; // default error message style

      // Custom error message handling
      if (config.messages) {
        if (typeof config.messages === 'function') {
          // Custom function for all errors
          message = config.messages(description, event);
        } else if (config.messages[event.code]) {
          // Messages is not a function, so it must be a map of strings or functions
          let customMessage = config.messages[event.code];

          if (typeof customMessage === 'string') {
            message = customMessage;
          } else {
            // The message is a function, so we call it
            message = customMessage(description, event);
          }
        }
      }

      this.errorLabel.setText(message);
      this.tvNoiseBackground.start();
      this.show();
    });

    player.on(player.exports.Event.SourceLoaded, (event: PlayerEvent) => {
      if (this.isShown()) {
        this.tvNoiseBackground.stop();
        this.hide();
      }
    });
  }

  release(): void {
    super.release();

    // Canvas rendering must be explicitly stopped, else it just continues forever and hogs resources
    this.tvNoiseBackground.stop();
  }
}