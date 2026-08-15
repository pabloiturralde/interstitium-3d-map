import * as THREE from 'three';

const stage = document.querySelector('#stage');
const { THREE: T } = await stage.ready;

/* ------------------------------------------------------------------ *
 *  Palette, curated hues per molecule/cell type.                     *
 *  "Textbook" (muted) is the primary look; confocal & neon derive.    *
 * ------------------------------------------------------------------ */
const BASE = {
  // interstitial matrix
  collagen:'#d98c46', collagen3:'#e8c79a', elastin:'#9fc23c', fluid:'#7fd0e0', gag:'#8fb8ff',
  // interstitial cells
  fibroblast:'#e0509a', macrophage:'#ef8a3d', tcell:'#a76fe8', mast:'#ff4d7d', dendritic:'#c79bff',
  // circulatory
  bloodWall:'#d6493f', bloodLumen:'#9a1d26', rbc:'#e8404f', pericyte:'#c77aa0', venous:'#6b7fb5',
  // lymphatic
  lymphWall:'#2fb87e', lymphFil:'#5fd39c', lymphFluid:'#bfe8d4',
  // nervous
  nerveAxon:'#e6c22e', myelin:'#efdf94', schwann:'#d8a24e',
  // glymphatic
  glymph:'#28c2b6', astrocyte:'#149a8f', arteriole:'#e85b5b', amyloid:'#9aa0a6',
  // ventricular
  ependyma:'#5f9fe8', csf:'#356fbf', cilia:'#8fc0f0',
  // dual-scale extras
  silhouette:'#7fd0e0', brain:'#e0c85a',
  // hydration / organ extras
  channel:'#8fe0ea', organ:'#c9a86a'
};
const TRANSLUCENT = { fluid:0.12, gag:0.55, bloodWall:0.55, lymphWall:0.5, lymphFluid:0.28, glymph:0.3, csf:0.28, venous:0.5, silhouette:0.22, brain:0.46, channel:0.18, organ:0.5 };
const BG = {
  muted:  'radial-gradient(circle at 50% 34%, #f4f0e6 0%, #e6dfce 62%, #d7cdb6 100%)',
  bright: 'radial-gradient(circle at 50% 38%, #0e1524 0%, #070a12 100%)',
  neon:   'radial-gradient(circle at 50% 50%, #0a0716 0%, #020106 100%)'
};

function hslShift(hex, satMul, litSet, litMul){
  const c = new T.Color(hex); const o = {}; c.getHSL(o);
  const s = o.s * satMul;
  const l = litSet != null ? o.l + (litSet - o.l) * 0.55 : o.l * (litMul||1);
  return new T.Color().setHSL(o.h, Math.min(1,s), Math.min(0.96,Math.max(0.04,l)));
}
function paletteColor(type, mode){
  const hex = BASE[type];
  if (mode === 'muted') return hslShift(hex, 0.62, 0.56);   // desaturated, mid-value = illustrative
  if (mode === 'neon')  return hslShift(hex, 1.18, null, 1.1);
  return new T.Color(hex);                                    // confocal = true hue
}

/* ------------------------------------------------------------------ *
 *  Named materials (drive OBJ usemtl grouping on export)             *
 * ------------------------------------------------------------------ */
const MAT = {};
function mat(type){
  const m = new T.MeshStandardMaterial({
    color: new T.Color(BASE[type]),
    roughness: 0.7, metalness: 0.02,
    transparent: TRANSLUCENT[type] != null,
    opacity: TRANSLUCENT[type] ?? 1,
    depthWrite: TRANSLUCENT[type] != null ? false : true
  });
  m.name = type; MAT[type] = m; return m;
}
Object.keys(BASE).forEach(mat);
MAT.fluid.side = T.BackSide;

let _s = 20240517;
const rng = () => (_s = (_s*1664525+1013904223)>>>0) / 4294967296;
const V = (x,y,z) => new T.Vector3(x,y,z);
const rv = (m=1) => V((rng()-0.5)*m,(rng()-0.5)*m,(rng()-0.5)*m);

const model = new T.Group(); model.name = 'interstitial_system';
const SYSKEYS=['core','circulatory','lymphatic','nervous','glymphatic','ventricular'];
const BODY=new T.Group(); BODY.name='whole_body'; model.add(BODY);
const MICRO=new T.Group(); MICRO.name='microstructure'; model.add(MICRO);
const microG={}, bodyG={};
SYSKEYS.forEach(k=>{ microG[k]=new T.Group(); microG[k].name='micro_'+k; MICRO.add(microG[k]);
  bodyG[k]=new T.Group(); bodyG[k].name='body_'+k; BODY.add(bodyG[k]); });
// G proxy: toggling a system hides/shows it at BOTH scales
const G={}; SYSKEYS.forEach(k=>Object.defineProperty(G,k,{enumerable:true,value:{
  get visible(){return microG[k].visible;},
  set visible(v){microG[k].visible=v; bodyG[k].visible=v;} }}));
function tag(mesh, type, name, system, detail, cite){
  mesh.userData = { type, name, system, detail, cite: cite||'' }; return mesh;
}
function add(sys, mesh, type, name, detail, cite){       // micro-scale part
  mesh.name = type; tag(mesh, type, name, sys, detail, cite); microG[sys].add(mesh); return mesh;
}
function addBody(sys, mesh, type, name, detail, cite){   // body-scale (organ) part
  mesh.name = type; tag(mesh, type, name, sys, detail, cite); bodyG[sys].add(mesh); return mesh;
}
function wavy(a,b,r,jitter,segs=6,radial=10){
  const pts=[]; for(let i=0;i<=segs;i++){ const t=i/segs; const p=a.clone().lerp(b,t);
    if(i>0&&i<segs) p.add(rv(jitter)); pts.push(p); }
  return new T.TubeGeometry(new T.CatmullRomCurve3(pts), segs*6, r, radial, false);
}
function tubeAlong(points,r,radial=16){
  return new T.TubeGeometry(new T.CatmullRomCurve3(points), points.length*10, r, radial, false);
}

/* ------------------------------------------------------------------ *
 *  Flow-particle system, animation overlays (fluid / cell motion).   *
 *  Particles ride arc-length along a curve and live inside the system  *
 *  groups, so system + scale toggles hide them automatically.         *
 * ------------------------------------------------------------------ */
const FLOWS=[]; const FLOWMATS=[]; let flowOn=true;
const FLOWDENS=(typeof window!=='undefined' && window.__LOWDENSITY__) ? 0.5 : 1;   // mobile thins particles
let timeScale=1;                     // playback multiplier: 1× … 1000×
let flowClock=0, lastNow=null;       // accumulated flow time (respects timeScale)
const HYDRO=[]; let hydro=0.55, hydroTarget=0.55;   // 0 dehydrated · 0.55 normal · 1 hydrated (edema)
/* ---- flow-rate model: baseline speeds (µm/s, schematic but physiologically ordered) ---- */
const FLOWRATE={ 'Blood flow':800,'Venular flow':1500,'Lymph flow':10,'Interstitial drift':0.5,
  'Interstitial flow':0.6,'Action potential':12000000,'CSF influx':22,'Waste efflux':18,
  'CSF flow':300,'Arterial flow':400000,'Cerebral flow':200000,'Thoracic-duct flow':150 };
const DUCTRATE={ channel:[0.6,1.6],bloodWall:[800,0.6],bloodLumen:[800,0.6],rbc:[800,0.6],
  arteriole:[400000,0.5],lymphWall:[10,0.7],lymphFil:[10,0.7],lymphValve:[10,0.7],lymphFluid:[10,0.7],
  glymph:[22,1.2],amyloid:[18,1.2],csf:[300,1.0],ependyma:[300,1.0],venous:[1500,0.7],nerveAxon:[12000000,0.5] };
const HF_NORM=0.35+0.55*1.4;
function hydroFactor(h){ return 0.35+h*1.4; }
function rateFor(u){ if(!u) return null; if(u.rate!=null) return {base:u.rate,hs:u.hydroSens||0};
  const d=DUCTRATE[u.type]; return d?{base:d[0],hs:d[1]}:null; }
function liveRate(base,hs){ return base*Math.max(0.02,1+hs*(hydroFactor(hydro)-1)); }
function pctOfNormal(hs){ const m=Math.max(0.02,1+hs*(hydroFactor(hydro)-1)), mn=1+hs*(HF_NORM-1); return m/mn*100; }
function fmtRate(v){ const a=Math.abs(v);
  if(a>=1e6) return (v/1e6).toFixed(v/1e6>=100?0:1)+' m/s';
  if(a>=1e3) return (v/1e3).toFixed(v/1e3>=100?0:1)+' mm/s';
  if(a>=1)   return v.toFixed(a>=100?0:1)+' µm/s';
  return v.toFixed(2)+' µm/s'; }
