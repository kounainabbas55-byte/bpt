import {useEffect,useRef,useState,useCallback} from "react";
import {Routes,Route,Link,useNavigate,useParams,Navigate} from "react-router-dom";
import {ethers} from "ethers";import {QRCodeCanvas} from "qrcode.react";import {Html5QrcodeScanner} from "html5-qrcode";
import C from "./contract.json";

const API=import.meta.env.VITE_API||"http://localhost:5000/api", RPC=import.meta.env.VITE_RPC||"http://127.0.0.1:8545";
const ready=!!C.address;
const reader=()=>new ethers.Contract(C.address,C.abi,new ethers.JsonRpcProvider(RPC));
async function writer(){
  if(!window.ethereum)throw new Error("MetaMask not found. Install it and connect to Hardhat Local (chain 31337).");
  const p=new ethers.BrowserProvider(window.ethereum);await p.send("eth_requestAccounts",[]);
  return {c:new ethers.Contract(C.address,C.abi,await p.getSigner()),addr:(await (await p.getSigner()).getAddress()).toLowerCase()};
}
const errMsg=e=>e?.reason||e?.shortMessage||e?.message||String(e);
async function api(path,opts={}){
  const t=localStorage.getItem("token");
  const r=await fetch(API+path,{...opts,headers:{"Content-Type":"application/json",...(t&&{Authorization:"Bearer "+t})},body:opts.body&&JSON.stringify(opts.body)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d;
}
const fmt=ts=>new Date(Number(ts)*1000).toLocaleString();
const tone=s=>/deliver/i.test(s)?"ok":/transit|dispatch/i.test(s)?"warn":"";
const Badge=({s})=><span className={"badge "+tone(s)}>{s}</span>;
const Msg=({m})=>m?<div className={"msg "+(m.t||"info")}>{m.x}</div>:null;

async function loadProduct(id){
  const c=reader(),v=await c.verifyProduct(id);if(!v.registered)return null;
  const [d,h]=await Promise.all([c.getProductDetails(id),c.getProductHistory(id)]);
  const logs=await c.queryFilter(c.filters.EventRecorded(ethers.id(id)),0);
  const tx={};logs.forEach(l=>tx[Number(l.args.index)]=l.transactionHash);
  return {d,v,h:h.map((e,i)=>({...e,tx:tx[i]}))};
}
function Setup(){return !ready&&<div className="msg err">Blockchain not configured. Run <code>npm run node</code>, then <code>npm run deploy</code> in the project root and restart the frontend. No transactions can be recorded until then.</div>}

function Nav({user,out}){return <nav><b>⛓ ChainTrack</b><Link to="/">Home</Link><Link to="/verify">Verify</Link>
 {user?<><Link to="/dashboard">Dashboard</Link><a href="#/" onClick={out}>Log out ({user.role})</a></>:<><Link to="/login">Login</Link><Link to="/register">Register</Link></>}</nav>}

function Home(){const [id,setId]=useState("");const n=useNavigate();return <div className="wrap"><Setup/>
 <div className="hero"><h1>Know where your product has been.</h1>
  <p>Every step from factory to shelf is written to a blockchain. Anyone can check a product — no account needed.</p>
  <form onSubmit={e=>{e.preventDefault();id&&n("/verify/"+encodeURIComponent(id.trim()))}} style={{display:"flex",gap:8}}>
   <input value={id} onChange={e=>setId(e.target.value)} placeholder="Enter product ID, e.g. PROD001" style={{flex:1}}/><button>Verify product</button></form></div>
 <div className="grid" style={{marginTop:16}}>{[["Register","Manufacturers record each product once on-chain."],["Track","Distributors and retailers add status updates. Past records can’t be overwritten."],["Verify","Customers scan the QR code and see the full journey."]].map(([a,b])=><div className="card" key={a}><b>{a}</b><p>{b}</p></div>)}</div>
 <div className="card"><b>What blockchain does and doesn’t prove</b><p>A record shows that information was written by an authorised wallet at a certain time and hasn’t been altered since. It does not prove that the original data entered at the factory was truthful.</p></div></div>}

function Timeline({h}){return <div className="tl">{h.map((e,i)=><div key={i}>
 <b>{e.status}</b> <Badge s={e.status}/><div>{e.location} — {fmt(e.timestamp)}</div>
 {e.note&&<div>{e.note}</div>}<small>By {e.actor}</small><br/><small>Tx: {e.tx||"n/a"}</small></div>)}</div>}

function Scanner({onScan}){const ref=useRef();useEffect(()=>{
 const s=new Html5QrcodeScanner("qr",{fps:8,qrbox:220},false);
 s.render(t=>{s.clear().catch(()=>{});onScan(t)},()=>{});return()=>{s.clear().catch(()=>{})}},[]);return <div id="qr" ref={ref}/>}

function Verify(){const {id}=useParams();const n=useNavigate();const [q,setQ]=useState(id||"");const [r,setR]=useState();const [load,setLoad]=useState(false);const [err,setErr]=useState();const [scan,setScan]=useState(false);
 useEffect(()=>{setR();setErr();if(!id||!ready)return;setLoad(true);
  loadProduct(id).then(x=>setR(x||"none")).catch(e=>setErr("Could not reach the blockchain node: "+errMsg(e))).finally(()=>setLoad(false))},[id]);
 const go=v=>{const x=v.trim().split("/").pop();x&&n("/verify/"+encodeURIComponent(x))};
 const sample=r&&r!=="none"&&r.h.some(e=>e.note.includes("[SAMPLE DATA]"));
 return <div className="wrap"><Setup/><div className="card"><h2>Verify a product</h2>
  <div className="row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Product ID"/><button onClick={()=>go(q)}>Verify</button>
  <button className="ghost" onClick={()=>setScan(!scan)}>{scan?"Close scanner":"Scan QR code"}</button></div>{scan&&<Scanner onScan={go}/>}</div>
  {load&&<div className="msg info">Reading the blockchain…</div>}<Msg m={err&&{t:"err",x:err}}/>
  {r==="none"&&<div className="msg err"><b>Not verified.</b> “{id}” isn’t registered on this blockchain. It may be counterfeit or the ID was typed wrong.</div>}
  {r&&r!=="none"&&<><div className="msg ok"><b>✔ Registered on the blockchain.</b> Manufacturer wallet {r.v.manufacturerAuthorized?"is currently authorised":"is NOT currently authorised"}.</div>
   {sample&&<div className="msg info">Sample data created by the demo seed script for demonstration.</div>}
   <div className="card"><div className="row" style={{justifyContent:"space-between"}}><div><h2 style={{margin:0}}>{r.d.name}</h2>
    <p>ID <b>{r.d.id}</b> · {r.d.category} · Batch {r.d.batch} · Origin {r.d.origin}</p>
    <p>Manufactured {new Date(Number(r.d.mfgDate)*1000).toLocaleDateString()} · Status <Badge s={r.d.status}/></p>
    <p className="mono">Manufacturer: {r.d.manufacturer}<br/>Current holder: {r.d.currentOwner}</p></div><QR id={r.d.id}/></div></div>
   <div className="card"><h3>Product journey</h3><Timeline h={r.h}/></div></>}</div>}

function QR({id}){const ref=useRef();const url=`${location.origin}/#/verify/${encodeURIComponent(id)}`;
 const dl=()=>{const a=document.createElement("a");a.href=ref.current.querySelector("canvas").toDataURL();a.download=id+"-qr.png";a.click()};
 return <div ref={ref} style={{textAlign:"center"}}><QRCodeCanvas value={url} size={130}/><br/><button className="ghost" onClick={dl}>Download QR</button></div>}

function Auth({mode,setUser}){const n=useNavigate();const [f,setF]=useState({role:"manufacturer"});const [m,setM]=useState();
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const wallet=async()=>{try{const {addr}=await writer();setF(x=>({...x,wallet:addr}))}catch(e){setM({t:"err",x:errMsg(e)})}};
 const submit=async e=>{e.preventDefault();setM();try{
  if(mode==="login"){const d=await api("/auth/login",{method:"POST",body:f});localStorage.setItem("token",d.token);setUser(d.user);n("/dashboard")}
  else{const d=await api("/auth/register",{method:"POST",body:f});setM({t:"ok",x:d.message})}}catch(e){setM({t:"err",x:e.message})}};
 return <div className="wrap" style={{maxWidth:520}}><div className="card"><h2>{mode==="login"?"Log in":"Create an account"}</h2>
  <form onSubmit={submit} style={{gridTemplateColumns:"1fr"}}>
  {mode==="register"&&<><input placeholder="Organisation name" required onChange={set("name")}/>
   <select value={f.role} onChange={set("role")}><option value="manufacturer">Manufacturer</option><option value="distributor">Distributor</option><option value="retailer">Retailer</option></select></>}
  <input type="email" placeholder="Email" required onChange={set("email")}/>
  <input type="password" placeholder="Password (8+ characters)" minLength={8} required onChange={set("password")}/>
  {mode==="register"&&<div className="row"><input style={{flex:1}} placeholder="Wallet address 0x…" value={f.wallet||""} onChange={set("wallet")} pattern="0x[0-9a-fA-F]{40}" required/>
   <button type="button" className="ghost" onClick={wallet}>Use MetaMask</button></div>}
  <button>{mode==="login"?"Log in":"Register"}</button></form><Msg m={m}/>
  {mode==="register"&&<p>Distributors and retailers can only act after an admin approves your wallet on-chain.</p>}</div></div>}

function Dash({user}){
 const [ids,setIds]=useState([]),[prods,setProds]=useState([]),[m,setM]=useState(),[busy,setBusy]=useState(false),[q,setQ]=useState(""),[users,setUsers]=useState([]),[stats,setStats]=useState({}),[dir,setDir]=useState([]),[sel,setSel]=useState();
 const refresh=useCallback(async()=>{if(!ready)return;try{
  const c=reader(),n=Number(await c.productCount()),all=[];
  for(let i=0;i<n;i++){const id=await c.productIds(i);all.push((await loadProduct(id)));}
  setProds(all);
  if(user.role==="admin"){setUsers(await api("/admin/users"));setStats(await api("/admin/stats"))}
  else if(user.role!=="retailer")setDir(await api("/directory/"+(user.role==="manufacturer"?"distributor":"retailer")));
 }catch(e){setM({t:"err",x:errMsg(e)})}},[user]);
 useEffect(()=>{refresh()},[refresh]);
 const tx=async(fn,ok)=>{setBusy(true);setM({x:"Confirm the transaction in MetaMask…"});try{
  const {c,addr}=await writer();if(addr!==user.wallet.toLowerCase())throw new Error("MetaMask is on a different account than your registered wallet.");
  const t=await fn(c);setM({x:"Waiting for block confirmation…"});const rc=await t.wait();setM({t:"ok",x:`${ok} Tx: ${rc.hash}`});await refresh();return rc;
 }catch(e){setM({t:"err",x:"Transaction failed: "+errMsg(e)})}finally{setBusy(false)}};
 const mine=prods.filter(p=>p&&(user.role==="manufacturer"?p.d.manufacturer.toLowerCase()===user.wallet.toLowerCase():p.d.currentOwner.toLowerCase()===user.wallet.toLowerCase()||p.h.some(e=>e.actor.toLowerCase()===user.wallet.toLowerCase())));
 const rows=(user.role==="admin"?prods.filter(Boolean):mine).filter(p=>(p.d.name+p.d.id+p.d.status).toLowerCase().includes(q.toLowerCase()));
 const isHolder=p=>p.d.currentOwner.toLowerCase()===user.wallet.toLowerCase();
 const addProduct=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  tx(c=>c.registerProduct(f.id.trim(),f.name,f.category,f.batch,f.origin,Math.floor(new Date(f.date).getTime()/1000)),"Product registered on-chain.");};
 const act=(p,e)=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  tx(c=>f.to?c.transferProduct(p.d.id,f.to,f.location,f.note):c.updateProductStatus(p.d.id,f.status,f.location,f.note),"Recorded on-chain.");};
 const decide=async(u,status)=>{
  if(status==="rejected"){await api("/admin/users/"+u.id,{method:"PATCH",body:{status}});return refresh()}
  const rc=await tx(c=>c.grantRole(u.wallet,{manufacturer:1,distributor:2,retailer:3}[u.role]),"Wallet authorised on-chain.");
  if(rc){await api("/admin/users/"+u.id,{method:"PATCH",body:{status,txHash:rc.hash}});refresh()}};
 const pend=users.filter(u=>u.status==="pending");
 return <div className="wrap"><Setup/><h2>{user.role[0].toUpperCase()+user.role.slice(1)} dashboard</h2><Msg m={m}/>
  <div className="grid">{[["Products on-chain",prods.length],...(user.role==="admin"?[["Manufacturers",stats.manufacturers],["Distributors",stats.distributors],["Retailers",stats.retailers],["Pending approvals",stats.pending]]:[["My products",mine.length]])].map(([a,b])=><div className="card stat" key={a}><b>{b??"–"}</b>{a}</div>)}</div>
  {user.role==="admin"&&<div className="card table"><h3>Registrations</h3><table><thead><tr><th>Name</th><th>Role</th><th>Wallet</th><th>Status</th><th></th></tr></thead><tbody>
   {users.filter(u=>u.role!=="admin").map(u=><tr key={u.id}><td>{u.name}<br/>{u.email}</td><td>{u.role}</td><td className="mono">{u.wallet}</td><td><Badge s={u.status==="approved"?"Delivered":u.status}/></td>
   <td>{u.status==="pending"&&<div className="row"><button disabled={busy} onClick={()=>decide(u,"approved")}>Approve</button><button className="bad" onClick={()=>decide(u,"rejected")}>Reject</button></div>}</td></tr>)}</tbody></table>{!users.length&&<p>No registrations yet.</p>}</div>}
  {user.role==="manufacturer"&&<div className="card"><h3>Register a product</h3><form onSubmit={addProduct}>
   <input name="id" placeholder="Product ID" required maxLength={64}/><input name="name" placeholder="Product name" required/><input name="category" placeholder="Category" required/>
   <input name="batch" placeholder="Batch number" required/><input name="origin" placeholder="Origin" required/><input name="date" type="date" required/>
   <button disabled={busy||!ready}>Register on blockchain</button></form></div>}
  <div className="card table"><div className="row" style={{justifyContent:"space-between"}}><h3>Products</h3><input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(p=><tr key={p.d.id}><td>{p.d.id}</td><td>{p.d.name}</td><td><Badge s={p.d.status}/></td>
    <td><button className="ghost" onClick={()=>setSel(sel===p.d.id?null:p.d.id)}>{sel===p.d.id?"Close":"Open"}</button></td></tr>)}</tbody></table>{!rows.length&&<p>Nothing here yet.</p>}</div>
  {rows.filter(p=>p.d.id===sel).map(p=><div className="card" key={p.d.id}><div className="row" style={{justifyContent:"space-between"}}><h3>{p.d.name} ({p.d.id})</h3><QR id={p.d.id}/></div>
   {user.role!=="admin"&&isHolder(p)&&<form onSubmit={e=>act(p,e)}>
    <input name="location" placeholder="Current location" required/><input name="note" placeholder="Note (optional)"/>
    <input name="status" placeholder={user.role==="retailer"?"e.g. Received, In stock, Delivered":"e.g. Received, In Transit"} />
    {dir.length>0&&<select name="to"><option value="">— update status only —</option>{dir.map(d=><option key={d.wallet} value={d.wallet}>Transfer to {d.name}</option>)}</select>}
    <button disabled={busy}>Record on blockchain</button></form>}
   <Timeline h={p.h}/></div>)}</div>}

export default function App(){const [user,setUser]=useState();const [ld,setLd]=useState(!!localStorage.getItem("token"));
 useEffect(()=>{if(ld)api("/me").then(setUser).catch(()=>localStorage.removeItem("token")).finally(()=>setLd(false))},[]);
 const out=()=>{localStorage.removeItem("token");setUser(null)};
 return <><Nav user={user} out={out}/><Routes><Route path="/" element={<Home/>}/><Route path="/verify" element={<Verify/>}/><Route path="/verify/:id" element={<Verify/>}/>
  <Route path="/login" element={<Auth mode="login" setUser={setUser}/>}/><Route path="/register" element={<Auth mode="register"/>}/>
  <Route path="/dashboard" element={ld?<div className="wrap">Loading…</div>:user?<Dash user={user}/>:<Navigate to="/login"/>}/></Routes></>}
