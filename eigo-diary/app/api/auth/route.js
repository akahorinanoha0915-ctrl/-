import { NextResponse } from "next/server";
import { authenticateStudent } from "../../../lib/students";

// ログイン（初回はあいことば登録を兼ねる）
export async function POST(req) {
  try {
    const { classCode, studentNumber, pin } = await req.json();
    const result = await authenticateStudent(classCode, studentNumber, pin);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, isNew: result.isNew });
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }
}
