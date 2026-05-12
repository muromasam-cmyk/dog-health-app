import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const C = {
  c1:"#09637E", c2:"#088395", c3:"#7AB2B2", c4:"#EBF4F6",
  c1h:"#0A7A98", c2h:"#09A0AE",
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
  c4:"#073340",
};

const MAX_RECS = 365 * 3 * 3;
const PER_PAGE = 20;

const SK = "ron_heart_v1";
function loadDB() { try { return JSON.parse(localStorage.getItem(SK) || "{}"); } catch { return {}; } }
function saveDB(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} }
function initDB(d) {
  if (!d.recs)   d.recs   = [];
  if (!d.medLog) d.medLog = {};
  if (!d.hosp)   d.hosp   = { name:"", tel:"", addr:"" };
  if (!d.ntf)    d.ntf    = { fam:"08:00", fpm:"20:00", dam:"08:00", dpm:"20:00",
                               fam_on:true, fpm_on:true, dam_on:true, dpm_on:true };
  return d;
}


const Th = { v:{} };
function useTh() { return Th.v; }
function buildTh(dark) {
  return dark
    ? {bg:CD.bg,card:CD.card,bdr:CD.bdr,tx:CD.tx,sub:CD.sub,hint:CD.hint,bBg:CD.bBg,bBdr:CD.bBdr,bTx:CD.bTx,bHBg:CD.bHBg,bHBdr:CD.bHBdr,bHTx:CD.bHTx,c4:CD.c4}
    : {bg:C.c4,card:"#fff",bdr:C.bdr,tx:C.c1,sub:C.sub,hint:C.hint,bBg:C.bBg,bBdr:C.bBdr,bTx:C.bTx,bHBg:C.bHBg,bHBdr:C.bHBdr,bHTx:C.bHTx,c4:C.c4};
}

function Btn({children,onClick,disabled,style,full,save}) {
  const [h,sH]=useState(false); const th=useTh();
  const bg=save?(h&&!disabled?C.c2h:C.c2):(h&&!disabled?th.bHBg:th.bBg);
  const bdr=save?"none":`1.5px solid ${h&&!disabled?th.bHBdr:th.bBdr}`;
  const col=save?"#EBF4F6":(h&&!disabled?th.bHTx:th.bTx);
  return <button onClick={disabled?undefined:onClick} disabled={disabled}
    onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{fontFamily:"inherit",cursor:disabled?"default":"pointer",borderRadius:12,
      padding:save?"15px":"12px 16px",fontSize:save?15:14,fontWeight:500,
      width:full||save?"100%":undefined,background:bg,border:bdr,color:col,
      opacity:disabled?0.45:1,transition:"background .2s,border-color .2s,color .2s",...style}}>
    {children}
  </button>;
}
function Card({children,style}) { const th=useTh(); return <div style={{background:th.card,border:`1.5px solid ${th.bdr}`,borderRadius:16,overflow:"hidden",marginBottom:12,...style}}>{children}</div>; }
function CH({children}) { const th=useTh(); return <div style={{background:th.c4,padding:"10px 14px",fontSize:12,fontWeight:500,color:th.tx,borderBottom:`1px solid ${th.bdr}`}}>{children}</div>; }
function CB({children,style}) { return <div style={{padding:14,...style}}>{children}</div>; }
function Lbl({children}) { const th=useTh(); return <div style={{fontSize:12,color:th.sub,marginBottom:7}}>{children}</div>; }
function SBtn({children,active,onClick,danger}) {
  const [h,sH]=useState(false); const th=useTh();
  const bg=active?(danger?C.dnB:C.c2):h?th.bHBg:th.bBg;
  const bdr=active?(danger?C.dnB:C.c1):h?th.bHBdr:th.bBdr;
  const col=active?"#EBF4F6":h?th.bHTx:(danger?C.dnT:th.bTx);
  return <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{flex:1,minWidth:60,fontFamily:"inherit",background:bg,border:`1.5px solid ${bdr}`,color:col,borderRadius:10,padding:"11px 6px",fontSize:13,cursor:"pointer",transition:"background .2s,border-color .2s,color .2s"}}>
    {children}
  </button>;
}
function Badge({srr}) {
  if(srr==null) return null;
  const [bg,col,t]=srr>=40?[C.dnBg,C.dnT,"危険"]:srr>=30?[C.wnBg,C.wnT,"注意"]:[C.sfBg,C.sfT,"正常"];
  return <span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:bg,color:col}}>{t}</span>;
}
function Toggle({on,onClick}) {
  return <div onClick={onClick} style={{width:44,height:24,borderRadius:12,cursor:"pointer",position:"relative",background:on?C.c2:C.c3,transition:"background .25s",flexShrink:0}}>
    <div style={{position:"absolute",top:3,left:on?23:3,width:18,height:18,borderRadius:"50%",background:"#EBF4F6",transition:"left .25s"}}/>
  </div>;
}

