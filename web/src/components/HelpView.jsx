const TOPICS = [
  {
    id: 'h-chat',
    mr: 'गप्पा',
    en: 'Chat Tutor',
    body: '<li>मराठीत किंवा इंग्रजीत संदेश लिहा, <b>पाठवा</b> दाबा (किंवा Enter). शिक्षक मराठीत उत्तर देईल आणि चुका सुधारेल.</li><li><b>Offline</b> (default): नियम-आधारित सराव — शब्द, वाक्यं, सुधारणा. <b>Online</b>: Settings मध्ये API Base + Key टाका; हवा तो Model वापरा.</li><li><b>🔊 शेवटचं वाचा</b> शेवटचं उत्तर मोठ्याने वाचतं. <b>Clear</b> गप्पा पुसतो (history device वर save होते).</li>',
  },
  {
    id: 'h-sprint',
    mr: 'वाचन स्प्रिंट',
    en: 'Reading Sprint',
    body: '<li>वेळ (30/60/120 सेकंद) + स्तर निवडा → <b>सुरू करा</b> → उतारा मोठ्याने वाचा → <b>झालं</b> दाबा.</li><li>निकालात Words, Time, <b>WPM</b> (words per minute) आणि लक्ष्य-तुलना दिसते. L1 लक्ष्य 40–60 WPM पासून सुरुवात, L4 पर्यंत 120–140.</li><li>नंतर आकलन-प्रश्न सोडवा. रोज 1–2 sprint = वेग + आत्मविश्वास.</li>',
  },
  {
    id: 'h-stories',
    mr: 'गोष्टी',
    en: 'Stories',
    body: '<li>स्तर filter (सर्व / L1–L4) → गोष्ट उघडा. वर animated scene दिसते.</li><li><b>🔊 ऐका</b> = साधं वाचन (शब्दांवर hover केल्यास अर्थ दिसतो). <b>🎤 वाचा</b> = karaoke read-along, बोलका शब्द हायलाइट होतो.</li><li><b>गती</b> (0.6x–1.3x) बदला; <b>transliteration</b> चालू केल्यास roman लिपी दिसते.</li><li>Quiz मध्ये पूर्ण गुण मिळाल्यास 🎉 celebration. L4 गोष्टींमध्ये <b>विचार करा</b> चर्चा-प्रश्न (उत्तर पाहण्यासाठी उघडा).</li>',
  },
  {
    id: 'h-drills',
    mr: 'सराव',
    en: 'Drills',
    body: '<li>Adaptive सराव: सलग 4 बरोबर → पातळी आपोआप वर जाते. तीन प्रकार फिरून येतात.</li><li><b>pack</b>: वाक्य-सराव — MCQ, fill-blank, EN↔MR भाषांतर, reorder, match. Reorder मध्ये शब्दांना क्रमाने टॅप करा (<b>पुसा</b> = clear).</li><li><b>speaking</b>: वाक्य ऐका, मग <b>🎤 बोला</b> (mic 10 सेकंदात उत्तर न दिल्यास पुढे जाता येतं). Mic नसल्यास <b>मी मोठ्याने म्हणालो</b> दाबा.</li><li><b>vocab</b>: शब्द-सराव — ऐका-ओळखा, बोला, लिहा. 💡 hint नेहमी वाचा.</li>',
  },
  {
    id: 'h-grammar',
    mr: 'व्याकरण',
    en: 'Grammar',
    body: '<li>Topic निवडा (लिंग, वचन, विभक्ती-योग्य अव्यय, वर्तमान/भूत/भविष्य काळ, विशेषण) → नियम + तक्ता + उदाहरणं वाचा → Quiz सोडवा.</li><li>प्रत्येक उत्तराचं <b>स्पष्टीकरण</b> वाचा — pattern तिथेच लक्षात राहतो.</li><li>गप्पांमध्ये Topic चा वापर करून सराव करा (उदा. शिक्षकाला विचारा: लिंग म्हणजे काय?).</li>',
  },
  {
    id: 'h-vocab',
    mr: 'शब्दसंग्रह',
    en: 'Vocab Quiz',
    body: '<li><b>EN → MR</b> किंवा <b>MR → EN</b> दिशा निवडा, पर्यायांमधून उत्तर द्या, <b>पुढचं</b> दाबा.</li><li>चुकलेले शब्द SRS मुळे पुन्हा-पुन्हा येतात (box 0–5: वरचा box = जास्त आठवण).</li><li>नामांजवळची लिंग-चिप लक्षात ठेवा: <b>पु.</b> = masculine, <b>स्त्री.</b> = feminine, <b>न.</b> = neuter.</li>',
  },
  {
    id: 'h-progress',
    mr: 'प्रगती',
    en: 'Progress',
    body: '<li>एकूण <b>XP</b>, रोजची <b>streak 🔥</b>, <b>अचूकता %</b> आणि प्रत्येक mode चा XP bar.</li><li>बरोबर उत्तर +10 XP, प्रयत्न +2 XP, story पूर्ण +5 bonus. रोज थोडा सराव = streak टिकते.</li><li><b>Reset progress</b> फक्त आकडे पुसतो; Settings/chat वेगळे राहतात.</li>',
  },
  {
    id: 'h-settings',
    mr: 'सेटिंग्ज',
    en: 'Settings',
    body: '<li><b>Model</b>: हवा तो model (default muse-spark-1.3-contributor). <b>API Base + Key</b>: रिकामं = offline tutor; भरल्यास online AI.</li><li><b>API Style</b>: chat/completions (सार्वत्रिक) किंवा responses (नवीन OpenAI style).</li><li><b>स्तर, Voice, Speed, Theme, transliteration</b> तुमच्या सोयीनुसार. <b>जतन करा</b> दाबायला विसरू नका.</li><li><b>सर्व डेटा पुसा</b> device वरील सगळं (settings, progress, chat) पुसून fresh सुरुवात देतो.</li>',
  },
  {
    id: 'h-tips',
    mr: 'टिप्स',
    en: 'Daily routine',
    body: '<li>शिफारस केलेली 15 मिनिटं: 1 sprint + 1 story + 10 drills + 5 vocab.</li><li>Enter = पाठवा/तपासा. Voice features साठी <b>Chrome/Edge</b> वापरा आणि mic परवानगी द्या.</li><li>कुठलंही मराठी text <b>highlight</b> केल्यास <b>🔊 वाचा</b> button येतं — Marathi voice मध्ये ऐका (थांबवायला <b>⏹ थांबा</b> किंवा Esc).</li><li>कठीण वाटल्यास स्तर खाली घ्या — सातत्य > अवघडपणा. Streak तुटू देऊ नका!</li>',
  },
]

export default function HelpView() {
  return (
    <>
      <div className="card">
        <h2>मदत — How to use every part</h2>
        <p className="muted small">प्रत्येक भागासाठी सूचना. Tap a topic to jump.</p>
        <div className="row">
          {TOPICS.map((t) => (
            <a className="btn small secondary" key={t.id} href={`#${t.id}`}>
              {t.mr}
            </a>
          ))}
        </div>
      </div>
      {TOPICS.map((t) => (
        <div className="card" id={t.id} key={t.id}>
          <h3>
            {t.mr} <span className="muted small">{t.en}</span>
          </h3>
          {/* Local static help copy (same strings as the vanilla build). */}
          <ul dangerouslySetInnerHTML={{ __html: t.body }} />
        </div>
      ))}
    </>
  )
}
