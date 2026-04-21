import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

// ─── カラートークン ───────────────────────────────────────────────
const C = {
  c1:"#09637E", c2:"#088395", c3:"#7AB2B2", c4:"#EBF4F6",
  c1h:"#0A7A98", c2h:"#09A0AE", c4h:"#D2E8EE",
  bBg:"#D4ECF2", bBdr:"#7AB2B2", bTx:"#09637E",
  bHBg:"#B8DBE4", bHBdr:"#088395", bHTx:"#09637E",
  bdr:"#A8CEDA", hint:"#5A9898", sub:"#088395",
  dnBg:"#FFEBEB", dnB:"#E24B4A", dnT:"#A32D2D",
  wnBg:"#FFF8E1", wnB:"#E5B800", wnT:"#6B5200",
  sfBg:"#E1F5EE", sfT:"#0F6E56",
};
const CD = {
  bg:"#052830", card:"#073340", bdr:"#0D4D60",
  tx:"#EBF4F6", sub:"#7AB2B2", hint:"#3A7A8A",
  bBg:"#0A4455", bBdr:"#088395", bTx:"#EBF4F6",
  bHBg:"#0D566A", bHBdr:"#7AB2B2", bHTx:"#EBF4F6",
  c4:"#073340", c4h:"#0A4A5C",
};

const MAX_RECS = 365 * 3 * 3;
const PER_PAGE = 20;
const SK = "dogH_v5";

function loadDB() { try { return JSON.parse(localStorage.getItem(SK) || "{}"); } catch { return {}; } }
function saveDB(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} }

// ─── テーマコンテキスト（シンプルなグローバルオブジェクト） ────
const Th = { v: {} };
function useTh() { return Th.v; }
function buildTh(dark) {
  return dark
    ? { bg:CD.bg, card:CD.card, bdr:CD.bdr, tx:CD.tx, sub:CD.sub, hint:CD.hint,
        bBg:CD.bBg, bBdr:CD.bBdr, bTx:CD.bTx, bHBg:CD.bHBg, bHBdr:CD.bHBdr, bHTx:CD.bHTx,
        c4:CD.c4, c4h:CD.c4h }
    : { bg:C.c4, card:"#fff", bdr:C.bdr, tx:C.c1, sub:C.sub, hint:C.hint,
        bBg:C.bBg, bBdr:C.bBdr, bTx:C.bTx, bHBg:C.bHBg, bHBdr:C.bHBdr, bHTx:C.bHTx,
        c4:C.c4, c4h:C.c4h };
}

// ─── 共通UIパーツ ─────────────────────────────────────────────────
function Btn({ children, onClick, disabled, style, full, primary, save }) {
  const [h, sH] = useState(false);
  const th = useTh();
  let bg, bdr, col;
  if (primary || save) {
    bg  = h && !disabled ? C.c2h : C.c2;
    bdr = "none"; col = "#EBF4F6";
  } else {
    bg  = h && !disabled ? th.bHBg : th.bBg;
    bdr = `1.5px solid ${h && !disabled ? th.bHBdr : th.bBdr}`;
    col = h && !disabled ? th.bHTx : th.bTx;
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
      style={{ fontFamily:"inherit", cursor:disabled?"default":"pointer", borderRadius:12,
        padding:save?"15px":"12px 16px", fontSize:save?15:14, fontWeight:500,
        width:full||save?"100%":undefined, background:bg, border:bdr, color:col,
        opacity:disabled?0.45:1, transition:"background .2s,border-color .2s,color .2s",
        ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style }) {
  const th = useTh();
  return <div style={{ background:th.card, border:`1.5px solid ${th.bdr}`, borderRadius:16, overflow:"hidden", marginBottom:12, ...style }}>{children}</div>;
}
function CH({ children }) {
  const th = useTh();
  return <div style={{ background:th.c4, padding:"10px 14px", fontSize:12, fontWeight:500, color:th.tx, borderBottom:`1px solid ${th.bdr}` }}>{children}</div>;
}
function CB({ children, style }) { return <div style={{ padding:14, ...style }}>{children}</div>; }
function Lbl({ children }) {
  const th = useTh();
  return <div style={{ fontSize:12, color:th.sub, marginBottom:7 }}>{children}</div>;
}
function TInput({ value, onChange, placeholder, type="text", style }) {
  const [f, sF] = useState(false);
  const th = useTh();
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={() => sF(true)} onBlur={() => sF(false)}
      style={{ background:th.c4, border:`1.5px solid ${f?C.c2:th.bdr}`, borderRadius:10,
        padding:"12px 14px", fontSize:16, color:th.tx, fontFamily:"inherit", outline:"none",
        width:"100%", transition:"border-color .2s", ...style }} />
  );
}
function SBtn({ children, active, onClick, danger }) {
  const [h, sH] = useState(false);
  const th = useTh();
  const bg  = active ? (danger?C.dnB:C.c2) : h ? th.bHBg : th.bBg;
  const bdr = active ? (danger?C.dnB:C.c1) : h ? th.bHBdr : th.bBdr;
  const col = active ? "#EBF4F6" : h ? th.bHTx : (danger?C.dnT:th.bTx);
  return (
    <button onClick={onClick} onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
      style={{ flex:1, minWidth:60, fontFamily:"inherit", background:bg, border:`1.5px solid ${bdr}`,
        color:col, borderRadius:10, padding:"11px 6px", fontSize:13, cursor:"pointer",
        transition:"background .2s,border-color .2s,color .2s" }}>
      {children}
    </button>
  );
}
function Badge({ srr }) {
  if (srr == null) return null;
  const [bg,col,t] = srr>=40?[C.dnBg,C.dnT,"危険"]:srr>=30?[C.wnBg,C.wnT,"注意"]:[C.sfBg,C.sfT,"正常"];
  return <span style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:bg, color:col }}>{t}</span>;
}
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative",
      background:on?C.c2:C.c3, transition:"background .25s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?23:3, width:18, height:18,
        borderRadius:"50%", background:"#EBF4F6", transition:"left .25s" }} />
    </div>
  );
}