/* ---- hydration stress warnings: constriction (dry) · congestion/edema (wet) ---- */
const WARN=[]; let _hydBucket=-999;
function makeWarn(sys,pos,mode,base,hs,label,dmg){
  const m=new T.Mesh(new T.TorusGeometry(0.5,0.055,10,30),
    new T.MeshBasicMaterial({color:0xffb020,transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  m.position.copy(pos); m.renderOrder=6;
  m.userData={type:null,_warn:true,_mode:mode,rate:base,hydroSens:hs,
    name: dmg?'⚠ Axonal damage risk' : (mode==='dry'?'⚠ Flow constriction':'⚠ Congestion / edema'), system:label,
    detail: dmg
      ?'The peri-neural interstitial space buffers the ions that keep axons excitable. Dehydration collapses it, ion gradients fail and the axon’s environment turns hostile; edema instead compresses the axon and its myelin. Either extreme risks conduction block and, if sustained, structural axonal injury.'
      : (mode==='dry'
        ?'Low hydration collapses the matrix and narrows the channels here, resistance rises and flow through this system is throttled (strangulated). The ring blinks brighter red as the deficit deepens.'
        :'Over-hydration (edema) over-fills and congests this region, the swollen matrix compresses neighbouring structures and back-pressure builds. The ring blinks as overlap and congestion rise.'),
    cite:''};
  microG[sys].add(m); WARN.push({mesh:m,_mode:mode}); return m;
}
function updateWarnings(now){
  const dry=Math.max(0,(0.55-hydro)/0.55), wet=Math.max(0,(hydro-0.55)/0.45);
  for(const w of WARN){ const stress=w._mode==='dry'?dry:wet, mesh=w.mesh;
    if(stress<0.05 || mesh.parent.visible===false){ mesh.visible=false; continue; }
    mesh.visible=true;
    const blink=0.4+0.6*Math.abs(Math.sin(now*(3+stress*5)));
    mesh.material.opacity=Math.min(1,stress*1.15)*blink;
    mesh.scale.setScalar((1+0.22*blink+stress*0.5)*(window.__FIGWARN__||1));
    const c=mesh.material.color;
    if(w._mode==='dry') c.setRGB(1,0.72-0.6*stress,0.12*(1-stress));
    else c.setRGB(0.28+0.5*stress,0.72-0.25*stress,1);
    mesh.lookAt(stage._camera.position);
  }
}
const WSYS=[{key:'core',label:'Interstitium',hs:1.6},{key:'lymphatic',label:'Lymphatic',hs:0.7},
  {key:'glymphatic',label:'Glymphatic',hs:1.2},{key:'ventricular',label:'Ventricular CSF',hs:1.0},
  {key:'circulatory',label:'Circulatory',hs:0.6},{key:'nervous',label:'Nervous',hs:0.9}];
function refreshWarnPanel(){
  const panel=document.getElementById('warn'); if(!panel) return;
  const rows=[]; let worst=0, axonRisk=false;
  for(const s of WSYS){ if(G[s.key].visible===false) continue;
    const pct=pctOfNormal(s.hs); let cls='ok',arrow='●',st='nominal';
    if(pct<92){ cls='dn'; arrow='▼'; st='constricted'; }
    else if(pct>112){ cls='up'; arrow='▲'; st='congested'; }
    if(s.key==='nervous' && (pct<82||pct>128)){ cls='risk'; arrow='⚠'; st='axon risk'; axonRisk=true; }
    worst=Math.max(worst,Math.abs(pct-100));
    rows.push('<div class="wrow '+cls+'"><span class="wn">'+s.label+'</span><span class="wa">'+arrow+
      '</span><span class="wp">'+Math.round(pct)+'%</span><span class="wst">'+st+'</span></div>'); }
  panel.querySelector('.wh').textContent = hydro<0.5?'Dehydration, flow constriction'
    : hydro>0.6?'Over-hydration, congestion / edema' : 'Homeostasis, flow nominal';
  panel.querySelector('.wbody').innerHTML=rows.join('');
  const banner=panel.querySelector('.wbanner');
  banner.style.display=axonRisk?'block':'none';
  banner.textContent = axonRisk ? (hydro<0.55
    ? '⚠ Axonal damage risk, osmotic collapse of the peri-neural space'
    : '⚠ Axonal damage risk, edema compressing the axon & myelin') : '';
  const active=worst>8;
  panel.classList.toggle('alert',active);
  panel.classList.toggle('wet',hydro>0.6);
}
function flowMat(type){
  const m=MAT[type].clone(); m.name=type+'_flow';
  m.transparent=false; m.opacity=1; m.depthWrite=true; m.side=T.FrontSide;
  m._flowType=type; FLOWMATS.push(m); return m;
}
function makeFlow(sys, scale, points, opts){
  opts=opts||{};
  const pts=points.map(p=>Array.isArray(p)?V(p[0],p[1],p[2]):p.clone());
  const curve=new T.CatmullRomCurve3(pts);
  const group=(scale==='body'?bodyG:microG)[sys];
  const n=Math.max(2,Math.round((opts.count||8)*FLOWDENS)), geo=new T.SphereGeometry(opts.r||0.035,8,6), fm=flowMat(opts.mat||'fluid'), parts=[];
  for(let i=0;i<n;i++){
    const m=new T.Mesh(geo,fm);
    if(opts.scaleY) m.scale.set(1,opts.scaleY,1);
    m.position.copy(curve.getPoint(0));
    tag(m, opts.tagType||opts.mat||'fluid', opts.name||'Flow', sys, opts.detail||'', opts.cite||'');
    m.userData._flow=true; m.renderOrder=2;
    m.userData.rate=(FLOWRATE[opts.name]!=null?FLOWRATE[opts.name]:null); m.userData.hydroSens=opts.hydroSens||0;
    group.add(m); parts.push({mesh:m, phase:(i+(opts.jitter?rng()*0.4:0))/n});
  }
  FLOWS.push({curve, parts, group, dir:opts.dir||1, speed:opts.speed||0.05, hydroSens:opts.hydroSens||0});
}
function setFlow(on){ flowOn=on; FLOWS.forEach(f=>f.parts.forEach(p=>p.mesh.visible=on)); }
function setTimeScale(x){ timeScale=x; }
function setHydration(t){ hydroTarget=t; }
function registerHydro(fn){ HYDRO.push(fn); fn(hydro); }        // register + apply current state
function applyHydro(h){ hydro=h; for(const fn of HYDRO) fn(h); }
function updateFlows(now){
  if(lastNow==null) lastNow=now;
  const dt=Math.min(0.05, now-lastNow); lastNow=now;
  if(Math.abs(hydro-hydroTarget)>0.0015) applyHydro(hydro+(hydroTarget-hydro)*Math.min(1,dt*3));  // ease hydration
  updateWarnings(now);
  const b=Math.round(hydro*60); if(b!==_hydBucket){ _hydBucket=b; refreshWarnPanel(); }
  if(!flowOn) return;
  flowClock += dt*timeScale;
  const hf=hydroFactor(hydro);             // hydration accelerates bulk interstitial flow
  for(const f of FLOWS){
    if(f.group.visible===false) continue;
    const sp=f.speed*Math.max(0.03, 1 + f.hydroSens*(hf-1));
    for(const p of f.parts){ let u=(p.phase+f.dir*flowClock*sp)%1; if(u<0)u+=1;
      f.curve.getPointAt(u, p.mesh.position); }
  }
}

const HALF=2.2, TOP=3.4;

/* ================================================================== *
 *  1 · INTERSTITIUM CORE                                              *
 * ================================================================== */
// fluid volume, the space itself
{
  const g=new T.SphereGeometry(1,44,32); g.scale(HALF*1.03, TOP*0.5, HALF*1.03);
  const m=new T.Mesh(g,MAT.fluid); m.position.y=TOP*0.5;
  add('core',m,'fluid','Interstitial fluid','A continuous, fluid-filled pre-lymphatic compartment, not empty stroma. Benias et al. showed these macroscopically visible spaces are collapsed and flattened by the dehydration of conventional histology, which is why they went long unrecognized.','Benias et al. 2018, Sci. Rep. [32]');
}
// collagen-I bundle lattice
const nodes=[];
for(let i=0;i<44;i++) nodes.push(V((rng()-0.5)*2*HALF, 0.3+rng()*(TOP-0.6), (rng()-0.5)*2*HALF));
for(let i=0;i<nodes.length;i++){
  let best=-1,bd=1e9;
  for(let j=0;j<nodes.length;j++){ if(i===j)continue; const d=nodes[i].distanceTo(nodes[j]);
    if(d>0.8&&d<bd){bd=d;best=j;} }
  if(best>=0) add('core',new T.Mesh(wavy(nodes[i],nodes[best],0.05+rng()*0.03,0.45,7),MAT.collagen),
    'collagen','Collagen I bundle','Thick, irregular type-I collagen bundles form the strong, tension-bearing lattice that props the fluid spaces open, on EM the dense fibrillar struts lining each space.','Benias et al. 2018 [32]');
  const k=(i+9)%nodes.length; if(nodes[i].distanceTo(nodes[k])<3.6)
    add('core',new T.Mesh(wavy(nodes[i],nodes[k],0.045,0.55,7),MAT.collagen),
    'collagen','Collagen I bundle','Thick, irregular type-I collagen bundles form the tension-bearing lattice propping the spaces open.','Benias et al. 2018 [32]');
}
// collagen-III reticular fibres, fine mesh woven between bundles
for(let i=0;i<22;i++){
  const a=nodes[(i*5)%nodes.length], b=nodes[(i*5+3)%nodes.length];
  if(a.distanceTo(b)>3.2) continue;
  add('core',new T.Mesh(wavy(a,b,0.018,0.7,8,7),MAT.collagen3),
    'collagen3','Collagen III (reticular)','Thin type-III reticular fibres form a delicate supporting web between the thick bundles.','');
}
// elastin
for(let i=0;i<16;i++){
  const a=nodes[(i*3)%nodes.length], b=nodes[(i*3+5)%nodes.length];
  if(a.distanceTo(b)>3.6) continue;
  add('core',new T.Mesh(wavy(a,b,0.02,0.85,8,8),MAT.elastin),
    'elastin','Elastin fiber','Fine elastic fibres let the distended space recoil; sparser and thinner than the collagen struts.','Benias et al. 2018 [32]');
}
// fibroblasts (CD34+) lining bundles, with processes
for(let i=0;i<12;i++){
  const n=nodes[(i*2)%nodes.length];
  const b=new T.Mesh(new T.SphereGeometry(0.12,20,16),MAT.fibroblast);
  b.scale.set(1.7,0.45,1.1); b.position.copy(n); b.rotation.set(rng()*3,rng()*3,rng()*3);
  add('core',b,'fibroblast','Fibroblast (CD34+)','Flat, stellate CD34+ / vimentin+ cells line the bundles rather than forming a sealed epithelium, a key Benias finding: the spaces are NOT lined by continuous endothelium.','Benias et al. 2018 [32]');
  for(let p=0;p<3;p++){ const out=n.clone().add(rv(1).normalize().multiplyScalar(0.3+rng()*0.2));
    add('core',new T.Mesh(wavy(n,out,0.012,0.12,4,6),MAT.fibroblast),'fibroblast','Fibroblast process','Long cytoplasmic processes extend along the collagen struts.',''); }
}
// macrophages
for(let i=0;i<6;i++){
  const m=new T.Mesh(new T.IcosahedronGeometry(0.17,1),MAT.macrophage);
  m.position.set((rng()-0.5)*3,0.8+rng()*1.8,(rng()-0.5)*3);
  const p=m.geometry.attributes.position; for(let v=0;v<p.count;v++){ const f=1+(rng()-0.5)*0.28;
    p.setXYZ(v,p.getX(v)*f,p.getY(v)*f,p.getZ(v)*f);} p.needsUpdate=true; m.geometry.computeVertexNormals();
  add('core',m,'macrophage','Macrophage','Resident phagocytes patrol the fluid, clearing debris and antigen. Their access to this fluid highway may abet tumour-cell spread, a clinical implication Benias et al. raised.','Benias et al. 2018 [32]');
}
// mast cells, granulated, near vessels
for(let i=0;i<4;i++){
  const b=new T.Mesh(new T.SphereGeometry(0.13,18,14),MAT.mast);
  b.position.set((rng()-0.5)*3.2, 0.9+rng()*1.6, (rng()-0.5)*3.2);
  add('core',b,'mast','Mast cell','Granule-packed sentinels sitting beside vessels and nerves; degranulation releases histamine, driving the vascular leak that swells the interstitium.','');
  for(let g2=0;g2<8;g2++){ const gr=new T.Mesh(new T.SphereGeometry(0.03,8,6),MAT.mast);
    gr.position.copy(b.position).add(rv(0.16)); add('core',gr,'mast','Mast-cell granule','Histamine/heparin granules.',''); }
}
// dendritic cells, stellate antigen sentinels
for(let i=0;i<4;i++){
  const n=V((rng()-0.5)*3,0.7+rng()*1.9,(rng()-0.5)*3);
  const b=new T.Mesh(new T.SphereGeometry(0.1,16,12),MAT.dendritic); b.position.copy(n);
  add('core',b,'dendritic','Dendritic cell','Antigen-presenting sentinels with far-reaching veils; they sample the interstitial fluid then migrate via lymphatics to nodes.','');
  for(let p=0;p<5;p++){ const out=n.clone().add(rv(1).normalize().multiplyScalar(0.35+rng()*0.2));
    add('core',new T.Mesh(wavy(n,out,0.01,0.1,4,5),MAT.dendritic),'dendritic','Dendritic veil','Membrane veils that maximise antigen capture.',''); }
}
// T-lymphocytes
for(let i=0;i<14;i++){
  const m=new T.Mesh(new T.SphereGeometry(0.085,16,12),MAT.tcell);
  m.position.set((rng()-0.5)*3.6,0.6+rng()*2.3,(rng()-0.5)*3.6);
  add('core',m,'tcell','T-lymphocyte','Motile immune cells traffic through the fluid en route to draining lymphatics.','');
}
// hyaluronan / GAG gel, clustered fine beads + proteoglycan brushes
for(let i=0;i<90;i++){
  const s=0.028+rng()*0.045;
  const m=new T.Mesh(new T.SphereGeometry(s,10,8),MAT.gag);
  m.position.set((rng()-0.5)*2*HALF*0.92, 0.4+rng()*(TOP-0.8), (rng()-0.5)*2*HALF*0.92);
  add('core',m,'gag','Hyaluronan / GAG gel','Glycosaminoglycans (chiefly hyaluronan) form the hydrated gel holding interstitial water and governing its flow and pressure.','');
}
for(let i=0;i<9;i++){                                  // aggrecan brushes on a hyaluronan backbone, hydration-sensitive conformation
  const a=V((rng()-0.5)*3.4,0.6+rng()*2,(rng()-0.5)*3.4);
  const axis=rv(1).normalize(); const b=a.clone().add(axis.clone().multiplyScalar(0.6));
  add('core',new T.Mesh(tubeAlong([a,a.clone().lerp(b,0.5),b],0.009,6),MAT.gag),'gag','Hyaluronan backbone','Aggrecan brushes bound along a hyaluronan backbone, the space-filling gel that binds interstitial water.','');
  const c=new T.CatmullRomCurve3([a,b]); const chain=[];
  for(let k=0;k<11;k++){ const base=c.getPoint((k+0.5)/11);
    const dir=new T.Vector3().crossVectors(axis, rv(1)).normalize();
    const sp=new T.Mesh(new T.SphereGeometry(0.017,6,5),MAT.gag); sp.position.copy(base);
    add('core',sp,'gag','Proteoglycan side-chain','Sulfated GAG side-chains splay from the backbone. Hydrated, they swell into a stiff extended brush (a tertiary conformational change); dehydrated, they collapse against the core, stiffening and compacting the gel.','');
    chain.push({sp, base, dir}); }
  registerHydro(h=>{ const ext=0.03+h*0.33; chain.forEach(x=> x.sp.position.copy(x.base).add(x.dir.clone().multiplyScalar(ext))); });
}
// regional variation, a denser fascial condensation in one quadrant
{
  const c0=V(-1.4,0.9,1.3);
  for(let i=0;i<26;i++){ const a=c0.clone().add(rv(1.7)), b=a.clone().add(rv(1.2));
    add('core',new T.Mesh(wavy(a,b,0.018+rng()*0.02,0.5,6,6),MAT.collagen3),'collagen3','Collagen III (dense zone)','Interstitial density varies regionally, here reticular fibres condense into a denser fascial zone, while elsewhere the lattice stays looser and more fluid-rich.','Benias et al. 2018 [32]'); }
  for(let i=0;i<30;i++){ const m=new T.Mesh(new T.SphereGeometry(0.03+rng()*0.03,8,6),MAT.gag);
    m.position.copy(c0.clone().add(rv(2.3))); add('core',m,'gag','Hyaluronan (dense zone)','Concentrated hydrated gel within the denser matrix region.',''); }
}

/* ---- hydration actuators: pre-lymphatic channels, matrix openness, fluid volume ---- */
{
  const channels=[];
  const chDefs=[
    [V(-1.7,1.05,-0.9), V(0.7,1.6,0.5)],
    [V(1.5,0.85,1.2),   V(0.7,1.7,0.1)],
    [V(-0.5,0.6,1.6),   V(0.8,1.5,0.4)],
    [V(0.2,2.3,-1.7),   V(1.0,1.9,-0.5)],
    [V(-1.2,2.1,0.9),   V(0.4,1.8,-0.2)]
  ];
  chDefs.forEach(([A,B])=>{
    const L=A.distanceTo(B), M=A.clone().lerp(B,0.5), dir=B.clone().sub(A).normalize();
    const g=new T.CylinderGeometry(0.1,0.1,L,14,1,true);
    const m=new T.Mesh(g,MAT.channel); m.position.copy(M);
    m.quaternion.setFromUnitVectors(V(0,1,0),dir);
    add('core',m,'channel','Pre-lymphatic channel','A low-resistance conduit through the gel; bulk interstitial fluid percolates along it toward the initial lymphatics. It widens when the matrix is hydrated and collapses when water is withdrawn.','Benias et al. 2018 [32]');
    channels.push(m);
    makeFlow('core','micro',[A, M, B],{count:5,r:0.026,mat:'fluid',name:'Interstitial flow',detail:'Fluid percolating through a pre-lymphatic channel, slow and sparse when dehydrated, faster and fuller when the tissue is hydrated.',speed:0.05,hydroSens:1.6,jitter:true,cite:'Benias et al. 2018 [32]'});
  });
  registerHydro(h=>{ const w=0.32+h*1.35; channels.forEach(m=>m.scale.set(w,1,w)); });   // channel width
  const Cc=V(0,1.85,0);                                                               // matrix openness / regional density
  registerHydro(h=>{ const s=0.8+h*0.36; microG.core.scale.setScalar(s); microG.core.position.copy(Cc).multiplyScalar(1-s); });
  // fluid volume across ALL systems reads through the opacity of every fluid-filled space
  const spaceMats=[['fluid',0.14],['lymphFluid',0.3],['glymph',0.32],['csf',0.3],['venous',0.52]];
  registerHydro(h=>{ const f=0.3+h*0.95; spaceMats.forEach(([t,base])=>{ MAT[t].opacity=Math.min(0.96, base*f); MAT[t].needsUpdate=true; }); });
}

/* ================================================================== *
 *  2 · CIRCULATORY, capillary + venule, mural cells                  *
 * ================================================================== */
{
  const path=[V(-HALF-0.3,1.0,-0.7),V(-1,1.15,-0.4),V(0,0.95,-0.9),V(1,1.1,-0.5),V(HALF+0.3,0.95,-0.8)];
  add('circulatory',new T.Mesh(tubeAlong(path,0.16),MAT.bloodWall),'bloodWall','Capillary endothelium','A single endothelial layer on a basement membrane. Filtration across this wall (Starling forces) is the source of interstitial fluid.','');
  add('circulatory',new T.Mesh(tubeAlong(path,0.10),MAT.bloodLumen),'bloodLumen','Lumen / plasma','Plasma leaks solute and water into the interstitium here; most is reabsorbed downstream.','');
  const curve=new T.CatmullRomCurve3(path);
  for(let i=0;i<8;i++){ const p=curve.getPoint(0.06+i*0.115);
    const rbc=new T.Mesh(new T.SphereGeometry(0.07,16,12),MAT.rbc); rbc.scale.set(1,0.42,1);
    rbc.position.copy(p); rbc.rotation.set(rng()*3,rng()*3,rng()*3);
    add('circulatory',rbc,'rbc','Erythrocyte','Biconcave red cells confined to the lumen.',''); }
  for(let i=0;i<4;i++){ const t=0.15+i*0.22; const p=curve.getPoint(t), tn=curve.getTangent(t);
    const per=new T.Mesh(new T.TorusGeometry(0.17,0.03,10,20),MAT.pericyte);
    per.position.copy(p); per.lookAt(p.clone().add(tn)); per.scale.set(1,1.3,1);
    add('circulatory',per,'pericyte','Pericyte','Contractile mural cells embrace the capillary, tuning perfusion and stability.',''); }
  // branch capillary
  const bp=[V(0,0.95,-0.9),V(0.2,1.4,-1.6),V(0.1,2.0,-2.1)];
  add('circulatory',new T.Mesh(tubeAlong(bp,0.12),MAT.bloodWall),'bloodWall','Capillary branch','A daughter branch, capillary beds ramify densely through the interstitium.','');
  add('circulatory',new T.Mesh(tubeAlong(bp,0.07),MAT.bloodLumen),'bloodLumen','Lumen / plasma','',''); 
  // post-capillary venule, larger, thinner-walled, translucent
  const vp=[V(HALF+0.3,0.95,-0.8),V(1.8,0.7,0.2),V(1.6,0.5,1.4),V(1.9,0.6,2.2)];
  add('circulatory',new T.Mesh(tubeAlong(vp,0.24),MAT.venous),'venous','Post-capillary venule','Fluid and leukocytes re-enter the circulation across the thin, leaky venular wall, the main site of immune-cell diapedesis.','');
  add('circulatory',new T.Mesh(tubeAlong(vp,0.15),MAT.bloodLumen),'bloodLumen','Venular lumen','',''); 
  // dense anastomosing capillary bed, regional ramification into the matrix
  (function(){
    function branch(a,dir,len,r,depth){
      if(depth<=0||r<0.02) return;
      const b=a.clone().add(dir.clone().multiplyScalar(len)).add(rv(0.35));
      add('circulatory',new T.Mesh(wavy(a,b,r,0.3,5,8),MAT.bloodWall),'bloodWall','Capillary (bed)','Fine anastomosing capillaries, the true exchange surface, ramifying densely through the interstitial spaces where filtration and reabsorption occur.','');
      if(r>0.036) add('circulatory',new T.Mesh(wavy(a,b,r*0.55,0.3,5,6),MAT.bloodLumen),'bloodLumen','Capillary lumen','','');
      const nb=2+(rng()<0.4?1:0);
      for(let i=0;i<nb;i++){ const nd=dir.clone().add(rv(1.5)).normalize(); branch(b,nd,len*0.72,r*0.7,depth-1); }
    }
    [V(-1.7,1.25,-1.3),V(1.75,1.0,1.1),V(0.15,1.9,-1.9),V(-0.3,0.7,1.7)].forEach(s=>
      branch(s, V((rng()-0.5),(rng()-0.3),(rng()-0.5)).normalize(), 0.62, 0.055, 3));
  })();
}

/* ================================================================== *
 *  3 · LYMPHATIC, initial lymphatic + collecting vessel w/ valve     *
 * ================================================================== */
{
  const path=[V(0.9,1.7,HALF+0.3),V(0.7,1.9,0.6),V(0.9,1.75,-0.4),V(1.1,2.0,-1.4)];
  add('lymphatic',new T.Mesh(tubeAlong(path,0.2),MAT.lymphWall),'lymphWall','Initial lymphatic endothelium','Blind-ended initial lymphatic. Overlapping "oak-leaf" endothelial cells joined by discontinuous button junctions act as primary valves, interstitial fluid enters and becomes lymph.','Baluk et al. 2007');
  add('lymphatic',new T.Mesh(tubeAlong(path,0.14),MAT.lymphFluid),'lymphFluid','Lymph','Interstitial fluid, once inside, is lymph, flow is strictly one-way, away from the tissue.','');
  const cap=new T.Mesh(new T.SphereGeometry(0.2,20,16,0,6.283,0,Math.PI/2),MAT.lymphWall);
  cap.position.copy(V(0.9,1.7,HALF+0.3)); cap.rotation.x=-Math.PI/2;
  add('lymphatic',cap,'lymphWall','Blind end','The closed initial tip where uptake begins.','');
  const curve=new T.CatmullRomCurve3(path);
  // oak-leaf flaps
  for(let i=0;i<7;i++){ const t=0.08+i*0.13; const p=curve.getPoint(t), tn=curve.getTangent(t);
    const flap=new T.Mesh(new T.CircleGeometry(0.11,12,0,Math.PI),MAT.lymphWall);
    flap.position.copy(p).add(V(0,0.2,0)); flap.lookAt(p.clone().add(tn)); flap.material.side=T.DoubleSide;
    add('lymphatic',flap,'lymphWall','Oak-leaf endothelial flap','Overlapping flaps open under interstitial pressure to admit fluid, then seal, a passive primary valve.','Baluk et al. 2007'); }
  // anchoring filaments
  for(let i=0;i<9;i++){ const p=curve.getPoint(0.08+i*0.1);
    const out=p.clone().add(V((rng()-0.5),0.3+rng()*0.4,(rng()-0.5)).normalize().multiplyScalar(0.5));
    add('lymphatic',new T.Mesh(wavy(p,out,0.008,0.04,3,5),MAT.lymphFil),'lymphFil','Anchoring filament','Elastic filaments tether endothelium to the matrix; when the interstitium swells they pull the button junctions open, drawing fluid in.','Baluk et al. 2007'); }
  // collecting lymphatic with a bicuspid valve
  const cp=[V(1.1,2.0,-1.4),V(1.3,2.4,-2.0),V(1.5,2.9,-2.4)];
  add('lymphatic',new T.Mesh(tubeAlong(cp,0.16),MAT.lymphWall),'lymphWall','Collecting lymphatic','Downstream contractile vessel with luminal valves that ratchet lymph toward the nodes.','');
  add('lymphatic',new T.Mesh(tubeAlong(cp,0.11),MAT.lymphFluid),'lymphFluid','Lymph','',''); 
  const cc=new T.CatmullRomCurve3(cp); const vp=cc.getPoint(0.5), vt=cc.getTangent(0.5);
  for(let s=0;s<2;s++){ const cusp=new T.Mesh(new T.CircleGeometry(0.14,14,0,Math.PI),MAT.lymphFil);
    cusp.position.copy(vp); cusp.lookAt(vp.clone().add(vt)); cusp.rotateZ(s?Math.PI:0); cusp.material.side=T.DoubleSide;
    add('lymphatic',cusp,'lymphFil','Bicuspid valve','Paired cusps prevent lymph backflow between contractions.',''); }
}

/* ================================================================== *
 *  4 · NERVOUS, myelinated fascicle, Remak bundle, free ending       *
 * ================================================================== */
{
  const path=[V(-HALF-0.3,2.5,0.8),V(-0.8,2.65,0.5),V(0.4,2.45,0.9),V(HALF+0.3,2.6,0.6)];
  for(let a=0;a<3;a++){
    const off=V(Math.cos(a/3*6.28)*0.09,Math.sin(a/3*6.28)*0.09,0);
    const pp=path.map(p=>p.clone().add(off));
    add('nervous',new T.Mesh(tubeAlong(pp,0.03),MAT.nerveAxon),'nerveAxon','Myelinated axon','Nerve fibres run through the interstitium; endings sample its chemistry and mechanics (pressure, pH, mediators).','');
    const c2=new T.CatmullRomCurve3(pp);
    for(let s=0;s<7;s++){ const t=0.05+s*0.13; const p=c2.getPoint(t), tn=c2.getTangent(t);
      const my=new T.Mesh(new T.CylinderGeometry(0.052,0.052,0.085,14),MAT.myelin);
      my.position.copy(p); my.quaternion.setFromUnitVectors(V(0,1,0),tn.clone().normalize());
      add('nervous',my,'myelin','Myelin sheath','Segmented myelin, the gaps are nodes of Ranvier, gives saltatory conduction.','');
      if(s%2===0){ const sc=new T.Mesh(new T.SphereGeometry(0.05,12,10),MAT.schwann);
        sc.position.copy(p).add(V(0,0.06,0)); add('nervous',sc,'schwann','Schwann cell nucleus','Each internode is wrapped by one Schwann cell.',''); } }
  }
  // Remak bundle, unmyelinated C-fibres sharing one Schwann cell
  const rp=[V(-HALF-0.3,2.2,1.3),V(-0.5,2.3,1.5),V(0.8,2.15,1.2),V(HALF+0.3,2.25,1.4)];
  add('nervous',new T.Mesh(tubeAlong(rp,0.07),MAT.schwann),'schwann','Remak (Schwann) sheath','A single Schwann cell cradles a bundle of unmyelinated C-fibres, slow pain and autonomic signals.','');
  for(let a=0;a<3;a++){ const off=rv(0.05); add('nervous',new T.Mesh(tubeAlong(rp.map(p=>p.clone().add(off)),0.014),MAT.nerveAxon),'nerveAxon','Unmyelinated C-fiber','',''); }
  // free nerve ending branching into the matrix
  const fe=V(0.4,2.45,0.9);
  for(let b=0;b<4;b++){ const out=fe.clone().add(V((rng()-0.5),-(0.4+rng()*0.5),(rng()-0.5)).normalize().multiplyScalar(0.8));
    add('nervous',new T.Mesh(wavy(fe,out,0.014,0.15,5,6),MAT.nerveAxon),'nerveAxon','Free nerve ending','Bare terminal branches embedded directly in the interstitium, the sensor of tissue state.',''); }
}

/* ================================================================== *
 *  5 · GLYMPHATIC, peri-arterial influx + para-venous efflux         *
 * ================================================================== */
{
  const ap=[V(-1.4,-0.2,-1.0),V(-1.3,1.0,-1.05),V(-1.45,2.2,-0.95),V(-1.35,TOP+0.2,-1.0)];
  add('glymphatic',new T.Mesh(tubeAlong(ap,0.12),MAT.arteriole),'arteriole','Penetrating arteriole','Arteriole pulsation drives CSF inward along the peri-vascular space, the mechanical pump of the glymphatic system.','Iliff et al. 2012 [14]');
  add('glymphatic',new T.Mesh(tubeAlong(ap,0.22),MAT.glymph),'glymph','Peri-arterial (AQP4) space','The para-arterial space bounded by astrocyte end-feet. CSF enters here and exchanges with brain interstitial fluid, flushing solutes toward para-venous efflux.','Iliff et al. 2012 [14]');
  const ac=new T.CatmullRomCurve3(ap);
  for(let i=0;i<11;i++){ const p=ac.getPoint(0.05+i*0.088);
    const ef=new T.Mesh(new T.SphereGeometry(0.1,14,12),MAT.astrocyte); ef.scale.set(1.4,0.6,1.4);
    ef.position.copy(p.clone().add(V((rng()-0.5),(rng()-0.5)*0.3,(rng()-0.5)).normalize().multiplyScalar(0.22)));
    add('glymphatic',ef,'astrocyte','Astrocyte end-foot (AQP4)','End-feet studded with aquaporin-4 water channels sheath the vessel and gate glymphatic water flux.','Iliff et al. 2012 [14]'); }
  // astrocyte cell bodies with processes reaching to the vessel
  for(let i=0;i<3;i++){ const body=V(-0.7+rng()*0.4, 0.8+i*0.9, -0.4+rng()*0.3);
    const cb=new T.Mesh(new T.SphereGeometry(0.13,16,12),MAT.astrocyte); cb.position.copy(body);
    add('glymphatic',cb,'astrocyte','Astrocyte','Star-shaped glia, their end-feet build the glymphatic conduit and set water permeability.','');
    for(let p=0;p<4;p++){ const out=body.clone().add(rv(1).normalize().multiplyScalar(0.4));
      add('glymphatic',new T.Mesh(wavy(body,out,0.012,0.12,4,6),MAT.astrocyte),'astrocyte','Astrocyte process','',''); } }
  // amyloid-β solute being cleared along the space
  for(let i=0;i<7;i++){ const p=ac.getPoint(0.1+rng()*0.8);
    const am=new T.Mesh(new T.IcosahedronGeometry(0.04,0),MAT.amyloid);
    am.position.copy(p).add(rv(0.28)); add('glymphatic',am,'amyloid','Amyloid-β / solute','Metabolic waste (incl. amyloid-β) carried out of the brain by glymphatic flow, impaired clearance is linked to neurodegeneration.','Iliff et al. 2012 [14]'); }
  // para-venous efflux vein
  const vp=[V(-0.6,-0.2,0.4),V(-0.5,1.1,0.5),V(-0.65,2.3,0.45),V(-0.55,TOP+0.2,0.5)];
  add('glymphatic',new T.Mesh(tubeAlong(vp,0.16),MAT.venous),'venous','Para-venous efflux','Solute-laden fluid collects around deep veins and drains from the brain, the glymphatic outflow limb.','Iliff et al. 2012 [14]');
}

/* ================================================================== *
 *  6 · VENTRICULAR, ciliated ependyma lining a CSF channel           *
 * ================================================================== */
{
  const path=[V(1.5,-0.2,1.2),V(1.4,1.1,1.25),V(1.55,2.3,1.15),V(1.45,TOP+0.2,1.2)];
  add('ventricular',new T.Mesh(tubeAlong(path,0.28),MAT.csf),'csf','CSF (ventricular)','Cerebrospinal fluid filling the ventricular system, continuous, via the glymphatic route, with brain interstitial fluid.','');
  const curve=new T.CatmullRomCurve3(path);
  for(let i=0;i<10;i++){ const t=0.03+i*0.096; const p=curve.getPoint(t);
    for(let a=0;a<7;a++){ const ang=a/7*6.28; const n=V(Math.cos(ang),0,Math.sin(ang));
      const cell=new T.Mesh(new T.BoxGeometry(0.09,0.11,0.09),MAT.ependyma);
      cell.position.copy(p).add(n.clone().multiplyScalar(0.28)); cell.lookAt(p);
      add('ventricular',cell,'ependyma','Ependymal cell','Ciliated ependyma line the ventricles, propelling CSF and forming the CSF-brain interface with the interstitium.','');
      for(let c=0;c<3;c++){ const cil=new T.Mesh(new T.ConeGeometry(0.012,0.1,6),MAT.cilia);
        const tip=p.clone().add(n.clone().multiplyScalar(0.36)).add(rv(0.05));
        cil.position.copy(tip); cil.quaternion.setFromUnitVectors(V(0,1,0),n.clone().negate());
        add('ventricular',cil,'cilia','Cilium','Motile cilia beat in metachronal waves to circulate CSF.',''); } } }
  // CSF flow particles
  for(let i=0;i<10;i++){ const p=curve.getPoint(rng());
    const sp=new T.Mesh(new T.SphereGeometry(0.03,8,6),MAT.cilia);
    sp.position.copy(p).add(rv(0.2)); add('ventricular',sp,'csf','CSF flow','Bulk CSF movement driven by ciliary beating and arterial pulsation.',''); }
}

/* ================================================================== *
 *  WHOLE-BODY SCHEMATIC (organ scale), shares the system palette.    *
 *  The micro block above is a magnified sample from the cortical /     *
 *  meningeal boundary, the one locus where all five systems converge.  *
 * ================================================================== */
const P=(x,y,z)=>V(x,y,z);
function tube(pts,r,radial=12){
  return new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>V(p[0],p[1],p[2]))), pts.length*8, r, radial, false);
}

