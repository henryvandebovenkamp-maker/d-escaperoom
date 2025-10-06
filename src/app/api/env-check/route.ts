import { NextResponse } from "next/server";
export const runtime = "edge";
export async function GET() {
  return NextResponse.json({
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    runtime: "edge",
  });
}
