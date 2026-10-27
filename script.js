(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const scenes = [...document.querySelectorAll('.scene[data-page]')];
  const intro = $('#intro'), music = $('#bgMusic'), canvas = $('#fireworks');
  const ctx = canvas.getContext('2d', { alpha: true });
  const nightSky = $('#nightSky'), stars = $('#stars'), puddles = $('#puddles');
  const letter = $('#letterWrap'), letterCopy = $('#letterCopy'), letterHint = $('#letterHint'), toast = $('#toast');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pageTimes = {1:7200,2:8500,3:7800,5:7800,6:5200,7:8000,8:5200,9:6000,10:5400};
  const letterText = "happy birthday, cika!!!! i'm not great at making these things sound all deep and poetic, so i'll just say this: i'm really glad i get to celebrate you again. hope this year brings you good days, stupid laughs, kind people, and plans that actually work out for once. keep being you, twin. have the best day, okay?";
  const dotFrames = ['.','..','...','....'];
  const dotEls = [...document.querySelectorAll('.loading-dots')];
  const palettes = [['#ff4d8d','#ffb3d1','#fff4fa','#ff7a59'],['#ffca58','#fff0a6','#ff8b42','#fffdf0'],['#60e8ff','#77aaff','#e5fbff','#8f8bff'],['#8df7b0','#f2ffad','#50d9c8','#f7fff9'],['#bd8cff','#ff8bd1','#8bdcff','#fff0ff'],['#ff5b5b','#ffb34f','#ffe77a','#fff5d6'],['#fff','#c6e3ff','#9faaff','#ffe1f2'],['#ff75c3','#f8a6ff','#9cecff','#fff1a8']];
  let page = 0, started = false, pageTimer = 0, auxTimers = [], typingTimer = 0, typingRun = 0, toastTimer = 0, resizeTimer = 0;
  let particles = [], rockets = [], raf = 0, lastFrame = 0, launchInterval = 0, fireworksRunning = false;
  let shootingActive = false, shootingTimer = 0;

  function later(fn, ms) { const id = setTimeout(fn, ms); auxTimers.push(id); return id; }
  function clearPageTimers() { clearTimeout(pageTimer); pageTimer = 0; auxTimers.forEach(clearTimeout); auxTimers = []; }
  function stopTyping() { typingRun++; clearTimeout(typingTimer); typingTimer = 0; }
  function toastMessage(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); }
  function resizeCanvas() { const dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.floor(innerWidth*dpr); canvas.height = Math.floor(innerHeight*dpr); canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
  function makeStars() { stars.replaceChildren(); const colors = ['#fff','#cce7ff','#ffe7c4','#d9d0ff']; const count = innerWidth < 600 ? 70 : 125; for(let i=0;i<count;i++){const el=document.createElement('span');el.className='star';el.style.setProperty('--x',Math.random()*100+'%');el.style.setProperty('--y',Math.random()*100+'%');el.style.setProperty('--size',(Math.random()<.15?2.2:.8+Math.random()*1.2)+'px');el.style.setProperty('--color',colors[Math.floor(Math.random()*colors.length)]);el.style.setProperty('--time',1.5+Math.random()*3.5+'s');el.style.setProperty('--delay',-Math.random()*4+'s');stars.appendChild(el);}}
  function makePuddles() { puddles.replaceChildren(); const count=innerWidth<600?15:24; for(let i=0;i<count;i++){const p=document.createElement('span');p.className='puddle';p.style.setProperty('--x',Math.random()*100+'%');p.style.setProperty('--y',Math.random()*100+'%');p.style.setProperty('--w',38+Math.random()*(innerWidth<600?75:125)+'px');p.style.setProperty('--h',12+Math.random()*24+'px');p.style.setProperty('--duration',4.8+Math.random()*3.7+'s');p.style.setProperty('--delay',-Math.random()*7+'s');puddles.appendChild(p);}}

  // Shooting stars are created on demand for page 11, not left running behind other pages.
  function launchShootingStar() {
    if(!shootingActive || page!==11 || document.hidden) return;
    const el=document.createElement('span'); el.className='shooting-star';
    el.style.setProperty('--x',(5+Math.random()*70)+'%');
    el.style.setProperty('--y',(5+Math.random()*48)+'%');
    el.style.setProperty('--length',(70+Math.random()*55)+'px');
    el.style.setProperty('--angle',(20+Math.random()*18)+'deg');
    el.style.setProperty('--dx',Math.round(innerWidth*(.22+Math.random()*.18))+'px');
    el.style.setProperty('--dy',Math.round(innerHeight*(.13+Math.random()*.11))+'px');
    el.style.setProperty('--duration',(1.05+Math.random()*.55)+'s');
    nightSky.appendChild(el);
    const remove=()=>el.remove(); el.addEventListener('animationend',remove,{once:true});
    // Fallback cleanup for background-tab throttling or interrupted CSS animations.
    setTimeout(remove,2200);
    shootingTimer=setTimeout(launchShootingStar,900+Math.random()*1450);
  }
  function startShootingStars() { stopShootingStars(); if(reducedMotion) return; shootingActive=true; shootingTimer=setTimeout(launchShootingStar,550); }
  function stopShootingStars() { shootingActive=false; clearTimeout(shootingTimer); shootingTimer=0; nightSky.querySelectorAll('.shooting-star').forEach(el=>el.remove()); }
  document.addEventListener('visibilitychange',()=>{if(page===11){if(document.hidden){clearTimeout(shootingTimer);shootingTimer=0;}else if(shootingActive){shootingTimer=setTimeout(launchShootingStar,250);}}});

  function pickPalette(){return palettes[Math.floor(Math.random()*palettes.length)];}
  function burst(x,y,count,power,palette) { const max=innerWidth<600?340:720; count=Math.min(count||60,Math.max(0,max-particles.length)); for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=.65+Math.random()*(power||3.8),life=45+Math.random()*40;particles.push({x,y,px:x,py:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,size:.8+Math.random()*1.6,color:palette[Math.floor(Math.random()*palette.length)],gravity:.025+Math.random()*.025,drag:.988,glow:Math.random()<.25});} }
  function launchRocket(){const palette=pickPalette(),tx=innerWidth*(.12+Math.random()*.76),ty=innerHeight*(.13+Math.random()*.43),sx=tx+(Math.random()-.5)*innerWidth*.18;rockets.push({x:sx,y:innerHeight+10,px:sx,py:innerHeight+10,tx,ty,vx:(tx-sx)/(innerHeight*(.13+Math.random()*.22)),vy:-(5.2+Math.random()*2.2),color:palette[Math.floor(Math.random()*palette.length)],palette,trail:[],age:0});}
  function stopFireworks(clearAll=false){fireworksRunning=false;if(launchInterval){clearInterval(launchInterval);launchInterval=0;}if(clearAll){rockets=[];particles=[];if(raf)cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);}}
  function frame(now){if(now-lastFrame<30){raf=requestAnimationFrame(frame);return;}lastFrame=now;ctx.clearRect(0,0,innerWidth,innerHeight);
    for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.px=r.x;r.py=r.y;r.trail.push({x:r.x,y:r.y});if(r.trail.length>8)r.trail.shift();r.x+=r.vx;r.y+=r.vy;r.vy+=.035;r.age++;if(r.trail.length>1){ctx.beginPath();ctx.moveTo(r.trail[0].x,r.trail[0].y);for(let j=1;j<r.trail.length;j++)ctx.lineTo(r.trail[j].x,r.trail[j].y);ctx.strokeStyle=r.color;ctx.lineWidth=1.5;ctx.globalAlpha=.5;ctx.stroke();}ctx.globalAlpha=.95;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r.x,r.y,1.7,0,Math.PI*2);ctx.fill();if(r.y<=r.ty||r.vy>=0||r.age>110){burst(r.x,r.y,innerWidth<600?34+Math.random()*16:58+Math.random()*34,2.8+Math.random()*2.1,r.palette);rockets.splice(i,1);}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.px=p.x;p.py=p.y;p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.vx*=p.drag;p.vy*=p.drag;p.life--;const a=Math.max(0,p.life/p.max);ctx.globalAlpha=a*.72;ctx.strokeStyle=p.color;ctx.lineWidth=p.glow?1.2:.8;ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=a;ctx.fillStyle=p.color;if(p.glow){ctx.shadowBlur=7;ctx.shadowColor=p.color;}ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(p.life<=0)particles.splice(i,1);}
    ctx.globalAlpha=1;if(rockets.length||particles.length||fireworksRunning)raf=requestAnimationFrame(frame);else{ctx.clearRect(0,0,innerWidth,innerHeight);raf=0;}}
  function startFireworks(duration=3000,rate=2){if(reducedMotion)return;fireworksRunning=true;if(!raf)raf=requestAnimationFrame(frame);if(launchInterval)clearInterval(launchInterval);launchRocket();launchInterval=setInterval(()=>{if(!fireworksRunning)return;const count=innerWidth<600?Math.max(1,Math.ceil(rate/2)):rate+(Math.random()<.25?1:0);for(let i=0;i<count;i++)launchRocket();},innerWidth<600?680:540);later(()=>stopFireworks(),duration);}

  function typeLetter(){stopTyping();const run=typingRun;let i=0;letterCopy.textContent='';letterCopy.classList.remove('done');letterHint.textContent='just a sec...';function step(){if(run!==typingRun||page!==4)return;if(i>=letterText.length){letterCopy.classList.add('done');letterHint.textContent='hope that made you smile :)';pageTimer=setTimeout(()=>showPage(5),5200);return;}letterCopy.textContent+=letterText.charAt(i++);typingTimer=setTimeout(step,55);}step();}
  function showPage(n){clearPageTimers();stopTyping();page=Math.max(1,Math.min(13,n));intro.classList.remove('active');scenes.forEach(s=>s.classList.toggle('active',Number(s.dataset.page)===page));
    if(page!==11){nightSky.classList.remove('show');stopShootingStars();}
    if(page!==12&&page!==13)puddles.classList.remove('show');
    if(![1,3,11].includes(page))stopFireworks(page>=12);
    if(page===1)startFireworks(3900,2); if(page===3)startFireworks(4500,3);
    if(page===4){letter.classList.remove('open');letterCopy.textContent='';letterCopy.classList.remove('done');letterHint.textContent='just a sec...';later(()=>{letter.classList.add('open');typeLetter();},1300);return;}
    if(page===11){puddles.classList.remove('show');makeStars();nightSky.classList.add('show');startShootingStars();startFireworks(9500,2);pageTimer=setTimeout(()=>showPage(12),10200);return;}
    if(page===12){nightSky.classList.remove('show');stopShootingStars();stopFireworks(true);later(()=>{makePuddles();puddles.classList.add('show');},1100);pageTimer=setTimeout(()=>showPage(13),13200);return;}
    if(page===13){nightSky.classList.remove('show');makePuddles();puddles.classList.add('show');stopFireworks(true);return;}
    pageTimer=setTimeout(()=>showPage(page+1),pageTimes[page]||7500);
  }
  function begin(){if(started)return;started=true;showPage(1);}
  function reset(){clearPageTimers();stopTyping();stopShootingStars();stopFireworks(true);puddles.classList.remove('show');nightSky.classList.remove('show');letter.classList.remove('open');letterCopy.textContent='';letterCopy.classList.remove('done');started=true;showPage(1);}

  let dotIndex=0;function animateDots(){dotEls.forEach(el=>el.textContent=dotFrames[dotIndex]);dotIndex=(dotIndex+1)%dotFrames.length;}animateDots();setInterval(animateDots,450);
  resizeCanvas();makeStars();window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeCanvas();if(page===11)makeStars();},150);},{passive:true});
  $('#musicYes').addEventListener('click',async()=>{music.volume=.3;try{await music.play();}catch(e){toastMessage('Could not play the song. Check the file path.');}begin();});
  $('#musicNo').addEventListener('click',()=>{music.pause();begin();});$('#replayBtn').addEventListener('click',reset);
})();
