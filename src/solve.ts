import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { Page, Response } from "playwright-core";
import vosk from "vosk";
import wav from "wav";
import { debug } from "./debug.js";
import {
    MODEL_DIR,
    SOURCE_FILE,
    OUT_FILE,
    SAMPLE_RATE,
    MAIN_FRAME,
    BFRAME,
    CHALLENGE,
} from "./constants.js";

vosk.setLogLevel(-1);
const model = new vosk.Model(MODEL_DIR);

/**
 * Solve reCAPTCHA challenge in a page.
 * @param page a playwright Page.
 * @param options options.
 */
export async function solve(page: Page, { delay = 128, wait = 5000 } = {}): Promise<boolean> {
    try {
        await page.waitForSelector(BFRAME, { state: "attached" });
    } catch {
        throw new Error("No reCAPTCHA detected");
    }

    // bframe is the frame that contains the reCAPTCHA challenge.
    const b_iframe = await page.$(BFRAME);
    if (b_iframe === null) {
        throw new Error("Could not find reCAPTCHA popup iframe");
    }

    const bframe = await b_iframe.contentFrame();
    if (bframe === null) {
        throw new Error("Could not find reCAPTCHA popup iframe content");
    }

    const bframe_loaded = (await bframe.$(CHALLENGE)) ? true : false;
    debug("bframe loaded:", bframe_loaded);

    // if bframe is not loaded, manually load it by clicking the button in main frame.
    if (bframe_loaded === false) {
        await page.waitForSelector(MAIN_FRAME, { state: "attached" });

        const iframe = await page.$(MAIN_FRAME);
        if (iframe === null) {
            throw new Error("Could not find reCAPTCHA iframe");
        }

        const box_page = await iframe.contentFrame();
        if (box_page === null) {
            throw new Error("Could not find reCAPTCHA iframe content");
        }

        const invisible = (await box_page.$("div.rc-anchor-invisible")) ? true : false;
        debug("invisible:", invisible);

        // invisible reCAPTCHA does not has label on it.
        if (invisible === true) {
            return false;
        } else {
            const label = await box_page.$("#recaptcha-anchor-label");
            if (label === null) {
                throw new Error("Could not find reCAPTCHA label");
            }

            await label.click();
            await bframe.waitForSelector(CHALLENGE);
        }
    }

    const challenge = await bframe.$(CHALLENGE);
    if (challenge === null) {
        throw new Error("Could not find reCAPTCHA challenge");
    }

    const required = await challenge.evaluate(
        (elm): boolean => !elm.classList.contains("rc-footer"),
    );
    debug("action required:", required);

    if (required === false) {
        return false;
    }

    await bframe.waitForSelector("#recaptcha-audio-button", { timeout: wait });
    const audio_button = await bframe.$("#recaptcha-audio-button");
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
    await bframe.waitForSelector("#audio-source", { state: "attached", timeout: wait });

    debug("reconized text:", await text);

    await bframe.waitForSelector("#audio-response", { timeout: wait });
    const input = await bframe.$("#audio-response");
    if (input === null) {
        throw new Error("Could not find reCAPTCHA audio input");
    }

    await input.type(await text, { delay });

    const button = await bframe.$("#recaptcha-verify-button");
    if (button === null) {
        throw new Error("Could not find reCAPTCHA verify button");
    }

    await button.click();

    try {
        const iframe = await page.$(MAIN_FRAME);
        await iframe?.waitForSelector(".recaptcha-checkbox-checked", { timeout: wait });
    } catch {
        0;
    }

    return true;
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
