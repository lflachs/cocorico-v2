import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * POST /api/voice/speak
 * Convert text to speech using OpenAI TTS API
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

    console.log("[Voice] Converting to speech:", text, "language:", language);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate speech with OpenAI TTS
    // Available voices: alloy, echo, fable, onyx, nova, shimmer
    // Note: OpenAI TTS automatically handles multiple languages
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      speed: 1.0,
    });

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log("[Voice] Speech generated:", buffer.length, "bytes");

    // Return audio as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
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
