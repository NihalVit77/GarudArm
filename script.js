const state = {
  connected: false,
  espConnected: false,
  powerOn: false,
  shoulder: 0
};

function el(id){ return document.getElementById(id); }

function setConnected(yes){
  state.connected = yes;
  el('conn-light').style.background = yes ? 'green' : 'red';
  el('connect-btn').textContent = yes ? 'Disconnect' : 'Connect';
  updateStatus(yes ? 'Connected' : 'Disconnected');
  setEspConnected(yes);
}
function setEspConnected(yes){
  state.espConnected = yes;
  el('esp-light').style.background = yes ? 'green' : 'red';
}
function updateStatus(msg){
  el('status-msg').textContent = 'Status: ' + msg;
}
function sendCommand(cmd, payload={}){
  console.log('SEND', cmd, payload);
  updateStatus(cmd + (Object.keys(payload).length ? ' ' + JSON.stringify(payload) : ''));
}

// Movement buttons
['btn-forward','btn-back','btn-left','btn-right'].forEach(id => {
  const node = el(id);
  const cmd = id.replace('btn-','');
  node.addEventListener('touchstart', e=>{ e.preventDefault(); sendCommand('move:'+cmd); });
  node.addEventListener('touchend', e=>{ e.preventDefault(); sendCommand('move:stop'); });
  node.addEventListener('mousedown', e=>{ e.preventDefault(); sendCommand('move:'+cmd); });
  node.addEventListener('mouseup', e=>{ e.preventDefault(); sendCommand('move:stop'); });
});

el('btn-power').addEventListener('click', ()=>{
  state.powerOn = !state.powerOn;
  sendCommand('power:' + (state.powerOn ? 'on' : 'off'));
});
el('connect-btn').addEventListener('click', ()=>{
  setConnected(!state.connected);
  sendCommand(state.connected ? 'connect' : 'disconnect');
});
el('btn-grip-open').addEventListener('click', ()=>sendCommand('grip:open'));
el('btn-grip-close').addEventListener('click', ()=>sendCommand('grip:close'));
el('btn-pick').addEventListener('click', ()=>sendCommand('arm:pick'));
el('btn-drop').addEventListener('click', ()=>sendCommand('arm:drop'));

// Shoulder dial (slowed updates)
(function setupDial(){
  const dial = el('dial');
  const knob = el('dial-knob');
  const val = el('dial-value');
  let rect, center, radius, dragging=false;

  function updateGeometry(){
    rect = dial.getBoundingClientRect();
    center = {x: rect.left + rect.width/2, y: rect.top + rect.height/2};
    radius = rect.width/2 - 10;
  }
  updateGeometry();
  window.addEventListener('resize', updateGeometry);

  function setShoulderAngle(angle){
    angle = ((angle % 360) + 360) % 360;
    state.shoulder = angle;
    const theta = (angle - 90) * (Math.PI/180);
    const x = Math.cos(theta) * (radius - 5);
    const y = Math.sin(theta) * (radius - 5);
    knob.style.transform = `translate(${x}px,${y}px)`;
    val.textContent = angle + '°';
  }

  let lastSent = 0;
  function handlePointer(clientX, clientY){
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    let deg = Math.atan2(dy, dx) * 180/Math.PI;
    if(deg < 0) deg += 360;
    deg = Math.round(deg);
    setShoulderAngle(deg);
    let now = Date.now();
    if(now - lastSent > 150){ // throttle sending
      sendCommand('shoulder',{angle:deg});
      lastSent = now;
    }
  }

  dial.addEventListener('touchstart', e=>{ e.preventDefault(); dragging=true; handlePointer(e.touches[0].clientX, e.touches[0].clientY); });
  dial.addEventListener('touchmove', e=>{ e.preventDefault(); if(dragging) handlePointer(e.touches[0].clientX, e.touches[0].clientY); });
  dial.addEventListener('touchend', ()=>{ dragging=false; });
  dial.addEventListener('mousedown', e=>{ dragging=true; handlePointer(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e=>{ if(dragging) handlePointer(e.clientX, e.clientY); });
  window.addEventListener('mouseup', ()=>{ dragging=false; });

  setShoulderAngle(state.shoulder);
})();

// Sliders
[['slider-elbow','val-elbow','elbow'],
 ['slider-wrist','val-wrist','wrist'],
 ['slider-base','val-base','base']]
.forEach(([sliderId,valId,cmd])=>{
  const slider = el(sliderId);
  const label = el(valId);
  slider.addEventListener('input', ()=>{
    label.textContent = slider.value + '°';
  });
  slider.addEventListener('change', ()=>{
    sendCommand(cmd,{angle: slider.value});
  });
});

// Orientation check
(function orientationWatcher(){
  const overlay = el('orientation-overlay');
  function check(){
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    overlay.classList.toggle('hidden', !portrait);
  }
  window.addEventListener('orientationchange', check);
  window.addEventListener('resize', check);
  check();
})();
setConnected(false);