// --- Interstitium: translucent body silhouette (the fluid is everywhere) ---
function sil(g,x,y,z,rot){ const m=new T.Mesh(g,MAT.silhouette); m.position.set(x,y,z); if(rot)m.rotation.set(rot[0],rot[1],rot[2]);
  addBody('core',m,'silhouette','Interstitium (body-wide)','The interstitial fluid space is continuous throughout the body, beneath every epithelium and wrapping every vessel, muscle and nerve. This translucent figure marks that pervasive compartment.','Benias et al. 2018 [32]'); return m; }
sil(new T.SphereGeometry(0.6,24,20),0,5.5,0);                       // head
sil(new T.CylinderGeometry(0.22,0.28,0.5,16),0,4.95,0);            // neck
sil(new T.CylinderGeometry(0.92,0.66,2.05,24),0,3.7,0);           // torso
sil(new T.SphereGeometry(0.78,20,16),0,2.5,0);                     // pelvis
sil(new T.CylinderGeometry(0.2,0.16,2.2,14),-1.12,3.5,0,[0,0,0.34]);// arm L
sil(new T.CylinderGeometry(0.2,0.16,2.2,14), 1.12,3.5,0,[0,0,-0.34]);// arm R
sil(new T.CylinderGeometry(0.29,0.18,2.7,16),-0.42,1.15,0,[0,0,0.05]);// leg L
sil(new T.CylinderGeometry(0.29,0.18,2.7,16), 0.42,1.15,0,[0,0,-0.05]);// leg R
[[-0.3,3.7,0],[0.3,3.7,0]].forEach(p=>{ const m=new T.Mesh(new T.BoxGeometry(0.03,1.5,0.75),MAT.collagen3); m.position.set(p[0],p[1],p[2]);
  addBody('core',m,'collagen3','Fascia (connective sheet)','Parasagittal fascial planes are dense interstitial sheets that wrap and separate muscles and organs, a body-spanning collagen network.','Benias et al. 2018 [32]'); });

