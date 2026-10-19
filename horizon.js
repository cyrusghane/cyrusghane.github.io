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
