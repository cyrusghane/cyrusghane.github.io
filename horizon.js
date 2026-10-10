/* horizon — drives the loupe on the landing (the clock is below) */
(function(){
  var loupe=document.querySelector('.loupe'), glass=loupe&&loupe.querySelector('.glass');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse=matchMedia('(hover: none)').matches;
  var PY=0.44, Z=1.3;             /* .scene's "center 44%"; Z = how much closer the loupe looks */
  var IW=1495, IH=1014;           /* assets/oxbow-mono.jpg */
  var vw,vh,W,H,ox,oy,half,inner, rest={x:0,y:0}, cx=0,cy=0,tx=0,ty=0, t0=performance.now(), last=t0, on=false;
  var TAU=40;                     /* ms the loupe takes to close most of the gap to the cursor — smaller is tighter */

  function layout(){
    vw=innerWidth; vh=innerHeight;
    var s=Math.max(vw/IW, vh/IH);          /* background-size: cover */
    W=IW*s; H=IH*s; ox=(vw-W)/2; oy=(vh-H)*PY;
    if(!loupe) return;
    var S=202, m=Math.max(40,vw*0.07), id=document.querySelector('.id'), ph=document.querySelector('.portrait');
    rest.x=vw-S/2-m; rest.y=Math.max(vh*0.21,84+S/2);   /* the loupe rests in the sky: right of the column, below the strip */
    if(id){                                /* …but never over the name and the portrait: where the screen is narrow it shrinks to fit above them */
      var top=id.getBoundingClientRect().top+scrollY, right=(ph||id).getBoundingClientRect().right;
      if(!(rest.x-S/2>right+16 || rest.y+S/2<top-8)){ S=Math.min(202,top-8-84); rest.x=vw-S/2-m; rest.y=84+S/2; }
    }
    loupe.style.display=S>=110?'':'none'; loupe.style.width=loupe.style.height=S+'px';
    S=loupe.offsetWidth; half=S/2; inner=S-2;
    if(!S) return;                         /* phones, or no room: the loupe is hidden, so its width reads 0 and there is nothing to place */
    glass.style.backgroundSize=(W*Z)+'px '+(H*Z)+'px';
    rest.x=Math.min(Math.max(rest.x,half+12),vw-half-12);
    rest.y=Math.min(Math.max(rest.y,half+12),vh-half-12);
    if(!on){ on=true; cx=tx=rest.x; cy=ty=rest.y; loupe.style.transform='translate3d('+(cx-half)+'px,'+(cy-half)+'px,0)'; requestAnimationFrame(frame); }   /* start the loupe — or restart it when a phone-sized window grows */
  }
  layout();
  addEventListener('resize',layout);
  if(document.fonts) document.fonts.ready.then(layout);   /* the name grows when its font arrives, so place the loupe again */
  if(!loupe) return;

  addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; tx=e.clientX; ty=e.clientY; });
  document.documentElement.addEventListener('mouseleave',function(){ tx=rest.x; ty=rest.y; });

  function frame(now){
    if(!half){ on=false; return; }         /* the loupe is hidden: stop here until layout() starts it again */
    var dt=Math.min(now-last,50); last=now;   /* clamped: a tab coming back from the background should glide, not jump */
    if(coarse && !reduce){ var t=(now-t0)/1000; tx=rest.x+vw*0.03*Math.sin(t*0.13); ty=rest.y+vh*0.03*Math.sin(t*0.19+1.3); }
    var k=reduce?1:1-Math.exp(-dt/TAU); cx+=(tx-cx)*k; cy+=(ty-cy)*k;   /* the same feel at 60 and 120 Hz */
    loupe.style.transform='translate3d('+(cx-half)+'px,'+(cy-half)+'px,0)';
    var px=cx-ox, py=cy-oy;                /* the painting-pixel under the loupe's centre */
    glass.style.backgroundPosition=(inner/2-px*Z)+'px '+(inner/2-py*Z)+'px';
    requestAnimationFrame(frame);
  }
})();
/* the strip: the date and the hour in New Haven, ticking */
(function(){
  var dateEl=document.getElementById('date'), clockEl=document.getElementById('clock');
  if(!dateEl||!clockEl) return;
  var TZ='America/New_York';
  function tick(){
    var now=new Date(), p={};
    new Intl.DateTimeFormat('en-US',{timeZone:TZ,month:'numeric',day:'numeric',year:'numeric'}).formatToParts(now).forEach(function(x){ p[x.type]=x.value; });
    dateEl.textContent=p.month+'.'+p.day+'.'+p.year;
    var t=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    clockEl.innerHTML=t.split('').map(function(ch){ return ch===':' ? '<span class="c">:</span>' : '<span class="d">'+ch+'</span>'; }).join('');
  }
  tick(); setInterval(tick,1000);
})();
