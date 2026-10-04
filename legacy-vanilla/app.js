/* Marathi Tutor — offline-first vanilla JS, no deps. */
(function(){
"use strict";
var SKEY="mt.settings.v1", PKEY="mt.progress.v1", RKEY="mt.srs.v1", CKEY="mt.chat.v1";
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
var settings=Object.assign({model:"muse-spark-1.3-contributor",apiBase:"",apiKey:"",voice:"",speed:1,translit:false,theme:"light",level:1},lsGet(SKEY,{}));
var progress=Object.assign({xp:0,streak:0,lastDay:"",byMode:{},answers:0,correct:0},lsGet(PKEY,{}));
var srs=lsGet(RKEY,{});
var chatHist=lsGet(CKEY,[]);
var DB={stories:[],vocab:[],grammar:{topics:[]},sprints:[],speaking:[],drills:[]};
var view=document.getElementById("view");
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function touchStreak(){
  var t=todayStr();
  if(progress.lastDay===t) return;
  var y=new Date(Date.now()-864e5).toISOString().slice(0,10);
  progress.streak=(progress.lastDay===y)?(progress.streak+1):1;
  progress.lastDay=t; saveProgress();
}
function addXP(n,mode){
  touchStreak(); progress.xp+=n;
  if(mode){ progress.byMode[mode]=(progress.byMode[mode]||0)+n; }
  saveProgress(); renderChips();
}
function recordAns(ok,mode){ progress.answers++; if(ok)progress.correct++; addXP(ok?10:2,mode); }
function saveProgress(){ lsSet(PKEY,progress); }
function saveSettings(){ lsSet(SKEY,settings); applyTheme(); renderChips(); }
function applyTheme(){ document.documentElement.setAttribute("data-theme",settings.theme==="dark"?"dark":"light"); }
function renderChips(){
  document.getElementById("xpChip").textContent=progress.xp+" XP";
  document.getElementById("streakChip").textContent="\uD83D\uDD25 "+progress.streak;
  document.getElementById("levelChip").textContent="L"+settings.level;
  var on=!!(settings.apiBase&&settings.apiKey);
  var n=document.getElementById("netChip"); n.textContent=on?"online":"offline"; n.setAttribute("data-on",on?"1":"0");
}
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function speak(text){
  try{
    if(!("speechSynthesis" in window)) return false;
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text); u.lang="mr-IN"; u.rate=settings.speed||1;
    if(settings.voice){ var vs=speechSynthesis.getVoices(); for(var i=0;i<vs.length;i++){ if(vs[i].name===settings.voice){u.voice=vs[i];break;} } }
    speechSynthesis.speak(u); return true;
  }catch(e){ return false; }
}
function trLine(v){ return settings.translit&&v.tr?'<span class="tr">'+esc(v.tr)+'</span>':""; }
function fetchJSON(p,fb){
  return fetch(p).then(function(r){ if(!r.ok)throw new Error(r.status); return r.json(); }).catch(function(){ return fb; });
}
function loadData(){
  return Promise.all([
    fetchJSON("data/stories.json",[]),
    fetchJSON("data/vocab.json",[]),
    fetchJSON("data/grammar.json",{topics:[]}),
    fetchJSON("data/sprints.json",[]),
    fetchJSON("data/speaking.json",[]),
    fetchJSON("data/drills.json",{exercises:[]})
  ]).then(function(all){
    DB.stories=all[0]||[]; DB.vocab=all[1]||[]; DB.grammar=all[2]||{topics:[]};
    DB.sprints=all[3]||[]; DB.speaking=all[4]||[]; DB.drills=((all[5]||{}).exercises)||[];
    if(!DB.stories.length) DB.stories=FALLBACK_STORIES;
    if(!DB.vocab.length) DB.vocab=FALLBACK_VOCAB;
    if(!DB.grammar.topics.length) DB.grammar={topics:FALLBACK_GRAMMAR};
  });
}
var FALLBACK_STORIES=[{id:"fb1",level:1,title_mr:"नमस्कार",title_en:"Hello",text_mr:"नमस्कार. माझं नाव मीना आहे.",text_en:"Hello. My name is Meena.",gloss:[{mr:"नमस्कार",en:"hello"}],questions:[{q_mr:"नाव काय?",q_en:"What is the name?",options:["मीना","राम","सीता"],answer:0}]}];
var FALLBACK_VOCAB=[{en:"hello",mr:"नमस्कार",tr:"namaskār",pos:"interjection",gender:null,level:1,cat:"greetings"},{en:"water",mr:"पाणी",tr:"pāṇī",pos:"noun",gender:"n",level:1,cat:"food"}];
var FALLBACK_GRAMMAR=[{id:"gender",title_mr:"लिंग",title_en:"Gender",explanation_en:"Three genders.",explanation_mr:"तीन लिंगं.",table:{headers:["g","ex"],rows:[["m","मुलगा"]]},examples:[],quiz:[{q:"घर?",options:["neuter","masculine"],answer:0,explain:"neuter"}]}];
var MODES=["modes","chat","sprint","stories","drills","grammar","vocab","progress","settings","help"];
function nav(mode){
  if(MODES.indexOf(mode)<0)mode="chat";
  view.setAttribute("data-mode",mode);
  var btns=document.querySelectorAll(".nav-btn");
  for(var i=0;i<btns.length;i++)btns[i].classList.toggle("active",btns[i].getAttribute("data-mode")===mode);
  document.getElementById("sidebar").classList.remove("open");
  stopSprint();
  try{ if(selSpeaking)speechSynthesis.cancel(); }catch(e){} selSpeaking=false; hideSelPop();
  if(mode==="chat")renderChat(); else if(mode==="sprint")renderSprint();
  else if(mode==="stories")renderStories(); else if(mode==="drills")renderDrills();
  else if(mode==="grammar")renderGrammar(); else if(mode==="vocab")renderVocab();
  else if(mode==="progress")renderProgress(); else if(mode==="help")renderHelp(); else if(mode==="modes")renderModes(); else renderSettings();
  view.focus();
}
/* ---- Chat Tutor ---- */
function offlineTutorReply(text){
  var t=(text||"").toLowerCase();
  var hasDev=/[\u0900-\u097F]/.test(text||"");
  var found=null;
  for(var i=0;i<DB.vocab.length;i++){ var v=DB.vocab[i];
    if(t.indexOf(v.en.toLowerCase())>=0||(text&&text.indexOf(v.mr)>=0)){ found=v; break; } }
  if(/(namaskar|hello|namaste)/.test(t)||text.indexOf("नमस्कार")>=0)
    return {mr:"नमस्कार! मी तुमचा मराठी शिक्षक आहे. आज काय शिकायचं — शब्द, वाक्य की गोष्ट?",tr:"namaskār! ...",en:"Hello! I am your Marathi tutor. What shall we learn today?"};
  if(/(thank)/.test(t)) return {mr:"अगदी आनंद झाला! आणखी सराव करूया का?",en:"You are welcome! Shall we practise more?"};
  if(/(name|नाव)/.test(t)||text.indexOf("नाव")>=0) return {mr:"माझं नाव 'मराठी शिका' आहे. तुझं नाव काय? उत्तर मराठीत दे: 'माझं नाव ___ आहे.'",en:"My name is Marathi Shika. What is your name? Answer in Marathi."};
  if(/(gender|लिंग)/.test(t)||text.indexOf("लिंग")>=0) return {mr:"मराठीत तीन लिंगं: मुलगा (पु.), मुलगी (स्त्री.), घर (न.). 'मोठा/मोठी/मोठं' असं विशेषण बदलतं.",en:"Three genders: masculine, feminine, neuter. Adjectives agree."};
  if(/(plural|वचन|अनेकवचन)/.test(t)) return {mr:"अनेकवचन: मुलगा→मुले, मुलगी→मुली, घर→घरं. व्याकरण विभागात तक्ता पाहा.",en:"Plurals: mulga→mule, mulgi→muli, ghar→ghara."};
  if(found) return {mr:"छान! '"+found.en+"' म्हणजे '"+found.mr+"'"+(found.tr?" ("+found.tr+")":"")+". वाक्य: 'मला "+found.mr+" आवडतं.' आता तू वाक्य कर.",en:"Nice! Now you make a sentence with it."};
  if(hasDev) return {mr:"छान प्रयत्न! तुम्ही लिहिलं: "+text+". याचा अर्थ इंग्रजीत सांगता का? चूक असेल तर मी सुधारते.",en:"Good effort! Can you say its meaning in English?"};
  return {mr:"समजलं! मराठीत प्रयत्न कर: 'मला ___ आवडतं' (I like ___). एखादा शब्द घालून पाठव.",en:"Try in Marathi: 'mala ___ aavadta' (I like ___)."};
}
var TUTOR_SYS="You are a Marathi tutor. Reply mainly in Marathi (Devanagari) with a short English gloss. Keep replies under 80 words.";
function parseResponses(j){
  var out=j.output||[];
  for(var i=0;i<out.length;i++){ var it=out[i];
    if(it&&(it.type==="message"||it.type==="output_message")&&it.content){
      for(var k=0;k<it.content.length;k++){ var c=it.content[k];
        if(c&&(c.type==="output_text"||c.type==="text")&&c.text)return c.text; } } }
  if(typeof j.output_text==="string"&&j.output_text)return j.output_text;
  return "(empty reply)";
}
function callLLM(text){
  var base=settings.apiBase.replace(/\/+$/,"");
  var model=settings.model||"muse-spark-1.3-contributor";
  if((settings.apiStyle||"chat")==="responses"){
    return fetch(base+"/responses",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+settings.apiKey},
      body:JSON.stringify({model:model,instructions:TUTOR_SYS,input:text,temperature:0.7})
    }).then(function(r){ if(!r.ok)throw new Error("HTTP "+r.status); return r.json(); })
     .then(function(j){ return {mr:parseResponses(j),en:""}; });
  }
  return fetch(base+"/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+settings.apiKey},
    body:JSON.stringify({model:model,
      messages:[{role:"system",content:TUTOR_SYS},{role:"user",content:text}],temperature:0.7})
  }).then(function(r){ if(!r.ok)throw new Error("HTTP "+r.status); return r.json(); })
   .then(function(j){ var c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content; return {mr:c||"(empty reply)",en:""}; });
}
function renderChat(){
  var h='<div class="card"><h2>गप्पा — Chat Tutor</h2><div class="chatlog" id="chatlog"></div><div class="row"><input id="chatIn" style="flex:1" placeholder="मराठीत लिहा… (उदा. मला आंबा आवडतो)" aria-label="Message"><button class="btn" id="chatSend">पाठवा</button></div><div class="row" style="margin-top:.5rem"><button class="btn secondary small" id="chatClear">Clear</button><button class="btn secondary small" id="chatSpeak">🔊 शेवटचं वाचा</button></div></div>';
  view.innerHTML=h;
  var log=document.getElementById("chatlog");
  function draw(){
    log.innerHTML=chatHist.map(function(m){ return '<div class="msg '+m.who+'">'+esc(m.mr)+(m.en?'<span class="tr">'+esc(m.en)+'</span>':"")+"</div>"; }).join("")||'<p class="muted">नमस्कार! पहिला संदेश लिहा.</p>';
    log.scrollTop=log.scrollHeight;
  }
  draw();
  function send(){
    var inp=document.getElementById("chatIn"); var text=(inp.value||"").trim(); if(!text)return; inp.value="";
    chatHist.push({who:"user",mr:text}); addXP(2,"chat"); draw();
    var typing=document.createElement("div"); typing.className="msg bot"; typing.textContent="…"; log.appendChild(typing);
    function done(reply){ log.removeChild(typing); chatHist.push({who:"bot",mr:reply.mr,en:reply.en||""}); lsSet(CKEY,chatHist.slice(-60)); addXP(3,"chat"); draw(); }
    if(settings.apiBase&&settings.apiKey){ callLLM(text).then(done).catch(function(){ done(offlineTutorReply(text)); }); }
    else { setTimeout(function(){ done(offlineTutorReply(text)); },250); }
  }
  document.getElementById("chatSend").onclick=send;
  document.getElementById("chatIn").onkeydown=function(e){ if(e.key==="Enter")send(); };
  document.getElementById("chatClear").onclick=function(){ chatHist=[]; lsSet(CKEY,[]); draw(); };
  document.getElementById("chatSpeak").onclick=function(){ for(var i=chatHist.length-1;i>=0;i--){ if(chatHist[i].who==="bot"){ speak(chatHist[i].mr); break; } } };
}
/* ---- Reading Sprint ---- */
var sprintTimer=null;
function stopSprint(){ if(sprintTimer){ clearInterval(sprintTimer); sprintTimer=null; } try{ speechSynthesis.cancel(); }catch(e){} try{ if(window.MarathiAnim)MarathiAnim.stop(); }catch(e){} }
function renderSprint(){
  stopSprint();
  view.innerHTML='<div class="card"><h2>वाचन स्प्रिंट — Reading Sprint</h2><div class="row"><label class="field">वेळ<select id="spDur"><option value="30">30s</option><option value="60" selected>60s</option><option value="120">120s</option></select></label><label class="field">स्तर (Level)<select id="spLvl"><option value="0">सर्व</option><option value="1">L1</option><option value="2">L2</option><option value="3">L3</option><option value="4">L4</option></select></label><button class="btn" id="spStart">सुरू करा</button></div><div id="spBody" style="margin-top:.8rem"><p class="muted">वेळ निवडा आणि वाचन सुरू करा. वेळ संपल्यावर WPM + आकलन प्रश्न.</p></div></div>';
  document.getElementById("spStart").onclick=function(){
    var dur=parseInt(document.getElementById("spDur").value,10);
    var lvl=parseInt(document.getElementById("spLvl").value,10);
    var src=(DB.sprints&&DB.sprints.length?DB.sprints:DB.stories);
    var pool=src.filter(function(s){ return !lvl||s.level===lvl; });
    if(!pool.length)pool=src;
    if(!pool.length)pool=DB.stories;
    var st=pick(pool);
    var words=st.words||st.text_mr.split(/\s+/).length;
    var left=dur, body=document.getElementById("spBody");
    body.innerHTML='<div class="row"><span class="timer" id="spT">'+left+'</span><span class="muted">सेकंद — मोठ्याने वाचा, मग "झालं" दाबा.'+(st.target_wpm?' लक्ष्य: '+st.target_wpm+' WPM':"")+'</span></div><h3>'+esc(st.title_mr||("स्प्रिंट "+st.id))+' <span class="muted small">'+esc(st.title_en||"")+' · L'+st.level+'</span></h3><p class="story-text">'+esc(st.text_mr)+'</p><div class="row"><button class="btn" id="spDone">झालं / वेळ संपली</button></div>';
    stopSprint();
    sprintTimer=setInterval(function(){ left--; var el=document.getElementById("spT"); if(el)el.textContent=left; if(left<=0)finish(); },1000);
    document.getElementById("spDone").onclick=finish;
    var done=false;
    function finish(){
      if(done)return; done=true; stopSprint();
      var elapsed=dur-left; if(elapsed<5)elapsed=5;
      var wpm=Math.round(words/(elapsed/60));
      addXP(10,"sprint");
      var verdict=wpm<30?"हळू — रोज सराव करा.":wpm<80?"चांगलं! L2 गोष्टींकडे जा.":"उत्कृष्ट! L3/L4 वाचा.";
      if(st.target_wpm)verdict+=(wpm>=st.target_wpm?" लक्ष्य गाठलं! 🎉":" लक्ष्य: "+st.target_wpm+" WPM.");
      var qs=(st.questions||[]).slice(0,3);
      var qh="";
      if(qs.length){ qh='<h3>आकलन — Comprehension</h3>'+qs.map(function(q,qi){ return '<p><b>'+esc(q.q_mr||q.q_en||"")+'</b>'+(q.q_mr&&q.q_en?'<br><span class="muted small">'+esc(q.q_en)+'</span>':"")+'</p><div class="opts" data-sq="'+qi+'">'+q.options.map(function(o,i){return '<button class="opt" data-i="'+i+'">'+esc(o)+'</button>';}).join("")+'</div>'; }).join(""); }
      body.innerHTML='<h3>निकाल — Result</h3><div class="kv"><span>शब्द / Words</span><b>'+words+'</b></div><div class="kv"><span>वेळ / Time</span><b>'+elapsed+'s</b></div><div class="kv"><span>WPM</span><b>'+wpm+'</b></div><p class="muted small">'+verdict+'</p>'+qh+'<div class="row"><button class="btn secondary" id="spAgain">पुन्हा</button></div>';
      document.getElementById("spAgain").onclick=renderSprint;
      qs.forEach(function(q,qi){
        var opts=body.querySelectorAll('[data-sq="'+qi+'"] .opt');
        for(var k=0;k<opts.length;k++)opts[k].onclick=function(){ var i=parseInt(this.getAttribute("data-i"),10); var ok=(i===q.answer); recordAns(ok,"sprint");
          for(var j=0;j<opts.length;j++){ opts[j].disabled=true; if(j===q.answer)opts[j].classList.add("correct"); }
          if(!ok)this.classList.add("wrong"); };
      });
    }
  };
}
/* ---- Stories ---- */
var storyFilter=0;
function renderStories(){
  var levels=[0,1,2,3,4];
  var h='<div class="card"><h2>गोष्टी — Stories ('+DB.stories.length+')</h2><div class="row">'+levels.map(function(l){return '<button class="btn small '+(storyFilter===l?"":"secondary")+'" data-lvl="'+l+'">'+(l===0?"सर्व":("L"+l))+'</button>';}).join("")+'</div><div id="stList" style="margin-top:.7rem"></div></div><div id="stRead"></div>';
  view.innerHTML=h;
  function drawList(){
    var pool=DB.stories.filter(function(s){ return !storyFilter||s.level===storyFilter; });
    document.getElementById("stList").innerHTML=pool.map(function(s){ return '<button class="opt" data-id="'+s.id+'"><b>'+esc(s.title_mr)+'</b> <span class="muted small">'+esc(s.title_en)+' · L'+s.level+'</span></button>'; }).join("");
    var bs=document.querySelectorAll("#stList .opt");
    for(var i=0;i<bs.length;i++)bs[i].onclick=function(){ openStory(this.getAttribute("data-id")); };
  }
  var fbs=view.querySelectorAll("[data-lvl]");
  for(var k=0;k<fbs.length;k++)fbs[k].onclick=function(){ storyFilter=parseInt(this.getAttribute("data-lvl"),10); renderStories(); };
  drawList();
}
function sceneFor(st){
  try{ if(window.MarathiAnim){ var r=MarathiAnim.resolve(st.id); if(r)return r; } }catch(e){}
  var t=(st.title_mr||"")+" "+(st.text_mr||"");
  var KW=[["मांजर","cat"],["कुत्रा","dog"],["कुत्र","dog"],["ससा","rabbit"],["पोपट","parrot"],["पाऊस","rain"],["पावस","rain"],["दिवाळी","diwali"],["दिवा","diwali"],["गणपती","ganpati"],["शाळा","school"],["वर्ग","school"],["बाजार","market"],["शेत","farm"],["आंबा","mango"],["जेवण","mango"],["कुटुंब","family"],["आई","family"],["बाबा","family"],["मित्र","family"]];
  for(var i=0;i<KW.length;i++){ if(t.indexOf(KW[i][0])>=0)return KW[i][1]; }
  return ["cat","farm","market","school"][Math.min(4,Math.max(1,st.level||1))-1];
}
function openStory(id){
  var st=null; for(var i=0;i<DB.stories.length;i++)if(DB.stories[i].id===id)st=DB.stories[i];
  if(!st)return;
  try{ if(window.MarathiAnim)MarathiAnim.stop(); }catch(e){}
  var box=document.getElementById("stRead");
  var glossMap={}; (st.gloss||[]).forEach(function(g){ glossMap[g.mr]=g.en; });
  var wordsHtml=st.text_mr.split(/\s+/).map(function(w){ var clean=w.replace(/[.,!?'""]/g,""); var g=glossMap[clean]||glossMap[w]; return g?'<span class="glossed" title="'+esc(g)+'">'+esc(w)+'</span>':esc(w); }).join(" ");
  box.innerHTML='<div class="card"><h3>'+esc(st.title_mr)+' <span class="muted small">'+esc(st.title_en)+' · L'+st.level+'</span></h3><p class="story-text" id="stText">'+wordsHtml+'</p>'+(settings.translit&&st.text_tr?'<p class="tr">'+esc(st.text_tr)+'</p>':"")+'<p class="muted">'+esc(st.text_en)+'</p><div class="row"><button class="btn small" id="stTTS">🔊 ऐका</button><button class="btn small secondary" id="stKara">🎤 वाचा</button><label class="field" style="max-width:120px">गती<select id="stSpd"><option value="0.6">0.6x</option><option value="1">1x</option><option value="1.3">1.3x</option></select></label><label class="small"><input type="checkbox" id="stTr" '+(settings.translit?"checked":"")+'> transliteration</label>'+(st.gloss&&st.gloss.length?'<span class="muted small">शब्दार्थ: '+st.gloss.map(function(g){return esc(g.mr)+"="+esc(g.en);}).join(", ")+'</span>':"")+'</div><div id="stQuiz"></div></div>';
  var card=box.firstChild;
  if(window.MarathiAnim){ var scEl=document.createElement("div"); scEl.id="stScene"; card.insertBefore(scEl,card.querySelector(".story-text")); try{ MarathiAnim.render(scEl,sceneFor(st)); }catch(e){} }
  document.getElementById("stSpd").value=String(settings.speed||1);
  document.getElementById("stSpd").onchange=function(){ settings.speed=parseFloat(this.value); saveSettings(); };
  document.getElementById("stTr").onchange=function(){ settings.translit=this.checked; saveSettings(); openStory(id); };
  document.getElementById("stTTS").onclick=function(){ speak(st.text_mr); addXP(2,"stories"); };
  var kara=document.getElementById("stKara");
  if(kara)kara.onclick=function(){
    if(window.MarathiAnim){ var tel=document.getElementById("stText"); try{ MarathiAnim.prep(tel); MarathiAnim.speak(tel,{rate:settings.speed||1}); }catch(e){ speak(st.text_mr); } }
    else speak(st.text_mr);
    addXP(2,"stories");
  };
  var qz=document.getElementById("stQuiz");
  if(st.questions&&st.questions.length){
    qz.innerHTML='<h3>प्रश्न — Quiz</h3>'+st.questions.map(function(q,qi){ return '<p><b>'+(qi+1)+". "+esc(q.q_mr)+'</b><br><span class="muted small">'+esc(q.q_en||"")+'</span></p><div class="opts" data-q="'+qi+'">'+q.options.map(function(o,oi){return '<button class="opt" data-i="'+oi+'">'+esc(o)+'</button>';}).join("")+'</div>'; }).join("");
    var stTot=st.questions.length, stN=0, stOk=0;
    st.questions.forEach(function(q,qi){
      var opts=qz.querySelectorAll('[data-q="'+qi+'"] .opt');
      for(var k=0;k<opts.length;k++)opts[k].onclick=function(){ var oi=parseInt(this.getAttribute("data-i"),10); var ok=(oi===q.answer); recordAns(ok,"stories"); stN++; if(ok)stOk++;
        for(var j=0;j<opts.length;j++){ opts[j].disabled=true; if(j===q.answer)opts[j].classList.add("correct"); }
        if(!ok)this.classList.add("wrong");
        if(stN===stTot&&stOk===stTot){ addXP(5,"stories"); if(window.MarathiAnim){ try{ MarathiAnim.celebrate(qz); }catch(e){} } } };
    });
  }
  if(st.discuss&&st.discuss.length){
    qz.innerHTML+='<h3>विचार करा — Discuss</h3>'+st.discuss.map(function(d){ return '<details class="discuss"><summary><b>'+esc(d.q_mr)+'</b><br><span class="muted small">'+esc(d.q_en||"")+'</span></summary><p>'+esc(d.answer_mr)+'</p></details>'; }).join("");
  }
  box.scrollIntoView();
}
/* ---- Drills (adaptive) ---- */
var drillState={streak:0,level:1,done:0};
function distractors(v,field,n){
  var pool=shuffle(DB.vocab.filter(function(x){ return x[field]!==v[field]; }));
  var out=[]; for(var i=0;i<pool.length&&out.length<n;i++)out.push(pool[i][field]);
  return out;
}
function renderDrills(){
  var h='<div class="card"><h2>सराव — Drills</h2><p class="muted small">Adaptive: सलग बरोबर → कठीण प्रश्न. <span id="drInfo"></span></p><div id="drBody"></div></div>';
  view.innerHTML=h; nextDrill();
}
function nextDrill(){
  var lvl=drillState.streak>=4?Math.min(4,drillState.level+1):drillState.level;
  if(DB.drills.length&&Math.random()<0.6){ packDrill(lvl); return; }
  if(DB.speaking.length&&Math.random()<0.25){ speakDrill(lvl); return; }
  var pool=DB.vocab.filter(function(v){ return v.level<=lvl+1; });
  if(!pool.length)pool=DB.vocab;
  var v=pick(pool);
  var types=["mcq-en-mr","mcq-mr-en","fill","translate","listen","speak"];
  var type=pick(types);
  if(type==="listen"&&!("speechSynthesis" in window))type="mcq-en-mr";
  if(type==="speak"&&!(window.SpeechRecognition||window.webkitSpeechRecognition))type="translate";
  var body=document.getElementById("drBody"); if(!body)return;
  document.getElementById("drInfo").textContent="streak "+drillState.streak+" · level "+lvl;
  function grade(ok,msg){
    recordAns(ok,"drills"); drillState.done++;
    if(ok){ drillState.streak++; if(drillState.streak%4===0&&drillState.level<4)drillState.level++; }
    else drillState.streak=0;
    body.innerHTML+='<p><b>'+(ok?"बरोबर! +10 XP":"चूक. "+esc(msg||""))+'</b></p><div class="row"><button class="btn" id="drNext">पुढचं →</button></div>';
    document.getElementById("drNext").onclick=nextDrill;
  }
  if(type==="mcq-en-mr"){
    var opts=shuffle([v.mr].concat(distractors(v,"mr",3)));
    body.innerHTML='<p>“<b>'+esc(v.en)+'</b>” म्हणजे?</p><div class="opts">'+opts.map(function(o){return '<button class="opt">'+esc(o)+'</button>';}).join("")+'</div>';
    var bs=body.querySelectorAll(".opt");
    for(var i=0;i<bs.length;i++)(function(b){ b.onclick=function(){ var ok=(b.textContent===v.mr); for(var j=0;j<bs.length;j++)bs[j].disabled=true; grade(ok,"बरोबर: "+v.mr); }; })(bs[i]);
  } else if(type==="mcq-mr-en"){
    var o2=shuffle([v.en].concat(distractors(v,"en",3)));
    body.innerHTML='<p>“<b>'+esc(v.mr)+'</b>” म्हणजे?'+trLine(v)+'</p><div class="opts">'+o2.map(function(o){return '<button class="opt">'+esc(o)+'</button>';}).join("")+'</div>';
    var b2=body.querySelectorAll(".opt");
    for(var k=0;k<b2.length;k++)(function(b){ b.onclick=function(){ var ok=(b.textContent===v.en); for(var j=0;j<b2.length;j++)b2[j].disabled=true; grade(ok,"बरोबर: "+v.en); }; })(b2[k]);
  } else if(type==="fill"){
    body.innerHTML='<p>रिकामी जागा भरा:</p><p class="story-text">मला ___ आवडतं. <span class="muted small">(I like '+esc(v.en)+'.)</span></p><div class="row"><input id="drIn" placeholder="मराठी शब्द" style="flex:1"><button class="btn" id="drGo">तपासा</button></div>';
    document.getElementById("drGo").onclick=function(){ var val=document.getElementById("drIn").value.trim(); grade(val===v.mr,"बरोबर: "+v.mr); };
  } else if(type==="translate"){
    body.innerHTML='<p>इंग्रजीत भाषांतर करा: “<b>'+esc(v.mr)+'</b>”</p><div class="row"><input id="drIn" placeholder="English…" style="flex:1"><button class="btn" id="drGo">तपासा</button></div>';
    document.getElementById("drGo").onclick=function(){ var val=document.getElementById("drIn").value.trim().toLowerCase(); grade(val===v.en.toLowerCase(),"बरोबर: "+v.en); };
  } else if(type==="listen"){
    body.innerHTML='<p>ऐका आणि ओळखा:</p><div class="row"><button class="btn secondary" id="drPlay">🔊 ऐका</button></div><div class="opts" id="drOpts"></div>';
    var o3=shuffle([v].concat(shuffle(DB.vocab.filter(function(x){return x.mr!==v.mr;})).slice(0,3)));
    document.getElementById("drOpts").innerHTML=o3.map(function(x){return '<button class="opt">'+esc(x.mr)+'</button>';}).join("");
    document.getElementById("drPlay").onclick=function(){ speak(v.mr); };
    speak(v.mr);
    var b3=document.querySelectorAll("#drOpts .opt");
    for(var m=0;m<b3.length;m++)(function(b){ b.onclick=function(){ var ok=(b.textContent===v.mr); for(var j=0;j<b3.length;j++)b3[j].disabled=true; grade(ok,"बरोबर: "+v.mr); }; })(b3[m]);
  } else {
    body.innerHTML='<p>मोठ्याने म्हणा: “<b>'+esc(v.mr)+'</b>” ('+esc(v.en)+')</p><div class="row"><button class="btn" id="drRec">🎤 बोला</button><span class="muted small" id="drHeard"></span></div>';
    document.getElementById("drRec").onclick=function(){
      var btn=this; btn.disabled=true;
      var kill=null;
      try{
        var RC=window.SpeechRecognition||window.webkitSpeechRecognition; var r=new RC(); r.lang="mr-IN";
        var settled=false;
        function settle(ok,msg){ if(settled)return; settled=true; if(kill)clearTimeout(kill); try{ r.abort(); }catch(e){} grade(ok,msg); }
        r.onresult=function(e){ var heard=e.results[0][0].transcript; document.getElementById("drHeard").textContent="ऐकलं: "+heard; settle(heard.indexOf(v.mr)>=0||heard.toLowerCase().indexOf(v.en.toLowerCase())>=0,"बरोबर: "+v.mr); };
        r.onerror=function(){ settle(false,"मायक्रोफोन त्रुटी — पुन्हा प्रयत्न करा."); };
        r.onend=function(){ settle(false,"ऐकू आलं नाही — पुन्हा प्रयत्न करा."); };
        kill=setTimeout(function(){ settle(false,"ऐकू आलं नाही — मायक्रोफोन तपासा आणि पुढचं करा."); },10000);
        r.start();
      }catch(e){ if(kill)clearTimeout(kill); grade(false,"Speech API उपलब्ध नाही."); }
    };
  }
}
/* ---- Pack drills + speaking ---- */
function drillGrade(body,ok,msg){
  recordAns(ok,"drills"); drillState.done++;
  if(ok){ drillState.streak++; if(drillState.streak%4===0&&drillState.level<4)drillState.level++; }
  else drillState.streak=0;
  body.innerHTML+='<p><b>'+(ok?"बरोबर! +10 XP":"चूक. "+esc(msg||""))+'</b></p><div class="row"><button class="btn" id="drNext">पुढचं →</button></div>';
  document.getElementById("drNext").onclick=nextDrill;
}
function normEn(s){ return String(s||"").trim().toLowerCase().replace(/[\s.,!?;:'"“”‘’।]+/g," ").replace(/\s+/g," ").trim(); }
function normMr(s){ return String(s||"").trim().replace(/[\s.,!?;:'"“”‘’।]+$/,"").replace(/\s+/g," ").trim(); }
function packDrill(lvl){
  var body=document.getElementById("drBody"); if(!body)return;
  document.getElementById("drInfo").textContent="streak "+drillState.streak+" · level "+lvl+" · pack";
  var pool=DB.drills.filter(function(e){ return e.level<=lvl+1; });
  if(!pool.length)pool=DB.drills;
  var e=pick(pool);
  function lock(bs,okIdx){ for(var j=0;j<bs.length;j++){ bs[j].disabled=true; if(okIdx!=null&&j===okIdx)bs[j].classList.add("correct"); } }
  var head=(e.skill?'<p class="muted small">'+esc(e.skill)+' · L'+e.level+'</p>':"");
  var hint=e.hint_en?'<p class="muted small">💡 '+esc(e.hint_en)+'</p>':"";
  if(e.type==="mcq"||e.type==="match"||e.type==="fill-blank"){
    var pr=head+(e.prompt_mr?'<p class="story-text">'+esc(e.prompt_mr)+'</p>':"")+(e.prompt_en?'<p>'+esc(e.prompt_en)+'</p>':"")+hint;
    var opts=shuffle(e.choices.slice());
    body.innerHTML=pr+'<div class="opts">'+opts.map(function(o){return '<button class="opt">'+esc(o)+'</button>';}).join("")+'</div>';
    var bs=body.querySelectorAll(".opt");
    for(var i=0;i<bs.length;i++)(function(b){ b.onclick=function(){ var ok=(b.textContent===e.answer); var oi=opts.indexOf(e.answer); lock(bs,oi); if(!ok)b.classList.add("wrong"); drillGrade(body,ok,"बरोबर: "+e.answer); }; })(bs[i]);
  } else if(e.type==="translate-en-mr"||e.type==="translate-mr-en"){
    var en=e.type==="translate-mr-en";
    body.innerHTML=head+(e.prompt_mr?'<p class="story-text">'+esc(e.prompt_mr)+'</p>':"")+(e.prompt_en?'<p>'+esc(e.prompt_en)+'</p>':"")+hint+'<div class="row"><input id="drIn" placeholder="'+(en?"English…":"मराठीत लिहा…")+'" style="flex:1"><button class="btn" id="drGo">तपासा</button></div>';
    document.getElementById("drGo").onclick=function(){ var val=document.getElementById("drIn").value; var ok=en?(normEn(val)===normEn(e.answer)):(normMr(val)===normMr(e.answer)); drillGrade(body,ok,"बरोबर: "+e.answer); };
    document.getElementById("drIn").onkeydown=function(ev){ if(ev.key==="Enter")document.getElementById("drGo").click(); };
  } else if(e.type==="reorder"){
    var words=shuffle(e.choices.slice()); var built=[];
    body.innerHTML=head+(e.prompt_en?'<p>'+esc(e.prompt_en)+'</p>':"")+(e.prompt_mr?'<p class="muted small">'+esc(e.prompt_mr)+'</p>':"")+hint+'<p class="story-text" id="drBuilt" style="min-height:2em"></p><div class="opts" id="drWords">'+words.map(function(o,i){return '<button class="opt" data-i="'+i+'">'+esc(o)+'</button>';}).join("")+'</div><div class="row" style="margin-top:.5rem"><button class="btn secondary" id="drClear">पुसा</button><button class="btn" id="drGo">तपासा</button></div>';
    var wb=body.querySelectorAll("#drWords .opt");
    function draw(){ document.getElementById("drBuilt").textContent=built.join(" "); }
    for(var k=0;k<wb.length;k++)(function(b){ b.onclick=function(){ if(b.disabled)return; b.disabled=true; built.push(b.textContent); draw(); }; })(wb[k]);
    document.getElementById("drClear").onclick=function(){ built=[]; for(var j=0;j<wb.length;j++)wb[j].disabled=false; draw(); };
    document.getElementById("drGo").onclick=function(){ var ok=(normMr(built.join(" "))===normMr(e.answer)); lock(wb,null); drillGrade(body,ok,"बरोबर: "+e.answer); };
  } else { nextDrill(); }
}
function speakDrill(lvl){
  var body=document.getElementById("drBody"); if(!body)return;
  document.getElementById("drInfo").textContent="streak "+drillState.streak+" · level "+lvl+" · speaking";
  var pool=DB.speaking.filter(function(p){ return p.level<=lvl+1; });
  if(!pool.length)pool=DB.speaking;
  var p=pick(pool);
  var hasSR=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
  body.innerHTML='<p class="muted small">'+esc(p.kind||"speak")+' · L'+p.level+'</p><p class="story-text">“<b>'+esc(p.say_mr)+'</b>”</p><p class="muted">'+esc(p.say_en)+'</p>'+(p.say_translit?'<p class="tr">'+esc(p.say_translit)+'</p>':"")+(p.tip_en?'<p class="muted small">💡 '+esc(p.tip_en)+'</p>':"")+'<div class="row"><button class="btn secondary" id="spPlay">🔊 ऐका</button>'+(hasSR?'<button class="btn" id="spRec">🎤 बोला</button>':'<button class="btn" id="spSelf">मी मोठ्याने म्हणालो ✓</button>')+'<span class="muted small" id="spHeard"></span></div>';
  document.getElementById("spPlay").onclick=function(){ speak(p.say_mr); };
  if(hasSR){
    document.getElementById("spRec").onclick=function(){
      var btn=this; btn.disabled=true;
      var kill=null;
      try{
        var RC=window.SpeechRecognition||window.webkitSpeechRecognition; var r=new RC(); r.lang="mr-IN";
        var settled=false;
        function settle(ok,msg){ if(settled)return; settled=true; if(kill)clearTimeout(kill); try{ r.abort(); }catch(e){} drillGrade(body,ok,msg); }
        r.onresult=function(ev){ var heard=ev.results[0][0].transcript; document.getElementById("spHeard").textContent="ऐकलं: "+heard; var ok=normMr(heard)===normMr(p.say_mr)||heard.indexOf(p.say_mr)>=0||normMr(p.say_mr).indexOf(normMr(heard))>=0; settle(ok,"बरोबर: "+p.say_mr); };
        r.onerror=function(){ settle(false,"मायक्रोफोन त्रुटी — पुन्हा प्रयत्न करा."); };
        r.onend=function(){ settle(false,"ऐकू आलं नाही — पुन्हा प्रयत्न करा."); };
        kill=setTimeout(function(){ settle(false,"ऐकू आलं नाही — मायक्रोफोन तपासा आणि पुढचं करा."); },10000);
        r.start();
      }catch(err){ if(kill)clearTimeout(kill); drillGrade(body,false,"Speech API उपलब्ध नाही."); }
    };
  } else {
    document.getElementById("spSelf").onclick=function(){ drillGrade(body,true,""); };
  }
}
/* ---- Grammar ---- */
function renderGrammar(){
  var ts=DB.grammar.topics||[];
  view.innerHTML='<div class="card"><h2>व्याकरण — Grammar ('+ts.length+' topics)</h2><div class="opts">'+ts.map(function(t){return '<button class="opt" data-id="'+t.id+'"><b>'+esc(t.title_mr)+'</b> <span class="muted small">'+esc(t.title_en)+'</span></button>';}).join("")+'</div></div><div id="grBody"></div>';
  var bs=view.querySelectorAll(".opt");
  for(var i=0;i<bs.length;i++)bs[i].onclick=function(){ openGrammar(this.getAttribute("data-id")); };
}
function openGrammar(id){
  var t=null; (DB.grammar.topics||[]).forEach(function(x){ if(x.id===id)t=x; });
  if(!t)return;
  var box=document.getElementById("grBody");
  var th="";
  if(t.table) th='<table class="gram"><tr>'+t.table.headers.map(function(h){return "<th>"+esc(h)+"</th>";}).join("")+'</tr>'+t.table.rows.map(function(r){return "<tr>"+r.map(function(c){return "<td>"+esc(c)+"</td>";}).join("")+"</tr>";}).join("")+'</table>';
  var ex=(t.examples||[]).map(function(e){return "<li>“"+esc(e.mr)+"” — "+esc(e.en)+"</li>";}).join("");
  box.innerHTML='<div class="card"><h3>'+esc(t.title_mr)+' <span class="muted small">'+esc(t.title_en)+'</span></h3><p>'+esc(t.explanation_mr)+'</p><p class="muted">'+esc(t.explanation_en)+'</p>'+th+(ex?"<ul>"+ex+"</ul>":"")+'<h3>Quiz</h3><div id="grQ"></div></div>';
  var qz=document.getElementById("grQ");
  qz.innerHTML=(t.quiz||[]).map(function(q,qi){ return '<p><b>'+(qi+1)+". "+esc(q.q)+'</b></p><div class="opts" data-q="'+qi+'">'+q.options.map(function(o,oi){return '<button class="opt" data-i="'+oi+'">'+esc(o)+'</button>';}).join("")+'</div><p class="muted small" id="gre'+qi+'"></p>'; }).join("");
  (t.quiz||[]).forEach(function(q,qi){
    var opts=qz.querySelectorAll('[data-q="'+qi+'"] .opt');
    for(var k=0;k<opts.length;k++)opts[k].onclick=function(){ var oi=parseInt(this.getAttribute("data-i"),10); var ok=(oi===q.answer); recordAns(ok,"grammar");
      for(var j=0;j<opts.length;j++){ opts[j].disabled=true; if(j===q.answer)opts[j].classList.add("correct"); }
      if(!ok)this.classList.add("wrong");
      document.getElementById("gre"+qi).textContent=(ok?"बरोबर! ":"चूक. ")+(q.explain||""); };
  });
  box.scrollIntoView();
}
/* ---- Vocab Quiz + SRS ---- */
var vocabDir="en-mr";
function srsGet(key){ if(!srs[key])srs[key]={box:0,due:0}; return srs[key]; }
function srsGrade(key,ok){
  var e=srsGet(key);
  e.box=ok?Math.min(5,e.box+1):0;
  e.due=Date.now()+[0,6e4,36e5,864e5,3*864e5,7*864e5][e.box];
  lsSet(RKEY,srs);
}
function renderVocab(){
  var h='<div class="card"><h2>शब्दसंग्रह — Vocab Quiz ('+DB.vocab.length+' words)</h2><div class="row"><button class="btn small '+(vocabDir==="en-mr"?"":"secondary")+'" id="vd1">EN → MR</button><button class="btn small '+(vocabDir==="mr-en"?"":"secondary")+'" id="vd2">MR → EN</button><span class="muted small">SRS: चुकलेले शब्द पुन्हा येतात</span></div><div id="vcBody" style="margin-top:.7rem"></div></div>';
  view.innerHTML=h;
  document.getElementById("vd1").onclick=function(){ vocabDir="en-mr"; renderVocab(); };
  document.getElementById("vd2").onclick=function(){ vocabDir="mr-en"; renderVocab(); };
  nextVocab();
}
function nextVocab(){
  var body=document.getElementById("vcBody"); if(!body)return;
  var now=Date.now();
  var due=DB.vocab.filter(function(v){ var e=srs[v.en+"|"+v.mr]; return e&&e.due<=now; });
  var v=(due.length&&Math.random()<0.7)?pick(due):pick(DB.vocab);
  var key=v.en+"|"+v.mr, e=srsGet(key);
  var g=v.gender?({m:"पु.",f:"स्त्री.",n:"न."}[v.gender]||""):"";
  if(vocabDir==="en-mr"){
    var opts=shuffle([v.mr].concat(distractors(v,"mr",3)));
    body.innerHTML='<p class="muted small">box '+e.box+' · '+esc(v.pos||"")+(g?" · "+g:"")+'</p><p>“<b>'+esc(v.en)+'</b>” चं मराठी?</p><div class="opts">'+opts.map(function(o){return '<button class="opt">'+esc(o)+'</button>';}).join("")+'</div><p id="vcF"></p>';
    var bs=body.querySelectorAll(".opt");
    for(var i=0;i<bs.length;i++)(function(b){ b.onclick=function(){ var ok=(b.textContent===v.mr); recordAns(ok,"vocab"); srsGrade(key,ok);
      for(var j=0;j<bs.length;j++){ bs[j].disabled=true; if(bs[j].textContent===v.mr)bs[j].classList.add("correct"); }
      if(!ok)b.classList.add("wrong");
      document.getElementById("vcF").innerHTML=(ok?"बरोबर!":"चूक. बरोबर: <b>"+esc(v.mr)+"</b>")+(v.tr?' <span class="muted">('+esc(v.tr)+')</span>':"")+' <button class="btn small" id="vcN">पुढचं →</button>';
      document.getElementById("vcN").onclick=nextVocab; }; })(bs[i]);
  } else {
    var o2=shuffle([v.en].concat(distractors(v,"en",3)));
    body.innerHTML='<p class="muted small">box '+e.box+' · '+esc(v.pos||"")+(g?" · "+g:"")+'</p><p>“<b>'+esc(v.mr)+'</b>” चं इंग्रजी?'+trLine(v)+'</p><div class="opts">'+o2.map(function(o){return '<button class="opt">'+esc(o)+'</button>';}).join("")+'</div><p id="vcF"></p>';
    var b2=body.querySelectorAll(".opt");
    for(var k=0;k<b2.length;k++)(function(b){ b.onclick=function(){ var ok=(b.textContent===v.en); recordAns(ok,"vocab"); srsGrade(key,ok);
      for(var j=0;j<b2.length;j++){ b2[j].disabled=true; if(b2[j].textContent===v.en)b2[j].classList.add("correct"); }
      if(!ok)b.classList.add("wrong");
      document.getElementById("vcF").innerHTML=(ok?"बरोबर!":"चूक. बरोबर: <b>"+esc(v.en)+"</b>")+' <button class="btn small" id="vcN">पुढचं →</button>';
      document.getElementById("vcN").onclick=nextVocab; }; })(b2[k]);
  }
}
/* ---- Progress ---- */
function renderProgress(){
  var acc=progress.answers?Math.round(100*progress.correct/progress.answers):0;
  var modes=["chat","sprint","stories","drills","grammar","vocab"];
  var mx=1;
  modes.forEach(function(m){ mx=Math.max(mx,progress.byMode[m]||0); });
  view.innerHTML='<div class="card"><h2>प्रगती — Progress</h2><div class="grid2"><div><div class="kv"><span>XP</span><b>'+progress.xp+'</b></div><div class="kv"><span>Streak (दिवस)</span><b>🔥 '+progress.streak+'</b></div><div class="kv"><span>उत्तरं</span><b>'+progress.correct+'/'+progress.answers+'</b></div><div class="kv"><span>अचूकता</span><b>'+acc+'%</b></div></div><div><h3>XP by mode</h3>'+modes.map(function(m){ var v=progress.byMode[m]||0; var w=Math.round(100*v/mx); return '<div class="kv"><span>'+m+'</span><b>'+v+'</b></div><div class="progress-bar"><div style="width:'+w+'%"></div></div>'; }).join("")+'</div></div><div class="row" style="margin-top:.7rem"><button class="btn secondary small" id="pgReset">Reset progress</button></div></div>';
  document.getElementById("pgReset").onclick=function(){ progress={xp:0,streak:0,lastDay:"",byMode:{},answers:0,correct:0}; saveProgress(); renderChips(); renderProgress(); };
}
/* ---- Modes gallery ---- */
function modeIcon(id){
  try{ var el=document.querySelector('button.nav-btn[data-mode="'+id+'"] .nav-icon'); return el?el.outerHTML:""; }catch(e){ return ""; }
}
function renderModes(){
  var Ms=[
    {id:"chat",mr:"गप्पा",en:"Chat Tutor",desc:"Free Marathi conversation with corrections. Talk about anything and get fixed in real time.",best:"Best for: thinking in Marathi, everyday phrases."},
    {id:"sprint",mr:"वाचन स्प्रिंट",en:"Reading Sprint",desc:"Timed reading races with WPM scores and level targets from 40 to 140 WPM.",best:"Best for: reading speed."},
    {id:"stories",mr:"गोष्टी",en:"Stories",desc:"62 leveled tales with animated scenes, audio, karaoke read-along and quizzes.",best:"Best for: comprehension + words in context."},
    {id:"drills",mr:"सराव",en:"Drills",desc:"Adaptive Duolingo-style sentence, speaking and listening workouts that level up with you.",best:"Best for: daily all-round practice."},
    {id:"grammar",mr:"व्याकरण",en:"Grammar",desc:"Gender, plurals, postpositions and verbs — rules, tables, examples and 123 quiz items.",best:"Best for: accuracy, writing correctly."},
    {id:"vocab",mr:"शब्दसंग्रह",en:"Vocab Quiz",desc:"503 words as two-way EN↔MR flashcards with spaced repetition.",best:"Best for: word memory."},
    {id:"progress",mr:"प्रगती",en:"Progress",desc:"XP, daily streaks, accuracy and per-mode stats.",best:"Best for: staying motivated."},
    {id:"settings",mr:"सेटिंग्ज",en:"Settings",desc:"Model, API key + style, level, voice, speed, theme and data controls.",best:"Best for: setup."},
    {id:"help",mr:"मदत",en:"Help",desc:"Full how-to guide for every part of the app.",best:"Best for: learning the ropes."}
  ];
  view.innerHTML='<div class="cards2">'+Ms.map(function(m){
    return '<div class="card mode-card"><div class="mode-card-top">'+modeIcon(m.id)+'<h3>'+m.mr+' <span class="muted small">'+m.en+'</span></h3></div><p>'+m.desc+'</p><p class="muted small">'+m.best+'</p><button class="btn small" data-go="'+m.id+'">सुरू करा →</button></div>';
  }).join("")+'</div>';
  var bs=view.querySelectorAll("[data-go]");
  for(var i=0;i<bs.length;i++)bs[i].onclick=function(){ nav(this.getAttribute("data-go")); };
}
/* ---- Help ---- */
function renderHelp(){
  var T=[
    {id:"h-chat",mr:"गप्पा",en:"Chat Tutor",body:"<li>मराठीत किंवा इंग्रजीत संदेश लिहा, <b>पाठवा</b> दाबा (किंवा Enter). शिक्षक मराठीत उत्तर देईल आणि चुका सुधारेल.</li><li><b>Offline</b> (default): नियम-आधारित सराव — शब्द, वाक्यं, सुधारणा. <b>Online</b>: Settings मध्ये API Base + Key टाका; हवा तो Model वापरा.</li><li><b>🔊 शेवटचं वाचा</b> शेवटचं उत्तर मोठ्याने वाचतं. <b>Clear</b> गप्पा पुसतो (history device वर save होते).</li>"},
    {id:"h-sprint",mr:"वाचन स्प्रिंट",en:"Reading Sprint",body:"<li>वेळ (30/60/120 सेकंद) + स्तर निवडा → <b>सुरू करा</b> → उतारा मोठ्याने वाचा → <b>झालं</b> दाबा.</li><li>निकालात Words, Time, <b>WPM</b> (words per minute) आणि लक्ष्य-तुलना दिसते. L1 लक्ष्य 40–60 WPM पासून सुरुवात, L4 पर्यंत 120–140.</li><li>नंतर आकलन-प्रश्न सोडवा. रोज 1–2 sprint = वेग + आत्मविश्वास.</li>"},
    {id:"h-stories",mr:"गोष्टी",en:"Stories",body:"<li>स्तर filter (सर्व / L1–L4) → गोष्ट उघडा. वर animated scene दिसते.</li><li><b>🔊 ऐका</b> = साधं वाचन (शब्दांवर hover केल्यास अर्थ दिसतो). <b>🎤 वाचा</b> = karaoke read-along, बोलका शब्द हायलाइट होतो.</li><li><b>गती</b> (0.6x–1.3x) बदला; <b>transliteration</b> चालू केल्यास roman लिपी दिसते.</li><li>Quiz मध्ये पूर्ण गुण मिळाल्यास 🎉 celebration. L4 गोष्टींमध्ये <b>विचार करा</b> चर्चा-प्रश्न (उत्तर पाहण्यासाठी उघडा).</li>"},
    {id:"h-drills",mr:"सराव",en:"Drills",body:"<li>Adaptive सराव: सलग 4 बरोबर → पातळी आपोआप वर जाते. तीन प्रकार फिरून येतात.</li><li><b>pack</b>: वाक्य-सराव — MCQ, fill-blank, EN↔MR भाषांतर, reorder, match. Reorder मध्ये शब्दांना क्रमाने टॅप करा (<b>पुसा</b> = clear).</li><li><b>speaking</b>: वाक्य ऐका, मग <b>🎤 बोला</b> (mic 10 सेकंदात उत्तर न दिल्यास पुढे जाता येतं). Mic नसल्यास <b>मी मोठ्याने म्हणालो</b> दाबा.</li><li><b>vocab</b>: शब्द-सराव — ऐका-ओळखा, बोला, लिहा. 💡 hint नेहमी वाचा.</li>"},
    {id:"h-grammar",mr:"व्याकरण",en:"Grammar",body:"<li>Topic निवडा (लिंग, वचन, विभक्ती-योग्य अव्यय, वर्तमान/भूत/भविष्य काळ, विशेषण) → नियम + तक्ता + उदाहरणं वाचा → Quiz सोडवा.</li><li>प्रत्येक उत्तराचं <b>स्पष्टीकरण</b> वाचा — pattern तिथेच लक्षात राहतो.</li><li>गप्पांमध्ये Topic चा वापर करून सराव करा (उदा. शिक्षकाला विचारा: लिंग म्हणजे काय?).</li>"},
    {id:"h-vocab",mr:"शब्दसंग्रह",en:"Vocab Quiz",body:"<li><b>EN → MR</b> किंवा <b>MR → EN</b> दिशा निवडा, पर्यायांमधून उत्तर द्या, <b>पुढचं</b> दाबा.</li><li>चुकलेले शब्द SRS मुळे पुन्हा-पुन्हा येतात (box 0–5: वरचा box = जास्त आठवण).</li><li>नामांजवळची लिंग-चिप लक्षात ठेवा: <b>पु.</b> = masculine, <b>स्त्री.</b> = feminine, <b>न.</b> = neuter.</li>"},
    {id:"h-progress",mr:"प्रगती",en:"Progress",body:"<li>एकूण <b>XP</b>, रोजची <b>streak 🔥</b>, <b>अचूकता %</b> आणि प्रत्येक mode चा XP bar.</li><li>बरोबर उत्तर +10 XP, प्रयत्न +2 XP, story पूर्ण +5 bonus. रोज थोडा सराव = streak टिकते.</li><li><b>Reset progress</b> फक्त आकडे पुसतो; Settings/chat वेगळे राहतात.</li>"},
    {id:"h-settings",mr:"सेटिंग्ज",en:"Settings",body:"<li><b>Model</b>: हवा तो model (default muse-spark-1.3-contributor). <b>API Base + Key</b>: रिकामं = offline tutor; भरल्यास online AI.</li><li><b>API Style</b>: chat/completions (सार्वत्रिक) किंवा responses (नवीन OpenAI style).</li><li><b>स्तर, Voice, Speed, Theme, transliteration</b> तुमच्या सोयीनुसार. <b>जतन करा</b> दाबायला विसरू नका.</li><li><b>सर्व डेटा पुसा</b> device वरील सगळं (settings, progress, chat) पुसून fresh सुरुवात देतो.</li>"},
    {id:"h-tips",mr:"टिप्स",en:"Daily routine",body:"<li>शिफारस केलेली 15 मिनिटं: 1 sprint + 1 story + 10 drills + 5 vocab.</li><li>Enter = पाठवा/तपासा. Voice features साठी <b>Chrome/Edge</b> वापरा आणि mic परवानगी द्या.</li><li>कुठलंही मराठी text <b>highlight</b> केल्यास <b>🔊 वाचा</b> button येतं — Marathi voice मध्ये ऐका (थांबवायला <b>⏹ थांबा</b> किंवा Esc).</li><li>कठीण वाटल्यास स्तर खाली घ्या — सातत्य > अवघडपणा. Streak तुटू देऊ नका!</li>"}
  ];
  view.innerHTML='<div class="card"><h2>मदत — How to use every part</h2><p class="muted small">प्रत्येक भागासाठी सूचना. Tap a topic to jump.</p><div class="row">'
    +T.map(function(t){ return '<a class="btn small secondary" href="#'+t.id+'">'+t.mr+'</a>'; }).join("")
    +'</div></div>'
    +T.map(function(t){ return '<div class="card" id="'+t.id+'"><h3>'+t.mr+' <span class="muted small">'+t.en+'</span></h3><ul>'+t.body+'</ul></div>'; }).join("");
}
/* ---- Settings ---- */
function renderSettings(){
  view.innerHTML='<div class="card"><h2>सेटिंग्ज — Settings</h2>'
  +'<div class="row"><label class="field">Model<input id="sModel" value="'+esc(settings.model)+'"></label><label class="field">API Base (OpenAI-compatible)<input id="sBase" placeholder="https://api.example.com/v1" value="'+esc(settings.apiBase)+'"></label><label class="field">API Style<select id="sStyle"><option value="chat">chat/completions</option><option value="responses">responses</option></select></label></div>'
  +'<div class="row"><label class="field">API Key<input id="sKey" type="password" value="'+esc(settings.apiKey)+'" placeholder="(रिकामं = offline)"></label><label class="field">स्तर Level<select id="sLvl"><option value="1">L1</option><option value="2">L2</option><option value="3">L3</option><option value="4">L4</option></select></label></div>'
  +'<div class="row"><label class="field">Voice<select id="sVoice"><option value="">default</option></select></label><label class="field">Speed<select id="sSpd"><option value="0.6">0.6x</option><option value="1">1x</option><option value="1.3">1.3x</option></select></label><label class="field">Theme<select id="sTheme"><option value="light">light</option><option value="dark">dark</option></select></label></div>'
  +'<div class="row"><label class="small"><input type="checkbox" id="sTr" '+(settings.translit?"checked":"")+'> transliteration दाखवा</label></div>'
  +'<div class="row" style="margin-top:.6rem"><button class="btn" id="sSave">जतन करा (Save)</button><button class="btn secondary" id="sTest">🔊 चाचणी</button><button class="btn secondary" id="sWipe">सर्व डेटा पुसा</button></div><p class="muted small" id="sMsg"></p></div>';
  document.getElementById("sLvl").value=String(settings.level);
  document.getElementById("sSpd").value=String(settings.speed||1);
  document.getElementById("sTheme").value=settings.theme;
  document.getElementById("sStyle").value=settings.apiStyle||"chat";
  try{
    var vs=speechSynthesis.getVoices(); var sel=document.getElementById("sVoice");
    vs.forEach(function(v){ var o=document.createElement("option"); o.value=v.name; o.textContent=v.name+" ("+v.lang+")"; if(v.name===settings.voice)o.selected=true; sel.appendChild(o); });
    if(speechSynthesis.onvoiceschanged!==undefined)speechSynthesis.onvoiceschanged=function(){};
  }catch(e){}
  document.getElementById("sSave").onclick=function(){
    settings.model=document.getElementById("sModel").value.trim()||"muse-spark-1.3-contributor";
    settings.apiBase=document.getElementById("sBase").value.trim();
    settings.apiStyle=document.getElementById("sStyle").value;
    settings.apiKey=document.getElementById("sKey").value.trim();
    settings.level=parseInt(document.getElementById("sLvl").value,10);
    settings.voice=document.getElementById("sVoice").value;
    settings.speed=parseFloat(document.getElementById("sSpd").value);
    settings.theme=document.getElementById("sTheme").value;
    settings.translit=document.getElementById("sTr").checked;
    saveSettings(); document.getElementById("sMsg").textContent="जतन झालं ✓";
  };
  document.getElementById("sTest").onclick=function(){ speak("नमस्कार! मी मराठी शिकवते."); };
  document.getElementById("sWipe").onclick=function(){ localStorage.removeItem(SKEY); localStorage.removeItem(PKEY); localStorage.removeItem(RKEY); localStorage.removeItem(CKEY); location.reload(); };
}
/* ---- Speak any selection ---- */
var selPop=null, selSpeaking=false;
function bestMrVoice(){
  var vs=[];
  try{ vs=speechSynthesis.getVoices()||[]; }catch(e){ return null; }
  function find(fn){ for(var i=0;i<vs.length;i++){ if(fn(vs[i]))return vs[i]; } return null; }
  return find(function(v){ return /^mr[-_]/i.test(v.lang||"")&&/marathi|मराठी/i.test(v.name||""); })
      || find(function(v){ return /^mr[-_]/i.test(v.lang||""); })
      || find(function(v){ return /marathi|मराठी/i.test(v.name||""); })
      || find(function(v){ return /^hi[-_]/i.test(v.lang||""); });
}
function chunkMr(text){
  var parts=String(text||"").replace(/\s+/g," ").trim().match(/[^।.!?\n]+[।.!?]+|[^।.!?\n]+$/g)||[];
  var out=[],cur="";
  for(var i=0;i<parts.length;i++){ var p=parts[i].trim(); if(!p)continue;
    if((cur+" "+p).trim().length>180){ if(cur)out.push(cur); cur=p; }
    else cur=(cur?cur+" ":"")+p; }
  if(cur)out.push(cur);
  return out;
}
function doneSelSpeak(){ selSpeaking=false; refreshSelPop(); }
function speakChunks(parts){
  try{
    if(!("speechSynthesis" in window))return false;
    speechSynthesis.cancel();
    var bv=(settings.voice?null:bestMrVoice());
    for(var i=0;i<parts.length;i++){
      var u=new SpeechSynthesisUtterance(parts[i]);
      u.lang="mr-IN"; u.rate=settings.speed||1;
      if(settings.voice){ var vs=speechSynthesis.getVoices(); for(var k=0;k<vs.length;k++){ if(vs[k].name===settings.voice){ u.voice=vs[k]; break; } } }
      else if(bv){ u.voice=bv; u.lang=bv.lang; }
      if(i===parts.length-1){ u.onend=doneSelSpeak; u.onerror=doneSelSpeak; }
      speechSynthesis.speak(u);
    }
    selSpeaking=true; paintSelPop(); return true;
  }catch(e){ return false; }
}
function ensureSelPop(){
  if(selPop)return selPop;
  selPop=document.createElement("button");
  selPop.id="selPop"; selPop.className="sel-pop"; selPop.style.display="none";
  selPop.setAttribute("aria-label","Read selection aloud");
  selPop.onclick=function(ev){ ev.stopPropagation(); toggleSelSpeak(); };
  document.body.appendChild(selPop);
  return selPop;
}
function paintSelPop(){
  if(!selPop)return;
  selPop.textContent=selSpeaking?"⏹ थांबा":"🔊 वाचा";
}
function currentSelText(){
  var ae=null;
  try{ ae=document.activeElement; }catch(e){}
  if(ae&&((ae.tagName==="TEXTAREA")||(ae.tagName==="INPUT"&&/text|search/i.test(ae.type||"text")))){
    try{ var s=ae.selectionStart, e=ae.selectionEnd;
      if(s!=null&&e!=null&&e>s+1)return {text:ae.value.slice(s,e),rect:ae.getBoundingClientRect()};
    }catch(ex){}
  }
  try{
    var sel=window.getSelection();
    if(sel&&!sel.isCollapsed&&sel.rangeCount){
      var t=String(sel.toString()||"").replace(/\s+/g," ").trim();
      if(t.length>1)return {text:t,rect:sel.getRangeAt(0).getBoundingClientRect()};
    }
  }catch(e){}
  return null;
}
function refreshSelPop(){
  var el=ensureSelPop();
  var s=currentSelText();
  if(!s){ el.style.display="none"; return; }
  paintSelPop();
  var r=s.rect;
  var x=Math.min(window.innerWidth-100,Math.max(8,r.left+r.width/2-50));
  var y=r.top-46; if(y<8)y=r.bottom+8;
  el.style.left=x+"px"; el.style.top=y+"px"; el.style.display="block";
  el._text=s.text;
}
function toggleSelSpeak(){
  if(!selPop)return;
  if(selSpeaking){ try{ speechSynthesis.cancel(); }catch(e){} doneSelSpeak(); return; }
  var t=selPop._text||(currentSelText()||{}).text;
  if(!t)return;
  var parts=chunkMr(t).slice(0,40);
  if(!parts.length)return;
  if(!speakChunks(parts)){ selPop.textContent="🔇 उपलब्ध नाही"; }
}
function hideSelPop(){ if(selPop)selPop.style.display="none"; }
document.addEventListener("selectionchange",function(){ if(!selSpeaking)refreshSelPop(); });
document.addEventListener("scroll",function(){ if(!selSpeaking)refreshSelPop(); },true);
document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ if(selSpeaking)toggleSelSpeak(); else hideSelPop(); } });
/* ---- init ---- */
function init(){
  applyTheme(); touchStreak(); renderChips();
  var btns=document.querySelectorAll(".nav-btn");
  for(var i=0;i<btns.length;i++)btns[i].onclick=function(){ nav(this.getAttribute("data-mode")); };
  document.getElementById("menuBtn").onclick=function(){ document.getElementById("sidebar").classList.toggle("open"); };
  view.innerHTML='<div class="card"><p>लोड होत आहे…</p></div>';
  loadData().then(function(){ nav("chat"); });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
})();
