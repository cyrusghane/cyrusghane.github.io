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
/* contact: on a desktop, clicking an email link copies the address instead of opening a mail app — phones keep mailto */
(function(){
  if(!navigator.clipboard || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="mailto:"]'),function(a){
    var address=a.getAttribute('href').slice(7).split('?')[0], tip=a.querySelector('.eh-tip'), timer;
    if(!tip){   /* every email link whispers the address on hover, the way "Email" in the bio already does */
      tip=document.createElement('span'); tip.className='eh-tip'; tip.setAttribute('aria-hidden','true'); tip.textContent=address;
      a.classList.add('email-hint'); a.appendChild(tip);
    }
    a.addEventListener('click',function(e){
      e.preventDefault();
      navigator.clipboard.writeText(address).then(function(){
        tip.textContent='copied'; a.classList.add('copied'); clearTimeout(timer);
        timer=setTimeout(function(){ a.classList.remove('copied'); tip.textContent=address; },1500);
      },function(){ location.href=a.href; });   /* no clipboard after all: open mail */
    });
  });
})();

/* the light on the land follows the real New Haven sunrise and sunset (the NOAA approximation): --night, --gold; recomputed every minute */
(function(){
  var land=document.querySelector('.land'); if(!land) return;
  var LAT=41.3083,LON=-72.9279,TZ='America/New_York',rad=Math.PI/180;
  function parts(d){var p={};new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(d).forEach(function(x){p[x.type]=x.value});
    return {y:+p.year,m:+p.month,d:+p.day,h:(+p.hour)%24+(+p.minute)/60};}
  function sunTime(N,tz,rising){
    var lngHour=LON/15,t=N+((rising?6:18)-lngHour)/24,M=0.9856*t-3.289;
    var L=(M+1.916*Math.sin(M*rad)+0.020*Math.sin(2*M*rad)+282.634+720)%360;
    var RA=(Math.atan(0.91764*Math.tan(L*rad))/rad+360)%360; RA=(RA+Math.floor(L/90)*90-Math.floor(RA/90)*90)/15;
    var sinDec=0.39782*Math.sin(L*rad),cosDec=Math.cos(Math.asin(sinDec));
    var cosH=(Math.cos(90.833*rad)-sinDec*Math.sin(LAT*rad))/(cosDec*Math.cos(LAT*rad)); if(cosH>1||cosH<-1) return null;
    var H=(rising?360-Math.acos(cosH)/rad:Math.acos(cosH)/rad)/15;
    var UT=(H+RA-0.06571*t-6.622-lngHour)%24; if(UT<0) UT+=24;
    return ((UT+tz)%24+24)%24;
  }
  function set(){
    var now=new Date(),p=parts(now);
    var tz=Math.round((Date.UTC(p.y,p.m-1,p.d,Math.floor(p.h),Math.round((p.h%1)*60))-now.getTime())/3.6e6*4)/4;   /* the zone's offset in hours */
    var N=Math.round((Date.UTC(p.y,p.m-1,p.d)-Date.UTC(p.y,0,1))/864e5)+1;
    var rise=sunTime(N,tz,true),down=sunTime(N,tz,false); if(rise==null||down==null){rise=6;down=18;}
    var h=p.h;
    if(land){
      var night=Math.min(1,Math.max(0,Math.max(rise+.5-h,h-down+.5)/1.25));     /* 0 by day, 1 from ~45 min after sunset to ~45 min before sunrise */
      var gold=Math.min(1,Math.max(0,1-Math.abs(h-rise))+Math.max(0,1-Math.abs(h-down)));   /* within an hour of sunrise or sunset */
      land.style.setProperty('--night',(night*.22).toFixed(3));land.style.setProperty('--gold',(gold*.14).toFixed(3));
    }
  }
  set();setInterval(set,60000);
})();
/* click the land and it lifts to fill the screen (the whole painting); click again or press Escape and it settles back */
(function(){
  var land=document.querySelector('.land'); if(!land) return;
  var timer;
  function settle(e){ if(e&&e.target!==land) return; /* the caption's fade bubbles its own transitionend */ land.classList.remove('up','down'); land.removeEventListener('transitionend',settle); clearTimeout(timer); }
  land.addEventListener('click',function(){
    if(land.classList.contains('up') && !land.classList.contains('down')){
      land.classList.add('down'); land.addEventListener('transitionend',settle); timer=setTimeout(settle,900);
    } else if(!land.classList.contains('up')){
      land.classList.add('up');
    }
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && land.classList.contains('up') && !land.classList.contains('down')) land.click(); });
})();