// --- Nervous ---
const brain=new T.Mesh(new T.IcosahedronGeometry(0.5,3),MAT.brain);
{ const bp=brain.geometry.attributes.position; for(let v=0;v<bp.count;v++){ const x=bp.getX(v),y=bp.getY(v),z=bp.getZ(v);
    const f=1+(Math.sin(x*13)+Math.cos(z*11)+Math.sin(y*12))*0.018; bp.setXYZ(v,x*f,y*f,z*f);} bp.needsUpdate=true; brain.geometry.computeVertexNormals(); }
brain.position.set(0,5.55,0.03); brain.scale.set(1,0.92,1.05);
addBody('nervous',brain,'brain','Brain (cerebrum)','The brain is the sole site of the glymphatic and ventricular systems; its cortical surface is where they meet meningeal lymphatics, cortical vessels and neurons, the convergence sampled in the callout.','');
addBody('nervous',new T.Mesh(tube([[0,5.0,0],[0,4.2,-0.05],[0,3.2,-0.05],[0,2.5,0]],0.07),MAT.nerveAxon),'nerveAxon','Spinal cord','Central axons in the vertebral canal; their perivascular spaces continue the glymphatic route into the cord.','');
[[[-0.2,4.7,0],[-0.9,3.9,0.1],[-1.15,2.9,0]],[[0.2,4.7,0],[0.9,3.9,0.1],[1.15,2.9,0]],
 [[-0.15,2.7,0],[-0.4,1.5,0],[-0.45,0.35,0]],[[0.15,2.7,0],[0.4,1.5,0],[0.45,0.35,0]]].forEach(pp=>
  addBody('nervous',new T.Mesh(tube(pp,0.03),MAT.nerveAxon),'nerveAxon','Peripheral nerve','Nerves branch to every tissue, their endings immersed in interstitial fluid.',''));

// --- Circulatory ---
{ const h=new T.Mesh(new T.SphereGeometry(0.3,18,16),MAT.bloodWall); h.scale.set(1,1.2,0.8); h.position.set(-0.14,3.95,0.28);
  addBody('circulatory',h,'bloodWall','Heart','The pump generating the pressure that filters plasma across capillary walls into the interstitium.',''); }
addBody('circulatory',new T.Mesh(tube([[-0.14,3.95,0.25],[0,4.55,0.12],[0,5.05,0.02]],0.055),MAT.arteriole),'arteriole','Carotid / cerebral artery','Feeds the brain; its pulsation powers the glymphatic pump.','Iliff et al. 2012 [14]');
addBody('circulatory',new T.Mesh(tube([[-0.14,3.9,0.2],[-0.1,3.2,0.1],[-0.1,2.5,0.05]],0.07),MAT.arteriole),'arteriole','Aorta','The main arterial trunk.','');
[[[-0.15,4.2,0.15],[-0.9,3.9,0.1],[-1.15,2.95,0]],[[0.05,4.2,0.15],[0.9,3.9,0.1],[1.15,2.95,0]],
 [[-0.1,2.6,0.05],[-0.4,1.5,0],[-0.45,0.4,0]],[[0.05,2.6,0.05],[0.4,1.5,0],[0.45,0.4,0]]].forEach(pp=>
  addBody('circulatory',new T.Mesh(tube(pp,0.035),MAT.arteriole),'arteriole','Artery','',''));
addBody('circulatory',new T.Mesh(tube([[0.06,5.05,-0.08],[0.05,4.3,-0.05],[-0.05,3.98,0.12]],0.05),MAT.venous),'venous','Jugular / cerebral vein','Drains blood, and, via para-venous routes, glymphatic efflux from the brain.','Iliff et al. 2012 [14]');

// --- Lymphatic ---
function nodeCluster(cx,cy,cz,n,label){ for(let i=0;i<n;i++){ const m=new T.Mesh(new T.SphereGeometry(0.055+rng()*0.03,12,10),MAT.lymphWall);
  m.position.set(cx+(rng()-0.5)*0.26,cy+(rng()-0.5)*0.26,cz+(rng()-0.5)*0.16);
  addBody('lymphatic',m,'lymphWall',label,'Lymph nodes filter lymph and mount immune responses, interstitial fluid, once drained, arrives here as lymph.',''); } }
nodeCluster(-0.35,4.75,0.12,4,'Cervical nodes'); nodeCluster(0.35,4.75,0.12,4,'Cervical nodes');
nodeCluster(-1.0,4.15,0,4,'Axillary nodes'); nodeCluster(1.0,4.15,0,4,'Axillary nodes');
nodeCluster(0,3.85,0.16,3,'Mediastinal nodes');
nodeCluster(-0.42,2.3,0.12,4,'Inguinal nodes'); nodeCluster(0.42,2.3,0.12,4,'Inguinal nodes');
addBody('lymphatic',new T.Mesh(tube([[0,2.85,-0.1],[-0.15,3.4,-0.05],[-0.3,4.2,0],[-0.35,4.75,0.05]],0.045),MAT.lymphWall),'lymphWall','Thoracic duct','The main lymphatic trunk, returning lymph to the venous circulation at the left neck.','');
addBody('lymphatic',new T.Mesh(tube([[-0.32,5.85,0.05],[0,6.02,0.12],[0.32,5.85,0.05]],0.02),MAT.lymphFil),'lymphFil','Meningeal lymphatics','Lymphatic vessels in the dura drain CSF and brain interstitial fluid, the link joining the glymphatic and lymphatic systems.','Louveau et al. 2015 [15]');
// peripheral collecting lymphatics tracing the limbs & trunk into the regional nodes
[[[-1.15,2.95,0.05],[-1.05,3.5,0.03],[-1.0,4.1,0.0]],
 [[1.15,2.95,0.05],[1.05,3.5,0.03],[1.0,4.1,0.0]],
 [[-0.45,0.5,0.05],[-0.44,1.4,0.05],[-0.42,2.25,0.1]],
 [[0.45,0.5,0.05],[0.44,1.4,0.05],[0.42,2.25,0.1]],
 [[-1.0,4.15,0],[-0.6,4.55,0.05],[-0.35,4.78,0.05]],
 [[-0.42,2.3,0.1],[-0.28,2.9,0],[0,2.85,-0.05]]].forEach(pp=>
  addBody('lymphatic',new T.Mesh(tube(pp,0.013),MAT.lymphFil),'lymphFil','Lymphatic vessel','Collecting lymphatics thread through the limbs and trunk, carrying lymph from tissue beds to the regional nodes and on to the thoracic duct.',''));
// smaller peripheral node chains, regional detail
nodeCluster(-1.05,3.5,0.03,2,'Brachial nodes'); nodeCluster(1.05,3.5,0.03,2,'Brachial nodes');
nodeCluster(-0.44,1.35,0.05,3,'Popliteal nodes'); nodeCluster(0.44,1.35,0.05,3,'Popliteal nodes');
nodeCluster(0,3.35,0.04,3,'Para-aortic nodes');

// --- Glymphatic (brain) ---
addBody('glymphatic',new T.Mesh(tube([[-0.14,3.95,0.25],[0,4.55,0.12],[0,5.05,0.02]],0.1),MAT.glymph),'glymph','Peri-arterial (glymphatic) sheath','CSF tracks inward along cerebral arteries, glymphatic influx, shown at brain scale around the feeding artery.','Iliff et al. 2012 [14]');

// --- Ventricular (brain) ---
[[-0.13,5.62,0.02,0.16,0.24,0.11],[0.13,5.62,0.02,0.16,0.24,0.11],[0,5.4,0.08,0.1,0.2,0.09]].forEach(v=>{
  const m=new T.Mesh(new T.SphereGeometry(1,14,12),MAT.csf); m.scale.set(v[3],v[4],v[5]); m.position.set(v[0],v[1],v[2]);
  addBody('ventricular',m,'csf','Ventricle (CSF)','CSF-filled cavities; ventricular CSF exchanges with brain interstitial fluid through the glymphatic route.',''); });

// --- Interstitium-rich organs (Benias 2018 sampled dermis, gut & bladder submucosa, lung, fascia) ---
function organ(g,x,y,z,s,rot,name,detail){ const m=new T.Mesh(g,MAT.organ); m.position.set(x,y,z);
  if(s)m.scale.set(s[0],s[1],s[2]); if(rot)m.rotation.set(rot[0],rot[1],rot[2]);
  addBody('core',m,'organ',name,detail,'Benias et al. 2018 [32]'); return m; }