// ─── SRR測定ページ ────────────────────────────────────────────────
function SRRPage({ setDb }) {
  const th = useTh();
  const [cnt,  setCnt]  = useState(0);
  const [left, setLeft] = useState(15.0);
  const [run,  setRun]  = useState(false);
  const [res,  setRes]  = useState(null);
  const [recOn,setRecOn]= useState(false);
  const [toast,setToast]= useState("");

  const cntRef   = useRef(0);
  const timerRef = useRef(null);
  // ── マイク用 refs（全てrefで管理し useEffect 依存なし） ──
  const streamRef  = useRef(null);
  const ctxRef     = useRef(null);
  const analyRef   = useRef(null);
  const recRef     = useRef(null);
  const rafRef     = useRef(null);
  const canvasRef  = useRef(null);
  const recOnRef   = useRef(false);   // recOn state の同期ref

  // toast helper
  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  // タイマー完了
  const finish = useCallback(() => {
    const pm = cntRef.current * 4;
    setRes(pm);
    const now = new Date();
    setDb(prev => ({
      ...prev,
      recs: [{ ts:now.getTime(), date:now.toLocaleDateString("ja-JP"),
               time:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),
               srr:pm, water:"", uAmt:"", uCol:"" }, ...prev.recs].slice(0, MAX_RECS),
    }));
    showToast("SRRを記録しました");
  }, [setDb, showToast]);

  const startTimer = () => {
    if (run) return;
    cntRef.current = 0; setCnt(0); setLeft(15.0); setRes(null); setRun(true);
    let t = 15.0;
    timerRef.current = setInterval(() => {
      t = parseFloat((t - 0.1).toFixed(1));
      if (t <= 0) { clearInterval(timerRef.current); setRun(false); setLeft(0); finish(); }
      else setLeft(t);
    }, 100);
  };
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setRun(false); setLeft(15.0); setCnt(0); cntRef.current=0; setRes(null);
  };
  const tap = () => {
    if (!run) return;
    cntRef.current += 1;
    setCnt(cntRef.current);
  };

  // ── 波形描画ループ（ref版：state非依存） ──────────────────────
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const an = analyRef.current;
    if (!canvas || !an || !recOnRef.current) return;
    rafRef.current = requestAnimationFrame(drawLoop);
    const W = 600, H = 112;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext("2d");
    const data = new Uint8Array(an.frequencyBinCount);
    an.getByteTimeDomainData(data);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#088395";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = W / data.length;
    data.forEach((v, i) => {
      const x = i * step;
      const y = (v / 128.0) * (H / 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, []);

  // マイク開始・停止
  const toggleMic = useCallback(async () => {
    if (recOnRef.current) {
      // ── 停止 ──
      recOnRef.current = false;
      cancelAnimationFrame(rafRef.current);
      recRef.current?.state === "recording" && recRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      ctxRef.current?.close();
      streamRef.current = null; ctxRef.current = null;
      analyRef.current = null; recRef.current = null;
      // canvasをクリア
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      setRecOn(false);
      return;
    }
    // ── 開始 ──
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();
      ctxRef.current = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      analyRef.current = an;
      const mr = new MediaRecorder(stream);
      mr.start();
      recRef.current = mr;
      recOnRef.current = true;
      setRecOn(true);
      // drawLoopはsetRecOn後のレンダリングを待たずにrefで直接起動
      rafRef.current = requestAnimationFrame(drawLoop);
    } catch (e) {
      console.warn("Mic error:", e);
      alert("マイクへのアクセスができませんでした。\nブラウザでマイクを許可してください。");
    }
  }, [drawLoop]);

  // アンマウント時クリーンアップ
  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
  }, []);

  const rc = res == null ? null
    : res >= 40 ? { bg:C.dnBg, b:C.dnB, c:C.dnT }
    : res >= 30 ? { bg:C.wnBg, b:C.wnB, c:C.wnT }
    : { bg:C.sfBg, b:C.sfT, c:C.sfT };
  const rm = res == null ? ""
    : res >= 40 ? "【至急】病院へ連絡してください！肺水腫の再発の可能性があります"
    : res >= 30 ? "注意：呼吸が少し早めです。安静を保ち経過を観察してください"
    : "正常範囲内です。引き続き観察を続けてください";

  return (
    <div style={{ padding:12, position:"relative" }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      {toast && (
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
          background:C.c1, color:"#EBF4F6", fontSize:12, padding:"8px 18px",
          borderRadius:20, zIndex:100, whiteSpace:"nowrap", pointerEvents:"none" }}>
          {toast}
        </div>
      )}
      <Card>
        <CH>🫁 安静時呼吸数（SRR）測定</CH>
        <CB>
          <div style={{ textAlign:"center", fontSize:66, fontWeight:500, color:C.c1, lineHeight:1 }}>{cnt}</div>
          <div style={{ textAlign:"center", fontSize:20, color:th.sub, margin:"4px 0 12px" }}>
            {left === 0 ? "完了" : `${left.toFixed(1)} 秒`}
          </div>
          <button onClick={tap} disabled={!run}
            style={{ width:"100%", background:run?C.c1:C.c3, color:"#EBF4F6", border:"none",
              borderRadius:14, padding:22, fontSize:19, fontWeight:500, cursor:run?"pointer":"default",
              fontFamily:"inherit", transition:"background .2s" }}>
            タップして呼吸をカウント
          </button>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
            <Btn onClick={startTimer} disabled={run}>▶ 開始</Btn>
            <Btn onClick={resetTimer}>↺ リセット</Btn>
          </div>
          {res != null && (
            <div style={{ background:rc.bg, border:`2px solid ${rc.b}`, borderRadius:12,
              padding:14, textAlign:"center", marginTop:12 }}>
              <div style={{ fontSize:30, fontWeight:500, color:rc.c,
                animation:res>=40?"blink .75s infinite":"none" }}>{res} 回/分</div>
              <div style={{ fontSize:13, marginTop:6, lineHeight:1.5, color:rc.c }}>{rm}</div>
            </div>
          )}

          {/* ── マイクボタン ── */}
          <button onClick={toggleMic}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              gap:8, marginTop:10, background:recOn?C.dnBg:th.bBg, fontFamily:"inherit",
              border:`1.5px solid ${recOn?C.dnB:th.bBdr}`, borderRadius:12, padding:12,
              fontSize:13, color:recOn?C.dnT:th.bTx, cursor:"pointer",
              transition:"background .2s,border-color .2s,color .2s" }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:"currentColor",
              animation:recOn?"blink .75s infinite":"none" }} />
            {recOn ? "録音中 — タップして停止" : "🎙 マイク録音を開始"}
          </button>

          {/* ── 波形 canvas（常にDOM上に存在、録音中のみ表示） ── */}
          <div style={{ overflow:"hidden", transition:"height .2s, margin-top .2s",
            height:recOn?60:0, marginTop:recOn?10:0 }}>
            <canvas ref={canvasRef}
              style={{ display:"block", width:"100%", height:56,
                borderRadius:8, background:th.c4 }} />
          </div>
        </CB>
      </Card>
    </div>
  );
}

