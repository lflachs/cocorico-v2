import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * POST /api/voice/transcribe
 * Transcribe audio using OpenAI Whisper API
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log("[Voice] Transcribing audio:", audioFile.name, audioFile.size, "bytes", "language:", language);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Map language codes to Whisper language codes
    const whisperLang = language === "fr" ? "fr" : "en";

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: whisperLang,
      response_format: "json",
    });

    console.log("[Voice] Transcription:", transcription.text);

    return NextResponse.json({
      text: transcription.text,
      success: true,
    });
  } catch (error) {
    console.error("[Voice] Transcription error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
