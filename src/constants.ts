import path from "node:path";

export const MODEL_DIR = path.resolve(__dirname, "..", "model");
export const SOURCE_FILE = "sound.mp3";
export const OUT_FILE = "out.wav";
export const SAMPLE_RATE = 16000;

export const MAIN_FRAME = "iframe[title='reCAPTCHA']";
export const BFRAME = "iframe[src^='https://www.google.com/recaptcha/api2/bframe']";
export const CHALLENGE = "body > div > div";
