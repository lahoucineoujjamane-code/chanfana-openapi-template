/* ============================================================
   GeoTopo Pro — full engine (FR / EN)
   ============================================================ */

/* ---------- i18n ---------- */
const I18N = {
  fr:{
    tools_draw:"Outils de dessin", point:"Point", line:"Ligne", polygon:"Polygone",
    rect:"Rectangle", circle:"Cercle", edit:"Éditer", delete:"Supprimer", clear:"Tout effacer",
    tools_measure:"Mesure", distance:"Distance", area:"Surface", units:"Unités",
    metric:"Métrique (m / km / ha)", imperial:"Impérial (ft / mi / ac)",
    basemaps:"Fonds de carte", layer:"Couche", opacity:"Opacité",
    coords:"Coordonnées", crs:"Système (CRS)", cursor:"Curseur", goto:"Aller à des coordonnées",
    goto_btn:"Aller / Ajouter point", io:"Import / Export",
    import:"Importer (KML, GeoJSON, CSV, GPX, DXF)", export_as:"Exporter en",
    features:"Éléments", no_feat:"Aucun élément.",
    map_loaded:"Carte chargée", click_map:"Cliquez sur la carte pour dessiner",
    deleted:"Élément supprimé", cleared:"Tout effacé", nothing_sel:"Rien à supprimer — activez Éditer et sélectionnez",
    imported:"%n élément(s) importé(s)", import_err:"Échec de l'import : format non reconnu",
    exported:"Exporté : ", no_export:"Aucun élément à exporter", bad_coords:"Coordonnées invalides",
    added_pt:"Point ajouté", total_dist:"Distance totale", total_area:"Surface",
    feat_point:"Point", feat_line:"Ligne", feat_poly:"Polygone", feat_circle:"Cercle", feat_rect:"Rectangle"
  },
  en:{
    tools_draw:"Drawing tools", point:"Point", line:"Line", polygon:"Polygon",
    rect:"Rectangle", circle:"Circle", edit:"Edit", delete:"Delete", clear:"Clear all",
    tools_measure:"Measure", distance:"Distance", area:"Area", units:"Units",
    metric:"Metric (m / km / ha)", imperial:"Imperial (ft / mi / ac)",
    basemaps:"Base maps", layer:"Layer", opacity:"Opacity",
    coords:"Coordinates", crs:"System (CRS)", cursor:"Cursor", goto:"Go to coordinates",
    goto_btn:"Go / Add point", io:"Import / Export",
    import:"Import (KML, GeoJSON, CSV, GPX, DXF)", export_as:"Export as",
    features:"Features", no_feat:"No features yet.",
    map_loaded:"Map loaded", click_map:"Click the map to draw",
    deleted:"Feature deleted", cleared:"All cleared", nothing_sel:"Nothing to delete — enable Edit and select",
    imported:"%n feature(s) imported", import_err:"Import failed: unrecognized format",
    exported:"Exported: ", no_export:"No features to export", bad_coords:"Invalid coordinates",
    added_pt:"Point added", total_dist:"Total distance", total_area:"Area",
    feat_point:"Point", feat_line:"Line", feat_poly:"Polygon", feat_circle:"Circle", feat_rect:"Rectangle"
  }
};
let LANG = "fr";
const t = k => (I18N[LANG][k] ?? k);
function applyLang(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    if(I18N[LANG][k]!==undefined) el.textContent = I18N[LANG][k];
  });
  document.getElementById("langBtn").textContent = LANG==="fr" ? "EN" : "FR";
  renderList();
}

/* ---------- CRS definitions (proj4) ---------- */
proj4.defs([
  ["EPSG:4326","+proj=longlat +datum=WGS84 +no_defs"],
  // Morocco — Lambert Merchich (Nord Maroc / Sud Maroc / Sahara)
  ["EPSG:26191","+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"],
  ["EPSG:26192","+proj=lcc +lat_1=29.7 +lat_0=29.7 +lon_0=-5.4 +k_0=0.999615596 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"],
  ["EPSG:26194","+proj=lcc +lat_1=26.1 +lat_0=26.1 +lon_0=-5.4 +k_0=0.999616304 +x_0=1200000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"],
  ["EPSG:3857","+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs"]
]);
// All 60 UTM zones N & S
for(let z=1;z<=60;z++){
  proj4.defs(`EPSG:${32600+z}`,`+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`);
  proj4.defs(`EPSG:${32700+z}`,`+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`);
}
const CRS_LIST = [
  {code:"EPSG:4326", name:"WGS84 — Lat/Lon (°)"},
  {code:"EPSG:3857", name:"Web Mercator (m)"},
  {code:"EPSG:26191", name:"Maroc — Lambert Nord (Zone 1)"},
  {code:"EPSG:26192", name:"Maroc — Lambert Sud (Zone 2)"},
  {code:"EPSG:26194", name:"Maroc — Lambert Sahara (Zone 4)"},
];
for(let z=1;z<=60;z++) CRS_LIST.push({code:`EPSG:${32600+z}`, name:`UTM ${z}N (WGS84)`});
for(let z=1;z<=60;z++) CRS_LIST.push({code:`EPSG:${32700+z}`, name:`UTM ${z}S (WGS84)`});

