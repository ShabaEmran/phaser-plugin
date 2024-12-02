import { GameSession } from ".";

export interface SDKConfig {
    baseUrl: string;
}

export interface PlayeSDK {
    test(text?: string): void;
    isDemo(): boolean;
    gameLoadingStart(): void;
    gameLoadingFinished(): void;
    gamePlayStop(): void;
    updateGameSession(gameSession: GameSession): Promise<GameSession>;
    getGameById(id: number): Promise<GameSession | null>;
    getGameSession(): Promise<GameSession>;
}

declare global {
    interface Window {
        Playe: {
            SDK: {
                new(config: SDKConfig): PlayeSDK;
            };
        };
    }
}