// ─── お薬管理ページ ───────────────────────────────────────────────
function MedPage() {
  const th = useTh();
  const [ok, setOk] = useState({});
  const tog = k => setOk(p => ({ ...p, [k]:!p[k] }));
  return (
    <div style={{ padding:12 }}>
      <Card>
        <CH>💊 お薬管理（本日）</CH>
        <CB>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{ id:"fc", name:"フォルテコール\nプラス" }, { id:"di", name:"利尿剤" }].map(m => (
              <div key={m.id} style={{ background:th.c4, border:`1.5px solid ${th.bdr}`, borderRadius:12, padding:12 }}>
                <div style={{ fontSize:12, color:th.sub, marginBottom:10, lineHeight:1.5, whiteSpace:"pre-line" }}>{m.name}</div>
                <div style={{ display:"flex", gap:7 }}>
                  {["am","pm"].map(t => {
                    const k = `${m.id}-${t}`, done = ok[k];
                    return (
                      <button key={t} onClick={() => tog(k)}
                        style={{ flex:1, borderRadius:10, padding:"11px 4px", fontSize:13,
                          border:`1.5px solid ${done?"#1D9E75":th.bBdr}`,
                          background:done?C.sfBg:th.bBg, color:done?C.sfT:th.bTx,
                          cursor:"pointer", fontFamily:"inherit", transition:"background .2s" }}>
                        {t==="am"?"朝":"晩"}{done?" ✓":""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CB>
      </Card>
    </div>
  );
}

// ─── 体調記録ページ ───────────────────────────────────────────────
function CondPage({ setDb }) {
  const th = useTh();
  const [water, setWater] = useState("");
  const [uAmt,  setUAmt]  = useState("");
  const [uCol,  setUCol]  = useState("");
  const [vid,   setVid]   = useState("");
  const [toast, setToast] = useState(false);

  const save = () => {
    const now = new Date();
    setDb(prev => ({
      ...prev,
      recs: [{ ts:now.getTime(), date:now.toLocaleDateString("ja-JP"),
               time:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),
               srr:null, water, uAmt, uCol }, ...prev.recs].slice(0, MAX_RECS),
    }));
    setToast(true); setTimeout(() => setToast(false), 2200);
  };

  return (
    <div style={{ padding:12, position:"relative" }}>
      {toast && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        background:C.c1, color:"#EBF4F6", fontSize:12, padding:"8px 18px",
        borderRadius:20, zIndex:100, whiteSpace:"nowrap" }}>体調記録を保存しました</div>}
      <Card>
        <CH>📋 体調記録</CH>
        <CB>
          <Lbl>呼吸の質（動画）</Lbl>
          <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            width:"100%", background:th.bBg, border:`1.5px dashed ${th.bBdr}`,
            borderRadius:12, padding:14, fontSize:13, color:th.bTx, cursor:"pointer" }}>
            <span style={{ fontSize:16 }}>📹</span> 動画を選択・記録する
            <input type="file" accept="video/*" style={{ display:"none" }}
              onChange={e => e.target.files?.[0] && setVid(e.target.files[0].name)} />
          </label>
          {vid && <div style={{ fontSize:11, color:th.hint, marginTop:5, textAlign:"center" }}>記録済：{vid}</div>}

          <div style={{ height:14 }} />
          <Lbl>飲水量</Lbl>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input type="number" value={water} onChange={e => setWater(e.target.value)} placeholder="0" min={0} max={3000}
              style={{ flex:1, background:th.c4, border:`1.5px solid ${th.bdr}`, borderRadius:10,
                padding:"12px 14px", fontSize:17, color:th.tx, textAlign:"center",
                fontFamily:"inherit", outline:"none" }} />
            <span style={{ fontSize:15, color:th.sub, fontWeight:500 }}>ml</span>
          </div>

          <div style={{ height:14 }} />
          <Lbl>排尿 — 量</Lbl>
          <div style={{ display:"flex", gap:7, marginTop:8 }}>
            {["少ない","普通","多い"].map(v => (
              <SBtn key={v} active={uAmt===v} onClick={() => setUAmt(uAmt===v?"":v)}>{v}</SBtn>
            ))}
          </div>

          <div style={{ height:10 }} />
          <Lbl>排尿 — 色</Lbl>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:8 }}>
            {["薄い","正常","濃い"].map(v => (
              <SBtn key={v} active={uCol===v} onClick={() => setUCol(uCol===v?"":v)}>{v}</SBtn>
            ))}
            <SBtn danger active={uCol==="血尿"} onClick={() => setUCol(uCol==="血尿"?"":"血尿")}>血尿</SBtn>
          </div>

          <Btn save full onClick={save} style={{ marginTop:14 }}>記録を保存する</Btn>
        </CB>
      </Card>
    </div>
  );
}

