/* horizon — sets the rule and the words on the landing, and drives the loupe where there is one */
(function(){
  var horizon=document.querySelector('.horizon'), cluster=document.querySelector('.cluster');
  var loupe=document.querySelector('.loupe'), glass=loupe&&loupe.querySelector('.glass');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse=matchMedia('(hover: none)').matches;
  var PY=0.44, Z=1.3;             /* .scene's "center 44%"; Z = how much closer the loupe looks */
  var IW=1495, IH=1014;           /* assets/oxbow.jpg */
  var vw,vh,W,H,ox,oy,half,inner, rest={x:0,y:0}, cx=0,cy=0,tx=0,ty=0, t0=performance.now(), on=false;

  function layout(){
    vw=innerWidth; vh=innerHeight;
    var s=Math.max(vw/IW, vh/IH);          /* background-size: cover */
    W=IW*s; H=IH*s; ox=(vw-W)/2; oy=(vh-H)*PY;
    var isInner=document.body.classList.contains('inner');
    if(!isInner){ var pin=vw>720, yr=Math.round(0.44*vh); horizon.style.top=pin?yr+'px':''; cluster.style.top=pin?yr+'px':''; }   /* the rule sits at 44% of the screen; phones flow instead (see CSS) */   /* landing only: inner pages keep their masthead near the top in CSS */
    if(!loupe) return;
    var S=loupe.offsetWidth; half=S/2; inner=S-2;
    if(!S) return;                         /* phones: the CSS hides the loupe, so its width reads 0 and there is nothing to place */
    glass.style.backgroundSize=(W*Z)+'px '+(H*Z)+'px';
    rest.x=ox+0.80*W; rest.y=oy+0.27*H;    /* the loupe rests in the sky, clear of the words */
    rest.x=Math.min(Math.max(rest.x,half+12),vw-half-12);
    rest.y=Math.min(Math.max(rest.y,half+12),vh-half-12);
    if(!on){ on=true; cx=tx=rest.x; cy=ty=rest.y; requestAnimationFrame(frame); }   /* start the loupe — or restart it when a phone-sized window grows */
  }
  layout();
  addEventListener('resize',layout);
  if(!loupe) return;

  addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; tx=e.clientX; ty=e.clientY; });
  document.documentElement.addEventListener('mouseleave',function(){ tx=rest.x; ty=rest.y; });

  function frame(now){
    if(!half){ on=false; return; }         /* the loupe is hidden: stop here until layout() starts it again */
    if(coarse && !reduce){ var t=(now-t0)/1000; tx=rest.x+vw*0.05*Math.sin(t*0.13); ty=rest.y+vh*0.04*Math.sin(t*0.19+1.3); }
    var k=reduce?1:0.11; cx+=(tx-cx)*k; cy+=(ty-cy)*k;
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
