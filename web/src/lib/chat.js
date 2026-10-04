// Chat tutor: offline rule-based Marathi tutor + optional online LLM
// via user-supplied OpenAI-compatible apiBase/key (chat or responses style).

const GREETINGS = ['नमस्कार', 'नमस्ते', 'hello', 'hi', 'hey', 'ram ram']

const SMALL_TALK = [
  {
    k: ['नाव', 'name'],
    r: 'माझं नाव मराठी मित्र आहे! 🤖 तुझं नाव काय? (My name is Marathi Mitra! What is your name?)',
  },
  {
    k: ['कसा आहेस', 'कशी आहेस', 'कसे आहात', 'how are you'],
    r: 'मी छान आहे, धन्यवाद! 😊 तू कसा/कशी आहेस? (I am well, thank you! How are you?)',
  },
  {
    k: ['धन्यवाद', 'thank'],
    r: 'अगदी स्वागत आहे! 🙏 (You are most welcome!)',
  },
  {
    k: ['bye', 'निरोप', 'भेटू'],
    r: 'पुन्हा भेटू! 👋 सराव करत राहा. (See you again! Keep practicing.)',
  },
]

const WORD_HELP = [
  { k: ['पाणी', 'water'], r: '💧 पाणी = water. वाक्य: "मला पाणी हवं आहे." (I want water.)' },
  { k: ['जेवण', 'food', 'जेवायला'], r: '🍛 जेवण = food/meal. वाक्य: "जेवण तयार आहे." (The meal is ready.)' },
  { k: ['शाळा', 'school'], r: '🏫 शाळा = school. वाक्य: "मी शाळेत जातो/जाते." (I go to school.)' },
  { k: ['मांजर', 'cat'], r: '🐱 मांजर = cat. वाक्य: "मांजर दूध पितं." (The cat drinks milk.)' },
  { k: ['पुस्तक', 'book'], r: '📖 पुस्तक = book. वाक्य: "हे माझं पुस्तक आहे." (This is my book.)' },
]

const CORRECTIONS = [
  {
    // masculine speaker using feminine verb
    test: (t) => /मी (जातो|करतो|बोलतो|शिकतो)/.test(t),
    r: null, // correct already — praise below
  },
]

/** Offline tutor reply. Returns { text, corrected } — corrected is a gentle fix or ''. */
export function offlineReply(input) {
  const t = (input || '').trim()
  const low = t.toLowerCase()
  if (!t) return { text: 'काहीतरी लिहा — मी मराठीत उत्तर देईन! ✍️', corrected: '' }
  if (GREETINGS.some((g) => low.startsWith(g)))
    return {
      text: 'नमस्कार! 🙏 मी तुझा मराठी शिक्षक आहे. मराठीत काहीतरी विचार! (Hello! I am your Marathi tutor. Ask me something in Marathi!)',
      corrected: '',
    }
  for (const s of SMALL_TALK) {
    if (s.k.some((k) => low.includes(k.toLowerCase()))) return { text: s.r, corrected: '' }
  }
  for (const w of WORD_HELP) {
    if (w.k.some((k) => low.includes(k.toLowerCase()))) return { text: w.r, corrected: '' }
  }
  // Gender-verb nudge: मी जाते (f.) vs मी जातो (m.) — remind, don't scold
  if (/मी .*ते\b/.test(t) && !/मी (जाते|करते|बोलते|शिकते|राहते|घेते)/.test(t)) {
    return {
      text: `छान प्रयत्न! 👏 लक्षात ठेव: "मी" सोबत क्रियापद बदलतं — मुलगा म्हणतो "मी जातो", मुलगी म्हणते "मी जाते". तुझं वाक्य पुन्हा लिहून पाहा! (Nice try! Remember verb gender with मी.)`,
      corrected: '',
    }
  }
  if (/[\u0900-\u097F]/.test(t)) {
    // contains Devanagari — praise + follow-up question
    void CORRECTIONS
    const follows = [
      'छान! 🌟 आणखी एक वाक्य लिहा — आज तू काय केलंस? (Great! Write one more sentence — what did you do today?)',
      'खूप छान! 🎉 "मला ___ आवडतं" वापरून एक वाक्य बनव. (Very nice! Make a sentence with "I like ___".)',
      'शाब्बास! 👏 आता हेच वाक्य प्रश्नात बदल: शेवटी "का?" जोड. (Bravo! Now turn it into a question with "का?".)',
    ]
    return { text: follows[t.length % follows.length], corrected: '' }
  }
  return {
    text: 'मराठीत लिहायचा प्रयत्न कर! 💪 उदाहरण: "माझं नाव ___ आहे." (Try writing in Marathi! Example: "My name is ___".)',
    corrected: '',
  }
}

export function isOnline(settings) {
  return Boolean(settings?.apiBase && settings?.apiKey)
}

function systemPrompt() {
  return 'You are a friendly Marathi tutor for beginners. Always reply with Marathi (Devanagari) first, then a short English gloss in parentheses. Correct mistakes gently, then ask one follow-up question. Keep replies under 60 words.'
}

/** Call an OpenAI-compatible API. style: 'chat' | 'responses'. Returns reply text. */
export async function llmReply(settings, messages) {
  const base = (settings.apiBase || '').replace(/\/+$/, '')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  }
  const model = settings.model || 'muse-spark-1.3-contributor'
  if ((settings.apiStyle || 'chat') === 'responses') {
    const input = messages
      .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.text}`)
      .join('\n')
    const res = await fetch(`${base}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, instructions: systemPrompt(), input }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return (
      data.output_text ||
      data.output?.map((o) => o.content?.map((c) => c.text).join('')).join('') ||
      '(रिकामं उत्तर)'
    )
  }
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        ...messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      ],
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '(रिकामं उत्तर)'
}
