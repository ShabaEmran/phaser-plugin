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
      baseUrl: "https://dev-playe-api.playe.co",
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
    window.addEventListener('beforeunload', () => {
      if (!this.isGameFinished()) {
        this.sessionTimer.stop();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !this.isGameFinished()) {
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

    // Only update session timer if game is not finished and not in demo mode
    if (!this.isDemo() && !this.isGameFinished()) {
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
    if (!this.isDemo() && this.gameSession && !this.isGameFinished()) {
      this.gameSession.sessionDuration = this.sessionTimer.getDuration();
      this.executeCommand(() => {
        if (this.gameSession) {
          this.sdk.updateGameSession(this.gameSession);
        } else {
          console.error("Game session is not initialized");
        }
      });
    }
  }

  // Helper method to check if the game is finished
  private isGameFinished(): boolean {
    return this.gameSession?.isCompleted ?? false;
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

  // Reset all state and prepare for a new game session
  private resetGameState(): void {
    this.sessionTimer.stop();
    this.sessionTimer = new SessionTimer();
    this.gameSession = undefined;
    this.activeScenes = [];
  }

  gamePlayFinish(score: number, email: string): void {
    if (!this.isDemo() && this.gameSession) {
      this.finalizeGameSession(score, email);
      this.executeCommand(() => {
        if (this.gameSession) {
          this.sdk.updateGameSession({
            ...this.gameSession,
            isCompleted: true,
          });
        }
      });
      // Reset all state after finishing
      this.resetGameState();
    }
  }

  private finalizeGameSession(score: number, email: string): void {
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
    if (!this.isDemo() && !this.isGameFinished()) {
      this.sessionTimer.stop();
      this.executeCommand(() => this.sdk.gamePlayStop());
    }
  }

  // New method to handle play again functionality
  async playAgain(): Promise<void> {
    if (!this.isDemo()) {
      // Reset all state
      this.resetGameState();

      // Start a new game session
      await this.gameplayStart();

      // Notify the SDK that we're starting a new game
      this.executeCommand(() => this.sdk.gamePlayStop());
      this.gameLoadingStart();
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