// ─── 履歴・チャートページ ─────────────────────────────────────────
function SRRTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const col = v>=40?C.dnT:v>=30?C.wnT:C.sfT;
  const bg  = v>=40?C.dnBg:v>=30?C.wnBg:C.sfBg;
  return (
    <div style={{ background:bg, border:`1px solid ${col}`, borderRadius:8,
      padding:"6px 12px", fontSize:12, color:col }}>
      <div style={{ fontWeight:500 }}>{label}</div>
      <div>{v} 回/分</div>
    </div>
  );
}

function HistPage({ db, setDb, dark }) {
  const th = useTh();
  const [range, setRange] = useState("week");
  const [page,  setPage]  = useState(0);

  const getFiltered = useCallback(() => {
    const now = Date.now();
    const ms = range==="day"?86400000:range==="week"?604800000:range==="month"?2678400000:94608000000;
    return db.recs.filter(r => r.ts && now-r.ts <= ms);
  }, [db.recs, range]);

  const filtered   = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curP       = Math.min(page, totalPages-1);
  const slice      = filtered.slice(curP*PER_PAGE, (curP+1)*PER_PAGE);

  useEffect(() => { setPage(0); }, [range]);

  const chartData = useMemo(() => {
    return getFiltered().filter(r => r.srr != null).slice().reverse().map(r => ({
      label: range==="day"?r.time:range==="year"?r.date.replace(/\/\d+$/,""):r.date.replace(/^\d{4}\//,""),
      srr: r.srr,
    }));
  }, [getFiltered, range]);

  const srrAll   = db.recs.filter(r => r.srr != null);
  const srrAvg   = srrAll.length ? Math.round(srrAll.reduce((a,r)=>a+r.srr,0)/srrAll.length) : null;
  const srrMax   = srrAll.length ? Math.max(...srrAll.map(r=>r.srr)) : null;
  const dangerCt = srrAll.filter(r => r.srr >= 40).length;

  const del = idx => {
    if (!window.confirm("削除しますか？")) return;
    setDb(prev => { const recs=[...prev.recs]; recs.splice(idx,1); return {...prev,recs}; });
  };

  const genReport = () => {
    const recs = db.recs.slice(0, 30);
    const sr   = recs.filter(r => r.srr != null);
    const avg  = sr.length ? Math.round(sr.reduce((a,r)=>a+r.srr,0)/sr.length) : "—";
    const max  = sr.length ? Math.max(...sr.map(r=>r.srr)) : "—";
    const today = new Date().toLocaleDateString("ja-JP");
    const rows  = recs.map(r =>
      `<tr><td>${r.date}</td><td>${r.time}</td>` +
      `<td class="${r.srr>=40?"dn":r.srr>=30?"wn":r.srr!=null?"sf":""}">${r.srr!=null?r.srr+"回/分":"—"}</td>` +
      `<td>${r.water?r.water+"ml":"—"}</td><td>${r.uAmt||"—"}</td><td>${r.uCol||"—"}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>診察前レポート</title>
<style>body{font-family:"Hiragino Kaku Gothic ProN",sans-serif;padding:30px;color:#09637E;max-width:720px;margin:0 auto}
h1{font-size:20px;border-bottom:2px solid #088395;padding-bottom:10px;margin-bottom:20px}
.stat-row{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.stat{background:#EBF4F6;border:1px solid #A8CEDA;border-radius:10px;padding:12px 20px;text-align:center}
.stat .lb{font-size:11px;color:#7AB2B2}.stat .vl{font-size:22px;font-weight:500;color:#09637E}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#09637E;color:#EBF4F6;padding:8px;text-align:left}
td{padding:7px 8px;border-bottom:1px solid #C2DDE2}
.dn{color:#A32D2D;font-weight:500}.wn{color:#6B5200}.sf{color:#0F6E56}
footer{margin-top:30px;font-size:11px;color:#7AB2B2;border-top:1px solid #C2DDE2;padding-top:10px}</style></head>
<body><h1>🐾 愛犬の心臓病 診察前レポート</h1>
<p style="font-size:12px;color:#7AB2B2;margin-bottom:16px">作成日：${today}　｜　病院：${db.hosp.name||"未設定"}　｜　総記録：${db.recs.length}件</p>
<div class="stat-row"><div class="stat"><div class="lb">SRR 平均</div><div class="vl">${avg}回</div></div>
<div class="stat"><div class="lb">SRR 最大</div><div class="vl">${max}回</div></div>
<div class="stat"><div class="lb">記録件数</div><div class="vl">${recs.length}件</div></div></div>
<table><tr><th>日付</th><th>時刻</th><th>SRR</th><th>飲水</th><th>排尿量</th><th>排尿色</th></tr>${rows}</table>
<footer>このレポートは愛犬の心臓病管理アプリが自動生成しました。</footer></body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type:"text/html" }));
    a.download = `診察前レポート_${today.replace(/\//g,"-")}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const gc = dark ? "rgba(122,178,178,0.15)" : "rgba(9,99,126,0.08)";
  const RANGES = [["day","日"],["week","週"],["month","月"],["year","年"]];

  return (
    <div style={{ padding:12 }}>
      {/* stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          { lb:"SRR 平均", v:srrAvg!=null?srrAvg+"回":"—" },
          { lb:"SRR 最大", v:srrMax!=null?srrMax+"回":"—", d:srrMax>=40 },
          { lb:"危険回数", v:dangerCt+"回", d:dangerCt>0 },
        ].map(s => (
          <div key={s.lb} style={{ background:s.d?C.dnBg:th.c4, border:`1px solid ${s.d?C.dnB:th.bdr}`,
            borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:s.d?C.dnT:th.hint, marginBottom:4 }}>{s.lb}</div>
            <div style={{ fontSize:18, fontWeight:500, color:s.d?C.dnT:th.tx }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* chart */}
      <Card>
        <CH>📈 SRR 推移チャート</CH>
        <CB>
          <div style={{ display:"flex", background:th.bBg, border:`1.5px solid ${th.bBdr}`,
            borderRadius:10, padding:3, marginBottom:12 }}>
            {RANGES.map(([v,l]) => (
              <button key={v} onClick={() => setRange(v)}
                style={{ flex:1, border:"none", borderRadius:8, padding:"7px 4px", fontSize:12,
                  background:range===v?C.c2:"transparent", color:range===v?"#EBF4F6":th.hint,
                  cursor:"pointer", fontFamily:"inherit", transition:"background .2s,color .2s" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:12, marginBottom:8, fontSize:11, color:th.sub }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:14, height:3, background:C.c2, display:"inline-block", borderRadius:2 }} />SRR（回/分）
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:14, borderTop:`2px dashed ${C.dnB}`, display:"inline-block" }} />危険ライン 40
            </span>
          </div>
          {chartData.length === 0
            ? <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center",
                color:th.hint, fontSize:13, background:th.c4, borderRadius:10 }}>
                この期間のSRR記録はありません
              </div>
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top:8, right:16, left:-16, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                  <XAxis dataKey="label" tick={{ fill:th.tx, fontSize:10 }} tickLine={false}
                    axisLine={{ stroke:th.bdr }} interval="preserveStartEnd" />
                  <YAxis domain={[0,60]} tickFormatter={v=>`${v}回`}
                    tick={{ fill:th.tx, fontSize:10 }} tickLine={false}
                    axisLine={{ stroke:th.bdr }} width={38} />
                  <Tooltip content={<SRRTooltip />} />
                  <ReferenceLine y={40} stroke={C.dnB} strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value:"40", fill:C.dnT, fontSize:10, position:"right" }} />
                  <Line type="monotone" dataKey="srr" stroke={C.c2} strokeWidth={2}
                    dot={{ r:4, fill:C.c2, stroke:"#fff", strokeWidth:1.5 }}
                    activeDot={{ r:6, fill:C.c1 }} isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
          }
        </CB>
      </Card>

      {/* PDF */}
      <Btn full onClick={genReport} style={{ marginBottom:12 }}>
        📄 診察前レポートをHTML出力
      </Btn>

      {/* list */}
      <Card>
        <CH>🗓 記録一覧 <span style={{ fontWeight:400, fontSize:11, marginLeft:6 }}>全 {db.recs.length} 件</span></CH>
        <CB>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <Btn onClick={() => setPage(p => Math.max(0,p-1))} disabled={curP===0} style={{ padding:"6px 14px", fontSize:12 }}>◀ 前へ</Btn>
            <span style={{ fontSize:12, color:th.sub }}>
              {filtered.length ? `${curP*PER_PAGE+1}〜${Math.min((curP+1)*PER_PAGE,filtered.length)} / ${filtered.length}件` : "0件"}
            </span>
            <Btn onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={curP>=totalPages-1||!filtered.length} style={{ padding:"6px 14px", fontSize:12 }}>次へ ▶</Btn>
          </div>
          {!slice.length
            ? <div style={{ color:th.hint, fontSize:13, textAlign:"center", padding:"16px 0" }}>この期間の記録はありません</div>
            : slice.map(r => {
                const idx = db.recs.indexOf(r);
                return (
                  <div key={`${r.ts}-${idx}`} style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${th.bdr}` }}>
                    <div>
                      <div style={{ fontSize:12, color:th.hint }}>{r.date} {r.time}{r.water?` | 飲水 ${r.water}ml`:""}</div>
                      <div style={{ fontSize:11, color:th.hint }}>{r.uAmt||""}{r.uCol?` / ${r.uCol}`:""}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      {r.srr!=null
                        ? <span style={{ fontSize:15, fontWeight:500, color:th.tx }}>{r.srr}回</span>
                        : <span style={{ fontSize:11, color:th.hint }}>体調のみ</span>}
                      <Badge srr={r.srr} />
                      <button onClick={() => del(idx)}
                        style={{ fontSize:11, color:th.hint, background:th.bBg,
                          border:`1px solid ${th.bBdr}`, cursor:"pointer",
                          fontFamily:"inherit", padding:"3px 8px", borderRadius:6 }}>削除</button>
                    </div>
                  </div>
                );
              })}
        </CB>
      </Card>
    </div>
  );
}

// ─── 病院ページ ───────────────────────────────────────────────────
function HospPage({ db, setDb }) {
  const th = useTh();
  const [name, setName] = useState(db.hosp.name||"");
  const [tel,  setTel]  = useState(db.hosp.tel||"");
  const [addr, setAddr] = useState(db.hosp.addr||"");
  const [saved,setSaved]= useState(false);

  const save = () => {
    setDb(p => ({ ...p, hosp:{ name, tel, addr } }));
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };
  const callH = () => tel ? window.location.href="tel:"+tel.replace(/[^0-9+]/g,"") : alert("電話番号が設定されていません");
  const msgH  = () => {
    const lr = db.recs[0];
    const body = lr ? `愛犬の安静時呼吸数：${lr.srr!=null?lr.srr+"回/分":"記録なし"}（${lr.date} ${lr.time}）。診察をお願いしたいのですがご都合はいかがでしょうか。` : "愛犬の状態について相談させてください。";
    tel ? window.location.href="sms:"+tel.replace(/[^0-9+]/g,"")+"?body="+encodeURIComponent(body) : alert("電話番号が設定されていません");
  };

  return (
    <div style={{ padding:12 }}>
      <div style={{ background:C.c1, borderRadius:16, padding:18, marginBottom:12 }}>
        <div style={{ fontSize:16, fontWeight:500, color:"#EBF4F6", marginBottom:4 }}>{db.hosp.name||"かかりつけ動物病院"}</div>
        <div style={{ fontSize:12, color:"rgba(235,244,246,.75)", marginBottom:14 }}>{db.hosp.addr||"病院情報を下で設定してください"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={callH} style={{ background:"#EBF4F6", color:C.c1, border:"none", borderRadius:12, padding:14, fontSize:14, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit" }}>
            <span style={{ fontSize:16 }}>📞</span> 電話する
          </button>
          <button onClick={msgH} style={{ background:"rgba(235,244,246,.2)", color:"#EBF4F6", border:"1px solid rgba(235,244,246,.35)", borderRadius:12, padding:14, fontSize:14, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit" }}>
            <span style={{ fontSize:16 }}>💬</span> メッセージ
          </button>
        </div>
      </div>
      <Card>
        <CH>⚙️ 病院情報を設定</CH>
        <CB>
          {saved && <div style={{ background:C.sfBg, color:C.sfT, fontSize:12, padding:"8px 12px", borderRadius:8, marginBottom:10, textAlign:"center" }}>保存しました</div>}
          <Lbl>病院名</Lbl>
          <TInput value={name} onChange={setName} placeholder="○○動物病院" style={{ marginBottom:10 }} />
          <Lbl>電話番号</Lbl>
          <TInput value={tel} onChange={setTel} placeholder="03-0000-0000" type="tel" style={{ marginBottom:10 }} />
          <Lbl>住所・メモ</Lbl>
          <TInput value={addr} onChange={setAddr} placeholder="東京都○○区..." style={{ marginBottom:10 }} />
          <Btn save full onClick={save}>保存する</Btn>
        </CB>
      </Card>
    </div>
  );
}

// ─── 通知ページ ───────────────────────────────────────────────────
function NtfPage({ db, setDb }) {
  const th = useTh();
  const [cfg, setCfg] = useState({ ...db.ntf });
  const [msg, setMsg] = useState("");
  const tmRef = useRef([]);

  const ENTRIES = [
    { k:"fam", ok:"fam_on", lb:"フォルテコールプラス 朝" },
    { k:"fpm", ok:"fpm_on", lb:"フォルテコールプラス 晩" },
    { k:"dam", ok:"dam_on", lb:"利尿剤 朝" },
    { k:"dpm", ok:"dpm_on", lb:"利尿剤 晩" },
  ];

  const schedule = c => {
    tmRef.current.forEach(clearTimeout); tmRef.current = [];
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(p => {
      if (p !== "granted") return;
      ENTRIES.forEach(e => {
        if (!c[e.ok] || !c[e.k]) return;
        const [hh,mm] = c[e.k].split(":").map(Number);
        const fire = new Date(); fire.setHours(hh,mm,0,0);
        if (fire <= new Date()) fire.setDate(fire.getDate()+1);
        tmRef.current.push(setTimeout(() => new Notification("🐾 お薬リマインダー", { body: e.lb+"のお薬の時間です" }), fire-new Date()));
      });
    });
  };

  const save = () => {
    setDb(p => ({ ...p, ntf:cfg }));
    schedule(cfg);
    setMsg("通知設定を保存しました"); setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div style={{ padding:12 }}>
      <Card>
        <CH>🔔 お薬リマインダー設定</CH>
        <CB>
          <div style={{ fontSize:12, color:th.sub, marginBottom:12, padding:10,
            background:th.c4, border:`1px solid ${th.bdr}`, borderRadius:10, lineHeight:1.6 }}>
            通知は端末の通知許可が必要です。設定を保存すると、ページを開いている間は指定時刻に通知します。
          </div>
          {ENTRIES.map(e => (
            <div key={e.k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"11px 0", borderBottom:`1px solid ${th.bdr}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:th.tx }}>{e.lb}</div>
                <input type="time" value={cfg[e.k]} onChange={ev => setCfg(p => ({ ...p, [e.k]:ev.target.value }))}
                  style={{ marginTop:6, background:th.c4, border:`1.5px solid ${th.bdr}`, borderRadius:10,
                    padding:"6px 10px", fontSize:13, color:th.tx, fontFamily:"inherit", outline:"none", width:120 }} />
              </div>
              <Toggle on={cfg[e.ok]} onClick={() => setCfg(p => ({ ...p, [e.ok]:!p[e.ok] }))} />
            </div>
          ))}
          <Btn save full onClick={save} style={{ marginTop:12 }}>通知設定を保存する</Btn>
          {msg && <div style={{ fontSize:12, color:th.sub, textAlign:"center", marginTop:8 }}>{msg}</div>}
        </CB>
      </Card>
    </div>
  );
}