function toCRS(lng,lat,code){
  if(code==="EPSG:4326") return [lng,lat];
  return proj4("EPSG:4326",code,[lng,lat]);
}
function fromCRS(x,y,code){
  if(code==="EPSG:4326") return [x,y]; // [lng,lat]
  return proj4(code,"EPSG:4326",[x,y]); // -> [lng,lat]
}

/* ---------- Map ---------- */
const map = L.map("map",{zoomControl:true,center:[28.987,-10.057],zoom:11});
const BASEMAPS = {
  osm:{name:"OpenStreetMap", layer:()=>L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"})},
  topo:{name:"OpenTopoMap (topographique)", layer:()=>L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:"© OpenTopoMap (CC-BY-SA)"})},
  sat:{name:"Satellite (Esri)", layer:()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"© Esri"})},
  terrain:{name:"Terrain (Esri)", layer:()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:13,attribution:"© Esri"})},
};
let currentBase = null;
function setBase(key){
  if(currentBase) map.removeLayer(currentBase);
  currentBase = BASEMAPS[key].layer().addTo(currentBase ? undefined : map);
  if(!map.hasLayer(currentBase)) currentBase.addTo(map);
  currentBase.setOpacity(document.getElementById("opacity").value/100);
}
const baseSel = document.getElementById("baseSel");
Object.entries(BASEMAPS).forEach(([k,v])=>{
  const o=document.createElement("option"); o.value=k; o.textContent=v.name; baseSel.appendChild(o);
});
baseSel.onchange = ()=>setBase(baseSel.value);
document.getElementById("opacity").oninput = e=>{ if(currentBase) currentBase.setOpacity(e.target.value/100); };
setBase("osm");

/* ---------- Drawn items ---------- */
const drawn = new L.FeatureGroup().addTo(map);
let featSeq = 0;
const colors = ["#19c6a8","#3b82f6","#f59e0b","#ef4444","#a855f7","#10b981","#ec4899"];

const drawCtl = new L.Control.Draw({
  edit:{ featureGroup:drawn, remove:true },
  draw:{
    polyline:{shapeOptions:{color:"#3b82f6",weight:3}},
    polygon:{allowIntersection:false,shapeOptions:{color:"#19c6a8",weight:2}},
    rectangle:{shapeOptions:{color:"#f59e0b",weight:2}},
    circle:{shapeOptions:{color:"#a855f7",weight:2}},
    marker:true, circlemarker:false
  }
});
map.addControl(drawCtl);
// hide default toolbar (we use our own buttons)
document.querySelector(".leaflet-draw")?.style.setProperty("display","none");

function labelFor(type){
  return ({marker:t("feat_point"),polyline:t("feat_line"),polygon:t("feat_poly"),
           rectangle:t("feat_rect"),circle:t("feat_circle")})[type] || type;
}
function registerFeature(layer,type){
  featSeq++;
  layer._gid = featSeq;
  layer._gtype = type;
  layer._gcolor = (layer.options && layer.options.color) || colors[featSeq%colors.length];
  layer._gname = labelFor(type)+" "+featSeq;
  drawn.addLayer(layer);
  bindPopup(layer);
  renderList();
}
function bindPopup(layer){
  const info = describe(layer);
  layer.bindPopup(`<b>${layer._gname}</b><br>${info}`);
}

map.on(L.Draw.Event.CREATED, e=>{
  const type = e.layerType;
  registerFeature(e.layer, type);
  toast(labelFor(type)+" ✓");
});
map.on(L.Draw.Event.DELETED, ()=>{ renderList(); toast(t("deleted")); });
map.on(L.Draw.Event.EDITED, ()=>{ drawn.eachLayer(bindPopup); renderList(); });

