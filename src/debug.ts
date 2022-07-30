export function debug(...args: unknown[]): void {
    if (process.env.VERBOSE) {
        console.log("[reCAPTCHA solver]", ...args);
    }
}
