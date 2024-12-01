export const EVENT_INITIALIZED = "playe:initialized";

export interface GameSession {
    id: string;
    gameId: string;
    vendorId: string;
    campaignId: string;
    reservationId: string;
    playerId: string;
    browserSessionId: string;
    fingerprint: string;
    email: string;
    score: number;
    sessionDuration: number;
    startTime: Date;
    completionTime: Date;
    status: string;
    receiptUrl: string;
    receiptHash: string;
    totalAmount: number;
    gamepassDeducted: boolean;
    heartbeatCount: number;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}