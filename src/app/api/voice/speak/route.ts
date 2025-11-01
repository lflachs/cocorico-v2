import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prepareTextForTTS } from "@/lib/utils/number-to-words";
import crypto from "crypto";

// In-memory cache for TTS audio
// Key: hash of text + language
// Value: { audio: Buffer, timestamp: number }
const ttsCache = new Map<string, { audio: Buffer; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/voice/speak
 * Convert text to speech using OpenAI TTS API with caching
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { text, voice = "nova", language = "en" } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Prepare text for TTS: convert numbers and currency to words
    const preparedText = prepareTextForTTS(text, language as 'fr' | 'en');

    console.log("[Voice] Converting to speech:", preparedText, "language:", language);

    // Create cache key from text + language + voice
    const cacheKey = crypto
      .createHash('md5')
      .update(`${preparedText}-${language}-${voice}`)
      .digest('hex');

    // Check cache
    const cached = ttsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log("[Voice] Using cached audio:", cached.audio.length, "bytes");
      return new NextResponse(cached.audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cached.audio.length.toString(),
          "X-Cache": "HIT",
        },
      });
    }

    // Clean up expired cache entries (every 100 requests)
    if (Math.random() < 0.01) {
      for (const [key, value] of ttsCache.entries()) {
        if (now - value.timestamp >= CACHE_DURATION) {
          ttsCache.delete(key);
        }
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate speech with OpenAI TTS
    // Available voices: alloy, echo, fable, onyx, nova, shimmer
    // Note: OpenAI TTS automatically handles multiple languages
    // Using tts-1-hd for better quality, but you can use tts-1 for faster response
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // tts-1 is faster (~50% faster than tts-1-hd), use tts-1-hd for higher quality
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: preparedText,
      speed: 1.1, // Slightly faster speech (1.0-1.25 range) - saves ~10% time
    });

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log("[Voice] Speech generated:", buffer.length, "bytes");

    // Store in cache
    ttsCache.set(cacheKey, { audio: buffer, timestamp: now });

    // Return audio as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[Voice] TTS error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
