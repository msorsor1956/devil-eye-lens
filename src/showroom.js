import * as THREE from 'three';
const host=document.querySelector('#spatial-view');
const load=document.querySelector('#load-3d');
const controls=document.querySelector('#scene-controls');
const status=document.querySelector('#scene-status');
let sceneState;
const colors={blue:0x38baff,green:0x8cff50,purple:0xab72ff,red:0xff403c};
function createScene(){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.setClearColor(0x000000,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,30);
 camera.position.set(0,0,7.8);
 const model=new THREE.Group(); scene.add(model);
 const shell=new THREE.MeshStandardMaterial({color:0x222935,metalness:.65,roughness:.28});
 const rim=new THREE.MeshStandardMaterial({color:0x8390a3,metalness:.95,roughness:.2});
 const lightMat=new THREE.MeshBasicMaterial({color:colors.blue});
 const black=new THREE.MeshStandardMaterial({color:0x030609,roughness:.13,metalness:.4});
 function cylinder(radius,depth,z,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,64),mat);m.rotation.x=Math.PI/2;m.position.z=z;model.add(m);return m;}
 cylinder(1.35,.8,-.35,shell);cylinder(1.42,.12,.08,rim);cylinder(1.32,.13,.18,black);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,.08,16,96),rim);ring.position.z=.3;model.add(ring);
 const iris=new THREE.Mesh(new THREE.RingGeometry(.28,.9,96),lightMat);iris.position.z=.35;model.add(iris);
 const pupil=cylinder(.28,.04,.38,black);
 for(let i=0;i<80;i++){const a=i*Math.PI*2/80;const ray=new THREE.Mesh(new THREE.BoxGeometry(.016,.42,.018),i%3?rim:black);ray.position.set(Math.sin(a)*.65,Math.cos(a)*.65,.37);ray.rotation.z=-a;model.add(ray);}
 const lens=new THREE.Mesh(new THREE.SphereGeometry(1.07,48,32),new THREE.MeshPhysicalMaterial({color:0xb9e6ff,metalness:.1,roughness:.06,transparent:true,opacity:.16,clearcoat:1}));lens.scale.z=.3;lens.position.z=.38;model.add(lens);
 for(const x of [-1,1])for(const y of [-1,1]){const tab=new THREE.Mesh(new THREE.BoxGeometry(.3,.34,.12),shell);tab.position.set(x*1.09,y*1.09,-.2);model.add(tab);const screw=new THREE.Mesh(new THREE.TorusGeometry(.06,.018,8,16),rim);screw.position.set(x*1.09,y*1.09,-.12);model.add(screw);}
 scene.add(new THREE.HemisphereLight(0xc8eaff,0x111826,3));
 const key=new THREE.DirectionalLight(0xffffff,5);key.position.set(-3,4,5);scene.add(key);
 const edge=new THREE.DirectionalLight(0x3b9dff,6);edge.position.set(4,-1,1);scene.add(edge);
 model.rotation.set(-.12,-.35,0);
 renderer.domElement.setAttribute('aria-label','Interactive illustrative 3D projector. Use the rotation buttons below.');renderer.domElement.setAttribute('role','img');
 host.append(renderer.domElement);
 let frame=0,clock=0,lastTime=0,moving=host.dataset.moving==='true',disposed=false;
 const render=()=>renderer.render(scene,camera);
 function tick(time){
  frame=0;if(!moving||disposed)return;
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;clock+=dt;
  model.rotation.y+=dt*.23;
  model.position.y=Math.sin(clock*.8)*.09;
  model.rotation.x=-.12+Math.sin(clock*.45)*.06;
  edge.position.x=3+Math.sin(clock*.6)*2;
  render();frame=requestAnimationFrame(tick);
 }
 function setMoving(value){moving=value;cancelAnimationFrame(frame);frame=0;lastTime=0;if(moving&&!disposed)frame=requestAnimationFrame(tick);}
 function motionChange(event){setMoving(event.detail.moving);}
 host.addEventListener('showroom-motion',motionChange);
 setMoving(moving);
 const resize=new ResizeObserver(()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();render();});resize.observe(host);
 let drag=null;
 renderer.domElement.addEventListener('pointerdown',e=>{drag=e.clientX;setMoving(false);renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(drag===null)return;model.rotation.y+=(e.clientX-drag)*.008;drag=e.clientX;render();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{drag=null;setMoving(host.dataset.moving==='true');});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setMoving(false);host.classList.remove('scene-ready');controls.hidden=true;status.textContent='3D paused. Product photo is shown.';});
 host.classList.add('scene-ready');controls.hidden=false;render();
 return {rotate:d=>{model.rotation.y+=d;render();},reset:()=>{clock=0;model.position.y=0;model.rotation.set(-.12,-.35,0);render();},color:key=>{lightMat.color.setHex(colors[key]||colors.blue);render();},dispose:()=>{disposed=true;cancelAnimationFrame(frame);host.removeEventListener('showroom-motion',motionChange);resize.disconnect();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}};
}
load?.addEventListener('click',()=>{try{load.disabled=true;status.textContent='Loading interactive view…';sceneState=createScene();sceneState.color(document.querySelector('[data-preview][aria-pressed="true"]')?.dataset.preview);load.hidden=true;status.textContent='Drag to explore · Rotate, reset, or pause motion';}catch{load.hidden=true;controls.hidden=true;host.querySelector('canvas')?.remove();status.textContent='3D is unavailable on this device. Animated product photo is shown.';}});
for(const b of document.querySelectorAll('[data-turn]'))b.addEventListener('click',()=>sceneState?.rotate(Number(b.dataset.turn)));
document.querySelector('#reset-3d')?.addEventListener('click',()=>sceneState?.reset());
for(const b of document.querySelectorAll('[data-preview], [data-color]'))b.addEventListener('click',()=>{const key=b.dataset.preview||({'Electric blue':'blue','Acid green':'green','Ultraviolet purple':'purple','Signal red':'red'}[b.dataset.color]);sceneState?.color(key);});
window.addEventListener('pagehide',event=>{if(!event.persisted)sceneState?.dispose();});