organ(new T.SphereGeometry(0.3,18,16),-0.44,4.05,0.02,[0.85,1.5,0.8],null,'Lung (L)','Pulmonary interstitium, the connective space wrapping alveoli and vessels; a classic site of interstitial fluid build-up and fibrosis.');
organ(new T.SphereGeometry(0.3,18,16), 0.44,4.05,0.02,[0.85,1.5,0.8],null,'Lung (R)','Pulmonary interstitium around the alveolar-capillary units.');
organ(new T.SphereGeometry(0.34,18,16),0.28,3.18,0.15,[1.35,0.85,0.9],null,'Liver','Hepatic interstitium (spaces of Disse), a large, dynamic fluid compartment feeding hepatic lymph.');
organ(new T.TorusKnotGeometry(0.2,0.085,72,8),0,2.82,0.17,[1,0.75,0.6],[0.35,0,0],'Intestine','Gut submucosa, one of the first tissues where Benias et al. identified the fluid-filled interstitial spaces.');
organ(new T.SphereGeometry(0.15,16,14),-0.33,3.02,-0.06,[0.8,1.35,0.8],[0,0,0.28],'Kidney (L)','Renal interstitium, its hydration governs urinary concentration; the urinary tract was a Benias sampling site.');
organ(new T.SphereGeometry(0.15,16,14), 0.33,3.02,-0.06,[0.8,1.35,0.8],[0,0,-0.28],'Kidney (R)','Renal interstitium of the urinary tract.');
organ(new T.SphereGeometry(0.16,16,14),0,2.4,0.16,null,null,'Bladder','Bladder submucosa, another tissue where the interstitial spaces were directly observed.');
organ(new T.SphereGeometry(0.15,16,14),0.52,3.22,-0.02,[0.8,1.1,0.7],null,'Spleen','Splenic interstitium and red-pulp spaces, rich in immune cells and lymph.');
// organ vasculature & mesenteric lymphatics, added body detail
addBody('circulatory',new T.Mesh(tube([[-0.1,3.4,0.12],[0.15,3.2,0.15],[0.3,3.15,0.14]],0.024),MAT.arteriole),'arteriole','Hepatic / splanchnic artery','Feeds the gut and liver, beds with a large, active interstitial fluid turnover.','');
addBody('circulatory',new T.Mesh(tube([[-0.1,3.2,0.05],[-0.3,3.05,-0.04],[-0.34,3.0,-0.05]],0.02),MAT.arteriole),'arteriole','Renal artery','Perfuses the kidney.','');
nodeCluster(0,2.72,0.22,4,'Mesenteric nodes');
addBody('lymphatic',new T.Mesh(tube([[0,2.8,0.18],[-0.08,3.15,0.05],[-0.2,3.7,0]],0.015),MAT.lymphFil),'lymphFil','Intestinal (lacteal) lymphatics','Lacteals drain the gut interstitium, one of the largest lymphatic beds in the body.','');
// body-scale hydration: the interstitium-bearing soft tissues swell / shrink
{ const Cb=V(0,3.3,0);
  registerHydro(h=>{ const s=0.965+h*0.075; bodyG.core.scale.setScalar(s); bodyG.core.position.copy(Cb).multiplyScalar(1-s); }); }

/* --- place the two scales: body figure + magnified callout --- */
BODY.position.set(-0.6,0,0);
MICRO.scale.setScalar(0.55);
MICRO.position.set(3.3,4.25,0);          // block center ~ head height, to the right

/* --- callout guide: sampling pin on the cortex + fan lines to the inset --- */
const GUIDE=new T.Group(); GUIDE.name='callout'; model.add(GUIDE);
const guideMat=new T.MeshBasicMaterial({ color:0x8a8375, transparent:true, opacity:0.55 }); guideMat.name='guide';
function guide(mesh,name,detail){ mesh.userData={type:null,name,system:'sampling site',detail,cite:''}; GUIDE.add(mesh); return mesh; }
const pin=V(-0.2,5.95,0.42);
const ring=new T.Mesh(new T.TorusGeometry(0.16,0.028,12,26),guideMat); ring.position.copy(pin); ring.lookAt(pin.clone().add(V(0.4,0.25,1)));
guide(ring,'Sampling site, cortical / meningeal boundary','The microstructural callout is drawn from here: the cortical surface and its meninges, the one region where interstitium, blood vessels, meningeal lymphatics, glymphatic peri-vascular spaces, ventricular CSF and neurons all meet.');
guide(new T.Mesh(new T.SphereGeometry(0.05,12,10),guideMat),'Sampling site','');
GUIDE.children[1].position.copy(pin);
guide(new T.Mesh(tube([[pin.x,pin.y,pin.z],[1.0,6.3,0.2],[1.95,6.2,0.08]],0.012,8),guideMat),'Zoom guide','This inset is a ~micrometre-scale sample magnified ~×20,000 from the sampling site.');
guide(new T.Mesh(tube([[pin.x,pin.y,pin.z],[1.0,4.5,0.2],[1.95,4.35,0.08]],0.012,8),guideMat),'Zoom guide','This inset is a ~micrometre-scale sample magnified from the sampling site.');

/* ================================================================== *
 *  ANIMATION FLOWS, fluid / cell motion along the vessels & spaces    *
 * ================================================================== */
// circulatory, erythrocytes streaming through capillary then venule
makeFlow('circulatory','micro',[V(-HALF-0.3,1.0,-0.7),V(-1,1.15,-0.4),V(0,0.95,-0.9),V(1,1.1,-0.5),V(HALF+0.3,0.95,-0.8)],
  {count:9,r:0.06,scaleY:0.42,mat:'rbc',name:'Blood flow',detail:'Erythrocytes streaming through the capillary lumen, the flow that drives Starling filtration into the interstitium.',speed:0.07,hydroSens:0.6});
makeFlow('circulatory','micro',[V(HALF+0.3,0.95,-0.8),V(1.8,0.7,0.2),V(1.6,0.5,1.4),V(1.9,0.6,2.2)],
  {count:5,r:0.05,scaleY:0.5,mat:'rbc',name:'Venular flow',detail:'Blood and leukocytes returning to the circulation through the leaky post-capillary venule.',speed:0.05,hydroSens:0.7});
// lymphatic, one-way uptake becoming lymph, toward the nodes
makeFlow('lymphatic','micro',[V(0.9,1.7,HALF+0.3),V(0.7,1.9,0.6),V(0.9,1.75,-0.4),V(1.1,2.0,-1.4),V(1.3,2.4,-2.0),V(1.5,2.9,-2.4)],
  {count:7,r:0.05,mat:'lymphFluid',name:'Lymph flow',detail:'Interstitial fluid drawn in through button junctions becomes lymph and moves strictly one-way toward the nodes; uptake rises with hydration and edema.',speed:0.045,hydroSens:0.7,cite:'Baluk et al. 2007'});
// core, bulk interstitial drift toward the initial lymphatic
makeFlow('core','micro',[V(-1.2,1.4,1.6),V(-0.2,1.6,1.4),V(0.5,1.7,1.0),V(0.9,1.75,0.4)],
  {count:8,r:0.03,mat:'fluid',name:'Interstitial drift',detail:'Bulk interstitial fluid drifts slowly through the gel toward the initial lymphatics, the pre-lymphatic flow Benias described; it quickens markedly with hydration.',speed:0.035,jitter:true,hydroSens:1.5,cite:'Benias et al. 2018 [32]'});
// nervous, action-potential blips racing along the axon
makeFlow('nervous','micro',[V(-HALF-0.3,2.5,0.8),V(-0.8,2.65,0.5),V(0.4,2.45,0.9),V(HALF+0.3,2.6,0.6)],
  {count:3,r:0.05,mat:'nerveAxon',name:'Action potential',detail:'A depolarisation wave races along the axon; endings report interstitial pressure, pH and mediators back to the CNS. Its conduction depends on the ionic state of the peri-neural interstitial space.',speed:0.3,hydroSens:0.5});
// glymphatic clearance cycle, CSF influx (peri-arterial) + waste efflux (para-venous)
makeFlow('glymphatic','micro',[V(-1.4,-0.2,-1.0),V(-1.3,1.0,-1.05),V(-1.45,2.2,-0.95),V(-1.35,TOP+0.2,-1.0)],
  {count:8,r:0.045,mat:'glymph',name:'CSF influx',detail:'CSF is driven inward along the peri-arterial space by arterial pulsation, the influx limb of the glymphatic clearance cycle.',speed:0.05,hydroSens:1.2,cite:'Iliff et al. 2012 [14]'});
makeFlow('glymphatic','micro',[V(-0.55,TOP+0.2,0.5),V(-0.65,2.3,0.45),V(-0.5,1.1,0.5),V(-0.6,-0.2,0.4)],
  {count:7,r:0.045,mat:'amyloid',name:'Waste efflux',detail:'Solute and amyloid-β wash out along the para-venous route, the clearance limb; impaired efflux is linked to neurodegeneration.',speed:0.045,hydroSens:1.2,cite:'Iliff et al. 2012 [14]'});
// ventricular, CSF propelled along the ciliated channel
makeFlow('ventricular','micro',[V(1.5,-0.2,1.2),V(1.4,1.1,1.25),V(1.55,2.3,1.15),V(1.45,TOP+0.2,1.2)],
  {count:8,r:0.04,mat:'csf',name:'CSF flow',detail:'Ciliary beating and arterial pulsation propel CSF along the ventricular channel.',speed:0.055,hydroSens:1.0});
// body scale, arterial, cerebral, and thoracic-duct flow
makeFlow('circulatory','body',[[-0.14,3.9,0.2],[-0.1,3.2,0.1],[-0.1,2.5,0.05]],{count:4,r:0.03,scaleY:0.6,mat:'rbc',name:'Arterial flow',detail:'Blood driven from the heart down the aorta.',speed:0.08,hydroSens:0.5});
makeFlow('circulatory','body',[[-0.14,3.95,0.25],[0,4.55,0.12],[0,5.05,0.02]],{count:3,r:0.026,scaleY:0.6,mat:'rbc',name:'Cerebral flow',detail:'Blood to the brain; its pulsation powers glymphatic influx.',speed:0.07,hydroSens:0.5,cite:'Iliff et al. 2012 [14]'});
makeFlow('lymphatic','body',[[0,2.85,-0.1],[-0.15,3.4,-0.05],[-0.3,4.2,0],[-0.35,4.75,0.05]],{count:5,r:0.022,mat:'lymphFluid',name:'Thoracic-duct flow',detail:'Lymph ascends the thoracic duct to rejoin venous blood at the left neck.',speed:0.04,hydroSens:0.7});

/* --- interstitial interfaces: the shared fluid medium cuffing every system --- */
[['circulatory',V(0,0.98,-0.85),'peri-capillary','bathes the capillary wall, where Starling filtration and reabsorption cross into the matrix, its width sets the diffusion distance for oxygen and solutes'],
 ['circulatory',V(1.72,0.6,1.32),'peri-venular','surrounds the leaky venule where fluid and leukocytes re-enter the tissue'],
 ['lymphatic',V(0.95,1.8,-0.5),'peri-lymphatic','feeds the initial lymphatic, its hydration sets lymph uptake and thus whole-body fluid balance'],
 ['nervous',V(0.05,2.55,0.7),'peri-neural','buffers the ions that make the axon excitable, collapse or swelling here risks conduction failure and axonal injury'],
 ['glymphatic',V(-1.4,1.1,-1.0),'peri-arterial','is the glymphatic influx route, clearance of amyloid depends on this space staying open'],
 ['ventricular',V(1.5,1.15,1.2),'peri-ependymal','couples ventricular CSF to brain interstitial fluid']
].forEach(([sys,pos,nm,det])=>{
  const m=new T.Mesh(new T.SphereGeometry(0.42,18,14),MAT.fluid); m.position.copy(pos);
  add('core',m,'fluid','Interstitial interface, '+nm,'A cuff of shared interstitial fluid that '+det+'. It is the most hydration-sensitive compartment in the body: a small water shift changes its width, matrix density and even protein conformation, and because it wraps every system, that single change propagates outward to all of them.','Benias et al. 2018 [32]');
  registerHydro(h=>{ const s=0.55+h*0.95; m.scale.set(s,s*0.8,s); });
});
// extra load-bearing lattice + gel, emphasising the pervasive matrix
for(let i=0;i<14;i++){ const a=V((rng()-0.5)*3.2,0.6+rng()*2.2,(rng()-0.5)*3.2), b=a.clone().add(rv(0.9));
  add('core',new T.Mesh(wavy(a,b,0.012+rng()*0.014,0.4,6,6),MAT.collagen),'collagen','Collagen I (lattice)','Additional tensioned type-I bundles, the interstitium’s load-bearing web threading between every system.',''); }
for(let i=0;i<24;i++){ const m=new T.Mesh(new T.SphereGeometry(0.02+rng()*0.03,7,6),MAT.gag);
  m.position.copy(V((rng()-0.5)*3.4,0.6+rng()*2.2,(rng()-0.5)*3.4)); add('core',m,'gag','Hyaluronan gel','Space-filling hydrated gel, it binds the water whose shifts drive the whole model.',''); }

