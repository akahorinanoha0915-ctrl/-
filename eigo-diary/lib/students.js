import crypto from "crypto";
import { supabaseAdmin } from "./supabaseAdmin";

export function hashPin(pin) {
  return crypto
    .createHash("sha256")
    .update(`eigo-diary:${pin}`)
    .digest("hex");
}

// 英単語カウント: 空白区切りに加えて英字を含むトークンだけを数える
// （日本語混じり入力や記号だけのトークンを誤カウントしない）
export function countEnglishWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-zA-Z]/.test(w)).length;
}

export function isMostlyEnglish(text) {
  const jp = (text.match(/[ぁ-んァ-ヶ一-龯]/g) || []).length;
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  return en > 0 && en >= jp * 2;
}

// クラスコード＋出席番号＋PIN で本人確認して student レコードを返す。
// 初回利用時（PIN未設定）は渡された PIN を登録する。
export async function authenticateStudent(classCode, studentNumber, pin) {
  if (!classCode || !studentNumber || !pin || !/^\d{4}$/.test(String(pin))) {
    return { error: "クラスコード・出席番号・4けたのあいことばを入力してね", status: 400 };
  }
  const sb = supabaseAdmin();
  const code = String(classCode).toUpperCase().slice(0, 10);
  const num = parseInt(studentNumber, 10);
  if (!Number.isInteger(num) || num < 1 || num > 99) {
    return { error: "出席番号が正しくありません", status: 400 };
  }

  const { data: existing, error: selErr } = await sb
    .from("students")
    .select("id, pin_hash")
    .eq("class_code", code)
    .eq("student_number", num)
    .maybeSingle();
  if (selErr) return { error: "サーバーエラーが発生しました", status: 500 };

  const pinHash = hashPin(String(pin));

  if (!existing) {
    const { data: created, error: insErr } = await sb
      .from("students")
      .insert({ class_code: code, student_number: num, pin_hash: pinHash })
      .select("id")
      .single();
    if (insErr) return { error: "登録に失敗しました", status: 500 };
    return { student: created, isNew: true };
  }

  if (!existing.pin_hash) {
    // 旧データ移行: PIN 未設定なら今回の PIN を登録
    await sb.from("students").update({ pin_hash: pinHash }).eq("id", existing.id);
    return { student: existing, isNew: false };
  }

  if (existing.pin_hash !== pinHash) {
    return { error: "あいことばがちがいます", status: 401 };
  }
  return { student: existing, isNew: false };
}
