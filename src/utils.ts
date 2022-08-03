import { debug } from "./debug";

export class Mutex {
    private _locked = false;
    private _queue: Array<() => void> = [];

    constructor(public name = "Mutex") {}

    public async lock(tag?: string): Promise<void> {
        if (this._locked) {
            if (tag) {
                debug(`[${this.name}] ${tag} waiting`);
            }

            return new Promise((resolve) => {
                this._queue.push(() => {
                    this._lock(tag);

                    resolve();
                });
            });
        }

        this._lock(tag);
    }

    public unlock(tag?: string): void {
        if (this._locked) {
            if (tag) {
                debug(`[${this.name}] ${tag} unlocked`);
            }

            this._locked = false;
            this._queue.shift()?.();
        }
    }

    private _lock(tag?: string): void {
        this._locked = true;

        if (tag) {
            debug(`[${this.name}] ${tag} locked`);
        }
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