/* ---------- Manual draw triggers ---------- */
function startDraw(handlerName,opts){
  const H = {
    marker:()=>new L.Draw.Marker(map,drawCtl.options.draw.marker),
    polyline:()=>new L.Draw.Polyline(map,drawCtl.options.draw.polyline),
    polygon:()=>new L.Draw.Polygon(map,drawCtl.options.draw.polygon),
    rectangle:()=>new L.Draw.Rectangle(map,drawCtl.options.draw.rectangle),
    circle:()=>new L.Draw.Circle(map,drawCtl.options.draw.circle),
  }[handlerName];
  const h = H(); h.enable();
  toast(t("click_map"));
}
document.getElementById("tPoint").onclick = ()=>startDraw("marker");
document.getElementById("tLine").onclick  = ()=>startDraw("polyline");
document.getElementById("tPoly").onclick  = ()=>startDraw("polygon");
document.getElementById("tRect").onclick  = ()=>startDraw("rectangle");
document.getElementById("tCircle").onclick= ()=>startDraw("circle");

let editHandler = null;
document.getElementById("tEdit").onclick = function(){
  this.classList.toggle("active");
  if(this.classList.contains("active")){
    editHandler = new L.EditToolbar.Edit(map,{featureGroup:drawn});
    editHandler.enable();
  } else if(editHandler){ editHandler.save(); editHandler.disable(); editHandler=null; drawn.eachLayer(bindPopup); renderList(); }
};
document.getElementById("tDelSel").onclick = ()=>{
  const dh = new L.EditToolbar.Delete(map,{featureGroup:drawn});
  dh.enable();
  toast(t("nothing_sel"));
};
document.getElementById("tClear").onclick = ()=>{ drawn.clearLayers(); renderList(); toast(t("cleared")); };

/* ---------- Measure ---------- */
let measureMode = null;
const measureOut = document.getElementById("measureOut");
function fmtLen(m){
  const u = document.getElementById("units").value;
  if(u==="imperial"){ const ft=m*3.28084; return ft>5280?(ft/5280).toFixed(3)+" mi":ft.toFixed(1)+" ft"; }
  return m>1000?(m/1000).toFixed(3)+" km":m.toFixed(1)+" m";
}
function fmtArea(m2){
  const u = document.getElementById("units").value;
  if(u==="imperial"){ const ac=m2/4046.86; return ac>1?ac.toFixed(3)+" ac":(m2*10.7639).toFixed(0)+" ft²"; }
  return m2>10000?(m2/10000).toFixed(3)+" ha":m2.toFixed(1)+" m²";
}
// Haversine + spherical polygon area
function lineLength(latlngs){
  let s=0; for(let i=1;i<latlngs.length;i++) s+=map.distance(latlngs[i-1],latlngs[i]); return s;
}
function ringArea(latlngs){
  const R=6378137; let a=0; const n=latlngs.length;
  for(let i=0;i<n;i++){
    const p1=latlngs[i], p2=latlngs[(i+1)%n];
    a += (p2.lng-p1.lng)*Math.PI/180 * (2+Math.sin(p1.lat*Math.PI/180)+Math.sin(p2.lat*Math.PI/180));
  }
  return Math.abs(a*R*R/2);
}
function startMeasure(kind){
  const pts=[]; const tmp=L.layerGroup().addTo(map);
  measureMode=kind; measureOut.style.display="block"; measureOut.textContent="…";
  function redraw(){
    tmp.clearLayers();
    if(pts.length>=1) pts.forEach(p=>L.circleMarker(p,{radius:4,color:"#f59e0b"}).addTo(tmp));
    if(kind==="dist" && pts.length>=2){
      L.polyline(pts,{color:"#f59e0b",dashArray:"6 4"}).addTo(tmp);
      measureOut.textContent = t("total_dist")+": "+fmtLen(lineLength(pts));
    }
    if(kind==="area" && pts.length>=3){
      L.polygon(pts,{color:"#f59e0b",fillOpacity:.15,dashArray:"6 4"}).addTo(tmp);
      measureOut.textContent = t("total_area")+": "+fmtArea(ringArea(pts));
    }
  }
  function onClick(e){ pts.push(e.latlng); redraw(); }
  function onDbl(){ stop(); }
  function stop(){
    map.off("click",onClick); map.off("dblclick",onDbl);
    map.doubleClickZoom.enable();
    setTimeout(()=>{ tmp.remove(); measureOut.style.display="none"; },4000);
    measureMode=null;
    document.getElementById("mDist").classList.remove("active");
    document.getElementById("mArea").classList.remove("active");
  }
  map.doubleClickZoom.disable();
  map.on("click",onClick); map.on("dblclick",onDbl);
  startMeasure._stop = stop;
}
document.getElementById("mDist").onclick = function(){
  if(startMeasure._stop) startMeasure._stop();
  this.classList.add("active"); document.getElementById("mArea").classList.remove("active");
  startMeasure("dist");
};
document.getElementById("mArea").onclick = function(){
  if(startMeasure._stop) startMeasure._stop();
  this.classList.add("active"); document.getElementById("mDist").classList.remove("active");
  startMeasure("area");
};

