import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { generateFeedback } from "../../../lib/feedback";
import {
  authenticateStudent,
  countEnglishWords,
  isMostlyEnglish,
} from "../../../lib/students";

const MAX_LENGTH = 1000;

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

  // 単語帳の既習語を取得（重複登録を避ける＋おすすめ単語の選定に使う）
  const { data: existingWords } = await sb
    .from("vocabulary")
    .select("word")
    .eq("student_id", studentId);
  const known = (existingWords || []).map((v) => v.word);

  // フィードバック生成（内蔵ロジック・無料。外部APIは使わない）
  const feedback = generateFeedback(text, known);
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

  // 使った単語を単語帳に追加
  if (feedback.vocabulary.length > 0) {
    await sb.from("vocabulary").insert(
      feedback.vocabulary.map((v) => ({ student_id: studentId, ...v }))
    );
  }

  return NextResponse.json({
    aiComment: feedback.aiComment,
    grammarNote: feedback.grammarNote,
    todayWord: feedback.todayWord,
    wordCount,
    alreadyToday,
  });
}