/* a hand-drawn arrow from "cloudy days" down to the land: the painting is a view after a thunderstorm */
(function(){
  var svg=document.querySelector('.arrow'),cue=document.querySelector('.cue'),land=document.querySelector('.land'); if(!svg||!cue||!land) return;
  var NS='http://www.w3.org/2000/svg';
  function build(animate){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    if(!matchMedia('(min-width:861px)').matches) return;
    var vw=innerWidth,vh=innerHeight; svg.setAttribute('viewBox','0 0 '+vw+' '+vh);
    var c=cue.getBoundingClientRect(),l=land.getBoundingClientRect();
    var col=document.querySelector('.main').getBoundingClientRect();
    var x0=c.left+c.width*.55,y0=c.top-6,xm=Math.min(col.right+56,vw-24),x1=col.right-110,y1=l.top-7;   /* up out of the word into the gap, over to the margin, down to the land */
    if(y1-y0<140) return;
    /* a cubic curve, walked in small steps with a little tremor so it reads as a pen line */
    var p0=[x0,y0],p1=[col.right+40,y0-64],p2=[xm+34,y0+(y1-y0)*.52],p3=[x1,y1],pts=[],n=40;   /* bulges past the column before it comes down */
    for(var i=0;i<=n;i++){var t=i/n,u=1-t,x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];
      var w=Math.sin(t*23+7)*1.1+Math.sin(t*7.3)*.8;pts.push([x+w,y+w*.6]);}
    var path=document.createElementNS(NS,'path');path.setAttribute('d','M'+pts.map(function(q){return q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' L'));svg.appendChild(path);
    var a=pts[n],b=pts[n-3],ang=Math.atan2(a[1]-b[1],a[0]-b[0]);
    function tip(da){return (a[0]-11*Math.cos(ang+da)).toFixed(1)+' '+(a[1]-11*Math.sin(ang+da)).toFixed(1)}
    var head=document.createElementNS(NS,'path');head.setAttribute('d','M'+tip(.5)+' L'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' L'+tip(-.5));svg.appendChild(head);
    var len=path.getTotalLength();path.style.strokeDasharray=len;
    if(animate){
      path.style.strokeDashoffset=len;head.style.opacity=0;
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        path.style.transition='stroke-dashoffset 1.2s cubic-bezier(.22,.61,.36,1) 1s';path.style.strokeDashoffset=0;
        head.style.transition='opacity .4s ease 2.1s';head.style.opacity=1;});});
    } else { path.style.strokeDashoffset=0; }
  }
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){build(!reduce)}); else build(!reduce);
  addEventListener('resize',function(){build(false)});addEventListener('scroll',function(){build(false)},{passive:true});
})();

/* "surprises" lifts the land; hovering the name redraws the river beneath it */
(function(){
  var land=document.querySelector('.land'),cue=document.querySelector('.cue2'),wm=document.querySelector('.wordmark');
  if(land&&cue) cue.addEventListener('click',function(e){ e.preventDefault(); if(!land.classList.contains('up')) land.click(); });
  if(wm&&matchMedia('(hover:hover)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    var path=wm.querySelector('.mark path');
    wm.addEventListener('mouseenter',function(){ if(!path) return; path.style.animation='none'; path.getBoundingClientRect(); path.style.animation='draw .9s cubic-bezier(.22,.61,.36,1) forwards'; });
  }
})();

/* the land never covers the sidebar: on short windows it gives up height, down to a floor */
(function(){
  var land=document.querySelector('.land'),side=document.querySelector('.side'),body=document.body; if(!land||!side) return;
  function fit(){
    if(!matchMedia('(min-width:721px)').matches){ body.style.removeProperty('--land'); return; }   /* phones: the band sits at the end of the page */
    if(land.classList.contains('up')) return;
    land.classList.add('still');
    body.style.removeProperty('--land');
    var v=getComputedStyle(land).getPropertyValue('--land').trim(),vh=innerHeight;
    var want=/vh$/.test(v)?parseFloat(v)/100*vh:(parseFloat(v)||vh*.3);
    var sideBottom=side.getBoundingClientRect().bottom+scrollY,room=vh-sideBottom-22;
    var h=Math.round(Math.max(Math.min(want,room),Math.min(160,vh*.16)));
    if(h<want-1) body.style.setProperty('--land',h+'px');
    land.getBoundingClientRect(); land.classList.remove('still');
  }
  fit(); addEventListener('resize',fit);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
})();