/* ---------- Coordinates panel ---------- */
const crsSel = document.getElementById("crsSel");
CRS_LIST.forEach(c=>{ const o=document.createElement("option"); o.value=c.code; o.textContent=c.name; crsSel.appendChild(o); });
crsSel.value="EPSG:4326";

function updateCoordOut(lat,lng){
  const code = crsSel.value;
  const [x,y] = toCRS(lng,lat,code);
  const isGeo = code==="EPSG:4326";
  const fx = isGeo ? x.toFixed(6) : x.toFixed(2);
  const fy = isGeo ? y.toFixed(6) : y.toFixed(2);
  document.getElementById("coordOut").innerHTML =
    `<div><span class="k">WGS84:</span> <span class="v">${lat.toFixed(6)}, ${lng.toFixed(6)}</span></div>`+
    `<div><span class="k">${code}:</span></div>`+
    `<div><span class="k">X/E:</span> <span class="v">${fx}</span></div>`+
    `<div><span class="k">Y/N:</span> <span class="v">${fy}</span></div>`;
}
map.on("mousemove", e=>updateCoordOut(e.latlng.lat,e.latlng.lng));
map.on("click", e=>{ if(!measureMode) updateCoordOut(e.latlng.lat,e.latlng.lng); });
crsSel.onchange = ()=>{ const c=map.getCenter(); updateCoordOut(c.lat,c.lng); };
updateCoordOut(map.getCenter().lat, map.getCenter().lng);

document.getElementById("goBtn").onclick = ()=>{
  const xv=parseFloat(document.getElementById("gX").value);
  const yv=parseFloat(document.getElementById("gY").value);
  if(isNaN(xv)||isNaN(yv)){ toast(t("bad_coords"),true); return; }
  const code=crsSel.value;
  let lng,lat;
  try{ [lng,lat]=fromCRS(xv,yv,code); }catch(err){ toast(t("bad_coords"),true); return; }
  if(!isFinite(lng)||!isFinite(lat)||Math.abs(lat)>90||Math.abs(lng)>180){ toast(t("bad_coords"),true); return; }
  map.setView([lat,lng],16);
  const m=L.marker([lat,lng]); registerFeature(m,"marker");
  toast(t("added_pt"));
};

