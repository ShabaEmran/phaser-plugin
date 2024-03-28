import { Plugins } from "phaser";

export const EVENT_INITIALIZED = "playe:initialized";

export class PlayePlugin extends Plugins.BasePlugin {
  init({ loadingSceneKey, gameplaySceneKey }) {
    this._loadingSceneKey = loadingSceneKey;
    this._gameplaySceneKey = gameplaySceneKey;

    this._scriptLoaded = false;
    this._initializeHooks = [];
    this._queue = [];

    this.initialized = false;

    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "https://dev-playe-games.s3.amazonaws.com/scripts/v1/playe-sdk.js");
    script.addEventListener("load", () => {
      this.sdk = new Playe.SDK({
        baseUrl: "https://dev-playe-games.s3.amazonaws.com",
      });

      this.sdk.test();

      this._scriptLoaded = true;
      this._queue.forEach((f) => f());

      this.game.events.emit(EVENT_INITIALIZED, this);
      this._initializeHooks.forEach((f) => f(this));
    });
    script.addEventListener("error", (e) => {
      console.error("failed to load PlayeSDK", e);
    });
    document.head.appendChild(script);

    this._currentScenes = [];
  }

  runWhenInitialized(callback) {
    if (this.initialized) {
      callback(this); // eslint-disable-line node/no-callback-literal
    } else {
      this._initializeHooks.push(callback);
    }
  }

  // Called by Phaser, do not use
  start() {
    this.game.events.on("step", this._update, this);
  }

  // Called by Phaser, do not use
  stop() {
    this.game.events.off("step", this._update);
  }

  _update() {
    // Detect if new actives scenes are added or removed:
    const names = this.game.scene.getScenes(true).map((s) => s.constructor.name);
    this._currentScenes.forEach((name) => {
      if (names.indexOf(name) === -1) {
        this._currentScenes.splice(this._currentScenes.indexOf(name), 1);
        if (name === this._loadingSceneKey) {
          this.gameLoadingFinished();
        }
        if (name === this._gameplaySceneKey) {
          this.gamePlayStop();
        }
      }
    });
    names.forEach((name) => {
      if (this._currentScenes.indexOf(name) === -1) {
        this._currentScenes.push(name);
        if (name === this._loadingSceneKey) {
          this.gameLoadingStart();
        }
        if (name === this._gameplaySceneKey) {
          this.gameplayStart();
        }
      }
    });
  }

  // Manually call the gameLoadedStart event in the PlayeSDK, this is done
  // automatically if you've set the loadingSceneKey in the plugin data.
  gameLoadingStart() {
    if (this._scriptLoaded) {
      this.sdk.gameLoadingStart();
    } else {
      this._queue.push(() => {
        this.sdk.gameLoadingStart();
      });
    }
  }

  // Manually call the gameLoadingFinished event in the PlayeSDK, this is done
  // automatically if you've set the loadingSceneKey in the plugin data.
  gameLoadingFinished() {
    if (this._scriptLoaded) {
      this.sdk.gameLoadingFinished();
    } else {
      this._queue.push(() => {
        this.sdk.gameLoadingFinished();
      });
    }
  }

  // Manually call the gameplayStart event in the PlayeSDK, this is done
  // automatically if you've set the gameplaySceneKey in the plugin data.
  gameplayStart() {
    if (this._scriptLoaded) {
      this.sdk.gamePlayStart();
    } else {
      this._queue.push(() => {
        this.sdk.gamePlayStart();
      });
    }
  }

  // Manually call the gameplayStop event in the PlayeSDK, this is done
  // automatically if you've set the gameplaySceneKey in the plugin data.
  gamePlayStop() {
    if (this._scriptLoaded) {
      this.sdk.gamePlayStop();
    } else {
      this._queue.push(() => {
        this.sdk.gamePlayStop();
      });
    }
  }
}