// ─── ルート ───────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const [tab,  setTab]  = useState("srr");
  const [db,   setDb]   = useState(() => {
    const d = loadDB();
    if (!d.recs)  d.recs  = [];
    if (!d.hosp)  d.hosp  = { name:"", tel:"", addr:"" };
    if (!d.ntf)   d.ntf   = { fam:"08:00", fpm:"20:00", dam:"08:00", dpm:"20:00",
                               fam_on:true, fpm_on:true, dam_on:true, dpm_on:true };
    return d;
  });

  const setDbSync = useCallback(fn => {
    setDb(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      saveDB(next);
      return { ...next };
    });
  }, []);

  // テーマをグローバルに注入
  Th.v = buildTh(dark);
  const th = Th.v;

  const TABS = [
    { id:"srr", l:"SRR" }, { id:"med", l:"お薬" }, { id:"cond", l:"体調" },
    { id:"hist", l:"履歴" }, { id:"hosp", l:"病院" }, { id:"ntf", l:"通知" },
  ];

  return (
    <div style={{ background:th.bg, minHeight:"100vh",
      fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",sans-serif',
      paddingBottom:40 }}>

      {/* ヘッダー */}
      <div style={{ background:C.c1, padding:"10px 14px", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:15, fontWeight:500, color:"#EBF4F6" }}>🐾 愛犬の心臓病管理</span>
          <button onClick={() => setDark(d => !d)}
            style={{ background:"rgba(235,244,246,.2)", border:"1px solid rgba(235,244,246,.4)",
              borderRadius:20, padding:"5px 10px", fontSize:11, color:"#EBF4F6", cursor:"pointer" }}>
            {dark ? "☀ ライト" : "🌙 ダーク"}
          </button>
        </div>
        <div style={{ background:"rgba(235,244,246,.2)", borderRadius:20, padding:"4px 10px",
          fontSize:11, color:"#EBF4F6", marginTop:5, display:"inline-block" }}>
          安静時呼吸数：正常 20〜30回/分 ｜{" "}
          <b style={{ color:"#FAD36C" }}>40回以上は危険 → 至急病院へ</b>
        </div>
      </div>

      {/* タブナビ */}
      <div style={{ display:"flex", background:C.c2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"9px 2px", fontSize:11, fontWeight:500,
              color:tab===t.id?"#EBF4F6":"rgba(235,244,246,.6)",
              background:tab===t.id?"rgba(235,244,246,.12)":"transparent",
              border:"none", borderBottom:`2px solid ${tab===t.id?"#EBF4F6":"transparent"}`,
              cursor:"pointer", fontFamily:"inherit",
              transition:"color .2s,border-color .2s,background .2s" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ページ */}
      {tab === "srr"  && <SRRPage  db={db} setDb={setDbSync} />}
      {tab === "med"  && <MedPage />}
      {tab === "cond" && <CondPage setDb={setDbSync} />}
      {tab === "hist" && <HistPage db={db} setDb={setDbSync} dark={dark} />}
      {tab === "hosp" && <HospPage db={db} setDb={setDbSync} />}
      {tab === "ntf"  && <NtfPage  db={db} setDb={setDbSync} />}
    </div>
  );
}
