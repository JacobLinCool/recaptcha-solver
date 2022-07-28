import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { Frame, Page, Response } from "playwright-core";
import vosk from "vosk";
import wav from "wav";

const MODEL_DIR = path.resolve(__dirname, "..", "model");
const SOURCE_FILE = "sound.mp3";
const OUT_FILE = "out.wav";
const SAMPLE_RATE = 16000;

vosk.setLogLevel(-1);
const model = new vosk.Model(MODEL_DIR);

/**
 * Resolve reCAPTCHA challenge in a page.
 * @param page a playwright Page.
 * @param options options.
 */
export async function resolve(page: Page, { delay = 128, popped = false } = {}): Promise<void> {
    popped || (await page.waitForSelector("iframe[title='reCAPTCHA']"));

    const iframe = await page.$("iframe[title='reCAPTCHA']");
    if (iframe === null && popped === false) {
        throw new Error("Could not find reCAPTCHA iframe");
    }

    const box_page = await iframe?.contentFrame();
    if (box_page === null && popped === false) {
        throw new Error("Could not find reCAPTCHA iframe content");
    }

    const label = await box_page?.$("#recaptcha-anchor-label");
    if (label === null && popped === false) {
        throw new Error("Could not find reCAPTCHA label");
    }

    popped || (await label?.click());

    const popup_iframe = await page.$(
        "iframe[src^='https://www.google.com/recaptcha/api2/bframe']",
    );
    if (popup_iframe === null) {
        throw new Error("Could not find reCAPTCHA popup iframe");
    }

    const popup_page = await popup_iframe.contentFrame();
    if (popup_page === null) {
        throw new Error("Could not find reCAPTCHA popup iframe content");
    }

    await popup_page.waitForSelector("#recaptcha-audio-button");
    const audio_button = await popup_page.$("#recaptcha-audio-button");
    if (audio_button === null) {
        throw new Error("Could not find reCAPTCHA audio button");
    }

    const text = new Promise<string>((resolve) => {
        page.on("response", async (res) => {
            get_text(res)
                .then(resolve)
                .catch(() => undefined);
        });
    });

    await audio_button.click();

    process.env.VERBOSE && console.log("reconized text:", await text);

    await popup_page.waitForSelector("#audio-response");
    const input = await popup_page.$("#audio-response");
    if (input === null) {
        throw new Error("Could not find reCAPTCHA audio input");
    }

    await input.type(await text, { delay });

    const button = await popup_page.$("#recaptcha-verify-button");
    if (button === null) {
        throw new Error("Could not find reCAPTCHA verify button");
    }

    await button.click();

    await box_page?.waitForSelector(".recaptcha-checkbox-checked");
}

function create_dir(): string {
    const dir = path.resolve(os.tmpdir(), "rr-" + Math.random().toString().slice(2));
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function convert(dir: string): void {
    spawnSync(
        "ffmpeg",
        [
            "-i",
            SOURCE_FILE,
            "-acodec",
            "pcm_s16le",
            "-ac",
            "1",
            "-ar",
            String(SAMPLE_RATE),
            OUT_FILE,
        ],
        { cwd: dir, stdio: process.env.VERBOSE ? "inherit" : "ignore" },
    );
}

function reconize(dir: string): Promise<string> {
    return new Promise((resolve) => {
        const reader = new wav.Reader();
        const readable = new Readable().wrap(reader);

        reader.on("format", async ({ audioFormat, sampleRate, channels }) => {
            if (audioFormat != 1 || channels != 1) {
                throw new Error("Audio file must be WAV with mono PCM.");
            }

            const rec = new vosk.Recognizer({ model, sampleRate });
            rec.setMaxAlternatives(10);
            rec.setWords(true);
            rec.setPartialWords(true);

            for await (const data of readable) {
                const end_of_speech = rec.acceptWaveform(data);
                if (end_of_speech) {
                    resolve(
                        rec
                            .result()
                            .alternatives.sort((a: any, b: any) => b.confidence - a.confidence)[0]
                            .text,
                    );
                }
            }

            rec.free();
        });
        fs.createReadStream(path.resolve(dir, OUT_FILE), { highWaterMark: 4096 }).pipe(reader);
    });
}

async function get_text(res: Response) {
    const temp_dir = create_dir();

    const content_type = res.headers()["content-type"];

    if (content_type === "audio/mp3") {
        fs.writeFileSync(path.resolve(temp_dir, SOURCE_FILE), await res.body());
        convert(temp_dir);
        return await reconize(temp_dir);
    }

    throw new Error("Unexpected response");
}
