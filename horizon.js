/* v2/horizon — finds the painting's horizon on this screen, hangs the words from it, and drives the loupe if there is one */
(function(){
  var horizon=document.querySelector('.horizon'), cluster=document.querySelector('.cluster');
  var loupe=document.querySelector('.loupe'), glass=loupe&&loupe.querySelector('.glass');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse=matchMedia('(hover: none)').matches;
  var PY=0.44, HZ=0.545, Z=1.3;   /* .scene's "center 44%"; the horizon sits 54.5% down the painting; Z = how much closer the loupe looks */
  var IW=1495, IH=1014;           /* assets/oxbow.jpg */
  var vw,vh,W,H,ox,oy,half,inner, rest={x:0,y:0}, cx=0,cy=0,tx=0,ty=0, t0=performance.now();

  function layout(){
    vw=innerWidth; vh=innerHeight;
    var s=Math.max(vw/IW, vh/IH);          /* background-size: cover */
    W=IW*s; H=IH*s; ox=(vw-W)/2; oy=(vh-H)*PY;
    var y=Math.round(oy+HZ*H);
    horizon.style.top=y+'px'; cluster.style.top=y+'px';
    if(document.body.classList.contains('inner')){   /* inner pages: the stage grows with the list; the foot follows in flow */
      var rem=parseFloat(getComputedStyle(document.documentElement).fontSize);
      document.querySelector('.stage').style.height=Math.max(vh, y+cluster.offsetHeight+3.6*rem)+'px';
    }
    if(!loupe) return;
    var S=loupe.offsetWidth; half=S/2; inner=S-2;
    glass.style.backgroundSize=(W*Z)+'px '+(H*Z)+'px';
    rest.x=ox+0.66*W; rest.y=oy+0.70*H;    /* the loupe rests on the river bend */
    if(vw<720){ rest.x=vw*0.62; rest.y=y-0.22*vh; }   /* phones: the words fill the land, so rest in the sky */
    rest.x=Math.min(Math.max(rest.x,half+12),vw-half-12);
    rest.y=Math.min(Math.max(rest.y,half+12),vh-half-12);
  }
  layout();
  addEventListener('resize',layout);
  if(!loupe) return;

  cx=tx=rest.x; cy=ty=rest.y;
  addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; tx=e.clientX; ty=e.clientY; });
  document.documentElement.addEventListener('mouseleave',function(){ tx=rest.x; ty=rest.y; });

  function frame(now){
    if(coarse && !reduce){ var t=(now-t0)/1000; tx=rest.x+vw*0.05*Math.sin(t*0.13); ty=rest.y+vh*0.04*Math.sin(t*0.19+1.3); }
    var k=reduce?1:0.11; cx+=(tx-cx)*k; cy+=(ty-cy)*k;
    loupe.style.transform='translate3d('+(cx-half)+'px,'+(cy-half)+'px,0)';
    var px=cx-ox, py=cy-oy;                /* the painting-pixel under the loupe's centre */
    glass.style.backgroundPosition=(inner/2-px*Z)+'px '+(inner/2-py*Z)+'px';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
