/* ---- name: gentle staggered entrance (no jiggle) ---- */
(function () {
  var el = document.getElementById("site-name");
  if (!el) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var text = el.textContent;
  el.textContent = "";
  [].forEach.call(text, function (ch, i) {
    var span = document.createElement("span");
    span.textContent = ch.charCodeAt(0) === 32 ? String.fromCharCode(160) : ch;
    span.setAttribute("aria-hidden", "true");
    if (!reduce) span.style.animation = "letterIn 0.6s cubic-bezier(0.22,0.61,0.36,1) " + (i * 34) + "ms both";
    el.appendChild(span);
  });
})();

/* ---- scroll reveal ---- */
(function () {
  var targets = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    [].forEach.call(targets, function (el) { el.classList.add("visible"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  [].forEach.call(targets, function (el) { io.observe(el); });
})();

/* ---- signature: the canvas, signed by the artist (brush-reveals on scroll) ---- */
(function () {
  var container = document.querySelector(".container");
  if (!container) return;
  var sig = document.createElement("div");
  sig.className = "signature";
  sig.setAttribute("aria-hidden", "true");
  // Monet's Giverny footbridge over the lily pond, drawn as one quiet line.
  sig.innerHTML =
    '<svg viewBox="0 0 230 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A line drawing of the footbridge over a lily pond">' +
      '<path class="ink water" d="M 26 70 Q 115 76 204 70" />' +
      '<path class="ink water" d="M 52 81 Q 115 85 178 81" />' +
      '<ellipse class="pad" cx="74" cy="75" rx="9" ry="3.1" />' +
      '<ellipse class="pad" cx="150" cy="79" rx="6.6" ry="2.5" />' +
      '<path class="ink arch" pathLength="1" d="M 8 46 Q 115 6 222 46" />' +
      '<path class="ink arch arch2" pathLength="1" d="M 8 56 Q 115 22 222 56" />' +
      '<g class="rail">' +
        '<line x1="8" y1="46" x2="8" y2="56" />' +
        '<line x1="46.5" y1="34.2" x2="46.5" y2="46" />' +
        '<line x1="80.8" y1="28" x2="80.8" y2="40.7" />' +
        '<line x1="115" y1="26" x2="115" y2="39" />' +
        '<line x1="149.2" y1="28" x2="149.2" y2="40.7" />' +
        '<line x1="183.5" y1="34.2" x2="183.5" y2="46" />' +
        '<line x1="222" y1="46" x2="222" y2="56" />' +
      '</g>' +
    '</svg>';
  container.appendChild(sig);
  // reveal shortly after load so the brush wipe plays once — robust across fonts/layout/page length
  setTimeout(function () { sig.classList.add("signed"); }, 700);
})();

/* ---- background: a single-ink flow field ----
   Fine streamlines trace an evolving vector field — each is a particle that
   drifts along the field, keeping a short trail. The field turns slowly on
   its own, shifts as you scroll, and bends gently around the cursor; a click
   sends a quiet ripple. Three barely-there tonal washes (green / sand / dusk
   blue) and the paper grain give it depth. It reads as fields and dynamics,
   not decoration. A slider pauses it; the choice is remembered. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // background motion runs by default (no toggle); OS reduced-motion still disables it
  var motion = !prefersReduce;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, t = 0, scrollN = 0, running = false;
  var particles = [];
  var ripples = [];
  var mouse = { x: -9999, y: -9999, active: false };

  var INK = "rgba(48, 52, 44, 0.075)";
  var WASHES = [
    { x: 0.16, y: 0.14, c: [111, 140, 128] },  // green
    { x: 0.84, y: 0.26, c: [178, 150, 120] },  // sand
    { x: 0.52, y: 0.92, c: [120, 134, 162] }   // dusk blue
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawn(stagger) {
    var life = 260 + Math.floor(Math.random() * 340);
    return {
      x: Math.random() * W, y: Math.random() * H, hist: [],
      len: 40 + Math.floor(Math.random() * 42),
      age: stagger ? Math.floor(Math.random() * life) : 0,
      life: life
    };
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.round((W * H) / 4600);
    n = Math.max(120, Math.min(W < 600 ? 170 : 360, n));
    particles = [];
    for (var i = 0; i < n; i++) particles.push(spawn(true));
    for (var w = 0; w < 300; w++) advance(t);   // warm start: present on first paint
    if (!running) draw();
  }

  function angleAt(x, y, te) {
    var a = (Math.sin(x * 0.0026 + te * 0.10)
           + Math.sin(y * 0.0030 - te * 0.083)
           + Math.sin((x - y) * 0.0021 + te * 0.052)
           + Math.sin((x + y) * 0.0017 - te * 0.041)) * 1.15;
    if (mouse.active) {
      var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
      var infl = Math.exp(-d2 / (150 * 150));
      if (infl > 0.01) {
        var tang = Math.atan2(dy, dx) + 1.5708;     // tangent → streamlines bend around cursor
        var ax = Math.cos(a), ay = Math.sin(a);
        var tx = Math.cos(tang), ty = Math.sin(tang);
        var k = infl * 0.7;
        a = Math.atan2(ay + (ty - ay) * k, ax + (tx - ax) * k);
      }
    }
    return a;
  }

  var SPEED = 1.4;
  function advance(te) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = angleAt(p.x, p.y, te);
      p.x += Math.cos(a) * SPEED;
      p.y += Math.sin(a) * SPEED;
      p.age++;
      p.hist.push(p.x, p.y);
      if (p.hist.length > p.len * 2) p.hist.splice(0, p.hist.length - p.len * 2);
      var m = 160;
      if (p.age > p.life || p.x < -m || p.x > W + m || p.y < -m || p.y > H + m) {
        var np = spawn(); p.x = np.x; p.y = np.y; p.hist = []; p.age = 0; p.len = np.len; p.life = np.life;
      }
    }
  }

  function drawWashes() {
    for (var i = 0; i < WASHES.length; i++) {
      var b = WASHES[i];
      var cx = (b.x + Math.sin(t * 0.12 + i * 1.7) * 0.02) * W;
      var cy = (b.y + Math.cos(t * 0.10 + i * 1.7) * 0.02) * H;
      var rad = 0.52 * Math.max(W, H);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + ",0.055)");
      g.addColorStop(1, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawRipples() {
    var now = t;
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      r.age += 1;
      var k = r.age / 90;
      if (k >= 1) { ripples.splice(i, 1); continue; }
      var rad = 16 + k * 150;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, 6.2832);
      ctx.strokeStyle = "rgba(92, 110, 95, " + (1 - k) * 0.12 + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawWashes();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < particles.length; i++) {
      var h = particles[i].hist;
      if (h.length < 6) continue;
      ctx.moveTo(h[0], h[1]);
      for (var j = 2; j < h.length; j += 2) ctx.lineTo(h[j], h[j + 1]);
    }
    ctx.stroke();
    drawRipples();
  }

  function frame() {
    if (!running) return;
    t += 0.0016;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollN = window.scrollY / max;
    advance(t + scrollN * 1.4);
    draw();
    requestAnimationFrame(frame);
  }
  function startLoop() { if (running) return; running = true; requestAnimationFrame(frame); }
  function stopLoop() { running = false; mouse.active = false; mouse.x = -9999; mouse.y = -9999; ripples.length = 0; draw(); }

  window.addEventListener("pointermove", function (e) {
    if (!motion) return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  window.addEventListener("click", function (e) {
    if (!motion) return;
    if (e.target.closest("a, button")) return;
    ripples.push({ x: e.clientX, y: e.clientY, age: 0 });
  });

  function setMotion(on) {
    motion = on;
    try { localStorage.setItem("field-motion", on ? "1" : "0"); } catch (e) {}
    if (on) startLoop(); else stopLoop();
  }

  resize();
  window.addEventListener("resize", resize);
  buildControl(setMotion, function () { return motion; });
  if (motion) startLoop(); else draw();

  /* motion toggle removed — keep a no-op so existing call sites stay harmless */
  function buildControl() {}
})();