/* ---------- Describe / list ---------- */
function describe(layer){
  if(layer instanceof L.Marker){
    const ll=layer.getLatLng();
    const [x,y]=toCRS(ll.lng,ll.lat,crsSel.value);
    return `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;
  }
  if(layer instanceof L.Circle){
    return "r = "+fmtLen(layer.getRadius());
  }
  if(layer instanceof L.Polygon){
    const ll=layer.getLatLngs()[0];
    return t("area")+": "+fmtArea(ringArea(ll));
  }
  if(layer instanceof L.Polyline){
    return t("distance")+": "+fmtLen(lineLength(layer.getLatLngs()));
  }
  return "";
}
function renderList(){
  const box=document.getElementById("flist");
  const layers=drawn.getLayers();
  document.getElementById("fcount").textContent=layers.length;
  if(!layers.length){ box.innerHTML=`<div class="empty">${t("no_feat")}</div>`; return; }
  box.innerHTML="";
  layers.forEach(layer=>{
    const row=document.createElement("div"); row.className="fitem";
    row.innerHTML=`<span class="dot" style="background:${layer._gcolor||'#19c6a8'}"></span>
      <span class="nm">${layer._gname||'?'} — <span style="color:var(--muted)">${describe(layer)}</span></span>
      <span class="x">✕</span>`;
    row.querySelector(".nm").onclick=()=>{
      if(layer.getBounds) map.fitBounds(layer.getBounds(),{maxZoom:16});
      else if(layer.getLatLng) map.setView(layer.getLatLng(),16);
      layer.openPopup&&layer.openPopup();
    };
    row.querySelector(".x").onclick=()=>{ drawn.removeLayer(layer); renderList(); };
    box.appendChild(row);
  });
}

/* ---------- Export ---------- */
function featuresToGeoJSON(){
  const feats=[];
  drawn.eachLayer(l=>{
    let g=null;
    if(l instanceof L.Marker){ const p=l.getLatLng(); g={type:"Point",coordinates:[p.lng,p.lat]}; }
    else if(l instanceof L.Circle){
      const c=l.getLatLng(), r=l.getRadius(); const pts=[];
      for(let i=0;i<=64;i++){ const a=i/64*2*Math.PI; const dx=r*Math.cos(a), dy=r*Math.sin(a);
        const dLat=dy/111320, dLng=dx/(111320*Math.cos(c.lat*Math.PI/180));
        pts.push([c.lng+dLng,c.lat+dLat]); }
      g={type:"Polygon",coordinates:[pts]};
    }
    else if(l instanceof L.Polygon){ const r=l.getLatLngs()[0].map(p=>[p.lng,p.lat]); r.push(r[0]); g={type:"Polygon",coordinates:[r]}; }
    else if(l instanceof L.Polyline){ g={type:"LineString",coordinates:l.getLatLngs().map(p=>[p.lng,p.lat])}; }
    if(g) feats.push({type:"Feature",properties:{name:l._gname,type:l._gtype},geometry:g});
  });
  return {type:"FeatureCollection",features:feats};
}
function download(name,content,mime){
  const blob=new Blob([content],{type:mime||"text/plain"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}
function toKML(gj){
  const esc=s=>String(s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
  let p="";
  gj.features.forEach(f=>{
    const nm=esc(f.properties.name||"");
    const g=f.geometry;
    if(g.type==="Point") p+=`<Placemark><name>${nm}</name><Point><coordinates>${g.coordinates[0]},${g.coordinates[1]},0</coordinates></Point></Placemark>`;
    else if(g.type==="LineString") p+=`<Placemark><name>${nm}</name><LineString><coordinates>${g.coordinates.map(c=>c[0]+","+c[1]+",0").join(" ")}</coordinates></LineString></Placemark>`;
    else if(g.type==="Polygon") p+=`<Placemark><name>${nm}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${g.coordinates[0].map(c=>c[0]+","+c[1]+",0").join(" ")}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>GeoTopo Pro</name>${p}</Document></kml>`;
}
function toCSV(gj){
  let out="name,type,longitude,latitude\n";
  gj.features.forEach(f=>{
    const g=f.geometry; const nm=(f.properties.name||"").replace(/,/g," ");
    const coords = g.type==="Point"?[g.coordinates]:(g.type==="LineString"?g.coordinates:g.coordinates[0]);
    coords.forEach(c=>{ out+=`${nm},${g.type},${c[0]},${c[1]}\n`; });
  });
  return out;
}
function toGPX(gj){
  let wp="",trk="";
  gj.features.forEach(f=>{
    const g=f.geometry, nm=(f.properties.name||"");
    if(g.type==="Point") wp+=`<wpt lat="${g.coordinates[1]}" lon="${g.coordinates[0]}"><name>${nm}</name></wpt>`;
    else { const cs=(g.type==="LineString"?g.coordinates:g.coordinates[0]);
      trk+=`<trk><name>${nm}</name><trkseg>${cs.map(c=>`<trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`).join("")}</trkseg></trk>`; }
  });
  return `<?xml version="1.0"?>\n<gpx version="1.1" creator="GeoTopo Pro" xmlns="http://www.topografix.com/GPX/1/1">${wp}${trk}</gpx>`;
}
function toDXF(gj){
  // Export in the SELECTED CRS (projected metres ideal for CAD)
  const code=crsSel.value;
  const H=["0","SECTION","2","ENTITIES"];
  function P(lng,lat){ const [x,y]=toCRS(lng,lat,code); return [x,y]; }
  gj.features.forEach(f=>{
    const g=f.geometry;
    if(g.type==="Point"){ const [x,y]=P(...g.coordinates);
      H.push("0","POINT","8","GEOTOPO","10",x,"20",y,"30","0"); }
    else if(g.type==="LineString"){
      H.push("0","LWPOLYLINE","8","GEOTOPO","90",g.coordinates.length,"70","0");
      g.coordinates.forEach(c=>{ const [x,y]=P(...c); H.push("10",x,"20",y); }); }
    else if(g.type==="Polygon"){
      const r=g.coordinates[0]; H.push("0","LWPOLYLINE","8","GEOTOPO","90",r.length,"70","1");
      r.forEach(c=>{ const [x,y]=P(...c); H.push("10",x,"20",y); }); }
  });
  H.push("0","ENDSEC","0","EOF");
  return H.join("\n");
}
function toPDF(gj){
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(16); doc.text("GeoTopo Pro — Export",14,18);
  doc.setFontSize(9); doc.text("CRS: "+crsSel.value+"   "+new Date().toLocaleString(),14,25);
  let y=34; doc.setFontSize(8);
  doc.text("Name",14,y); doc.text("Type",70,y); doc.text("X/Lon",100,y); doc.text("Y/Lat",150,y); y+=4;
  doc.line(14,y,196,y); y+=5;
  gj.features.forEach(f=>{
    const g=f.geometry; const code=crsSel.value;
    const c0 = g.type==="Point"?g.coordinates:(g.type==="LineString"?g.coordinates[0]:g.coordinates[0][0]);
    const [x,yy]=toCRS(c0[0],c0[1],code);
    const isGeo=code==="EPSG:4326";
    doc.text(String(f.properties.name||""),14,y);
    doc.text(String(g.type),70,y);
    doc.text(isGeo?x.toFixed(6):x.toFixed(2),100,y);
    doc.text(isGeo?yy.toFixed(6):yy.toFixed(2),150,y);
    y+=6; if(y>280){ doc.addPage(); y=20; }
  });
  doc.save("geotopo.pdf");
}
document.querySelectorAll("[data-exp]").forEach(b=>{
  b.onclick=()=>{
    const gj=featuresToGeoJSON();
    if(!gj.features.length){ toast(t("no_export"),true); return; }
    const fmt=b.getAttribute("data-exp");
    try{
      if(fmt==="geojson") download("geotopo.geojson",JSON.stringify(gj,null,2),"application/json");
      else if(fmt==="kml") download("geotopo.kml",toKML(gj),"application/vnd.google-earth.kml+xml");
      else if(fmt==="csv") download("geotopo.csv",toCSV(gj),"text/csv");
      else if(fmt==="gpx") download("geotopo.gpx",toGPX(gj),"application/gpx+xml");
      else if(fmt==="dxf") download("geotopo.dxf",toDXF(gj),"application/dxf");
      else if(fmt==="pdf"){ toPDF(gj); }
      toast(t("exported")+fmt.toUpperCase());
    }catch(err){ console.error(err); toast("Export error",true); }
  };
});

/* ---------- Import ---------- */
document.getElementById("impBtn").onclick=()=>document.getElementById("impFile").click();
document.getElementById("impFile").onchange=function(e){
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{ try{ importText(file.name, r.result); }catch(err){ console.error(err); toast(t("import_err"),true); } this.value=""; };
  r.readAsText(file);
};
function addGeoJSON(gj){
  let n=0;
  L.geoJSON(gj,{
    onEachFeature:(f,layer)=>{
      layer.options.color = layer.options.color||colors[(featSeq+1)%colors.length];
      registerFeature(layer, layer instanceof L.Marker?"marker":(layer instanceof L.Polygon?"polygon":(layer instanceof L.Polyline?"polyline":"marker")));
      if(f.properties&&f.properties.name) layer._gname=f.properties.name;
      n++;
    },
    pointToLayer:(f,ll)=>L.marker(ll)
  });
  if(n){ try{ map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]}); }catch(_){} }
  return n;
}
function importText(name, text){
  const ext=name.split(".").pop().toLowerCase();
  let gj=null, n=0;
  if(ext==="geojson"||ext==="json"){ gj=JSON.parse(text); n=addGeoJSON(gj); }
  else if(ext==="kml"){ const xml=new DOMParser().parseFromString(text,"text/xml"); gj=toGeoJSON.kml(xml); n=addGeoJSON(gj); }
  else if(ext==="gpx"){ const xml=new DOMParser().parseFromString(text,"text/xml"); gj=toGeoJSON.gpx(xml); n=addGeoJSON(gj); }
  else if(ext==="csv"||ext==="txt"){ n=importCSV(text); }
  else if(ext==="dxf"){ n=importDXF(text); }
  else { toast(t("import_err"),true); return; }
  toast(t("imported").replace("%n",n));
  renderList();
}
function importCSV(text){
  const lines=text.trim().split(/\r?\n/); if(lines.length<2) return 0;
  const head=lines[0].toLowerCase().split(/[;,\t]/).map(s=>s.trim());
  const li=head.findIndex(h=>/lon|lng|x|easting/.test(h));
  const la=head.findIndex(h=>/lat|y|northing/.test(h));
  const ni=head.findIndex(h=>/name|nom|label/.test(h));
  if(li<0||la<0) return 0;
  let n=0;
  for(let i=1;i<lines.length;i++){
    const c=lines[i].split(/[;,\t]/);
    const x=parseFloat(c[li]), y=parseFloat(c[la]); if(isNaN(x)||isNaN(y)) continue;
    let lng=x,lat=y;
    // if not geographic range, treat as selected projected CRS
    if(crsSel.value!=="EPSG:4326" && (Math.abs(x)>180||Math.abs(y)>90)){ [lng,lat]=fromCRS(x,y,crsSel.value); }
    const m=L.marker([lat,lng]); registerFeature(m,"marker");
    if(ni>=0&&c[ni]) m._gname=c[ni].trim();
    n++;
  }
  if(n){ try{ map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]}); }catch(_){} }
  return n;
}
function importDXF(text){
  // Minimal DXF reader: POINT, LINE, LWPOLYLINE, POLYLINE vertices
  const lines=text.split(/\r?\n/).map(s=>s.trim());
  const pairs=[]; for(let i=0;i+1<lines.length;i+=2) pairs.push([lines[i],lines[i+1]]);
  const code=crsSel.value; let n=0; let i=0;
  function proj(x,y){ if(code==="EPSG:4326") return [x,y]; const [lng,lat]=fromCRS(x,y,code); return [lng,lat]; }
  while(i<pairs.length){
    const [g,v]=pairs[i];
    if(g==="0" && (v==="LWPOLYLINE"||v==="POLYLINE")){
      const verts=[]; i++;
      while(i<pairs.length && !(pairs[i][0]==="0")){ 
        if(pairs[i][0]==="10"){ const x=parseFloat(pairs[i][1]); let y=NaN;
          if(pairs[i+1]&&pairs[i+1][0]==="20") y=parseFloat(pairs[i+1][1]);
          if(!isNaN(x)&&!isNaN(y)){ const [lng,lat]=proj(x,y); verts.push([lat,lng]); } }
        i++; }
      if(verts.length>=2){ const pl=L.polyline(verts,{color:"#3b82f6"}); registerFeature(pl,"polyline"); n++; }
      continue;
    }
    if(g==="0" && v==="POINT"){
      let x=NaN,y=NaN; i++;
      while(i<pairs.length && !(pairs[i][0]==="0")){
        if(pairs[i][0]==="10") x=parseFloat(pairs[i][1]);
        if(pairs[i][0]==="20") y=parseFloat(pairs[i][1]); i++; }
      if(!isNaN(x)&&!isNaN(y)){ const [lng,lat]=proj(x,y); const m=L.marker([lat,lng]); registerFeature(m,"marker"); n++; }
      continue;
    }
    i++;
  }
  if(n){ try{ map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]}); }catch(_){} }
  return n;
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg,err){
  const el=document.getElementById("toast");
  el.textContent=msg; el.className="toast show"+(err?" err":"");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.className="toast",2600);
}

/* ---------- Mobile + lang ---------- */
document.getElementById("mtL").onclick=()=>document.getElementById("sideL").classList.toggle("open");
document.getElementById("mtR").onclick=()=>document.getElementById("sideR").classList.toggle("open");
map.on("click",()=>{ document.getElementById("sideL").classList.remove("open"); document.getElementById("sideR").classList.remove("open"); });
document.getElementById("langBtn").onclick=()=>{ LANG=LANG==="fr"?"en":"fr"; applyLang(); };

applyLang();
document.getElementById("status").textContent="✓ "+t("map_loaded");
setTimeout(()=>map.invalidateSize(),300);

/* PWA service worker */
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
