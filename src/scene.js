import Globe from 'globe.gl';
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {ArcLayer,ColumnLayer,ScatterplotLayer} from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {color,cssColor} from './model.js';

export class Scene {
 constructor(container,countries,onSelect) {
  this.container=container;this.onSelect=onSelect;this.events=[];this.mode='globe';
  this.jetObjects=new Set();this.layers={jets:true,arcs:true,glow:true};this.rotating=true;this.selected=null;
  this.globeHost=document.createElement('div');this.globeHost.className='render-host';container.append(this.globeHost);
  this.mapHost=document.createElement('div');this.mapHost.className='render-host map-host';this.mapHost.hidden=true;container.append(this.mapHost);
  this.globe=new Globe(this.globeHost,{animateIn:false})
   .backgroundColor('rgba(0,0,0,0)').showAtmosphere(true).atmosphereColor('#3878c8').atmosphereAltitude(.15)
   .globeMaterial(new THREE.MeshPhongMaterial({color:'#0b1c2c',shininess:6,transparent:true,opacity:1}))
   .polygonsData(countries.features).polygonAltitude(.004)
   .polygonCapColor(()=>'#17374b').polygonSideColor(()=>'#112a3b').polygonStrokeColor(()=>'#285268')
   .polygonsTransitionDuration(0)
   .pointsData([]).pointLat(d=>d.source[1]).pointLng(d=>d.source[0]).pointRadius(.23)
   .pointAltitude(.006).pointColor(cssColor).pointLabel(()=>null).onPointClick(onSelect)
   .arcsData([]).arcStartLat(d=>d.source[1]).arcStartLng(d=>d.source[0])
   .arcEndLat(d=>d.target[1]).arcEndLng(d=>d.target[0]).arcColor(d=>[cssColor(d),'rgba(95,162,255,0.2)'])
   .arcAltitudeAutoScale(.28).arcStroke(.36).arcDashLength(.22).arcDashGap(.45).arcDashAnimateTime(1600)
   .arcsTransitionDuration(0).arcLabel(()=>null).onArcClick(onSelect)
   .ringsData([]).ringAltitude(.009).ringLat(d=>d.source[1]).ringLng(d=>d.source[0])
   .ringColor(d=>t=>`rgba(${color(d).join(',')},${.85*(1-t)})`).ringMaxRadius(4)
   .ringPropagationSpeed(1.8).ringRepeatPeriod(2200)
   .customLayerData([]).customThreeObject(d=>this.makeJet(d)).customThreeObjectUpdate((obj,d)=>{obj.userData.event=d;});
  this.globe.pointOfView({lat:22,lng:12,altitude:2.25},0);
  this.globe.controls().autoRotate=true;this.globe.controls().autoRotateSpeed=.25;
  this.globe.controls().enableDamping=true;this.globe.controls().minDistance=130;this.globe.controls().maxDistance=650;
  this.globe.controls().addEventListener('start',()=>{this.globe.controls().autoRotate=false;});
  this.globe.renderer().setPixelRatio(Math.min(devicePixelRatio,1.7));
  this.addGraticule();
  this.map=new maplibregl.Map({container:this.mapHost,attributionControl:false,center:[0,15],zoom:.3,pitch:20,minZoom:-1.5,renderWorldCopies:false,
   style:{version:8,sources:{countries:{type:'geojson',data:countries}},layers:[
    {id:'ocean',type:'background',paint:{'background-color':'#0b1724'}},
    {id:'land',type:'fill',source:'countries',paint:{'fill-color':'#173447','fill-opacity':1}},
    {id:'borders',type:'line',source:'countries',paint:{'line-color':'#315066','line-width':.6}}
   ]}});
  this.overlay=new MapboxOverlay({interleaved:false,layers:[]});this.map.addControl(this.overlay);
  this.map.on('error',e=>console.warn('Map renderer:',e.error?.message));
  this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(container);this.fit();
  this.lastMap=0;this.lastData=0;this.lastRing=0;
  this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);
 }
 addGraticule(){
  const material=new THREE.LineBasicMaterial({color:'#2b4960',transparent:true,opacity:.25});
  for(let lat=-60;lat<=60;lat+=30){
   const points=[];for(let lng=-180;lng<=180;lng+=2){const c=this.globe.getCoords(lat,lng,.001);points.push(new THREE.Vector3(c.x,c.y,c.z));}
   this.globe.scene().add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
  }
  for(let lng=-180;lng<180;lng+=30){
   const points=[];for(let lat=-90;lat<=90;lat+=2){const c=this.globe.getCoords(lat,lng,.001);points.push(new THREE.Vector3(c.x,c.y,c.z));}
   this.globe.scene().add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
  }
 }
 makeJet(event){
  const group=new THREE.Group(),c=this.globe.getCoords(event.source[1],event.source[0],.006);
  group.position.set(c.x,c.y,c.z);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),group.position.clone().normalize());
  const height=event.latency===null?10:10+Math.min(event.latency,300)/8;
  const material=new THREE.MeshBasicMaterial({color:cssColor(event),transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.55,height,7),material);shaft.position.y=height/2;group.add(shaft);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),material);head.position.y=height;group.add(head);
  const halo=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.5,height,8),material.clone());halo.material.opacity=.12;halo.position.y=height/2;group.add(halo);
  if(!this.glowTexture){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
   const context=canvas.getContext('2d'),gradient=context.createRadialGradient(32,32,0,32,32,32);
   gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.15,'rgba(255,255,255,.8)');gradient.addColorStop(.5,'rgba(255,255,255,.2)');gradient.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);this.glowTexture=new THREE.CanvasTexture(canvas);
  }
  for(const [y,size] of [[height,3.2],[.3,4.5]]){
   const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:cssColor(event),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.y=y;glow.scale.set(size,size,1);group.add(glow);
  }
  group.userData={event,height};this.jetObjects.add(group);return group;
 }
 setEvents(events){this.events=events;this.dirty=true;}
 setLayer(name,value){this.layers[name]=value;this.dirty=true;}
 setMode(mode){
  this.mode=mode;this.globeHost.hidden=mode!=='globe';this.mapHost.hidden=mode!=='map';
  if(mode==='globe')this.globe.resumeAnimation();else this.globe.pauseAnimation();
  this.fit();if(mode==='map'&&!this.mapFramed){this.frameMap(0);this.mapFramed=true;}this.dirty=true;
 }
 frameMap(duration=900){this.map.fitBounds([[-179,-58],[179,78]],{padding:25,pitch:20,duration});}
 fit(){const {width,height}=this.container.getBoundingClientRect();this.globe.width(width).height(height);this.map?.resize();}
 focus(event){
  this.selected=event;
  if(this.mode==='globe')this.globe.pointOfView({lat:event.source[1],lng:event.source[0],altitude:1.55},900);
  else this.map.flyTo({center:event.source,zoom:3.5,duration:1000});
 }
 home(){this.selected=null;if(this.mode==='globe')this.globe.pointOfView({lat:22,lng:12,altitude:2.25},900);else this.frameMap();}
 animate(time){
  const now=Date.now();
  if(this.dirty){
   this.visible=this.events.filter(e=>now-e.receivedAt<60000);
   if(this.mode==='globe'){
    this.globe.pointsData(this.visible).arcsData(this.layers.arcs?this.visible.filter(e=>e.target).slice(-90):[]);
    this.globe.customLayerData(this.layers.jets?this.visible.filter(e=>now-e.receivedAt<14000).slice(-140):[]);
    if(this.layers.glow)this.globe.ringsData(this.visible.filter(e=>now-e.receivedAt<10000).slice(-80));else this.globe.ringsData([]);
   }
   this.dirty=false;this.lastData=now;
  }
  if(now-this.lastData>1000)this.dirty=true;
  if(this.mode==='globe'){
   for(const obj of this.jetObjects){
    if(!obj.parent){this.jetObjects.delete(obj);continue;}
    const age=(now-obj.userData.event.receivedAt)/1000;
    obj.scale.y=Math.max(.01,Math.min(1,age*2));
    const fade=Math.max(0,1-age/14);
    obj.visible=fade>0;
    obj.children.forEach((child,i)=>{if(child.material)child.material.opacity=fade*(i===2?.12:.9);});
   }
  }else if(time-this.lastMap>65){
   this.lastMap=time;this.updateMap(now);
  }
  this.frame=requestAnimationFrame(this.animate);
 }
 updateMap(now){
  const data=this.events.filter(e=>now-e.receivedAt<60000),onClick=({object})=>object&&this.onSelect(object);
  const layers=[new ScatterplotLayer({id:'probes',data,pickable:true,onClick,getPosition:d=>d.source,getFillColor:d=>[...color(d),180],getRadius:16000,radiusMinPixels:2,radiusMaxPixels:5})];
  if(this.layers.arcs)layers.push(new ArcLayer({id:'connections',data:data.filter(d=>d.target).slice(-90),pickable:true,onClick,getSourcePosition:d=>d.source,getTargetPosition:d=>d.target,getSourceColor:d=>[...color(d),150],getTargetColor:[99,157,255,35],getWidth:1.3,greatCircle:true,getHeight:.22}));
  const young=data.filter(d=>now-d.receivedAt<14000);
  if(this.layers.jets)layers.push(new ColumnLayer({id:'jets',data:young,pickable:true,onClick,diskResolution:6,radius:1.6,radiusUnits:'pixels',getPosition:d=>d.source,getFillColor:d=>[...color(d),Math.round(Math.max(0,1-(now-d.receivedAt)/14000)*230)],getElevation:d=>(500000+Math.min(d.latency??50,300)*18000)*Math.min(1,(now-d.receivedAt)/350),extruded:true,material:false}));
  if(this.layers.glow)layers.push(new ScatterplotLayer({id:'pulses',data:young,pickable:false,getPosition:d=>d.source,stroked:true,filled:true,getRadius:d=>30000+((now-d.receivedAt)%2400)*100,getFillColor:d=>[...color(d),Math.round(Math.max(0,1-(now-d.receivedAt)/14000)*30)],getLineColor:d=>[...color(d),Math.round(Math.max(0,1-(now-d.receivedAt)/14000)*170)],lineWidthMinPixels:1,radiusMinPixels:5,radiusMaxPixels:65}));
  this.overlay.setProps({layers});
 }
}