// ── SRRページ ─────────────────────────────────────────────────────
function SRRPage({setDb}) {
  const th=useTh();
  const [cnt,setCnt]=useState(0),[left,setLeft]=useState(15.0),[run,setRun]=useState(false);
  const [res,setRes]=useState(null),[recOn,setRecOn]=useState(false),[toast,setToast]=useState("");
  const [savedWave,setSavedWave]=useState(null);
  const cntRef=useRef(0),timerRef=useRef(null),streamRef=useRef(null),ctxRef=useRef(null);
  const analyRef=useRef(null),recRef=useRef(null),rafRef=useRef(null),canvasRef=useRef(null);
  const recOnRef=useRef(false),waveHistRef=useRef([]);

  const showToast=useCallback(m=>{setToast(m);setTimeout(()=>setToast(""),2400);},[]);
  const finish=useCallback(()=>{
    const pm=cntRef.current*4; setRes(pm);
    const now=new Date();
    setDb(prev=>({...prev,recs:[{ts:now.getTime(),date:now.toLocaleDateString("ja-JP"),
      time:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),
      srr:pm,water:"",uAmt:"",uCol:""},...prev.recs].slice(0,MAX_RECS)}));
    showToast("SRRを記録しました");
  },[setDb,showToast]);

  const startTimer=()=>{
    if(run)return; cntRef.current=0;setCnt(0);setLeft(15.0);setRes(null);setRun(true);
    let t=15.0;
    timerRef.current=setInterval(()=>{
      t=parseFloat((t-0.1).toFixed(1));
      if(t<=0){clearInterval(timerRef.current);setRun(false);setLeft(0);finish();}
      else setLeft(t);
    },100);
  };
  const resetTimer=()=>{clearInterval(timerRef.current);setRun(false);setLeft(15.0);setCnt(0);cntRef.current=0;setRes(null);};
  const tap=()=>{if(!run)return;cntRef.current+=1;setCnt(cntRef.current);};

  const drawLoop=useCallback(()=>{
    const canvas=canvasRef.current,an=analyRef.current;
    if(!canvas||!an||!recOnRef.current)return;
    rafRef.current=requestAnimationFrame(drawLoop);
    const W=600,H=112;
    if(canvas.width!==W)canvas.width=W;
    if(canvas.height!==H)canvas.height=H;
    const ctx=canvas.getContext("2d");
    const data=new Uint8Array(an.frequencyBinCount);
    an.getByteTimeDomainData(data);
    const now=performance.now(),last=waveHistRef.current._lastSnap||0;
    if(now-last>100){waveHistRef.current.push(new Uint8Array(data));waveHistRef.current._lastSnap=now;}
    ctx.clearRect(0,0,W,H);ctx.strokeStyle="#088395";ctx.lineWidth=2;ctx.beginPath();
    const step=W/data.length;
    data.forEach((v,i)=>{const x=i*step,y=(v/128.0)*(H/2);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
  },[]);

  const toggleMic=useCallback(async()=>{
    if(recOnRef.current){
      recOnRef.current=false;cancelAnimationFrame(rafRef.current);
      recRef.current?.state==="recording"&&recRef.current.stop();
      streamRef.current?.getTracks().forEach(t=>t.stop());ctxRef.current?.close();
      streamRef.current=null;ctxRef.current=null;analyRef.current=null;recRef.current=null;
      const snaps=waveHistRef.current.filter(x=>x instanceof Uint8Array);
      if(snaps.length>0){
        const COLS=600,ROW_H=40,ROWS=snaps.length;
        const off=document.createElement("canvas");off.width=COLS;off.height=ROWS*ROW_H;
        const oc=off.getContext("2d");oc.fillStyle="#EBF4F6";oc.fillRect(0,0,COLS,ROWS*ROW_H);
        snaps.forEach((data,row)=>{
          const yBase=row*ROW_H+ROW_H/2;
          oc.strokeStyle="#088395";oc.lineWidth=1.5;oc.beginPath();
          const step=COLS/data.length;
          data.forEach((v,i)=>{const x=i*step,y=yBase+((v/128.0)-1)*(ROW_H/2-2);i===0?oc.moveTo(x,y):oc.lineTo(x,y);});
          oc.stroke();
          oc.strokeStyle="rgba(122,178,178,0.25)";oc.lineWidth=0.5;oc.beginPath();
          oc.moveTo(0,row*ROW_H);oc.lineTo(COLS,row*ROW_H);oc.stroke();
        });
        const now=new Date();oc.fillStyle="#5A9898";oc.font="11px sans-serif";
        oc.fillText(`録音波形  ${now.toLocaleDateString("ja-JP")} ${now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`,8,ROWS*ROW_H-6);
        const dataURL=off.toDataURL("image/png");setSavedWave(dataURL);
        const a=document.createElement("a");a.href=dataURL;a.download="waveform.png";
        document.body.appendChild(a);a.click();document.body.removeChild(a);
      }
      const canvas=canvasRef.current;
      if(canvas)canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
      waveHistRef.current=[];setRecOn(false);return;
    }
    try{
      waveHistRef.current=[];
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      streamRef.current=stream;
      const AC=window.AudioContext||window.webkitAudioContext;
      const ctx=new AC();if(ctx.state==="suspended")await ctx.resume();
      ctxRef.current=ctx;
      const an=ctx.createAnalyser();an.fftSize=256;
      ctx.createMediaStreamSource(stream).connect(an);analyRef.current=an;
      const mr=new MediaRecorder(stream);mr.start(100);recRef.current=mr;
      recOnRef.current=true;setRecOn(true);
      rafRef.current=requestAnimationFrame(drawLoop);
    }catch(e){alert("マイクへのアクセスができませんでした。");}
  },[drawLoop]);

  useEffect(()=>()=>{clearInterval(timerRef.current);cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());ctxRef.current?.close();},[]);

  const rc=res==null?null:res>=40?{bg:C.dnBg,b:C.dnB,c:C.dnT}:res>=30?{bg:C.wnBg,b:C.wnB,c:C.wnT}:{bg:C.sfBg,b:C.sfT,c:C.sfT};
  const rm=res==null?""
    :res>=40?"【至急】病院へ連絡してください！肺水腫の再発の可能性があります"
    :res>=30?"注意：呼吸が少し早めです。安静を保ち経過を観察してください"
    :"正常範囲内です。引き続き観察を続けてください";

  return (
    <div style={{padding:12,position:"relative"}}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      {toast&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",background:C.c1,color:"#EBF4F6",fontSize:12,padding:"8px 18px",borderRadius:20,zIndex:100,whiteSpace:"nowrap",pointerEvents:"none"}}>{toast}</div>}
      <Card>
        <CH>🫁 安静時呼吸数（SRR）測定</CH>
        <CB>
          <div style={{textAlign:"center",fontSize:66,fontWeight:500,color:C.c1,lineHeight:1}}>{cnt}</div>
          <div style={{textAlign:"center",fontSize:20,color:th.sub,margin:"4px 0 12px"}}>{left===0?"完了":`${left.toFixed(1)} 秒`}</div>
          <button onClick={tap} disabled={!run} style={{width:"100%",background:run?C.c1:C.c3,color:"#EBF4F6",border:"none",borderRadius:14,padding:22,fontSize:19,fontWeight:500,cursor:run?"pointer":"default",fontFamily:"inherit",transition:"background .2s"}}>
            タップして呼吸をカウント
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
            <Btn onClick={startTimer} disabled={run}>▶ 開始</Btn>
            <Btn onClick={resetTimer}>↺ リセット</Btn>
          </div>
          {res!=null&&(
            <div style={{background:rc.bg,border:`2px solid ${rc.b}`,borderRadius:12,padding:14,textAlign:"center",marginTop:12}}>
              <div style={{fontSize:30,fontWeight:500,color:rc.c,animation:res>=40?"blink .75s infinite":"none"}}>{res} 回/分</div>
              <div style={{fontSize:13,marginTop:6,lineHeight:1.5,color:rc.c}}>{rm}</div>
            </div>
          )}
          <button onClick={toggleMic} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:10,background:recOn?C.dnBg:th.bBg,fontFamily:"inherit",border:`1.5px solid ${recOn?C.dnB:th.bBdr}`,borderRadius:12,padding:12,fontSize:13,color:recOn?C.dnT:th.bTx,cursor:"pointer",transition:"background .2s,border-color .2s,color .2s"}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:"currentColor",animation:recOn?"blink .75s infinite":"none"}}/>
            {recOn?"録音中 — タップして停止":"🎙 マイク録音を開始"}
          </button>
          <div style={{overflow:"hidden",transition:"height .2s,margin-top .2s",height:recOn?60:0,marginTop:recOn?10:0}}>
            <canvas ref={canvasRef} style={{display:"block",width:"100%",height:56,borderRadius:8,background:th.c4}}/>
          </div>
          {savedWave&&!recOn&&(
            <div style={{marginTop:12,background:th.c4,border:`1px solid ${th.bdr}`,borderRadius:10,padding:10}}>
              <div style={{fontSize:11,color:th.sub,marginBottom:6,fontWeight:500}}>💾 保存された波形</div>
              <img src={savedWave} alt="録音波形" style={{width:"100%",borderRadius:6,display:"block",marginBottom:8}}/>
              <button onClick={()=>{const a=document.createElement("a");a.href=savedWave;a.download="waveform.png";document.body.appendChild(a);a.click();document.body.removeChild(a);}} style={{width:"100%",background:th.bBg,border:`1.5px solid ${th.bBdr}`,borderRadius:8,padding:"8px 0",fontSize:12,color:th.bTx,cursor:"pointer",fontFamily:"inherit"}}>
                📥 波形画像を再ダウンロード
              </button>
            </div>
          )}
        </CB>
      </Card>
    </div>
  );
}

