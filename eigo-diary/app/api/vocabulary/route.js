import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { authenticateStudent } from "../../../lib/students";

export async function POST(req) {
  try {
    const { classCode, studentNumber, pin } = await req.json();
    const result = await authenticateStudent(classCode, studentNumber, pin);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { data, error } = await supabaseAdmin()
      .from("vocabulary")
      .select("id, word, meaning_ja, example, created_at")
      .eq("student_id", result.student.id)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
    }
    return NextResponse.json({ vocabulary: data });
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }
}
