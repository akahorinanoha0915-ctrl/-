// APIを使わない無料のフィードバック生成。
// Ms. Sunny のコメント・文法アドバイス・おすすめ単語・単語帳登録を
// 内蔵の辞書とルールだけで作る。

// 小5・6でよく使う語彙のミニ辞書（単語帳の意味付けに使用）
const DICT = {
  play: "あそぶ・（スポーツを）する", played: "あそんだ・した", eat: "たべる",
  ate: "たべた", go: "いく", went: "いった", see: "みる", saw: "みた",
  watch: "みる（テレビなど）", watched: "みた", like: "すき", love: "だいすき",
  make: "つくる", made: "つくった", study: "べんきょうする", studied: "べんきょうした",
  read: "よむ", run: "はしる", ran: "はしった", swim: "およぐ", swam: "およいだ",
  buy: "かう", bought: "かった", get: "もらう・手に入れる", got: "もらった",
  talk: "はなす", talked: "はなした", listen: "きく", walk: "あるく",
  today: "きょう", yesterday: "きのう", tomorrow: "あした", morning: "あさ",
  afternoon: "ごご", night: "よる", school: "学校", home: "いえ", house: "いえ",
  friend: "ともだち", friends: "ともだち", family: "かぞく", mother: "おかあさん",
  father: "おとうさん", brother: "きょうだい（男）", sister: "きょうだい（女）",
  teacher: "先生", dog: "いぬ", cat: "ねこ", book: "本", music: "音楽",
  game: "ゲーム", games: "ゲーム", soccer: "サッカー", baseball: "野球",
  basketball: "バスケットボール", tennis: "テニス", lunch: "昼ごはん",
  dinner: "夕ごはん", breakfast: "朝ごはん", happy: "うれしい", sad: "かなしい",
  fun: "たのしい", good: "よい", great: "すばらしい", nice: "すてき",
  delicious: "おいしい", beautiful: "うつくしい", big: "大きい", small: "小さい",
  hot: "あつい", cold: "さむい", rainy: "雨の", sunny: "晴れの", cloudy: "くもりの",
  tired: "つかれた", excited: "わくわくした", interesting: "おもしろい",
  favorite: "お気に入りの", park: "公園", library: "図書館", pool: "プール",
  weekend: "週末", homework: "宿題", movie: "えいが", curry: "カレー",
  rice: "ごはん", fish: "さかな", apple: "りんご", pizza: "ピザ",
};

// 「次回はこの単語を使ってみよう！」候補
const SUGGEST_WORDS = [
  { word: "excited", meaning_ja: "わくわくした", example: "I was excited about the game." },
  { word: "delicious", meaning_ja: "おいしい", example: "The curry was delicious." },
  { word: "because", meaning_ja: "〜だから", example: "I was happy because I won." },
  { word: "with", meaning_ja: "〜といっしょに", example: "I played soccer with my friends." },
  { word: "after", meaning_ja: "〜のあとで", example: "After school, I went to the park." },
  { word: "favorite", meaning_ja: "お気に入りの", example: "Curry is my favorite food." },
  { word: "weekend", meaning_ja: "週末", example: "I want to swim this weekend." },
  { word: "interesting", meaning_ja: "おもしろい", example: "The book was interesting." },
  { word: "tired", meaning_ja: "つかれた", example: "I was tired after practice." },
  { word: "beautiful", meaning_ja: "うつくしい", example: "The sky was beautiful." },
  { word: "usually", meaning_ja: "ふだんは", example: "I usually get up at seven." },
  { word: "want to", meaning_ja: "〜したい", example: "I want to see my friends." },
];

const PRAISE = [
  "Great job writing in English today! I enjoyed reading your diary.（今日も英語で書けたね！日記を読むのが楽しかったよ）",
  "Wonderful! Your English is getting better and better.（すばらしい！英語がどんどん上手になっているね）",
  "Nice writing! Thank you for sharing your day with me.（すてきな日記！今日のできごとを教えてくれてありがとう）",
  "Well done! I love reading about your day.（よくできました！きみの一日のお話を読むのが大すきだよ）",
  "Fantastic! Keep writing a little every day.（すごい！毎日少しずつ書き続けようね）",
];

const TOPIC_COMMENTS = [
  { re: /(soccer|baseball|basketball|tennis|swim|sport|game)/i, en: "Sports are so much fun!", ja: "スポーツって楽しいよね！" },
  { re: /(eat|ate|lunch|dinner|breakfast|delicious|curry|pizza|food)/i, en: "That sounds delicious!", ja: "おいしそう！" },
  { re: /(friend|friends)/i, en: "Time with friends is the best!", ja: "友だちとの時間は最高だね！" },
  { re: /(book|read|library)/i, en: "Reading is wonderful!", ja: "読書はすてきだね！" },
  { re: /(happy|fun|excited|great)/i, en: "I'm happy that you had a good day!", ja: "いい一日だったみたいでうれしいよ！" },
  { re: /(tired|sad)/i, en: "I hope tomorrow will be a better day!", ja: "あしたはもっといい日になりますように！" },
  { re: /(rain|rainy|sunny|hot|cold|snow)/i, en: "Weather words are great to use!", ja: "天気のことばを使えたね！" },
];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function checkGrammar(text) {
  const notes = [];
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (/(^|[.!?]\s+)[a-z]/.test(text)) {
    notes.push("文のさいしょの文字は大文字にしてみよう（例：today → Today）");
  }
  if (/\bi\b/.test(text)) {
    notes.push("「わたしは」の i はいつも大文字の I で書くよ（i → I）");
  }
  if (!/[.!?]\s*$/.test(text.trim())) {
    notes.push("文のさいごにはピリオド（.）をつけよう");
  }
  if (sentences.some((s) => s.split(/\s+/).length > 15)) {
    notes.push("長い文は2つに分けると読みやすくなるよ");
  }
  return notes.length > 0 ? notes[0] : null;
}

export function generateFeedback(text, knownWords = []) {
  const seed = Array.from(text).reduce((a, c) => a + c.charCodeAt(0), 0);
  const words = text.toLowerCase().match(/[a-z']+/g) || [];

  // コメント: ほめことば + 内容に合わせたひとこと
  const topic = TOPIC_COMMENTS.find((t) => t.re.test(text));
  let aiComment = pick(PRAISE, seed);
  if (topic) aiComment += `\n${topic.en}（${topic.ja}）`;

  // 単語帳: 日記で実際に使った単語のうち辞書にあるもの
  const known = new Set(knownWords.map((w) => w.toLowerCase()));
  const seen = new Set();
  const vocabulary = [];
  for (const w of words) {
    if (DICT[w] && !known.has(w) && !seen.has(w)) {
      seen.add(w);
      vocabulary.push({ word: w, meaning_ja: DICT[w], example: "" });
      if (vocabulary.length >= 5) break;
    }
  }

  // おすすめ単語: まだ使っていないものから選ぶ
  const unused = SUGGEST_WORDS.filter(
    (s) => !words.includes(s.word.split(" ")[0]) && !known.has(s.word)
  );
  const todayWord = pick(unused.length > 0 ? unused : SUGGEST_WORDS, seed);

  return {
    aiComment,
    grammarNote: checkGrammar(text),
    todayWord,
    vocabulary,
  };
}
