export class SessionTimer {
    private startTime: number | null = null;
    private duration: number = 0;
    private timerInterval: number | null = null;
    private lastSavedDuration: number = 0;

    start(): void {
        this.startTime = Date.now();
        this.timerInterval = window.setInterval(() => this.update(), 1000);
    }

    update(): void {
        if (this.startTime !== null) {
            this.duration = Math.floor((Date.now() - this.startTime) / 1000);
        }
    }

    stop(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getDuration(): number {
        return this.duration;
    }
}