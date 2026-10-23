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
