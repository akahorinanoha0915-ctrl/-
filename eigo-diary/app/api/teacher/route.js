import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// 先生用ダッシュボード。TEACHER_PASSWORD による認証必須。
// 児童数ぶんの逐次クエリ（N+1）をやめて一括取得に変更。
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }

  const { password, classCode, from, to } = body;
  const expected = process.env.TEACHER_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "パスワードがちがいます" }, { status: 401 });
  }
  if (!classCode) {
    return NextResponse.json({ error: "クラスコードを入力してください" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const code = String(classCode).toUpperCase();

  const { data: students, error: stuErr } = await sb
    .from("students")
    .select("id, student_number")
    .eq("class_code", code)
    .order("student_number");
  if (stuErr) {
    return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
  }
  if (!students || students.length === 0) {
    return NextResponse.json({ students: [] });
  }

  // 全児童の日記を1クエリで取得（期間絞り込み対応）
  let q = sb
    .from("diary_entries")
    .select("student_id, content, word_count, ai_comment, grammar_note, created_at")
    .in("student_id", students.map((s) => s.id))
    .order("created_at", { ascending: false });
  if (from) q = q.gte("created_at", new Date(from).toISOString());
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    q = q.lte("created_at", end.toISOString());
  }
  const { data: entries, error: entErr } = await q;
  if (entErr) {
    return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
  }

  const byStudent = new Map(students.map((s) => [s.id, []]));
  for (const e of entries || []) {
    byStudent.get(e.student_id)?.push(e);
  }

  const rows = students.map((s) => {
    const es = byStudent.get(s.id) || [];
    return {
      student_number: s.student_number,
      entry_count: es.length,
      total_words: es.reduce((sum, e) => sum + (e.word_count || 0), 0),
      latest_date: es[0]?.created_at || null,
      entries: es.map((e) => ({
        content: e.content,
        word_count: e.word_count,
        ai_comment: e.ai_comment,
        grammar_note: e.grammar_note,
        created_at: e.created_at,
      })),
    };
  });

  return NextResponse.json({ students: rows });
}
