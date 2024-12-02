import { Plugins, Scene } from "phaser";
import { GameSession } from "./types";
import { PlayeSDK, SDKConfig } from "./types/sdk";
import { SessionTimer } from "./session-timer";

export class PlayePlugin extends Plugins.BasePlugin {
  private readonly SAVE_INTERVAL_MS = 10000; // 10 seconds
  private loadingSceneKey?: string;
  private gameplaySceneKey?: string;
  private isScriptLoaded = false;
  private initializeHooks: ((plugin: PlayePlugin) => void)[] = [];
  private commandQueue: (() => void)[] = [];
  private activeScenes: string[] = [];
  private gameSession?: GameSession;
  private sessionTimer: SessionTimer;

  public initialized = false;
  public sdk!: PlayeSDK;

  constructor(pluginManager: Plugins.PluginManager) {
    super(pluginManager);
    this.sessionTimer = new SessionTimer();
  }

  init({ loadingSceneKey, gameplaySceneKey }: GamePluginConfig): void {
    this.loadingSceneKey = loadingSceneKey;
    this.gameplaySceneKey = gameplaySceneKey;
    this.initializeSDK();
    this.setupEventListeners();
  }

  private initializeSDK(): void {
    const script = this.createSDKScript();
    script.addEventListener("load", this.handleScriptLoad.bind(this));
    script.addEventListener("error", this.handleScriptError);
    document.head.appendChild(script);
  }

  private createSDKScript(): HTMLScriptElement {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://dev-playe.s3.us-east-2.amazonaws.com/scripts/v1/playe-sdk.js";
    return script;
  }

  private async handleScriptLoad(): Promise<void> {
    const sdkConfig: SDKConfig = {
      baseUrl: "https://localhost:7232"
    };

    this.sdk = new window.Playe.SDK(sdkConfig);

    this.sdk.test();
    this.isScriptLoaded = true;
    this.executeQueuedCommands();
    this.initialized = true;
    this.notifyInitializeHooks();
  }

  private handleScriptError(error: ErrorEvent): void {
    console.error("Failed to load PlayeSDK:", error);
  }

  private setupEventListeners(): void {
    window.addEventListener('beforeunload', () => this.sessionTimer.stop());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveSessionDuration();
      }
    });
  }

  runWhenInitialized(callback: (plugin: PlayePlugin) => void): void {
    if (this.initialized) {
      callback(this);
    } else {
      this.initializeHooks.push(callback);
    }
  }

  start(): void {
    this.game.events.on("step", this.update, this);
  }

  stop(): void {
    this.game.events.off("step", this.update);
  }

  private update(): void {
    const currentScenes = this.game.scene.getScenes(true).map((s: Scene) => s.constructor.name);
    this.handleSceneChanges(currentScenes);

    if (!this.isDemo()) {
      this.sessionTimer.update();
    }
  }

  private handleSceneChanges(currentScenes: string[]): void {
    this.handleRemovedScenes(currentScenes);
    this.handleNewScenes(currentScenes);
  }

  private handleRemovedScenes(currentScenes: string[]): void {
    this.activeScenes = this.activeScenes.filter(name => {
      if (!currentScenes.includes(name)) {
        this.handleSceneRemoval(name);
        return false;
      }
      return true;
    });
  }

  private handleSceneRemoval(sceneName: string): void {
    if (sceneName === this.loadingSceneKey) {
      this.gameLoadingFinished();
    } else if (sceneName === this.gameplaySceneKey) {
      this.gamePlayStop();
    }
  }

  private handleNewScenes(currentScenes: string[]): void {
    currentScenes.forEach(async (name) => {
      if (!this.activeScenes.includes(name)) {
        this.activeScenes.push(name);
        await this.handleNewScene(name);
      }
    });
  }

  private async handleNewScene(sceneName: string): Promise<void> {
    if (sceneName === this.loadingSceneKey) {
      this.gameLoadingStart();
    } else if (sceneName === this.gameplaySceneKey) {
      await this.gameplayStart();
    }
  }

  private executeCommand(command: () => void): void {
    if (this.isScriptLoaded) {
      command();
    } else {
      this.commandQueue.push(command);
    }
  }

  private executeQueuedCommands(): void {
    this.commandQueue.forEach(command => command());
    this.commandQueue = [];
  }

  private notifyInitializeHooks(): void {
    this.initializeHooks.forEach(hook => hook(this));
  }

  private saveSessionDuration(): void {
    if (!this.isDemo() && this.gameSession) {
      this.gameSession.sessionDuration = this.sessionTimer.getDuration();
      this.executeCommand(() => {
        if (this.gameSession) {
          if (this.gameSession) {
            this.sdk.updateGameSession(this.gameSession);
          } else {
            console.error("Game session is not initialized");
          }
        } else {
          console.error("Game session is not initialized");
        }
      });
    }
  }

  gameLoadingStart(): void {
    if (!this.isDemo()) {
      this.executeCommand(() => this.sdk.gameLoadingStart());
    }
  }

  gameLoadingFinished(): void {
    if (!this.isDemo()) {
      this.executeCommand(() => this.sdk.gameLoadingFinished());
    }
  }

  async gameplayStart(): Promise<void> {
    if (!this.isDemo()) {
      const result = await this.sdk.getGameSession();
      console.log("GameSession:", result);

      this.executeCommand(() => {
        this.gameSession = result;
        this.sessionTimer.start();
      });
    }
  }

  gamePlayFinish(score: number, email: string): void {
    if (!this.isDemo() && this.gameSession) {
      this.updateGameSession(score, email);
      this.executeCommand(() => {
        if (this.gameSession) {
          this.sdk.updateGameSession(this.gameSession);
        } else {
          console.error("Game session is not initialized");
        }
      });
      this.sessionTimer.stop();
    } else {
      console.error("Game session is not initialized");
    }
  }

  private updateGameSession(score: number, email: string): void {
    if (this.gameSession) {
      this.gameSession.score = score;
      this.gameSession.sessionDuration = this.sessionTimer.getDuration();
      this.gameSession.updatedAt = new Date();
      this.gameSession.updatedBy = email;
      this.gameSession.playerId = email;
      this.gameSession.email = email;
    }
  }

  gamePlayStop(): void {
    if (!this.isDemo()) {
      this.sessionTimer.stop();
      this.executeCommand(() => this.sdk.gamePlayStop());
    }
  }

  private isDemo(): boolean {
    return this.sdk && this.sdk.isDemo();
  }
}

interface GamePluginConfig {
  loadingSceneKey: string;
  gameplaySceneKey: string;
}