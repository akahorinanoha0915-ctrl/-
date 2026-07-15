"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STARTERS = ["I played ", "I ate ", "I went to ", "It was ", "I like ", "I watched "];
const TOPICS = [
  "今日たべたもの (food)",
  "今日の天気 (weather)",
  "すきなこと (favorite things)",
  "今日したこと (what you did)",
  "家族や友だち (family & friends)",
];
const DRAFT_KEY = "eigo-diary-draft";
const LOGIN_KEY = "eigo-diary-login";

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/（[^）]*）/g, ""));
  u.lang = "en-US";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function streakDays(entries) {
  const days = new Set(entries.map((e) => new Date(e.created_at).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const BADGES = [
  { need: 1, emoji: "🌱", label: "はじめての日記" },
  { need: 5, emoji: "⭐", label: "5回達成" },
  { need: 10, emoji: "🏅", label: "10回達成" },
  { need: 20, emoji: "🏆", label: "20回達成" },
];

export default function Home() {
  const [classCode, setClassCode] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState("diary");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [aiComment, setAiComment] = useState(null);
  const [grammarNote, setGrammarNote] = useState(null);
  const [todayWord, setTodayWord] = useState(null);
  const [entries, setEntries] = useState([]);
  const [vocab, setVocab] = useState([]);
  const topic = useMemo(() => TOPICS[new Date().getDate() % TOPICS.length], []);
  const sendingRef = useRef(false);

  const creds = { classCode, studentNumber, pin };

  // ログイン状態・下書きの復元
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOGIN_KEY) || "null");
      if (saved?.classCode && saved?.studentNumber && saved?.pin) {
        setClassCode(saved.classCode);
        setStudentNumber(saved.studentNumber);
        setPin(saved.pin);
      }
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setContent(draft);
    } catch {}
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // 下書きの自動保存
  useEffect(() => {
    try {
      if (content) localStorage.setItem(DRAFT_KEY, content);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [content]);

  async function loadData(c = creds) {
    const [e, v] = await Promise.all([
      fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      }).then((r) => r.json()),
      fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      }).then((r) => r.json()),
    ]);
    if (e.entries) setEntries(e.entries);
    if (v.vocabulary) setVocab(v.vocabulary);
  }

  async function login() {
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "ログインできませんでした");
        return;
      }
      localStorage.setItem(LOGIN_KEY, JSON.stringify(creds));
      setLoggedIn(true);
      loadData();
    } catch {
      setLoginError("つうしんエラーです。もう一度ためしてね");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    localStorage.removeItem(LOGIN_KEY);
    setLoggedIn(false);
    setPin("");
    setEntries([]);
    setVocab([]);
  }

  async function submit() {
    if (sendingRef.current) return; // 二重送信防止
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送信に失敗しました。書いた日記は消えていないので、もう一度送ってみてね");
        return;
      }
      setAiComment(data.aiComment);
      setGrammarNote(data.grammarNote);
      setTodayWord(data.todayWord);
      setContent("");
      localStorage.removeItem(DRAFT_KEY);
      loadData();
    } catch {
      setError("つうしんエラーです。書いた日記は消えていないので、もう一度送ってみてね");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  const wordCount = content.trim().split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
  const wroteToday = entries.some(
    (e) => new Date(e.created_at).toDateString() === new Date().toDateString()
  );
  const streak = streakDays(entries);
  const maxWords = Math.max(1, ...entries.map((e) => e.word_count || 0));

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-100 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-sky-600 mb-2">🌟 英語日記アプリ</h1>
          <p className="text-center text-gray-500 text-sm mb-6">English Diary</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">クラスコード</label>
              <input
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-2 focus:outline-none focus:border-sky-400"
                placeholder="例：5A"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出席番号</label>
              <input
                type="number"
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-2 focus:outline-none focus:border-sky-400"
                placeholder="例：12"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                あいことば（4つの数字）
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-2 focus:outline-none focus:border-sky-400"
                placeholder="はじめての人はここで決めてね"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-gray-400 mt-1">
                はじめて使うときに入れた数字が、きみのあいことばになるよ
              </p>
            </div>
            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{loginError}</p>
            )}
            <button
              onClick={login}
              disabled={loggingIn || !classCode || !studentNumber || pin.length !== 4}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition"
            >
              {loggingIn ? "かくにん中..." : "はじめる！"}
            </button>
            <a href="/teacher" className="block text-center text-xs text-gray-400 mt-2 hover:text-gray-600">
              先生用ページ →
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 to-white p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-sky-600">🌟 英語日記</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{classCode} - {studentNumber}番</span>
            {streak > 0 && <span className="text-orange-500 font-bold">🔥{streak}日連続</span>}
            <button onClick={logout} className="text-xs text-gray-400 underline">こうたい</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            ["diary", "✏️ 日記"],
            ["vocab", `📖 単語帳${vocab.length ? ` (${vocab.length})` : ""}`],
            ["history", "📈 成長"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
                tab === key ? "bg-sky-500 text-white" : "bg-white text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "diary" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  今日の英語日記を書こう！✨
                </label>
                {wroteToday && (
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-1">
                    ✅ 今日は書けたよ
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-500 mb-2">💡 今日のおだい：{topic}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setContent((c) => c + s)}
                    className="text-xs bg-sky-50 text-sky-600 border border-sky-200 rounded-full px-2 py-1 hover:bg-sky-100"
                  >
                    {s.trim()}…
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 focus:outline-none focus:border-sky-400 min-h-[120px] text-base"
                placeholder="Today I..."
                maxLength={1000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">{wordCount} words・自動で下書き保存中</span>
                <button
                  onClick={submit}
                  disabled={sending || !content.trim()}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white font-bold px-6 py-2 rounded-xl transition"
                >
                  {sending ? "送信中..." : "送る！"}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-2">{error}</p>
              )}
            </div>

            {aiComment && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-bold text-yellow-700">👩‍🏫 Ms. Sunny より</p>
                    <button onClick={() => speak(aiComment)} className="text-sm">🔊 きく</button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{aiComment}</p>
                </div>
                {grammarNote && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3">
                    <p className="text-sm font-bold text-orange-600 mb-1">📝 ちょっとアドバイス</p>
                    <p className="text-sm text-orange-700">{grammarNote}</p>
                  </div>
                )}
                {todayWord?.word && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-blue-700 mb-2">
                      💡 次回はこの単語を使ってみよう！
                    </p>
                    <div className="bg-white rounded-xl px-4 py-3">
                      <p className="font-bold text-blue-600 text-lg">
                        {todayWord.word}
                        <span className="text-gray-500 font-normal text-sm ml-2">
                          （{todayWord.meaning_ja}）
                        </span>
                        <button onClick={() => speak(todayWord.word)} className="text-sm ml-2">🔊</button>
                      </p>
                      <p className="text-xs text-gray-500 mt-1 italic">{todayWord.example}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {entries.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-4">
                <p className="text-sm font-bold text-gray-600 mb-2">📚 最近の日記</p>
                {entries.slice(-3).reverse().map((e) => (
                  <div key={e.id} className="border-b last:border-0 py-2">
                    <p className="text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleDateString("ja-JP")}
                    </p>
                    <p className="text-sm">{e.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "vocab" && (
          <div className="space-y-2">
            {vocab.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                日記を書くと単語が自動で追加されるよ！
              </p>
            )}
            {vocab.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl shadow px-4 py-3">
                <p className="font-bold text-sky-600">
                  {v.word}
                  <span className="text-gray-500 font-normal text-sm ml-2">（{v.meaning_ja}）</span>
                  <button onClick={() => speak(v.word)} className="text-sm ml-2">🔊</button>
                </p>
                {v.example && <p className="text-xs text-gray-500 italic mt-1">{v.example}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-sky-600">{entries.length}</p>
                <p className="text-xs text-gray-500">回書いた</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-orange-500">{streak}</p>
                <p className="text-xs text-gray-500">日連続 🔥</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{vocab.length}</p>
                <p className="text-xs text-gray-500">単語を習得</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <p className="text-sm font-bold text-gray-600 mb-3">🏅 バッジ</p>
              <div className="flex gap-3">
                {BADGES.map((b) => (
                  <div
                    key={b.need}
                    className={`flex-1 text-center rounded-xl py-2 ${
                      entries.length >= b.need ? "bg-yellow-50" : "bg-gray-50 opacity-40"
                    }`}
                  >
                    <p className="text-2xl">{b.emoji}</p>
                    <p className="text-[10px] text-gray-500">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <p className="text-sm font-bold text-gray-600 mb-3">📊 書いた単語数の変化</p>
              {entries.length === 0 && (
                <p className="text-sm text-gray-400">日記を書くとグラフが出るよ！</p>
              )}
              <div className="flex items-end gap-1 h-32">
                {entries.slice(-15).map((e) => (
                  <div key={e.id} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-gradient-to-t from-sky-400 to-sky-300 rounded-t"
                      style={{ height: `${Math.max(8, ((e.word_count || 0) / maxWords) * 100)}%` }}
                      title={`${e.word_count}語`}
                    />
                    <p className="text-[9px] text-gray-400 mt-1">{e.word_count}</p>
                  </div>
                ))}
              </div>
              {entries.length >= 2 && (
                <div className="bg-purple-50 rounded-xl p-3 mt-3">
                  <p className="text-sm font-bold text-purple-700">🌱 成長してるね！</p>
                  <p className="text-sm text-purple-600 mt-1">
                    最初は {entries[0].word_count} 単語 → 最新は{" "}
                    {entries[entries.length - 1].word_count} 単語！
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