/* --- hydration stress markers: constriction (dry) & congestion (wet) --- */
makeWarn('core',       V(0.15,1.7,0.15),  'dry', 0.6, 1.6, 'Interstitium');
makeWarn('core',       V(-0.7,1.45,0.95), 'wet', 0.6, 1.6, 'Interstitium');
makeWarn('lymphatic',  V(1.0,1.9,-0.55),  'dry', 10,  0.7, 'Lymphatic');
makeWarn('glymphatic', V(-1.4,1.15,-1.0), 'dry', 22,  1.2, 'Glymphatic');
makeWarn('ventricular',V(1.5,1.2,1.2),    'dry', 300, 1.0, 'Ventricular CSF');
makeWarn('circulatory',V(1.75,0.6,1.4),   'wet', 1500,0.6, 'Circulatory');
makeWarn('circulatory',V(0.0,1.0,-0.9),   'wet', 800, 0.6, 'Circulatory');
makeWarn('nervous',    V(-0.35,2.55,0.78),'dry', 12000000, 0.9, 'Nervous', true);
makeWarn('nervous',    V(0.45,2.5,0.62),  'wet', 12000000, 0.9, 'Nervous', true);

/* ================================================================== */
stage.setObject(model);
stage._controls.autoRotate=false;
model.updateMatrixWorld(true);
const cam=stage._camera, controls=stage._controls;
function frameBox(obj,mult){ obj.updateWorldMatrix(true,true);
  const box=new T.Box3().setFromObject(obj); const sph=box.getBoundingSphere(new T.Sphere());
  const dist=(sph.radius/Math.tan(cam.fov*Math.PI/360))*(mult||1.4);
  const dir=V(0.18,0.09,1).normalize();
  return { pos:sph.center.clone().add(dir.multiplyScalar(dist)), tgt:sph.center.clone() }; }
const HOME=frameBox(model,1.3);
cam.position.copy(HOME.pos); controls.target.copy(HOME.tgt); controls.update();
let tween=null;
function tweenTo(f,ms){ tween={ fp:cam.position.clone(),tp:f.pos.clone(),ft:controls.target.clone(),tt:f.tgt.clone(),t0:performance.now(),ms:ms||1000 }; }
(function anim(){ const nowSec=performance.now()*0.001;
  if(tween){ const k=Math.min(1,(performance.now()-tween.t0)/tween.ms); const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  cam.position.lerpVectors(tween.fp,tween.tp,e); controls.target.lerpVectors(tween.ft,tween.tt,e); if(k>=1)tween=null; }
  updateFlows(nowSec);
  requestAnimationFrame(anim); })();
const VIEWS={ both:()=>HOME, body:()=>frameBox(BODY,1.4), micro:()=>frameBox(MICRO,1.45) };
function goView(name){ tweenTo(VIEWS[name]()); }

/* gather lights for per-palette tuning */
const lights={ hemi:null, key:stage._key };
stage._scene.traverse(o=>{ if(o.isHemisphereLight) lights.hemi=o; });

function applyPalette(mode){
  Object.keys(MAT).forEach(type=>{
    const m=MAT[type], c=paletteColor(type,mode);
    m.color.copy(c);
    const glow = type==='fluid' ? 0 : 1;
    if(mode==='neon'){ m.emissive=c.clone().multiplyScalar(0.5*glow); m.roughness=0.45; }
    else if(mode==='bright'){ m.emissive=c.clone().multiplyScalar(0.05*glow); m.roughness=0.6; }
    else { m.emissive=new T.Color(0,0,0); m.roughness=0.82; }   // textbook = matte
    m.needsUpdate=true;
  });
  FLOWMATS.forEach(m=>{ const c=paletteColor(m._flowType,mode); m.color.copy(c);
    if(mode==='neon'){ m.emissive=c.clone().multiplyScalar(0.65); m.roughness=0.4; }
    else if(mode==='bright'){ m.emissive=c.clone().multiplyScalar(0.14); m.roughness=0.5; }
    else { m.emissive=c.clone().multiplyScalar(0.06); m.roughness=0.7; }   // faint glow so flow reads on paper
    m.needsUpdate=true; });
  // lighting: flat & even for textbook, punchier for the dark palettes
  if(lights.hemi){
    if(mode==='muted'){ lights.hemi.intensity=1.55; lights.key.intensity=1.35; }
    else if(mode==='bright'){ lights.hemi.intensity=0.95; lights.key.intensity=2.2; }
    else { lights.hemi.intensity=0.55; lights.key.intensity=1.3; }
  }
  if(stage._ground) stage._ground.material.opacity = mode==='muted' ? 0.16 : 0.05;
  stage.style.setProperty('--stage-bg', BG[mode]);
}
const DEFPAL = (typeof window!=='undefined' && window.__MOBILE__) ? 'bright' : 'muted';
applyPalette(DEFPAL);                                   // confocal on mobile, textbook on desktop

/* ================================================================== *
 *  UI                                                                 *
 * ================================================================== */
const SYS=[
  {key:'core',nm:'Interstitium',color:BASE.collagen},
  {key:'circulatory',nm:'Circulatory',color:BASE.bloodWall},
  {key:'lymphatic',nm:'Lymphatic',color:BASE.lymphWall},
  {key:'nervous',nm:'Nervous',color:BASE.nerveAxon},
  {key:'glymphatic',nm:'Glymphatic',color:BASE.glymph},
  {key:'ventricular',nm:'Ventricular',color:BASE.csf}
];
const LEGEND=[
  {h:'Interstitial matrix',items:[
    ['collagen','Collagen I bundle','type-I tension lattice'],
    ['collagen3','Collagen III','fine reticular web'],
    ['elastin','Elastin fiber','elastic recoil'],
    ['fluid','Interstitial fluid','pre-lymphatic space'],
    ['gag','Hyaluronan / GAG','hydrated gel']
  ]},
  {h:'Interstitial cells',items:[
    ['fibroblast','Fibroblast','CD34+ lining cell'],
    ['macrophage','Macrophage','resident phagocyte'],
    ['mast','Mast cell','histamine granules'],
    ['dendritic','Dendritic cell','antigen sentinel'],
    ['tcell','T-lymphocyte','trafficking immune cell']
  ]},
  {h:'Circulatory',items:[
    ['bloodWall','Endothelium','+ basement membrane'],
    ['bloodLumen','Lumen / plasma','filtration source'],
    ['rbc','Erythrocyte','luminal'],
    ['pericyte','Pericyte','mural / contractile'],
    ['venous','Venule','leaky, diapedesis']
  ]},
  {h:'Lymphatic',items:[
    ['lymphWall','Lymphatic endothelium','button junctions'],
    ['lymphFluid','Lymph','one-way fluid'],
    ['lymphFil','Anchoring filament','opens junctions']
  ]},
  {h:'Nervous',items:[
    ['nerveAxon','Axon','sensory / autonomic'],
    ['myelin','Myelin sheath','saltatory conduction'],
    ['schwann','Schwann cell','myelin / Remak']
  ]},
  {h:'Glymphatic',items:[
    ['glymph','Peri-arterial space','AQP4-bounded'],
    ['astrocyte','Astrocyte end-foot','aquaporin-4'],
    ['arteriole','Arteriole','pulsation pump'],
    ['amyloid','Amyloid-β / solute','cleared waste']
  ]},
  {h:'Ventricular',items:[
    ['csf','CSF','ventricular fluid'],
    ['ependyma','Ependymal cell','ciliated lining'],
    ['cilia','Cilium','CSF propulsion']
  ]}
];

const sysList=document.getElementById('sysList');
SYS.forEach(s=>{
  const b=document.createElement('button'); b.className='sys'; b.dataset.key=s.key;
  b.innerHTML=`<span class="dot" style="background:${s.color};color:${s.color}"></span><span class="nm">${s.nm}</span><span class="tick">on</span>`;
  b.onclick=()=>{ const on=!G[s.key].visible; G[s.key].visible=on; b.classList.toggle('off',!on);
    b.querySelector('.tick').textContent=on?'on':'off'; };
  sysList.appendChild(b);
});
const legList=document.getElementById('legList');
LEGEND.forEach(g=>{ const d=document.createElement('div'); d.className='grp';
  d.innerHTML=`<p class="gh">${g.h}</p>`+g.items.map(([t,nm,sub])=>
    `<div class="row"><span class="sw" style="background:${BASE[t]}"></span><span class="lb">${nm}<small>${sub}</small></span></div>`).join('');
  legList.appendChild(d); });

document.querySelectorAll('.pal[data-pal]').forEach(b=>{
  b.classList.toggle('on', b.dataset.pal===DEFPAL);     // reflect the active palette from first paint
  b.onclick=()=>{ document.querySelectorAll('.pal[data-pal]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); applyPalette(b.dataset.pal); };
});
document.querySelectorAll('.pal[data-ts]').forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll('.pal[data-ts]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); setTimeScale(+b.dataset.ts); };
});
document.querySelectorAll('.pal[data-hy]').forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll('.pal[data-hy]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); setHydration(+b.dataset.hy); };
});
document.querySelectorAll('.pal[data-view]').forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll('.pal[data-view]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); goView(b.dataset.view); };
});
document.getElementById('resetBtn').onclick=()=>document.querySelector('.pal[data-view="both"]').click();
document.getElementById('allBtn').onclick=()=>{
  SYS.forEach(s=>{ G[s.key].visible=true; });
  document.querySelectorAll('.sys').forEach(b=>{ b.classList.remove('off'); b.querySelector('.tick').textContent='on'; });
};
const flowBtn=document.getElementById('flowBtn');
flowBtn.classList.add('on');
flowBtn.onclick=()=>{ const on=!flowOn; setFlow(on);
  flowBtn.textContent=on?'◍  Flow, on':'◌  Flow, off'; flowBtn.classList.toggle('on',on); flowBtn.setAttribute('aria-pressed',String(on)); };

/* raycast: hover + click */
const ray=new T.Raycaster(), ndc=new T.Vector2();
const tip=document.getElementById('tip'), info=document.getElementById('info');
function visible(o){ while(o){ if(o.visible===false) return false; o=o.parent; } return true; }
function pick(e){
  const r=stage.getBoundingClientRect();
  ndc.x=((e.clientX-r.left)/r.width)*2-1; ndc.y=-((e.clientY-r.top)/r.height)*2+1;
  ray.setFromCamera(ndc,stage._camera);
  for(const h of ray.intersectObject(model,true)){ if(h.object.userData&&h.object.userData.name&&visible(h.object)) return h.object; }
  return null;
}
stage.addEventListener('pointermove',e=>{
  if(window.__NOHOVER__) return;           // touch devices use tap-select instead
  const o=pick(e);
  if(o){ tip.querySelector('.ts').textContent=o.userData.system;
    tip.querySelector('.tt').textContent=o.userData.name;
    const rf=rateFor(o.userData), tr=tip.querySelector('.tr');
    if(rf){ const pct=pctOfNormal(rf.hs);
      tr.textContent='◍ '+fmtRate(liveRate(rf.base,rf.hs))+'  ·  '+Math.round(pct)+'% of normal';
      tr.className='tr '+(pct<92?'dn':pct>112?'up':'ok'); tr.style.display='block'; }
    else tr.style.display='none';
    tip.style.left=e.clientX+'px'; tip.style.top=e.clientY+'px'; tip.style.opacity='1'; stage.style.cursor='pointer'; }
  else { tip.style.opacity='0'; stage.style.cursor='grab'; }
});
stage.addEventListener('pointerleave',()=>{ tip.style.opacity='0'; });
let downXY=null;
stage.addEventListener('pointerdown',e=>{ downXY=[e.clientX,e.clientY]; });
stage.addEventListener('pointerup',e=>{
  if(!downXY) return; const moved=Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1]); downXY=null;
  if(moved>5) return;
  const o=pick(e);
  if(o){ const u=o.userData; const col=u._color||BASE[u.type]||'#8a8375';
    info.querySelector('.sw').style.background=col; info.querySelector('.sw').style.color=col;
    info.querySelector('h3').textContent=u.name; info.querySelector('.sy').textContent=u.system;
    info.querySelector('p').textContent=u.detail;
    const mk=info.querySelector('.markers'); if(mk){ if(u._markers){ mk.innerHTML=u._markers; mk.style.display='block'; } else mk.style.display='none'; }
    const rf=rateFor(u), mEl=info.querySelector('.metric');
    if(rf){ const pct=pctOfNormal(rf.hs), norm=rf.base*(1+rf.hs*(HF_NORM-1));
      mEl.innerHTML='Flow rate&nbsp; <b>'+fmtRate(liveRate(rf.base,rf.hs))+'</b> &nbsp;·&nbsp; '+Math.round(pct)+'% of normal &nbsp;·&nbsp; baseline '+fmtRate(norm);
      mEl.className='metric '+(pct<92?'dn':pct>112?'up':'ok'); mEl.style.display='block'; }
    else mEl.style.display='none';
    info.querySelector('.cite').textContent=u.cite?('Source · '+u.cite):'';
    info.classList.add('show'); }
  else info.classList.remove('show');
});
document.getElementById('infoX').onclick=()=>info.classList.remove('show');

document.getElementById('loading').classList.add('gone');

/* ==================================================================== *
 *  COMPANION-TO-MANUSCRIPT LAYER                                        *
 *  Iturralde (2026) "Comprehensive Interstitial Cell Atlas"            *
 *, 13 stromal/interstitial populations as a toggleable overlay,      *
 *    6 condition scenarios, and a figure-export pipeline.              *
 * ==================================================================== */

/* ---- lineage categories (paper's 5-colour legend strip) ---- */
const LIN={
  stromal:{c:'#e0509a',label:'Fibroblast / stromal'},
  mural:{c:'#c77aa0',label:'Vascular mural'},
  immune:{c:'#ef8a3d',label:'Immune'},
  pace:{c:'#b7c94a',label:'Pacemaker & telocyte'},
  lymphcsf:{c:'#28c2b6',label:'Lymphatic / CSF'}
};

