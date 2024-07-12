import { Plugins, Scene } from "phaser";

export const EVENT_INITIALIZED = "playe:initialized";

export type GameRecord = {
  id: string;
  gameId: string;
  gameVersion: string;
  score: number;
  playerId: string;
  sessionId: string;
  campaignId: string | null;
  hostedGameId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
  sessionDuration?: number;
};

export class PlayePlugin extends Plugins.BasePlugin {
  private _loadingSceneKey: string | undefined;
  private _gameplaySceneKey: string | undefined;
  private _scriptLoaded: boolean;
  private _initializeHooks: ((plugin: PlayePlugin) => void)[];
  private _queue: (() => void)[];
  private _currentScenes: string[];
  public initialized: boolean;
  public sdk: any;

  private _gameRecord: GameRecord | undefined;

  // Session duration tracking variables
  private _startTime: number | null = null;
  private _gameDuration: number = 0;
  private _gameTimer: number | null = null;
  private _lastSavedDuration: number = 0;

  constructor(pluginManager: Plugins.PluginManager) {
    super(pluginManager);
    this._scriptLoaded = false;
    this._initializeHooks = [];
    this._queue = [];
    this._currentScenes = [];
    this.initialized = false;

    this._gameRecord = undefined;
  }

  init({ loadingSceneKey, gameplaySceneKey }: { loadingSceneKey: string; gameplaySceneKey: string }): void {
    this._loadingSceneKey = loadingSceneKey;
    this._gameplaySceneKey = gameplaySceneKey;

    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "https://dev-playe.s3.us-east-2.amazonaws.com/scripts/v1/playe-sdk.js");
    script.addEventListener("load", async () => {
      this.sdk = new (window as any).Playe.SDK({
        baseUrl: "https://dev-playe-api.playe.co",
      });

      this.sdk.test();

      this._scriptLoaded = true;
      this._queue.forEach((f) => f());

      this.initialized = true;

      this._initializeHooks.forEach((f) => f(this));
    });
    script.addEventListener("error", (e: ErrorEvent) => {
      console.error("failed to load PlayeSDK", e);
    });
    document.head.appendChild(script);

    // Add event listeners for session tracking
    window.addEventListener('beforeunload', () => this.stopGameTimer());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendGameDuration();
      }
    });
  }

  runWhenInitialized(callback: (plugin: PlayePlugin) => void): void {
    if (this.initialized) {
      callback(this);
    } else {
      this._initializeHooks.push(callback);
    }
  }

  // Called by Phaser, do not use
  start(): void {
    this.game.events.on("step", this._update, this);
  }

  // Called by Phaser, do not use
  stop(): void {
    this.game.events.off("step", this._update);
  }

  private _update(): void {
    const names = this.game.scene.getScenes(true).map((s: Scene) => s.constructor.name);
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
    names.forEach(async (name) => {
      if (this._currentScenes.indexOf(name) === -1) {
        this._currentScenes.push(name);
        if (name === this._loadingSceneKey) {
          this.gameLoadingStart();
        }
        if (name === this._gameplaySceneKey) {
          await this.gameplayStart();
        }
      }
    });

    // Update game duration
    if (!this.isDemo()) {
      this.updateGameTimer();
    }
  }

  gameLoadingStart(): void {
    if (this._scriptLoaded) {
      if (!this.isDemo()) {
        this.sdk.gameLoadingStart();
      }
    } else {
      this._queue.push(() => {
        if (!this.isDemo()) {
          this.sdk.gameLoadingStart();
        }
      });
    }
  }

  gameLoadingFinished(): void {
    if (this._scriptLoaded) {
      if (!this.isDemo()) {
        this.sdk.gameLoadingFinished();
      }
    } else {
      this._queue.push(() => {
        if (!this.isDemo()) {
          this.sdk.gameLoadingFinished();
        }
      });
    }
  }


  // Session duration tracking methods
  private startGameTimer(): void {
    if (!this.isDemo()) {
      this._startTime = Date.now();
      this._gameTimer = window.setInterval(() => this.updateGameTimer(), 1000);
    }
  }

  private updateGameTimer(): void {
    if (!this.isDemo() && this._startTime !== null) {
      this._gameDuration = Math.floor((Date.now() - this._startTime) / 1000);

      // Periodically save duration (every 10 seconds)
      if (this._gameDuration % 10 === 0 && this._gameDuration !== this._lastSavedDuration) {
        this.sendGameDuration();
        this._lastSavedDuration = this._gameDuration;
      }
    }
  }

  private stopGameTimer(): void {
    if (!this.isDemo()) {
      if (this._gameTimer !== null) {
        clearInterval(this._gameTimer);
        this._gameTimer = null;
      }
      this.sendGameDuration();
    }
  }

  private sendGameDuration(): void {
    if (!this.isDemo() && this._gameRecord) {
      this._gameRecord.sessionDuration = this._gameDuration;
      if (this._scriptLoaded) {
        this.sdk.gamePlayFinish(this._gameRecord);
      } else {
        this._queue.push(() => {
          this.sdk.gamePlayFinish(this._gameRecord);
        });
      }
    }
  }

  async gameplayStart() {
    if (!this.isDemo()) {
      var result = await this.sdk.gamePlayStart()

      console.log("GameRecord", result);

      if (this._scriptLoaded) {
        this._gameRecord = result;
        this.startGameTimer(); // Start the timer when gameplay starts
      } else {
        this._queue.push(async () => {
          this._gameRecord = result;
          this.startGameTimer();
        });
      }
    }
  }

  private isDemo(): boolean {
    return this.sdk && this.sdk.isDemo();
  }

  gamePlayFinish(score: number): void {
    if (!this.isDemo()) {
      if (this._gameRecord) {
        this._gameRecord.score = score;
        this._gameRecord.sessionDuration = this._gameDuration; // Include the final duration

        if (this._scriptLoaded) {
          this.sdk.gamePlayFinish(this._gameRecord);
        } else {
          this._queue.push(() => {
            this.sdk.gamePlayFinish(this._gameRecord);
          });
        }
        this.stopGameTimer(); // Stop the timer when gameplay finishes
      } else {
        console.error("game record is not set");
      }
    }
  }

  gamePlayStop(): void {
    if (!this.isDemo()) {
      this.stopGameTimer(); // Stop the timer when gameplay stops
      if (this._scriptLoaded) {
        this.sdk.gamePlayStop();
      } else {
        this._queue.push(() => {
          this.sdk.gamePlayStop();
        });
      }
    }
  }
}