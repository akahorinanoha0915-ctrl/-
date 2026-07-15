"use client";

import { useState } from "react";

function toCsv(rows) {
  const header = ["出席番号", "提出回数", "合計単語数", "最新提出日"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.student_number,
        r.entry_count,
        r.total_words,
        r.latest_date ? new Date(r.latest_date).toLocaleDateString("ja-JP") : "-",
      ].join(",")
    );
  }
  return "﻿" + lines.join("\n"); // BOM付き（Excel文字化け対策）
}

export default function TeacherPage() {
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);

  async function load() {
    if (!password || !classCode) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, classCode, from: from || undefined, to: to || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "読み込みに失敗しました");
        setRows(null);
        return;
      }
      setRows(data.students);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!rows) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `英語日記_${classCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">👩‍🏫 先生用ダッシュボード</h1>
        <p className="text-sm text-gray-500 mb-6">クラスの英語日記の進捗を確認できます</p>

        <div className="bg-white rounded-2xl shadow p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              className="border-2 border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-[180px] focus:outline-none focus:border-sky-400"
              placeholder="先生用パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="border-2 border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-[160px] focus:outline-none focus:border-sky-400"
              placeholder="クラスコード（例：5A）"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>期間：</span>
            <input type="date" className="border-2 border-gray-200 rounded-xl px-3 py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>〜</span>
            <input type="date" className="border-2 border-gray-200 rounded-xl px-3 py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
            <button
              onClick={load}
              disabled={loading || !password || !classCode}
              className="bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white font-bold px-6 py-2 rounded-xl transition ml-auto"
            >
              {loading ? "読み込み中..." : "表示"}
            </button>
            {rows && rows.length > 0 && (
              <button onClick={downloadCsv} className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl transition">
                📄 CSV
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {rows && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-sky-600">{rows.length}</p>
                <p className="text-sm text-gray-500">登録済み児童</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {rows.filter((r) => r.entry_count > 0).length}
                </p>
                <p className="text-sm text-gray-500">日記提出済み</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {rows.reduce((s, r) => s + r.total_words, 0)}
                </p>
                <p className="text-sm text-gray-500">クラス合計単語</p>
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.student_number} className="bg-white rounded-2xl shadow overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setOpen(open === r.student_number ? null : r.student_number)}
                  >
                    <span className="font-bold text-gray-700 w-12">{r.student_number}番</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        r.entry_count === 0
                          ? "bg-red-100 text-red-600"
                          : r.entry_count < 3
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {r.entry_count}回
                    </span>
                    <span className="text-sm text-gray-500">{r.total_words}語</span>
                    <span className="flex-1 text-sm text-gray-600 truncate">
                      {r.entries[0]?.content || "（まだ書いていません）"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {r.latest_date ? new Date(r.latest_date).toLocaleDateString("ja-JP") : "-"}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {open === r.student_number ? "▲" : "▼"}
                    </span>
                  </div>
                  {open === r.student_number && r.entries.length > 0 && (
                    <div className="px-5 pb-4 space-y-3">
                      {r.entries.map((e, i) => (
                        <div key={i} className="border-t pt-3">
                          <p className="text-xs text-gray-400">
                            {new Date(e.created_at).toLocaleString("ja-JP")}（{e.word_count}語）
                          </p>
                          <p className="text-sm mt-1">{e.content}</p>
                          {e.ai_comment && (
                            <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1 mt-1">
                              👩‍🏫 {e.ai_comment}
                            </p>
                          )}
                          {e.grammar_note && (
                            <p className="text-xs text-orange-700 bg-orange-50 rounded-lg px-2 py-1 mt-1">
                              📝 {e.grammar_note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
