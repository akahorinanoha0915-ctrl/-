import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { authenticateStudent } from "../../../lib/students";

// 自分の日記一覧（PIN必須 — 番号を知っているだけでは他人の日記を読めない）
export async function POST(req) {
  try {
    const { classCode, studentNumber, pin } = await req.json();
    const result = await authenticateStudent(classCode, studentNumber, pin);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { data, error } = await supabaseAdmin()
      .from("diary_entries")
      .select("id, content, word_count, ai_comment, created_at")
      .eq("student_id", result.student.id)
      .order("created_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
    }
    return NextResponse.json({ entries: data });
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }
}
