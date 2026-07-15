import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  authenticateStudent,
  countEnglishWords,
  isMostlyEnglish,
} from "../../../lib/students";

const MAX_LENGTH = 1000;

const FEEDBACK_SCHEMA = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      aiComment: {
        type: "string",
        description:
          "Warm, encouraging comment in simple English (2-3 short sentences) from Ms. Sunny, followed by a short Japanese translation in parentheses.",
      },
      grammarNote: {
        type: ["string", "null"],
        description:
          "One gentle grammar/spelling tip in simple Japanese for elementary school students, or null if the entry has no notable issues.",
      },
      todayWord: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning_ja: { type: "string" },
          example: { type: "string" },
        },
        required: ["word", "meaning_ja", "example"],
        additionalProperties: false,
      },
      vocabulary: {
        type: "array",
        description:
          "English words the student actually used in the diary, with Japanese meanings.",
        items: {
          type: "object",
          properties: {
            word: { type: "string" },
            meaning_ja: { type: "string" },
            example: { type: "string" },
          },
          required: ["word", "meaning_ja", "example"],
          additionalProperties: false,
        },
      },
    },
    required: ["aiComment", "grammarNote", "todayWord", "vocabulary"],
    additionalProperties: false,
  },
};

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }

  const { classCode, studentNumber, pin, content } = body;
  const result = await authenticateStudent(classCode, studentNumber, pin);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 入力バリデーション
  const text = (content || "").trim();
  if (!text) {
    return NextResponse.json({ error: "日記を書いてから送ってね" }, { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `長すぎます（${MAX_LENGTH}文字まで）。少し短くしてみよう！` },
      { status: 400 }
    );
  }
  if (!isMostlyEnglish(text)) {
    return NextResponse.json(
      { error: "英語で書いてみよう！ 例：Today I played soccer." },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const studentId = result.student.id;

  // 同日の重複投稿チェック（連打・二重送信のサーバー側ガード）
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await sb
    .from("diary_entries")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", startOfDay.toISOString());
  const alreadyToday = (count || 0) > 0;

  // AIコメント生成（Ms. Sunny）
  let feedback;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system:
        "You are Ms. Sunny, a cheerful English teacher for Japanese elementary school students (grades 5-6). " +
        "Students write short English diaries. Respond warmly and simply. " +
        "Use vocabulary appropriate for beginners. Never criticize harshly.",
      output_config: { format: FEEDBACK_SCHEMA },
      messages: [
        {
          role: "user",
          content: `Here is today's diary entry from a student:\n\n${text}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "コメントを作れませんでした。もう一度送ってみてね" },
        { status: 502 }
      );
    }
    const textBlock = response.content.find((b) => b.type === "text");
    feedback = JSON.parse(textBlock.text);
  } catch (e) {
    console.error("AI feedback failed:", e);
    return NextResponse.json(
      { error: "先生からのコメントづくりに失敗しました。少し待ってからもう一度送ってね（書いた日記は消えていません）" },
      { status: 502 }
    );
  }

  const wordCount = countEnglishWords(text);

  // 日記保存
  const { error: insErr } = await sb.from("diary_entries").insert({
    student_id: studentId,
    content: text,
    word_count: wordCount,
    ai_comment: feedback.aiComment,
    grammar_note: feedback.grammarNote,
  });
  if (insErr) {
    console.error("insert failed:", insErr);
    return NextResponse.json(
      { error: "保存に失敗しました。もう一度送ってみてね（書いた日記は消えていません）" },
      { status: 500 }
    );
  }

  // 使った単語を単語帳に追加（重複はスキップ）
  const vocab = (feedback.vocabulary || []).slice(0, 10);
  if (vocab.length > 0) {
    const { data: existingWords } = await sb
      .from("vocabulary")
      .select("word")
      .eq("student_id", studentId);
    const known = new Set((existingWords || []).map((v) => v.word.toLowerCase()));
    const fresh = vocab
      .filter((v) => !known.has(v.word.toLowerCase()))
      .map((v) => ({ student_id: studentId, ...v }));
    if (fresh.length > 0) await sb.from("vocabulary").insert(fresh);
  }

  return NextResponse.json({
    aiComment: feedback.aiComment,
    grammarNote: feedback.grammarNote,
    todayWord: feedback.todayWord,
    wordCount,
    alreadyToday,
  });
}