// ── お薬ページ ────────────────────────────────────────────────────
function MedPage({db,setDb}) {
  const th=useTh();
  const todayKey=new Date().toLocaleDateString("ja-JP");
  const todayLog=(db.medLog||{})[todayKey]||{};
  const tog=k=>{
    const newVal=!todayLog[k];
    const next={...todayLog,[k]:newVal};
    setDb(prev=>{
      const updatedMedLog={...(prev.medLog||{}),[todayKey]:next};
      const now=new Date();
      const [medId,timing]=k.split("-");
      const medName=medId==="pi"?"DSピモハート":"利尿剤";
      const label=`${medName}（${timing==="am"?"朝":"晩"}）${newVal?"服薬":"取消"}`;
      const newRec={ts:now.getTime(),date:now.toLocaleDateString("ja-JP"),
        time:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),
        srr:null,water:"",uAmt:"",uCol:"",medEvent:label};
      return {...prev,medLog:updatedMedLog,recs:[newRec,...prev.recs].slice(0,MAX_RECS)};
    });
  };
  return (
    <div style={{padding:12}}>
      <Card>
        <CH>💊 お薬管理（本日 {todayKey}）</CH>
        <CB>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{id:"pi",name:"DSピモハート"},{id:"di",name:"利尿剤"}].map(m=>(
              <div key={m.id} style={{background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:12,padding:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div style={{fontSize:13,color:th.sub,fontWeight:500,flex:1,minWidth:0}}>{m.name}</div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  {["am","pm"].map(t=>{const k=`${m.id}-${t}`,done=!!todayLog[k];
                    return <button key={t} onClick={()=>tog(k)} style={{borderRadius:10,padding:"11px 20px",fontSize:13,border:`1.5px solid ${done?"#1D9E75":th.bBdr}`,background:done?C.sfBg:th.bBg,color:done?C.sfT:th.bTx,cursor:"pointer",fontFamily:"inherit",transition:"background .2s",whiteSpace:"nowrap"}}>
                      {t==="am"?"朝":"晩"}{done?" ✓":""}
                    </button>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:11,color:th.hint,textAlign:"right"}}>✓ のついたお薬は自動保存・履歴に記録されます</div>
        </CB>
      </Card>
    </div>
  );
}

// ── 体調記録ページ ────────────────────────────────────────────────
function CondPage({setDb}) {
  const th=useTh();
  const [water,setWater]=useState(""),[uAmt,setUAmt]=useState(""),[uCol,setUCol]=useState("");
  const [vid,setVid]=useState(""),[vidURL,setVidURL]=useState(null),[toast,setToast]=useState(false);
  const vidRef=useRef(null);
  useEffect(()=>()=>{if(vidURL)URL.revokeObjectURL(vidURL);},[vidURL]);
  const handleVidChange=e=>{const f=e.target.files?.[0];if(!f)return;if(vidURL)URL.revokeObjectURL(vidURL);setVid(f.name);setVidURL(URL.createObjectURL(f));};
  const save=()=>{
    const now=new Date();
    setDb(prev=>({...prev,recs:[{ts:now.getTime(),date:now.toLocaleDateString("ja-JP"),time:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),srr:null,water,uAmt,uCol},...prev.recs].slice(0,MAX_RECS)}));
    setToast(true);setTimeout(()=>setToast(false),2200);
  };
  return (
    <div style={{padding:12,position:"relative"}}>
      {toast&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",background:C.c1,color:"#EBF4F6",fontSize:12,padding:"8px 18px",borderRadius:20,zIndex:100,whiteSpace:"nowrap"}}>体調記録を保存しました</div>}
      <Card><CH>📋 体調記録</CH><CB>
        <Lbl>呼吸の質（動画）</Lbl>
        <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",background:th.bBg,border:`1.5px dashed ${th.bBdr}`,borderRadius:12,padding:14,fontSize:13,color:th.bTx,cursor:"pointer"}}>
          <span style={{fontSize:16}}>📹</span>{vid?"別の動画を選択する":"動画を選択・記録する"}
          <input type="file" accept="video/*" style={{display:"none"}} onChange={handleVidChange}/>
        </label>
        {vidURL&&(<div style={{marginTop:10,background:th.c4,border:`1px solid ${th.bdr}`,borderRadius:12,overflow:"hidden"}}><div style={{fontSize:11,color:th.sub,padding:"8px 12px 4px",fontWeight:500}}>🎬 {vid}</div><video ref={vidRef} src={vidURL} controls playsInline style={{width:"100%",display:"block",maxHeight:240,background:"#000",borderRadius:"0 0 10px 10px"}}/></div>)}
        <div style={{height:14}}/>
        <Lbl>飲水量</Lbl>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <input type="number" value={water} onChange={e=>setWater(e.target.value)} placeholder="0" min={0} max={3000} style={{flex:1,background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:10,padding:"12px 14px",fontSize:17,color:th.tx,textAlign:"center",fontFamily:"inherit",outline:"none"}}/>
          <span style={{fontSize:15,color:th.sub,fontWeight:500}}>ml</span>
        </div>
        <div style={{height:14}}/>
        <Lbl>排尿 — 量</Lbl>
        <div style={{display:"flex",gap:7,marginTop:8}}>{["少ない","普通","多い"].map(v=><SBtn key={v} active={uAmt===v} onClick={()=>setUAmt(uAmt===v?"":v)}>{v}</SBtn>)}</div>
        <div style={{height:10}}/>
        <Lbl>排尿 — 色</Lbl>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
          {["薄い","正常","濃い"].map(v=><SBtn key={v} active={uCol===v} onClick={()=>setUCol(uCol===v?"":v)}>{v}</SBtn>)}
          <SBtn danger active={uCol==="血尿"} onClick={()=>setUCol(uCol==="血尿"?"":"血尿")}>血尿</SBtn>
        </div>
        <Btn save full onClick={save} style={{marginTop:14}}>記録を保存する</Btn>
      </CB></Card>
    </div>
  );
}

// ── 履歴ページ（PDFモーダル付き） ─────────────────────────────────
function SRRTooltip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  const v=payload[0]?.value,col=v>=40?C.dnT:v>=30?C.wnT:C.sfT,bg=v>=40?C.dnBg:v>=30?C.wnBg:C.sfBg;
  return <div style={{background:bg,border:`1px solid ${col}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:col}}><div style={{fontWeight:500}}>{label}</div><div>{v} 回/分</div></div>;
}

function HistPage({db,setDb,dark}) {
  const th=useTh();
  const [range,setRange]=useState("month"),[page,setPage]=useState(0);
  const [showReport,setShowReport]=useState(false),[reportHtml,setReportHtml]=useState("");

  const getFiltered=useCallback(()=>{
    const now=Date.now();
    const ms=range==="day"?86400000:range==="week"?604800000:range==="month"?2678400000:94608000000;
    return db.recs.filter(r=>r.ts&&now-r.ts<=ms);
  },[db.recs,range]);

  const filtered=getFiltered();
  const totalPages=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const curP=Math.min(page,totalPages-1);
  const slice=filtered.slice(curP*PER_PAGE,(curP+1)*PER_PAGE);
  useEffect(()=>{setPage(0);},[range]);

  const chartData=useMemo(()=>
    getFiltered().filter(r=>r.srr!=null).slice().reverse().map(r=>({
      label:range==="day"?r.time:range==="year"?r.date.replace(/\/\d+$/,""):r.date.replace(/^\d{4}\//,""),
      srr:r.srr,
    }))
  ,[getFiltered,range]);

  const srrAll=db.recs.filter(r=>r.srr!=null);
  const srrAvg=srrAll.length?Math.round(srrAll.reduce((a,r)=>a+r.srr,0)/srrAll.length):null;
  const srrMax=srrAll.length?Math.max(...srrAll.map(r=>r.srr)):null;
  const dangerCt=srrAll.filter(r=>r.srr>=40).length;
  const del=idx=>{setDb(prev=>{const recs=[...prev.recs];recs.splice(idx,1);return{...prev,recs};});};

  const genReport=()=>{
    const recs=db.recs.slice(0,30),sr=recs.filter(r=>r.srr!=null);
    const avg=sr.length?Math.round(sr.reduce((a,r)=>a+r.srr,0)/sr.length):"—";
    const max=sr.length?Math.max(...sr.map(r=>r.srr)):"—";
    const today=new Date().toLocaleDateString("ja-JP");
    const rows=recs.map(r=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2">${r.date}</td><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2">${r.time}</td><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2;color:${r.srr>=40?"#A32D2D":r.srr>=30?"#6B5200":r.srr!=null?"#0F6E56":"#5A9898"};font-weight:${r.srr>=40?"600":"normal"}">${r.srr!=null?r.srr+"回/分":r.medEvent?"💊 "+r.medEvent:"—"}</td><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2">${r.water?r.water+"ml":"—"}</td><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2">${r.uAmt||"—"}</td><td style="padding:6px 8px;border-bottom:1px solid #C2DDE2">${r.uCol||"—"}</td></tr>`).join("");
    setReportHtml(`
      <h1 style="font-size:17px;border-bottom:2px solid #088395;padding-bottom:8px;margin-bottom:14px;color:#09637E">🐾 ロンの心臓病 診察前レポート</h1>
      <p style="font-size:11px;color:#7AB2B2;margin-bottom:14px">作成日：${today}　｜　病院：${db.hosp.name||"未設定"}　｜　総記録：${db.recs.length}件</p>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        ${[["SRR 平均",avg+"回"],["SRR 最大",max+"回"],["記録件数",recs.length+"件"]].map(([l,v])=>`<div style="background:#EBF4F6;border:1px solid #A8CEDA;border-radius:8px;padding:10px 16px;text-align:center;min-width:80px"><div style="font-size:10px;color:#7AB2B2;margin-bottom:4px">${l}</div><div style="font-size:18px;font-weight:600;color:#09637E">${v}</div></div>`).join("")}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr style="background:#09637E;color:#EBF4F6"><th style="padding:7px 8px;text-align:left">日付</th><th style="padding:7px 8px;text-align:left">時刻</th><th style="padding:7px 8px;text-align:left">SRR / 服薬</th><th style="padding:7px 8px;text-align:left">飲水</th><th style="padding:7px 8px;text-align:left">排尿量</th><th style="padding:7px 8px;text-align:left">排尿色</th></tr>
        ${rows}
      </table>
      <p style="margin-top:20px;font-size:10px;color:#7AB2B2;border-top:1px solid #C2DDE2;padding-top:8px">このレポートはロンの心臓病管理アプリが自動生成しました。</p>
    `);
    setShowReport(true);
  };

  const gc=dark?"rgba(122,178,178,0.15)":"rgba(9,99,126,0.08)";
  const RANGES=[["day","日"],["week","週"],["month","月"],["year","年"]];

  return (
    <div style={{padding:12}}>
      {/* PDFモーダル */}
      {showReport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",flexDirection:"column"}}>
          <div style={{background:"#fff",flex:1,overflowY:"auto",padding:20,fontFamily:'"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',color:"#09637E"}}
            dangerouslySetInnerHTML={{__html:reportHtml}}/>
          <div style={{background:C.c1,padding:"12px 16px",display:"flex",gap:10,flexShrink:0}}>
            <button onClick={()=>setShowReport(false)} style={{flex:1,background:"rgba(235,244,246,.2)",border:"1px solid rgba(235,244,246,.4)",borderRadius:12,padding:13,fontSize:14,fontWeight:500,color:"#EBF4F6",cursor:"pointer",fontFamily:"inherit"}}>
              ← アプリに戻る
            </button>
            <button onClick={()=>window.print()} style={{flex:1,background:"#EBF4F6",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:500,color:C.c1,cursor:"pointer",fontFamily:"inherit"}}>
              🖨 PDF保存 / 印刷
            </button>
          </div>
        </div>
      )}

      {/* stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        {[{lb:"SRR 平均",v:srrAvg!=null?srrAvg+"回":"—"},{lb:"SRR 最大",v:srrMax!=null?srrMax+"回":"—",d:srrMax>=40},{lb:"危険回数",v:dangerCt+"回",d:dangerCt>0}].map(s=>(
          <div key={s.lb} style={{background:s.d?C.dnBg:th.c4,border:`1px solid ${s.d?C.dnB:th.bdr}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:10,color:s.d?C.dnT:th.hint,marginBottom:4}}>{s.lb}</div>
            <div style={{fontSize:18,fontWeight:500,color:s.d?C.dnT:th.tx}}>{s.v}</div>
          </div>
        ))}
      </div>

      <Card>
        <CH>📈 SRR 推移チャート</CH>
        <CB>
          <div style={{display:"flex",background:th.bBg,border:`1.5px solid ${th.bBdr}`,borderRadius:10,padding:3,marginBottom:12}}>
            {RANGES.map(([v,l])=>(
              <button key={v} onClick={()=>setRange(v)} style={{flex:1,border:"none",borderRadius:8,padding:"7px 4px",fontSize:12,background:range===v?C.c2:"transparent",color:range===v?"#EBF4F6":th.hint,cursor:"pointer",fontFamily:"inherit",transition:"background .2s,color .2s"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginBottom:8,fontSize:11,color:th.sub}}>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:14,height:3,background:C.c2,display:"inline-block",borderRadius:2}}/>SRR（回/分）</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:14,borderTop:`2px dashed ${C.dnB}`,display:"inline-block"}}/>危険ライン 40</span>
          </div>
          {chartData.length===0
            ?<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:th.hint,fontSize:13,background:th.c4,borderRadius:10}}>この期間のSRR記録はありません</div>
            :<ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{top:8,right:20,left:4,bottom:36}}>
                <CartesianGrid strokeDasharray="3 3" stroke={gc}/>
                <XAxis dataKey="label" tick={{fill:th.tx,fontSize:10}} tickLine={false} axisLine={{stroke:th.bdr}} interval={0} angle={-40} textAnchor="end" height={56}/>
                <YAxis domain={[0,60]} tickFormatter={v=>`${v}回`} tick={{fill:th.tx,fontSize:10}} tickLine={false} axisLine={{stroke:th.bdr}} width={44}/>
                <Tooltip content={<SRRTooltip/>}/>
                <ReferenceLine y={40} stroke={C.dnB} strokeDasharray="5 4" strokeWidth={1.5} label={{value:"40回",fill:C.dnT,fontSize:10,position:"insideTopRight"}}/>
                <Line type="monotone" dataKey="srr" stroke={C.c2} strokeWidth={2} dot={{r:4,fill:C.c2,stroke:"#fff",strokeWidth:1.5}} activeDot={{r:6,fill:C.c1}} isAnimationActive/>
              </LineChart>
            </ResponsiveContainer>
          }
        </CB>
      </Card>
      <Btn full onClick={genReport} style={{marginBottom:12}}>🖨 診察前レポートをPDF出力</Btn>
      <Card>
        <CH>🗓 記録一覧 <span style={{fontWeight:400,fontSize:11,marginLeft:6}}>全 {db.recs.length} 件</span></CH>
        <CB>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <Btn onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={curP===0} style={{padding:"6px 14px",fontSize:12}}>◀ 前へ</Btn>
            <span style={{fontSize:12,color:th.sub}}>{filtered.length?`${curP*PER_PAGE+1}〜${Math.min((curP+1)*PER_PAGE,filtered.length)} / ${filtered.length}件`:"0件"}</span>
            <Btn onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={curP>=totalPages-1||!filtered.length} style={{padding:"6px 14px",fontSize:12}}>次へ ▶</Btn>
          </div>
          {!slice.length
            ?<div style={{color:th.hint,fontSize:13,textAlign:"center",padding:"16px 0"}}>この期間の記録はありません</div>
            :slice.map(r=>{
              const idx=db.recs.indexOf(r);
              return <div key={`${r.ts}-${idx}`} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${th.bdr}`}}>
                <div>
                  <div style={{fontSize:12,color:th.hint}}>{r.date} {r.time}{r.water?` | 飲水 ${r.water}ml`:""}</div>
                  <div style={{fontSize:11,color:th.hint}}>{r.medEvent?<span style={{color:C.sfT,fontWeight:500}}>💊 {r.medEvent}</span>:<>{r.uAmt||""}{r.uCol?` / ${r.uCol}`:""}</>}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  {r.srr!=null?<span style={{fontSize:15,fontWeight:500,color:th.tx}}>{r.srr}回</span>:<span style={{fontSize:11,color:th.hint}}>{r.medEvent?"服薬記録":"体調のみ"}</span>}
                  <Badge srr={r.srr}/>
                  <button onClick={()=>del(idx)} style={{fontSize:11,color:th.hint,background:th.bBg,border:`1px solid ${th.bBdr}`,cursor:"pointer",fontFamily:"inherit",padding:"3px 8px",borderRadius:6}}>削除</button>
                </div>
              </div>;
            })
          }
        </CB>
      </Card>
    </div>
  );
}

// ── 病院ページ ────────────────────────────────────────────────────
function HospPage({db,setDb}) {
  const th=useTh();
  const [name,setName]=useState(db.hosp.name||""),[tel,setTel]=useState(db.hosp.tel||"");
  const [addr,setAddr]=useState(db.hosp.addr||""),[saved,setSaved]=useState(false);
  const save=()=>{setDb(p=>({...p,hosp:{name,tel,addr}}));setSaved(true);setTimeout(()=>setSaved(false),2200);};
  return (
    <div style={{padding:12}}>
      <div style={{background:C.c1,borderRadius:16,padding:18,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:500,color:"#EBF4F6",marginBottom:4}}>{db.hosp.name||"かかりつけ動物病院"}</div>
        <div style={{fontSize:12,color:"rgba(235,244,246,.75)",marginBottom:14}}>{db.hosp.addr||"病院情報を下で設定してください"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button style={{background:"#EBF4F6",color:C.c1,border:"none",borderRadius:12,padding:14,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}><span style={{fontSize:16}}>📞</span> 電話する</button>
          <button style={{background:"rgba(235,244,246,.2)",color:"#EBF4F6",border:"1px solid rgba(235,244,246,.35)",borderRadius:12,padding:14,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}><span style={{fontSize:16}}>💬</span> メッセージ</button>
        </div>
      </div>
      <Card><CH>⚙️ 病院情報を設定</CH><CB>
        {saved&&<div style={{background:C.sfBg,color:C.sfT,fontSize:12,padding:"8px 12px",borderRadius:8,marginBottom:10,textAlign:"center"}}>保存しました</div>}
        <Lbl>病院名</Lbl>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="○○動物病院" style={{background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:10,padding:"12px 14px",fontSize:16,color:th.tx,fontFamily:"inherit",outline:"none",width:"100%",marginBottom:10}}/>
        <Lbl>電話番号</Lbl>
        <input type="tel" value={tel} onChange={e=>setTel(e.target.value)} placeholder="03-0000-0000" style={{background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:10,padding:"12px 14px",fontSize:16,color:th.tx,fontFamily:"inherit",outline:"none",width:"100%",marginBottom:10}}/>
        <Lbl>住所・メモ</Lbl>
        <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="東京都○○区..." style={{background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:10,padding:"12px 14px",fontSize:16,color:th.tx,fontFamily:"inherit",outline:"none",width:"100%",marginBottom:10}}/>
        <Btn save full onClick={save}>保存する</Btn>
      </CB></Card>
    </div>
  );
}

// ── 通知ページ（Web Push版） ──────────────────────────────────────
const VAPID_PUBLIC = "BDn76JrB79Gdb2DY38aHgitFm5lmQG4-6RiAj5Tky0KIeIEAUN4SbvY3IUxqDahbZk-UZhS_BZVcZbZwmb75ojU";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function NtfPage({db,setDb}) {
  const th=useTh();
  const [cfg,setCfg]=useState({...db.ntf}),[msg,setMsg]=useState("");
  const [status,setStatus]=useState("checking");
  const [debugLog,setDebugLog]=useState([]);

  const addLog=useCallback(text=>{
    const ts=new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    setDebugLog(prev=>[`[${ts}] ${text}`,...prev].slice(0,40));
  },[]);

  // 現在の購読状態チェック
  useEffect(()=>{
    (async()=>{
      if(!("Notification" in window)){setStatus("unsupported");return;}
      if(!("serviceWorker" in navigator)){setStatus("no-sw");return;}
      const perm=Notification.permission;
      if(perm==="denied"){setStatus("denied");return;}
      const reg=await navigator.serviceWorker.ready.catch(()=>null);
      if(!reg){setStatus("no-sw");return;}
      const existing=await reg.pushManager.getSubscription().catch(()=>null);
      if(existing){setStatus("subscribed");addLog("✅ 購読済み: "+existing.endpoint.slice(0,40)+"...");}
      else if(perm==="granted"){setStatus("granted");}
      else{setStatus("prompt");}
    })();
  },[]);

  // Web Push 購読を作成してサーバーに送信
  const subscribe=async()=>{
    try{
      addLog("Service Worker 登録中...");
      const reg=await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      addLog("通知許可リクエスト...");
      const perm=await Notification.requestPermission();
      addLog(`許可結果: ${perm}`);
      if(perm!=="granted"){setStatus("denied");return;}
      addLog("プッシュ購読を作成中...");
      const sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      addLog("サーバーに購読情報を送信中...");
      const schedules=buildSchedules(cfg);
      const res=await fetch("/api/subscribe",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({subscription:sub.toJSON(),schedules,deviceId:navigator.userAgent.slice(0,50)}),
      });
      if(!res.ok){const e=await res.text();throw new Error(`Server ${res.status}: ${e}`);}
      const data=await res.json();
      addLog(`✅ 登録完了 key=${data.key}`);
      setStatus("subscribed");
      setMsg("プッシュ通知の設定が完了しました！");
      setTimeout(()=>setMsg(""),3000);
    }catch(err){
      addLog(`❌ エラー: ${err.message}`);
      setStatus("error");
    }
  };

  const buildSchedules=(c)=>[
    {label:"DSピモハート 朝",time:c.fam,enabled:c.fam_on},
    {label:"DSピモハート 晩",time:c.fpm,enabled:c.fpm_on},
    {label:"利尿剤 朝",     time:c.dam,enabled:c.dam_on},
    {label:"利尿剤 晩",     time:c.dpm,enabled:c.dpm_on},
  ];

  // 設定を更新（購読済みなら再送信）
  const save=async()=>{
    setDb(p=>({...p,ntf:cfg}));
    addLog("設定を保存中...");
    if(status==="subscribed"){
      try{
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        if(sub){
          const res=await fetch("/api/subscribe",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({subscription:sub.toJSON(),schedules:buildSchedules(cfg),deviceId:navigator.userAgent.slice(0,50)}),
          });
          if(res.ok){addLog("✅ サーバーのスケジュールを更新しました");}
          else{addLog(`⚠ サーバー更新失敗: ${res.status}`);}
        }
      }catch(err){addLog(`❌ 更新エラー: ${err.message}`);}
    }
    setMsg("保存しました");setTimeout(()=>setMsg(""),2500);
  };

  // テスト通知（即時送信）
  const testNotif=async()=>{
    if(status!=="subscribed"){addLog("未購読 — テスト不可");return;}
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(!sub){addLog("購読が見つかりません");return;}
      addLog("テスト通知を送信中...");
      const res=await fetch("/api/subscribe",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          subscription:sub.toJSON(),
          schedules:buildSchedules(cfg),
          deviceId:navigator.userAgent.slice(0,50),
          sendTest:true,
        }),
      });
      if(res.ok){addLog("✅ テスト通知を送信しました");}
      else{addLog(`❌ テスト失敗: ${res.status}`);}
    }catch(err){addLog(`❌ テストエラー: ${err.message}`);}
  };

  const ENTRIES=[
    {k:"fam",ok:"fam_on",lb:"DSピモハート 朝"},
    {k:"fpm",ok:"fpm_on",lb:"DSピモハート 晩"},
    {k:"dam",ok:"dam_on",lb:"利尿剤 朝"},
    {k:"dpm",ok:"dpm_on",lb:"利尿剤 晩"},
  ];

  return (
    <div style={{padding:12}}>
      <Card>
        <CH>📱 バックグラウンド通知（Web Push）</CH>
        <CB>
          <div style={{fontSize:12,color:th.tx,lineHeight:1.8,marginBottom:10}}>
            <b style={{color:C.c1}}>アプリを完全に閉じていても</b>通知が届きます。
          </div>
          {status==="unsupported"&&<div style={{background:C.dnBg,border:`1px solid ${C.dnB}`,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.dnT}}>このブラウザはWeb Pushに対応していません</div>}
          {status==="no-sw"&&<div style={{background:C.dnBg,border:`1px solid ${C.dnB}`,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.dnT}}>Service Worker が利用できません（HTTPS環境でお試しください）</div>}
          {status==="denied"&&<div style={{background:C.dnBg,border:`1px solid ${C.dnB}`,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.dnT}}>通知がブロックされています。端末設定 → Safari → 通知 から許可してください</div>}
          {(status==="prompt"||status==="granted"||status==="checking")&&(
            <button onClick={subscribe} style={{width:"100%",background:C.c2,color:"#EBF4F6",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:500,cursor:"pointer",marginBottom:12,fontFamily:"inherit"}}>
              🔔 プッシュ通知を有効にする
            </button>
          )}
          {status==="error"&&(
            <button onClick={subscribe} style={{width:"100%",background:C.dnB,color:"#EBF4F6",border:"none",borderRadius:12,padding:14,fontSize:14,fontWeight:500,cursor:"pointer",marginBottom:12,fontFamily:"inherit"}}>
              ❌ エラー — もう一度試す
            </button>
          )}
          {status==="subscribed"&&(
            <div style={{background:C.sfBg,border:`1px solid ${C.sfT}`,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.sfT,fontWeight:500}}>
              ✅ プッシュ通知が有効です（バックグラウンドでも届きます）
            </div>
          )}
          <div style={{background:C.wnBg,border:`1px solid ${C.wnB}`,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11,color:C.wnT}}>
            <b>iPhoneをご利用の方：</b> Safari → 共有（□↑）→「ホーム画面に追加」→ ホーム画面から起動してから有効化してください（iOS 16.4以降）
          </div>
        </CB>
      </Card>

      <Card>
        <CH>🔔 通知時刻の設定</CH>
        <CB>
          {ENTRIES.map(e=>(
            <div key={e.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${th.bdr}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:th.tx}}>{e.lb}</div>
                <input type="time" value={cfg[e.k]} onChange={ev=>setCfg(p=>({...p,[e.k]:ev.target.value}))}
                  style={{marginTop:6,background:th.c4,border:`1.5px solid ${th.bdr}`,borderRadius:10,padding:"6px 10px",fontSize:13,color:th.tx,fontFamily:"inherit",outline:"none",width:120}}/>
              </div>
              <Toggle on={cfg[e.ok]} onClick={()=>setCfg(p=>({...p,[e.ok]:!p[e.ok]}))}/>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={save} style={{flex:2,background:C.c2,color:"#EBF4F6",border:"none",borderRadius:12,padding:14,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              保存する
            </button>
            <button onClick={testNotif} disabled={status!=="subscribed"}
              style={{flex:1,background:status==="subscribed"?C.sfBg:th.bBg,border:`1px solid ${status==="subscribed"?"#1D9E75":th.bBdr}`,color:status==="subscribed"?C.sfT:th.hint,borderRadius:12,padding:14,fontSize:13,fontWeight:500,cursor:status==="subscribed"?"pointer":"default",fontFamily:"inherit",opacity:status==="subscribed"?1:0.45}}>
              テスト
            </button>
          </div>
          {msg&&<div style={{fontSize:12,color:C.sfT,textAlign:"center",marginTop:8,fontWeight:500}}>{msg}</div>}
        </CB>
      </Card>

      <Card>
        <CH>🔍 デバッグログ</CH>
        <CB style={{padding:10}}>
          {debugLog.length===0
            ?<div style={{fontSize:11,color:th.hint,textAlign:"center",padding:"8px 0"}}>ログなし</div>
            :debugLog.map((l,i)=>(
              <div key={i} style={{fontSize:10,color:l.includes("✅")?"#0F6E56":l.includes("❌")?C.dnT:th.hint,padding:"2px 0",borderBottom:`1px solid ${th.bdr}`,fontFamily:"monospace"}}>{l}</div>
            ))
          }
        </CB>
      </Card>
    </div>
  );
}

// ── ルート ────────────────────────────────────────────────────────
export default function App() {
  const [dark,setDark]=useState(false),[tab,setTab]=useState("srr");
  const [db,setDb]=useState(()=>initDB(loadDB()));
  const setDbSync=useCallback(fn=>{setDb(prev=>{const next=typeof fn==="function"?fn(prev):fn;saveDB(next);return{...next};});},[]);
  Th.v=buildTh(dark);
  const th=Th.v;
  const TABS=[{id:"srr",l:"SRR"},{id:"med",l:"お薬"},{id:"cond",l:"体調"},{id:"hist",l:"履歴"},{id:"hosp",l:"病院"},{id:"ntf",l:"通知"}];
  return (
    <div style={{background:th.bg,minHeight:"100vh",fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",sans-serif',paddingBottom:40}}>
      <div style={{background:C.c1,padding:"10px 14px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:15,fontWeight:500,color:"#EBF4F6"}}>
            <span style={{filter:"brightness(0) invert(1)"}}>🐾</span> ロンの心臓病管理
          </span>
          <button onClick={()=>setDark(d=>!d)} style={{background:"rgba(235,244,246,.2)",border:"1px solid rgba(235,244,246,.4)",borderRadius:20,padding:"5px 10px",fontSize:11,color:"#EBF4F6",cursor:"pointer"}}>
            {dark?"☀ ライト":"🌙 ダーク"}
          </button>
        </div>
        <div style={{background:"rgba(235,244,246,.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#EBF4F6",marginTop:5,display:"inline-block"}}>
          安静時呼吸数：正常 20〜30回/分 ｜ <b style={{color:"#FAD36C"}}>40回以上は危険 → 至急病院へ</b>
        </div>
      </div>
      <div style={{display:"flex",background:C.c2}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 2px",fontSize:11,fontWeight:500,color:tab===t.id?"#EBF4F6":"rgba(235,244,246,.6)",background:tab===t.id?"rgba(235,244,246,.12)":"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?"#EBF4F6":"transparent"}`,cursor:"pointer",fontFamily:"inherit",transition:"color .2s,border-color .2s,background .2s"}}>
            {t.l}
          </button>
        ))}
      </div>
      {tab==="srr"&&<SRRPage db={db} setDb={setDbSync}/>}
      {tab==="med"&&<MedPage db={db} setDb={setDbSync}/>}
      {tab==="cond"&&<CondPage setDb={setDbSync}/>}
      {tab==="hist"&&<HistPage db={db} setDb={setDbSync} dark={dark}/>}
      {tab==="hosp"&&<HospPage db={db} setDb={setDbSync}/>}
      {tab==="ntf"&&<NtfPage db={db} setDb={setDbSync}/>}
    </div>
  );
}