/* ---- the 13 populations (Tables 1 & 2), placed at representative sites ---- */
// body:[x,y,z] in organ coords (BODY-local); micro:[x,y,z] in micro block coords (MICRO-local, optional)
const POPS=[
  {n:1,name:'Fasciacytes',lin:'stromal',body:[-0.5,1.5,0.25],
   niche:'Deep fascia sublayers (limb, trunk).',
   purpose:'Secrete a hyaluronan-rich matrix that lets adjacent fascial sublayers glide.',
   pos:'S100A4, HAS2, VIM',neg:'CD68',ref:'Stecco et al. 2018 [5]'},
  {n:2,name:'Telocytes',lin:'pace',body:[0.28,2.9,0.5],disputed:true,
   niche:'Perivascular / subepithelial, most organs.',
   purpose:'Putative stromal signalling network via long telopode contacts.',
   pos:'CD34, PDGFRA, KIT/PDGFRB (organ-dependent)',neg:'none',ref:'Popescu & Faussone 2010 [3]',
   note:'Disputed: CD34/PDGFRA alone cannot separate them from adventitial fibroblasts in dissociated data.'},
  {n:3,name:'Adventitial fibroblasts',lin:'stromal',body:[-0.32,3.25,0.3],micro:[1.2,1.0,0.9],
   niche:'Vessel adventitia & organ capsules.',
   purpose:'Quiescent progenitor reservoir for specialized and injury-activated fibroblasts.',
   pos:'PI16, DPT, PDGFRA, CD34',neg:'low ACTA2, low PDGFRB',ref:'Buechler et al. 2021 [1]'},
  {n:4,name:'Pericytes',lin:'mural',body:[0.25,3.7,0.45],micro:[-0.2,1.05,-0.75],
   niche:'Capillary / venule basement membrane, all vascular tissue.',
   purpose:'Stabilize and regulate the microvascular wall. NOTCH3 loss → CADASIL small-vessel disease.',
   pos:'PDGFRB, RGS5, CSPG4, NOTCH3, MCAM',neg:'PECAM1, PTPRC, CLDN5',ref:'Vanlandewijck et al. 2018 [7]'},
  {n:5,name:'Perivascular fibroblasts',lin:'stromal',body:[0.15,4.85,0.35],micro:[-1.4,1.55,-1.0],
   niche:'Cerebral Virchow-Robin perivascular spaces (vessels > capillary).',
   purpose:'Structural sheath lining the perivascular CSF-influx conduits of the glymphatic route.',
   pos:'COL1A1/3A1, DCN, LUM, ANPEP',neg:'RGS5',ref:'Vanlandewijck et al. 2018 [7]'},
  {n:6,name:'Fibroblastic reticular cells',lin:'stromal',body:[1.15,4.15,0.3],
   niche:'T-cell zones of lymph node & spleen.',
   purpose:'Channel antigen and guide T-cell trafficking through a self-ensheathed collagen conduit network.',
   pos:'PDPN, CCL19, CCL21A, IL7',neg:'PECAM1, PTPRC',ref:'Rodda et al. 2018 [8]'},
  {n:7,name:'Mesenchymal stem/stromal cells',lin:'stromal',body:[0.5,1.7,0.3],disputed:true,
   niche:'Bone-marrow perivascular niche (also fat, cord, dental pulp).',
   purpose:'Clonogenic progenitor with tri-lineage (bone/fat/cartilage) potential.',
   pos:'NT5E/CD73, THY1/CD90, ENG/CD105',neg:'PTPRC, CD34, CD14, CD19, HLA-DR',ref:'ISCT criteria, Dominici et al. 2006 [10]',
   note:'Disputed: in scRNA-seq they overlap adventitial/perivascular fibroblasts, niche-intrinsic vs culture-induced identity is unresolved.'},
  {n:8,name:'Interstitial macrophages',lin:'immune',body:[0.66,4.1,0.35],micro:[0.6,1.6,0.6],
   niche:'Non-epithelial compartment of nearly every organ.',
   purpose:'LYVE1-hi subset supports vessels & restrains fibrosis; LYVE1-lo, nerve-associated subset is antigen-presenting.',
   pos:'CSF1R, FCGR1, MERTK, LYVE1/MRC1',neg:'(subset-dependent)',ref:'Chakarov et al. 2019 [11]'},
  {n:9,name:'Interstitial cells of Cajal',lin:'pace',body:[-0.22,2.78,0.5],
   niche:'Myenteric & intramuscular GI plexuses.',
   purpose:'KIT-dependent pacemaker cells generating the gut slow-wave. Not to be confused with telocytes.',
   pos:'KIT/CD117, ANO1, ETV1',neg:'CD34 (most GI subtypes)',ref:'Huizinga et al. 1995 [4]'},
  {n:10,name:'Lymphatic stromal cells',lin:'lymphcsf',body:[0.55,4.78,0.35],
   niche:'Lymphatic vessel wall & lymph-node subcapsular sinus.',
   purpose:'Line lymphatics and drive lymphangiogenesis via VEGFC-FLT4 signalling; PROX1 is the discriminator.',
   pos:'PROX1, PDPN, LYVE1, FLT4',neg:'(shares PECAM1 with blood endothelium)',ref:'Wigle & Oliver 1999 [13]'},
  {n:11,name:'Glymphatic-associated stroma',lin:'lymphcsf',body:[-0.4,5.95,0.45],micro:[-1.4,1.75,-1.0],disputed:true,
   niche:'Perivascular CSF spaces; subarachnoid (disputed SLYM 4th layer).',
   purpose:'Implicated in CSF influx and clearance of interstitial solutes including amyloid-β.',
   pos:'COL1A1, ANPEP; SLYM: PDPN, PROX1, CRABP2',neg:'SLYM: LYVE1, FLT4, CLDN11, CDH1',ref:'Iliff 2012 [14]; SLYM, Møllgård et al. 2023 [17]',
   note:'Disputed: the SLYM phenotype lacks a lymphatic immunophenotype; rebuttals place the Prox1+ cells within the arachnoid barrier layer.'},
  {n:12,name:'Meningeal fibroblasts',lin:'stromal',body:[0.4,5.95,0.4],
   niche:'Dura, arachnoid and pia surrounding the CNS.',
   purpose:'Three molecularly distinct layers giving layer-specific structural and barrier support.',
   pos:'Dura: CRABP2, MGP · Arachnoid: ALDH1A2, CLDN11 · Pia: S100A6, NGFR',neg:'(layer-reciprocal)',ref:'DeSisto et al. 2020 [21]'},
  {n:13,name:'Organ-specific fibroblasts',lin:'stromal',body:[-0.4,3.9,0.5],
   niche:'Heart, lung, kidney, gut, skin, specializing a shared stromal template.',
   purpose:'Tissue-tailored ECM/signalling niches (e.g. the gut BMP-WNT crypt-to-villus gradient).',
   pos:'TCF21 · PDGFRA/WNT2 · FOXD1 · GREM1/RSPO3 · SFRP2/DPP4',neg:'(organ-reciprocal)',ref:'Skelly 2018 [22] … Rinkevich 2015 [31]'}
];
POPS.forEach(p=>{ p.color=LIN[p.lin].c; p.linLabel=LIN[p.lin].label; });

/* ---- pin sprites (numbered lineage discs) ---- */
const ATLAS=new T.Group(); ATLAS.name='cell_atlas'; ATLAS.visible=false; model.add(ATLAS);
function pinTexture(num,color,disputed){
  const c=document.createElement('canvas'); c.width=c.height=132; const x=c.getContext('2d');
  x.clearRect(0,0,132,132);
  x.beginPath(); x.arc(66,66,50,0,7); x.fillStyle=color; x.fill();
  x.lineWidth=9; x.strokeStyle='rgba(255,255,255,0.96)'; x.stroke();
  if(disputed){ x.setLineDash([12,9]); x.lineWidth=6; x.strokeStyle='#12151c';
    x.beginPath(); x.arc(66,66,50,0,7); x.stroke(); x.setLineDash([]); }
  x.fillStyle='#fff'; x.font='700 58px "IBM Plex Mono", monospace'; x.textAlign='center'; x.textBaseline='middle';
  x.fillText(String(num),66,72);
  const t=new T.CanvasTexture(c); t.anisotropy=4; return t;
}
const worldBody=([x,y,z])=>V(x-0.6,y,z);                                   // BODY.position=(-0.6,0,0)
const worldMicro=([x,y,z])=>V(3.3+x*0.55,4.25+y*0.55,z*0.55);              // MICRO offset+scale
function makePin(p, world, big){
  const spr=new T.Sprite(new T.SpriteMaterial({map:pinTexture(p.n,p.color,p.disputed),depthTest:false,transparent:true}));
  spr.position.copy(world); spr.scale.setScalar(big); spr.renderOrder=20;
  spr.userData={ name:(p.disputed?'⚠ ':'')+'⑬'.slice(0,0)+p.n+' · '+p.name, system:p.linLabel+(p.disputed?' · disputed':''),
    detail:p.niche+' '+p.purpose+(p.note?' '+p.note:''), cite:'Marker source · '+p.ref,
    _color:p.color, _atlas:p.n, _base:big,
    _markers:'<b style="color:#d7f7ea">'+p.pos+'</b>'+(p.neg&&p.neg!==', '?' &nbsp;·&nbsp; <span style="opacity:.7">neg</span> '+p.neg:'')+
      ' &nbsp;·&nbsp; <span style="opacity:.7">'+p.ref+'</span>'+(p.disputed?' &nbsp;·&nbsp; <span style="color:#ffcf8a">disputed identity</span>':'') };
  ATLAS.add(spr); return spr;
}
POPS.forEach(p=>{ p._pins=[]; if(p.body) p._pins.push(makePin(p,worldBody(p.body),0.32));
  if(p.micro) p._pins.push(makePin(p,worldMicro(p.micro),0.20)); });
function spotlightPops(set){   // set=array of n's to emphasize, or null = all equal
  POPS.forEach(p=>{ const on=!set||set.includes(p.n);
    p._pins.forEach(spr=>{ spr.material.opacity=on?1:0.16;
      spr.scale.setScalar(spr.userData._base*(set&&on?1.5:1)); }); });
}

/* ---- system visibility helper (keeps the .sys buttons in sync) ---- */
function setSystems(keys){
  SYS.forEach(s=>{ G[s.key].visible = !keys || keys.includes(s.key); });
  document.querySelectorAll('.sys').forEach(b=>{ const on=G[b.dataset.key].visible;
    b.classList.toggle('off',!on); const t=b.querySelector('.tick'); if(t)t.textContent=on?'on':'off'; });
}
function reflectHydration(v){ document.querySelectorAll('.pal[data-hy]').forEach(b=>
  b.classList.toggle('on', Math.abs((+b.dataset.hy)-v)<0.001)); }

/* ---- camera framing around an arbitrary world point ---- */
function frameAt(p, radius, dir){ const d=(radius/Math.tan(cam.fov*Math.PI/360))*1.4;
  return { pos:p.clone().add((dir||V(0.18,0.12,1)).clone().normalize().multiplyScalar(d)), tgt:p.clone() }; }

/* ---- figure caption state (also the on-screen scenario caption) ---- */
let FIG={ title:'The Human Interstitium, 3D Map', body:'Interactive companion to Iturralde (2026), “The cellular lining of a continuous fluid compartment”, submitted to Fluids and Barriers of the CNS.', refs:'' };
function setCaption(title,body,refs){
  FIG={title,body,refs:refs||''};
  const cap=document.getElementById('caption'); if(!cap) return;
  cap.querySelector('.ct').textContent=title;
  cap.querySelector('.cb').textContent=body;
  const cr=cap.querySelector('.cr'); cr.textContent=refs||''; cr.style.display=refs?'block':'none';
  cap.classList.add('show');
}
function closeCaption(){ const cap=document.getElementById('caption'); if(cap)cap.classList.remove('show'); }

/* ================================================================== *
 *  SCENARIOS, each stages systems + hydration + camera + spotlight   *
 * ================================================================== */
