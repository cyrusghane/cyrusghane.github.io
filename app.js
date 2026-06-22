/* ---- name: gentle staggered entrance (no jiggle) ---- */
(function () {
  var el = document.getElementById("site-name");
  if (!el) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var text = el.textContent;
  el.textContent = "";
  [].forEach.call(text, function (ch, i) {
    var span = document.createElement("span");
    span.textContent = ch.charCodeAt(0) === 32 ? String.fromCharCode(160) : ch;   // nbsp keeps the gap in inline-block
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

/* ---- background: Monet's "Water Lilies", as a pond you can disturb ----
   A WebGL shader paints a soft reflective pond — sky and willow reflections
   over warm light, a few floating lily pads. Move the pointer and the
   reflections gently bend with a soft touch of light beneath the cursor (no
   hard rings). A small control pauses the motion; the choice is remembered.
   Falls back to a painted wash without WebGL; respects reduced motion. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // background motion runs by default (no toggle); OS reduced-motion still disables it
  var motion = !prefersReduce;

  var gl = null;
  try {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false })
      || canvas.getContext("experimental-webgl");
  } catch (e) { gl = null; }

  if (!gl) { fallback2D(); return; }

  var RS = Math.min(window.devicePixelRatio || 1, 1.4);
  var W = 0, H = 0, t = 0, running = false;
  var mouse = { x: -9999, y: -9999 };
  var vel = { x: 0, y: 0 };
  var lastFB = null;

  var VERT = "attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";

  var FRAG = [
    "precision highp float;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "uniform vec2 u_mouse;",
    "uniform vec2 u_vel;",
    "uniform vec3 u_paper;",
    "float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }",
    "float vnoise(vec2 p){",
    "  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);",
    "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
    "  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);",
    "}",
    "float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5; } return s; }",
    "float ell(vec2 p, vec2 c, vec2 r){ vec2 d=(p-c)/r; return length(d); }",
    "void main(){",
    "  vec2 cur = gl_FragCoord.xy / u_res.y;",
    "  float aspect = u_res.x / u_res.y;",
    // cursor stirs a small local eddy that follows the drag — no bodily shift of the scene
    "  vec2 md = cur - u_mouse/u_res.y;",
    "  float lens = exp(-length(md)*6.5);",
    "  vec2 press = vec2(-md.y, md.x) * length(u_vel) * 15.0 * lens;",
    "  vec2 p = cur;",
    "  vec2 q = p*2.3 + press*0.7;",
    "  float n1=fbm(q+vec2(0.0,u_time*0.04));",
    "  float n2=fbm(q*1.7+vec2(5.2,-u_time*0.03));",
    "  float n3=fbm(q*0.8+vec2(11.0,3.0));",
    "  vec3 SAGE=vec3(0.580,0.682,0.576), LEAF=vec3(0.420,0.545,0.420);",
    "  vec3 SKY=vec3(0.620,0.706,0.812), WATER=vec3(0.471,0.580,0.733);",
    "  vec3 LILAC=vec3(0.722,0.667,0.804), GOLD=vec3(0.882,0.800,0.596);",
    "  vec3 col=u_paper;",
    "  col=mix(col, mix(WATER,SKY,n2), smoothstep(0.40,0.86,n1)*0.48);",
    "  col=mix(col, SAGE, smoothstep(0.48,0.92,n2)*0.32);",
    "  col=mix(col, LILAC, smoothstep(0.70,1.0,n3)*0.23);",
    "  col=mix(col, GOLD, smoothstep(0.72,1.0,n1*(0.5+n3))*0.27);",
    "  vec2 lp=p+press;",
    "  vec2 c0=vec2(0.20*aspect+0.10,0.74)+vec2(sin(u_time*0.50)*0.012, cos(u_time*0.43)*0.012);",
    "  vec2 c1=vec2(0.66*aspect,0.46)+vec2(sin(u_time*0.41+1.7)*0.012, cos(u_time*0.50+1.7)*0.012);",
    "  vec2 c2=vec2(0.45*aspect,0.18)+vec2(sin(u_time*0.46+3.1)*0.012, cos(u_time*0.39+3.1)*0.012);",
    "  vec2 c3=vec2(0.85*aspect,0.80)+vec2(sin(u_time*0.44+4.5)*0.012, cos(u_time*0.48+4.5)*0.012);",
    "  vec2 r0=vec2(0.075,0.055), r1=vec2(0.090,0.060), r2=vec2(0.070,0.050), r3=vec2(0.065,0.048);",
    "  float sh=0.0;",
    "  sh+=1.0-smoothstep(0.90,1.10, ell(lp, c0+vec2(0.009,-0.011), r0));",
    "  sh+=1.0-smoothstep(0.90,1.10, ell(lp, c1+vec2(0.009,-0.011), r1));",
    "  sh+=1.0-smoothstep(0.90,1.10, ell(lp, c2+vec2(0.009,-0.011), r2));",
    "  sh+=1.0-smoothstep(0.90,1.10, ell(lp, c3+vec2(0.009,-0.011), r3));",
    "  col=mix(col, col*0.90, clamp(sh,0.0,1.0)*0.5);",
    "  float pads=0.0;",
    "  pads+=1.0-smoothstep(0.85,1.05, ell(lp, c0, r0));",
    "  pads+=1.0-smoothstep(0.85,1.05, ell(lp, c1, r1));",
    "  pads+=1.0-smoothstep(0.85,1.05, ell(lp, c2, r2));",
    "  pads+=1.0-smoothstep(0.85,1.05, ell(lp, c3, r3));",
    "  pads=clamp(pads,0.0,1.0);",
    "  col=mix(col, mix(SAGE, u_paper, 0.10), pads*0.36);",
    "  float bloom=1.0-smoothstep(0.0,0.5, ell(lp, c1, vec2(0.013,0.011)));",
    "  col=mix(col, vec3(0.92,0.74,0.76), bloom*0.45);",
    "  col=mix(u_paper, col, 0.80);",
    // soft touch of light under the cursor (no rings)
    "  col = mix(col, vec3(0.98,0.975,0.95), lens*0.15);",
    "  col += vec3(0.04) * lens;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("shader:", gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { fallback2D(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn("link:", gl.getProgramInfoLog(prog)); fallback2D(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uTime = gl.getUniformLocation(prog, "u_time");
  var uMouse = gl.getUniformLocation(prog, "u_mouse");
  var uPaper = gl.getUniformLocation(prog, "u_paper");
  var uVel = gl.getUniformLocation(prog, "u_vel");

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * RS); canvas.height = Math.floor(H * RS);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform3f(uPaper, 0.965, 0.953, 0.925);
    if (!running) draw();
  }
  resize();
  window.addEventListener("resize", resize);

  function toFB(x, y) { return { x: x * RS, y: canvas.height - y * RS }; }

  window.addEventListener("pointermove", function (e) {
    if (!motion) return;
    var m = toFB(e.clientX, e.clientY);
    mouse.x = m.x; mouse.y = m.y;
    if (lastFB) {
      var cap = canvas.height * 0.05;
      vel.x = Math.max(-cap, Math.min(cap, vel.x + (m.x - lastFB.x)));
      vel.y = Math.max(-cap, Math.min(cap, vel.y + (m.y - lastFB.y)));
    }
    lastFB = m;
  }, { passive: true });

  function draw() {
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform2f(uVel, vel.x / canvas.height, vel.y / canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop() { if (!running) return; t += 0.016; vel.x *= 0.90; vel.y *= 0.90; draw(); requestAnimationFrame(loop); }
  function startLoop() { if (running) return; running = true; requestAnimationFrame(loop); }
  function stopLoop() { running = false; mouse.x = -9999; mouse.y = -9999; vel.x = 0; vel.y = 0; lastFB = null; draw(); }

  function setMotion(on) {
    motion = on;
    try { localStorage.setItem("monet-motion", on ? "1" : "0"); } catch (e) {}
    if (on) startLoop(); else stopLoop();
  }

  buildControl(setMotion, function(){ return motion; });
  if (motion) startLoop(); else draw();

  /* ---- click: a water lily opens in impressionist dabs, then dissolves ----
     Drawn on a light overlay canvas so it stays crisp and never blocks clicks. */
  (function () {
    var fx = document.createElement("canvas");
    fx.setAttribute("aria-hidden", "true");
    fx.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;";
    document.body.appendChild(fx);
    var fxc = fx.getContext("2d");
    var fxW = 0, fxH = 0;
    var blooms = [];
    var fxRunning = false;
    var PETALS = [[238, 215, 220], [220, 212, 231], [245, 233, 216]]; // pale rose / lilac / warm cream
    var bDPR = Math.min(window.devicePixelRatio || 1, 2);

    function fxResize() {
      fxW = window.innerWidth; fxH = window.innerHeight;
      fx.width = Math.floor(fxW * bDPR); fx.height = Math.floor(fxH * bDPR);
      fxc.setTransform(bDPR, 0, 0, bDPR, 0, 0);
    }
    fxResize();
    window.addEventListener("resize", fxResize);

    function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

    function drawBloom(b, k) {
      var e = easeOut(k);
      var fade = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      fade = Math.max(0, Math.min(1, fade));
      var R = 14 + e * 46;

      // outer watercolor wash — pigment opening into the water
      var wr = 12 + e * 92;
      var wg = fxc.createRadialGradient(b.x, b.y, 0, b.x, b.y, wr);
      wg.addColorStop(0, "rgba(150, 168, 158, " + (0.05 * fade) + ")");
      wg.addColorStop(1, "rgba(150, 168, 158, 0)");
      fxc.fillStyle = wg;
      fxc.beginPath(); fxc.arc(b.x, b.y, wr, 0, 6.2832); fxc.fill();

      // petals — soft dabs fanning open
      for (var p = 0; p < b.petals; p++) {
        var ang = b.rot + p / b.petals * 6.2832;
        var px = b.x + Math.cos(ang) * R * 0.55;
        var py = b.y + Math.sin(ang) * R * 0.55;
        var c = PETALS[p % PETALS.length];
        var pr = 15 + e * 15;
        fxc.save();
        fxc.translate(px, py);
        fxc.rotate(ang);
        fxc.scale(1.0, 0.5);
        var g = fxc.createRadialGradient(0, 0, 0, 0, 0, pr);
        g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.38 * fade) + ")");
        g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
        fxc.fillStyle = g;
        fxc.beginPath(); fxc.arc(0, 0, pr, 0, 6.2832); fxc.fill();
        fxc.restore();
      }

      // warm heart of the lily
      var cr = 5 + e * 9;
      var cg = fxc.createRadialGradient(b.x, b.y, 0, b.x, b.y, cr);
      cg.addColorStop(0, "rgba(228, 196, 132, " + (0.46 * fade) + ")");
      cg.addColorStop(1, "rgba(232, 204, 148, 0)");
      fxc.fillStyle = cg;
      fxc.beginPath(); fxc.arc(b.x, b.y, cr, 0, 6.2832); fxc.fill();
    }

    function fxFrame() {
      var now = performance.now();
      fxc.clearRect(0, 0, fxW, fxH);
      for (var i = blooms.length - 1; i >= 0; i--) {
        var b = blooms[i];
        var k = (now - b.t0) / 1500;
        if (k >= 1) { blooms.splice(i, 1); continue; }
        drawBloom(b, k);
      }
      if (blooms.length) { requestAnimationFrame(fxFrame); }
      else { fxRunning = false; fxc.clearRect(0, 0, fxW, fxH); }
    }

    window.addEventListener("click", function (e) {
      if (prefersReduce) return;
      if (e.target && e.target.closest && e.target.closest("a, button")) return;   // let links/controls act without a bloom
      blooms.push({ x: e.clientX, y: e.clientY, t0: performance.now(), rot: (e.clientX * 0.013) % 6.2832, petals: 7 + (e.clientY | 0) % 3 });
      if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxFrame); }
    });
  })();

  /* motion toggle removed — keep a no-op so existing call sites stay harmless */
  function buildControl() {}

  /* ===================== 2D fallback (no WebGL) ===================== */
  function fallback2D() {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, tt = 0, blobs = [], run = motion;
    var COLORS = [[150,173,150],[120,144,184],[150,170,202],[180,166,202],[218,198,150],[120,148,118]];
    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function build() {
      var mind = Math.min(w, h); blobs = [];
      for (var i = 0; i < 10; i++) blobs.push({
        c: COLORS[i % COLORS.length], x: rnd(0.05, 0.95), y: rnd(0.05, 0.95),
        ax: rnd(0.02, 0.05), ay: rnd(0.02, 0.05), sx: rnd(0.05, 0.12), sy: rnd(0.05, 0.12),
        ph: rnd(0, 6.28), r: rnd(0.32, 0.55) * mind, a: rnd(0.16, 0.24)
      });
    }
    function rs() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); build();
    }
    function render() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var cx = (b.x + Math.sin(tt * b.sx + b.ph) * b.ax) * w;
        var cy = (b.y + Math.cos(tt * b.sy + b.ph) * b.ay) * h;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        g.addColorStop(0, rgba(b.c, b.a)); g.addColorStop(0.55, rgba(b.c, b.a * 0.4)); g.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = g; ctx.fillRect(cx - b.r, cy - b.r, b.r * 2, b.r * 2);
      }
    }
    function fbLoop() { if (!run) return; tt += 0.0022; render(); requestAnimationFrame(fbLoop); }
    function setMotionFB(on) {
      motion = on; run = on;
      try { localStorage.setItem("monet-motion", on ? "1" : "0"); } catch (e) {}
      if (on) requestAnimationFrame(fbLoop); else render();
    }
    rs(); window.addEventListener("resize", function(){ rs(); if(!run) render(); });
    buildControl(setMotionFB, function(){ return motion; });
    if (run && !prefersReduce) requestAnimationFrame(fbLoop); else render();
  }
})();
