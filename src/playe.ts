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
};

export class PlayePlugin extends Plugins.BasePlugin {
  private _loadingSceneKey: string | undefined;
  private _gameplaySceneKey: string | undefined;
  private _scriptLoaded: boolean;
  private _initializeHooks: ((plugin: PlayePlugin) => void)[];
  private _queue: (() => void)[];
  private _currentScenes: string[];
  public initialized: boolean;
  public sdk: any; // Replace 'any' with the actual type of the SDK if available

  private _gameRecord: GameRecord | undefined;

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
      // const baseUrl = process.env.NODE_ENV === "production" ? "https://dev.playe.co" : "https://localhost:7232";
      this.sdk = new (window as any).Playe.SDK({
        baseUrl: "https://dev.playe.co",
      });

      this.sdk.test();

      this._scriptLoaded = true;
      this._queue.forEach((f) => f());

      this.initialized = true;

      // this.game.events.emit(EVENT_INITIALIZED, this);
      this._initializeHooks.forEach((f) => f(this));
    });
    script.addEventListener("error", (e: ErrorEvent) => {
      console.error("failed to load PlayeSDK", e);
    });
    document.head.appendChild(script);
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
  }

  gameLoadingStart(): void {
    if (this._scriptLoaded) {
      this.sdk.gameLoadingStart();
    } else {
      this._queue.push(() => {
        this.sdk.gameLoadingStart();
      });
    }
  }

  gameLoadingFinished(): void {
    if (this._scriptLoaded) {
      this.sdk.gameLoadingFinished();
    } else {
      this._queue.push(() => {
        this.sdk.gameLoadingFinished();
      });
    }
  }

  async gameplayStart() {
    var result = await this.sdk.gamePlayStart()

    console.log("GameRecord", result);

    if (this._scriptLoaded) {
      this._gameRecord = result;
    } else {
      this._queue.push(async () => {
        this._gameRecord = result;
      });
    }
  }


  gamePlayFinish(score: number): void {
    if (this._gameRecord) {
      this._gameRecord.score = score;

      if (this._scriptLoaded) {
        this.sdk.gamePlayFinish(this._gameRecord);
      } else {
        this._queue.push(() => {
          this.sdk.gamePlayFinish(this._gameRecord);
        });
      }
    } else {
      console.error("game record is not set");
    }
  }

  gamePlayStop(): void {
    if (this._scriptLoaded) {
      this.sdk.gamePlayStop();
    } else {
      this._queue.push(() => {
        this.sdk.gamePlayStop();
      });
    }
  }
}