const SCEN=[
  {id:'homeostasis',label:'Homeostasis',
   apply(){ setSystems(null); atlasSet(false); applyHydro(0.55); setHydration(0.55); reflectHydration(0.55);
     tweenTo(HOME,900); setCaption('Homeostasis, normal reference',
       'All six systems at normal hydration (~0.55). Interstitial channels are open, glymphatic influx and lymph uptake run at baseline, and the peri-neural space holds the ionic buffer that keeps axons excitable. This is the reference state the other scenarios are read against.',
       'Benias et al. 2018 [32] · Iliff et al. 2012 [14]'); }},

  {id:'perineural',label:'Perineural collapse',
   apply(){ setSystems(['core','nervous']); atlasSet(true); spotlightPops([12,5]); applyHydro(0.0); setHydration(0.0); reflectHydration(0);
     tweenTo(frameAt(worldMicro([0.05,2.55,0.7]),2.0),1000);
     setCaption('Perineural space collapse → axonal environment failure',
       'Dehydration collapses the peri-neural interstitial cuff (⚠ ring). The narrow fluid film that buffers extracellular ions thins, ion gradients drift, and the axon’s micro-environment turns hostile, conduction block first, then structural axonal injury if sustained. Because the interstitium is physically continuous along perineural sheaths, a systemic water deficit is transmitted directly to the nerve.',
       'Continuity of interstitial spaces, Cenaj et al. 2021 [33] · Benias et al. 2018 [32]'); }},

  {id:'glymphatic',label:'Glymphatic failure',
   apply(){ setSystems(['core','glymphatic','circulatory']); atlasSet(true); spotlightPops([11,5]); applyHydro(0.08); setHydration(0.08); reflectHydration(NaN);
     tweenTo(frameAt(worldMicro([-1.4,1.1,-1.0]),1.9),1000);
     setCaption('Glymphatic clearance failure → amyloid-β accumulation',
       'When the peri-arterial (AQP4) space narrows, advective CSF influx falls and solute clearance drops. Biophysical modelling shows clearance of heavy aggregates falls off exponentially once flow crosses a modest Péclet threshold, so a small loss of perivascular flow leaves amyloid-β (grey solute) behind, the clearance deficit linked to neurodegeneration.',
       'Iliff et al. 2012 [14] · Péclet-threshold model, Mukherjee & Tithof 2022 [20]'); }},

  {id:'ischemic',label:'Ischemic / CADASIL',
   apply(){ setSystems(['core','circulatory']); atlasSet(true); spotlightPops([4]); applyHydro(0.12); setHydration(0.12); reflectHydration(NaN);
     tweenTo(frameAt(worldMicro([0.0,1.0,-0.85]),1.9),1000);
     setCaption('Ischemic small-vessel disease, pericyte failure (CADASIL)',
       'Pericytes (pin ④) stabilise and tune the microvascular wall through PDGFB-PDGFRB and NOTCH3 signalling. NOTCH3 mutations that disrupt this axis cause CADASIL, a hereditary small-vessel disease with progressive white-matter injury and stroke. Here the capillary bed is shown constricted: perfusion falls, Starling filtration that supplies interstitial fluid drops, and the shared matrix downstream is starved.',
       'Brain vascular atlas, Vanlandewijck et al. 2018 [7] · CADASIL / NOTCH3 (Glossary)'); }},

  {id:'edema',label:'Edema',
   apply(){ setSystems(null); atlasSet(false); applyHydro(1.0); setHydration(1.0); reflectHydration(1);
     tweenTo(HOME,900); setCaption('Over-hydration → congestion / edema',
       'Excess water over-fills the matrix (⚠ blue rings). The swollen gel widens the interstitial cuffs, compresses neighbouring vessels and nerves, and raises back-pressure, lymph uptake saturates while diffusion distances lengthen. The same shared compartment that transmits a deficit also transmits an excess to every system it wraps.',
       'Benias et al. 2018 [32]'); }},

  {id:'continuity',label:'Continuity',
   apply(){ setSystems(['core','nervous','circulatory']); atlasSet(true); spotlightPops([1,5,11]); applyHydro(0.55); setHydration(0.55); reflectHydration(0.55);
     tweenTo(frameBox(BODY,1.45),1000); setCaption('Interstitial continuity, skin → fascia → perineural → perivascular',
       'In-vivo confocal endomicroscopy and tracer studies show the fluid-filled interstitium is not organ-confined: it runs continuously from skin into subcutaneous fascia, along perineural and perivascular sheaths, and into the cerebral Virchow-Robin spaces, an estimated fluid volume exceeding the combined cardiovascular and lymphatic systems. Pins ①⑤⑪ mark stromal populations lining that one continuous compartment.',
       'Benias et al. 2018 [32] · Cenaj et al. 2021 [33]'); }}
];
function runScenario(id){ const s=SCEN.find(x=>x.id===id); if(s) s.apply(); }

/* ---- atlas master toggle ---- */
function atlasSet(on){ ATLAS.visible=on; if(!on) spotlightPops(null);
  const t=document.getElementById('atlasToggle'); if(t){ t.classList.toggle('on',on);
    t.textContent=on?'◉  Cell atlas, on':'◌  Cell atlas, off'; t.setAttribute('aria-pressed',String(on)); }
  const wrap=document.getElementById('atlas'); if(wrap) wrap.classList.toggle('atlas-on',on); }
function selectPop(n){ const p=POPS.find(x=>x.n===n); if(!p) return;
  atlasSet(true); spotlightPops([n]);
  const w=p.micro?worldMicro(p.micro):worldBody(p.body); tweenTo(frameAt(w, p.micro?1.4:2.4),900);
  // open the info card using the pin's baked userData
  const u=p._pins[0].userData, col=u._color;
  info.querySelector('.sw').style.background=col; info.querySelector('.sw').style.color=col;
  info.querySelector('h3').textContent=u.name; info.querySelector('.sy').textContent=u.system;
  info.querySelector('p').textContent=u.detail;
  const mk=info.querySelector('.markers'); if(mk){ mk.innerHTML=u._markers; mk.style.display='block'; }
  const mEl=info.querySelector('.metric'); if(mEl) mEl.style.display='none';
  info.querySelector('.cite').textContent=u.cite?('Source · '+u.cite):'';
  info.classList.add('show');
}

/* ================================================================== *
 *  FIGURE EXPORT, high-res PNG (+ caption band) and condition matrix  *
 * ================================================================== */
const PAL_BG={ muted:'#e7e0cf', bright:'#0b1120', neon:'#050308' };
let curPal=DEFPAL;
document.querySelectorAll('.pal[data-pal]').forEach(b=> b.addEventListener('click',()=>{ curPal=b.dataset.pal; }));
function figBG(){ return PAL_BG[curPal]||'#0b1120'; }
function inkFor(bg){ const c=new T.Color(bg); return (c.r*0.299+c.g*0.587+c.b*0.114)>0.55; }  // true = dark ink on light bg
function renderAt(W,H){
  const r=stage._renderer, scn=stage._scene; const old=new T.Vector2(); r.getSize(old);
  const oldPR=r.getPixelRatio(), oldA=cam.aspect;
  r.setPixelRatio(1); r.setSize(W,H,false); cam.aspect=W/H; cam.updateProjectionMatrix();
  r.render(scn,cam);
  const out=document.createElement('canvas'); out.width=W; out.height=H; const g=out.getContext('2d');
  g.fillStyle=figBG(); g.fillRect(0,0,W,H); g.drawImage(r.domElement,0,0,W,H);
  r.setPixelRatio(oldPR); r.setSize(old.x,old.y,false); cam.aspect=oldA; cam.updateProjectionMatrix();
  return out;
}
function wrapText(g,text,x,y,maxW,lh){ const words=text.split(' '); let line='',yy=y;
  for(const w of words){ const t=line?line+' '+w:w; if(g.measureText(t).width>maxW && line){ g.fillText(line,x,yy); line=w; yy+=lh; } else line=t; }
  if(line) g.fillText(line,x,yy); return yy; }
function captionBand(W, scale){
  const pad=Math.round(34*scale), dark=inkFor(figBG());
  const ink=dark?'#14304a':'#eef2f8', dim=dark?'rgba(20,40,60.72)':'rgba(238,242,248.72)', faint=dark?'rgba(20,40,60.5)':'rgba(238,242,248.5)';
  const bg=dark?'#f3eee1':'#0d1422';
  // measure
  const meas=document.createElement('canvas').getContext('2d');
  meas.font=`600 ${Math.round(26*scale)}px "Space Grotesk", sans-serif`;
  let bodyLines=1; { let line='',n=0; const words=FIG.body.split(' '); meas.font=`400 ${Math.round(20*scale)}px "Space Grotesk", sans-serif`;
    const maxW=W-pad*2; for(const w of words){ const t=line?line+' '+w:w; if(meas.measureText(t).width>maxW&&line){ n++; line=w;} else line=t; } bodyLines=n+1; }
  const lh=Math.round(28*scale);
  const H=pad + Math.round(34*scale) + Math.round(14*scale) + bodyLines*lh + (FIG.refs?Math.round(26*scale):0) + Math.round(30*scale) + pad;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.fillStyle=LIN.lymphcsf.c; g.fillRect(0,0,Math.round(6*scale),H);   // accent rule
  let y=pad+Math.round(26*scale);
  g.fillStyle=ink; g.font=`600 ${Math.round(28*scale)}px "Space Grotesk", sans-serif`; g.fillText(FIG.title,pad,y);
  y+=Math.round(30*scale);
  g.fillStyle=dim; g.font=`400 ${Math.round(20*scale)}px "Space Grotesk", sans-serif`;
  y=wrapText(g,FIG.body,pad,y,W-pad*2,lh)+lh;
  if(FIG.refs){ g.fillStyle=faint; g.font=`500 ${Math.round(15*scale)}px "IBM Plex Mono", monospace`; g.fillText(FIG.refs,pad,y); y+=Math.round(24*scale); }
  g.fillStyle=faint; g.font=`500 ${Math.round(13*scale)}px "IBM Plex Mono", monospace`;
  g.fillText('Interstitial System 3D Map · Iturralde 2026 · schematic, literature-grounded',pad,H-pad+Math.round(6*scale));
  return c;
}
function stitch(image, band){ const W=image.width, H=image.height+band.height;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  g.drawImage(image,0,0); g.drawImage(band,0,image.height); return c; }
function dl(canvas,name){ canvas.toBlob(b=>{ const u=URL.createObjectURL(b); const a=document.createElement('a');
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); },'image/png'); }
function snapshot(colWidth){
  const W=colWidth, scale=W/1000, H=Math.round(W*(stage.clientHeight/Math.max(1,stage.clientWidth)));
  const img=renderAt(W,H); const band=captionBand(W,scale); dl(stitch(img,band),'interstitium_figure_'+Date.now()+'.png');
}
function conditionMatrix(colWidth){
  const states=[[0,'Dehydrated'],[0.3,'Low'],[0.55,'Normal'],[1,'High']];
  const savedH=hydro, savedT=hydroTarget;
  const cellW=Math.round(colWidth/2), cellH=Math.round(cellW*(stage.clientHeight/Math.max(1,stage.clientWidth)));
  const scale=colWidth/1000, gap=Math.round(10*scale), labelH=Math.round(34*scale);
  const gridW=cellW*2+gap, gridH=(cellH+labelH)*2+gap;
  const c=document.createElement('canvas'); c.width=gridW; c.height=gridH; const g=c.getContext('2d');
  g.fillStyle=figBG(); g.fillRect(0,0,gridW,gridH);
  const dark=inkFor(figBG());
  states.forEach(([v,lab],i)=>{ applyHydro(v); if(refreshWarnPanelSafe) refreshWarnPanelSafe();
    const cell=renderAt(cellW,cellH);
    const cx=(i%2)*(cellW+gap), cy=Math.floor(i/2)*(cellH+labelH+gap);
    g.fillStyle=dark?'#f3eee1':'#0d1422'; g.fillRect(cx,cy,cellW,cellH+labelH);
    g.drawImage(cell,cx,cy);
    g.fillStyle=dark?'#14304a':'#eef2f8'; g.font=`600 ${Math.round(20*scale)}px "Space Grotesk", sans-serif`;
    g.fillText(lab+', hydration '+v,cx+Math.round(16*scale),cy+cellH+Math.round(23*scale)); });
  applyHydro(savedH); hydroTarget=savedT;
  const band=captionBand(gridW,scale); dl(stitch(c,band),'interstitium_matrix_'+Date.now()+'.png');
}
const refreshWarnPanelSafe=(typeof refreshWarnPanel==='function')?refreshWarnPanel:null;

/* ---- figure mode: hide UI chrome for a clean capture ---- */
function figMode(on){ document.body.classList.toggle('figmode',on);
  let ex=document.getElementById('figExit');
  if(on && !ex){ ex=document.createElement('button'); ex.id='figExit'; ex.textContent='✕ Exit figure mode';
    ex.style.cssText='position:fixed;top:14px;right:14px;z-index:80;padding:9px 13px;border-radius:10px;border:1px solid rgba(0,0,0.2);background:rgba(255,255,255.92);color:#14304a;font:600 12px/1 "Space Grotesk",sans-serif;cursor:pointer;';
    ex.onclick=()=>figMode(false); document.body.appendChild(ex); }
  if(!on && ex) ex.remove();
  const b=document.getElementById('figMode'); if(b) b.classList.toggle('on',on);
}

/* ================================================================== *
 *  WIRE NEW UI (guarded, desktop & mobile provide different chrome)   *
 * ================================================================== */
// cell-atlas population list
const popList=document.getElementById('popList');
if(popList){ POPS.forEach(p=>{ const b=document.createElement('button'); b.className='pop'; b.dataset.n=p.n;
  b.innerHTML=`<span class="pdot" style="background:${p.color}">${p.n}</span>`+
    `<span class="plb">${p.name}${p.disputed?' <em>disputed</em>':''}<small>${p.pos}</small></span>`;
  b.onclick=()=>selectPop(p.n); popList.appendChild(b); }); }
const atlasToggle=document.getElementById('atlasToggle');
if(atlasToggle) atlasToggle.onclick=()=>atlasSet(!ATLAS.visible);
// scenario buttons
document.querySelectorAll('.scn[data-scn]').forEach(b=>{ b.onclick=()=>{
  document.querySelectorAll('.scn[data-scn]').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  runScenario(b.dataset.scn); }; });
const capX=document.querySelector('#caption .cx'); if(capX) capX.onclick=closeCaption;
// figure controls
const fm=document.getElementById('figMode'); if(fm) fm.onclick=()=>figMode(!document.body.classList.contains('figmode'));
const f1=document.getElementById('figSnap1'); if(f1) f1.onclick=()=>snapshot(1200);
const f2=document.getElementById('figSnap2'); if(f2) f2.onclick=()=>snapshot(2000);
const fmx=document.getElementById('figMatrix'); if(fmx) fmx.onclick=()=>conditionMatrix(2000);
// keep spotlight scaling steady as the camera orbits (sprites are constant-size already)

/* Automation hook, lets figure/plate generation drive the model deterministically
   without depending on the requestAnimationFrame loop (which throttles in
   background frames). Used to render the manuscript figures reproducibly. */
window.__IMAP__={
  applyHydro:(v)=>{ applyHydro(v); hydroTarget=v; },
  setHydration, runScenario, atlasSet, spotlightPops, setSystems, setCaption,
  frameAt, frameBox, tweenTo, renderAt, snapshot, conditionMatrix, figMode,
  POPS, SCEN, SYS, G, ATLAS, BODY, MICRO, model, stage,
  worldBody, worldMicro, MAT, WARN, updateWarnings,
  get hydro(){ return hydro; }
};

