document.addEventListener('DOMContentLoaded', () => {
  // ─── Utility: DPI-aware canvas setup ───────────────────────────────────
  function setupCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const containerWidth = container ? container.clientWidth : width;
    const scale = Math.min(containerWidth / width, 1);
    const displayW = Math.floor(width * scale);
    const displayH = Math.floor(height * scale);

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w: displayW, h: displayH, dpr };
  }

  // ─── TAB SWITCHING LOGIC ───────────────────────────────────────────────
  const tabs = document.querySelectorAll('.sim-tab');
  const panels = document.querySelectorAll('.sim-panel');

  function activateTab(tabName) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    panels.forEach(p => {
      p.style.display = p.dataset.panel === tabName ? 'block' : 'none';
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  // Default: first tab active
  if (tabs.length > 0) activateTab('swarm');

  function isTabVisible(name) {
    const panel = document.querySelector(`.sim-panel[data-panel="${name}"]`);
    return panel && panel.style.display !== 'none';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SIMULATION 1: SWARM MISSION SIMULATOR
  // ═══════════════════════════════════════════════════════════════════════
  (() => {
    const canvas = document.getElementById('sim-swarm');
    if (!canvas) return;
    let { ctx, w, h } = setupCanvas(canvas, 800, 500);
    const btn = document.getElementById('sim-swarm-btn');

    let running = false;
    let startTime = 0;
    let animId = null;

    // ── Targets ──
    function randomTargets() {
      return [
        { x: 150 + Math.random() * 100, y: 200 + Math.random() * 100, detected: false, detectTime: 0 },
        { x: 450 + Math.random() * 150, y: 300 + Math.random() * 100, detected: false, detectTime: 0 },
        { x: 600 + Math.random() * 100, y: 150 + Math.random() * 100, detected: false, detectTime: 0 },
      ];
    }
    let targets = randomTargets();

    // ── Drones ──
    function createDrones() {
      const cx = w / 2;
      const offsets = [
        { x: 0, y: 0 },
        { x: -30, y: -25 },
        { x: 30, y: -25 },
        { x: -60, y: -50 },
        { x: 60, y: -50 },
      ];
      return offsets.map((o, i) => ({
        x: cx + o.x,
        y: 60 + o.y,
        vx: 0,
        vy: 0,
        angle: Math.PI / 2,
        trail: [],
        label: `D${i + 1}`,
        targetAngle: Math.random() * Math.PI * 2,
        sweepTimer: Math.random() * 200,
        converging: false,
        convergeTarget: null,
      }));
    }
    let drones = createDrones();
    let detectedCount = 0;

    // ── Draw helpers ──
    function drawGrid() {
      ctx.strokeStyle = 'rgba(0,212,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    function drawDrone(d, time) {
      const sz = 12;
      // Trail
      ctx.beginPath();
      for (let i = 0; i < d.trail.length; i++) {
        const alpha = (i / d.trail.length) * 0.35;
        if (i === 0) ctx.moveTo(d.trail[i].x, d.trail[i].y);
        else {
          ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.lineTo(d.trail[i].x, d.trail[i].y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(d.trail[i].x, d.trail[i].y);
        }
      }

      // Communication range circle
      ctx.beginPath();
      ctx.arc(d.x, d.y, 120, 0, Math.PI * 2);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(0,212,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Glow
      const pulse = 0.4 + 0.3 * Math.sin(time * 3 + d.x);
      const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, sz * 2.5);
      grd.addColorStop(0, `rgba(0,212,255,${pulse * 0.5})`);
      grd.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(d.x, d.y, sz * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Triangle body
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.beginPath();
      ctx.moveTo(sz, 0);
      ctx.lineTo(-sz * 0.6, -sz * 0.5);
      ctx.lineTo(-sz * 0.6, sz * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#00d4ff';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Label
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = 'rgba(0,212,255,0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, d.x, d.y - 16);
    }

    function drawTarget(t, time) {
      const pulse = 1 + 0.3 * Math.sin(time * 4);
      const color = t.detected ? '#00ff88' : '#ff3344';
      const glowColor = t.detected ? 'rgba(0,255,136,' : 'rgba(255,51,68,';

      // Glow
      const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 18 * pulse);
      grd.addColorStop(0, glowColor + '0.4)');
      grd.addColorStop(1, glowColor + '0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 18 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Detection flash text
      if (t.detected && (time - t.detectTime) < 2.5) {
        const alpha = Math.max(0, 1 - (time - t.detectTime) / 2.5);
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = `rgba(0,255,136,${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('TARGET DETECTED', t.x, t.y - 20);
      }
    }

    function drawCommLines(time) {
      for (let i = 0; i < drones.length; i++) {
        for (let j = i + 1; j < drones.length; j++) {
          const dx = drones[i].x - drones[j].x;
          const dy = drones[i].y - drones[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const alpha = 0.08 + 0.06 * (1 - dist / 200);
            ctx.beginPath();
            ctx.setLineDash([3, 5]);
            ctx.lineDashOffset = -time * 30;
            ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(drones[i].x, drones[i].y);
            ctx.lineTo(drones[j].x, drones[j].y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    function drawScanArc(drone, target) {
      const angle = Math.atan2(target.y - drone.y, target.x - drone.x);
      ctx.beginPath();
      ctx.moveTo(drone.x, drone.y);
      ctx.arc(drone.x, drone.y, 80, angle - 0.25, angle + 0.25);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,255,136,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,255,136,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawAlertLines(drone, time) {
      for (const other of drones) {
        if (other === drone) continue;
        const dist = Math.hypot(other.x - drone.x, other.y - drone.y);
        if (dist < 250) {
          ctx.beginPath();
          ctx.setLineDash([2, 4]);
          ctx.lineDashOffset = -time * 50;
          ctx.strokeStyle = 'rgba(0,255,136,0.15)';
          ctx.lineWidth = 1;
          ctx.moveTo(drone.x, drone.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    function drawHUD(elapsed) {
      ctx.font = 'bold 12px "Courier New", monospace';
      // Top-left
      ctx.textAlign = 'left';
      const blink = Math.sin(elapsed * 4) > 0;
      ctx.fillStyle = blink ? '#00ff88' : '#005533';
      ctx.beginPath();
      ctx.arc(18, 22, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ff88';
      ctx.fillText('MISSION ACTIVE', 28, 26);

      // Top-right
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(Math.floor(elapsed % 60)).padStart(2, '0');
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0,212,255,0.8)';
      ctx.fillText(`${mins}:${secs}`, w - 14, 26);

      // Bottom-left
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,212,255,0.7)';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText('DRONES: 5/5 ACTIVE', 14, h - 14);

      // Bottom-right
      ctx.textAlign = 'right';
      ctx.fillText(`TARGETS: ${detectedCount}/3 FOUND`, w - 14, h - 14);
    }

    // ── Update logic ──
    function updateDrones(elapsed, dt) {
      for (const d of drones) {
        // Phase 1: spread out from V-formation
        if (elapsed < 5) {
          const spreadForce = elapsed / 5;
          d.vx += (Math.random() - 0.5) * 1.5 * spreadForce;
          d.vy += (0.6 + Math.random() * 0.4) * spreadForce;
        }

        // Phase 2: sweep pattern
        d.sweepTimer += dt;
        if (d.sweepTimer > 3 + Math.random() * 2 && !d.converging) {
          d.targetAngle = Math.random() * Math.PI * 2;
          d.sweepTimer = 0;
        }

        if (!d.converging) {
          const desiredVx = Math.cos(d.targetAngle) * 1.2;
          const desiredVy = Math.sin(d.targetAngle) * 1.2;
          d.vx += (desiredVx - d.vx) * 0.02;
          d.vy += (desiredVy - d.vy) * 0.02;
        }

        // Phase 3: converge to detected target
        if (d.converging && d.convergeTarget) {
          const ct = d.convergeTarget;
          const dx = ct.x - d.x;
          const dy = ct.y - d.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 40) {
            d.vx += (dx / dist) * 0.08;
            d.vy += (dy / dist) * 0.08;
          } else {
            d.vx *= 0.95;
            d.vy *= 0.95;
            d.converging = false;
          }
        }

        // Speed clamp
        const speed = Math.hypot(d.vx, d.vy);
        const maxSpeed = 2.5;
        if (speed > maxSpeed) {
          d.vx = (d.vx / speed) * maxSpeed;
          d.vy = (d.vy / speed) * maxSpeed;
        }

        d.x += d.vx;
        d.y += d.vy;

        // Bounce off edges
        const margin = 20;
        if (d.x < margin) { d.x = margin; d.vx = Math.abs(d.vx) + Math.random() * 0.3; }
        if (d.x > w - margin) { d.x = w - margin; d.vx = -Math.abs(d.vx) - Math.random() * 0.3; }
        if (d.y < margin) { d.y = margin; d.vy = Math.abs(d.vy) + Math.random() * 0.3; }
        if (d.y > h - margin) { d.y = h - margin; d.vy = -Math.abs(d.vy) - Math.random() * 0.3; }

        // Angle toward velocity
        if (speed > 0.1) {
          d.angle = Math.atan2(d.vy, d.vx);
        }

        // Trail
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 20) d.trail.shift();

        // Detection check
        for (const t of targets) {
          if (!t.detected && Math.hypot(d.x - t.x, d.y - t.y) < 80) {
            t.detected = true;
            t.detectTime = elapsed;
            detectedCount++;
            // Converge nearby drones
            for (const other of drones) {
              if (Math.hypot(other.x - d.x, other.y - d.y) < 250) {
                other.converging = true;
                other.convergeTarget = t;
              }
            }
          }
        }
      }
    }

    function drawFrame(timestamp) {
      if (!running) return;
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const dt = 1 / 60;

      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));

      // Background
      ctx.fillStyle = '#080c20';
      ctx.fillRect(0, 0, w, h);
      drawGrid();

      updateDrones(elapsed, dt);
      drawCommLines(elapsed);

      // Draw scan arcs for detected targets
      for (const d of drones) {
        for (const t of targets) {
          if (t.detected && Math.hypot(d.x - t.x, d.y - t.y) < 100) {
            drawScanArc(d, t);
            drawAlertLines(d, elapsed);
          }
        }
      }

      for (const t of targets) drawTarget(t, elapsed);
      for (const d of drones) drawDrone(d, elapsed);
      drawHUD(elapsed);

      animId = requestAnimationFrame(drawFrame);
    }

    function drawInitial() {
      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));
      ctx.fillStyle = '#080c20';
      ctx.fillRect(0, 0, w, h);
      drawGrid();
      for (const t of targets) drawTarget(t, 0);
      for (const d of drones) drawDrone(d, 0);

      // Idle HUD
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.fillText('PRESS START MISSION TO BEGIN', w / 2, h / 2);
    }

    function reset() {
      running = false;
      startTime = 0;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      drones = createDrones();
      targets = randomTargets();
      detectedCount = 0;
      drawInitial();
      btn.textContent = 'Start Mission';
    }

    if (btn) {
      btn.addEventListener('click', () => {
        if (!running) {
          running = true;
          startTime = 0;
          btn.textContent = 'Reset Mission';
          animId = requestAnimationFrame(drawFrame);
        } else {
          reset();
        }
      });
    }

    drawInitial();

    // Redraw on resize when visible
    window.addEventListener('resize', () => {
      if (!running && isTabVisible('swarm')) drawInitial();
    });
  })();

  // ═══════════════════════════════════════════════════════════════════════
  //  SIMULATION 2: SELF-TRIGGER SEQUENCE
  // ═══════════════════════════════════════════════════════════════════════
  (() => {
    const canvas = document.getElementById('sim-trigger');
    if (!canvas) return;
    let { ctx, w, h } = setupCanvas(canvas, 800, 500);
    const btn = document.getElementById('sim-trigger-btn');

    let running = false;
    let startTime = 0;
    let animId = null;

    // State
    const GRAPH_X = w * 0.68;
    const GRAPH_W = w * 0.28;
    const GRAPH_Y = 60;
    const GRAPH_H = 160;
    const PANEL_X = w * 0.68;
    const PANEL_W = w * 0.28;

    const motherY = 80;
    const motherW = 120;
    const motherH = 28;
    const childSize = 30;

    let childY, childVy, childX;
    let accelHistory = [];
    let phase = '';
    let propAngle = 0;
    let thrustParticles = [];
    let childVx = 0;
    let ax = 0, ay = 0, az = 0, aNet = 1;
    let triggerFlash = 0;
    let altitude = 1;

    function resetState() {
      childX = w * 0.32;
      childY = motherY + motherH / 2 + 10;
      childVy = 0;
      childVx = 0;
      accelHistory = [];
      phase = 'DOCKED';
      propAngle = 0;
      thrustParticles = [];
      ax = 0; ay = 9.8; az = 0; aNet = 1;
      triggerFlash = 0;
      altitude = 1;
    }
    resetState();

    function drawGradientBg() {
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0a0e27');
      grd.addColorStop(1, '#060a1a');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }

    function drawMothership() {
      const mx = w * 0.32;
      // Wings
      ctx.fillStyle = '#2a3050';
      ctx.beginPath();
      ctx.moveTo(mx - motherW * 0.8, motherY);
      ctx.lineTo(mx - motherW * 0.5, motherY - 8);
      ctx.lineTo(mx - motherW * 0.5, motherY + motherH + 8);
      ctx.lineTo(mx - motherW * 0.8, motherY + motherH);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + motherW * 0.8, motherY);
      ctx.lineTo(mx + motherW * 0.5, motherY - 8);
      ctx.lineTo(mx + motherW * 0.5, motherY + motherH + 8);
      ctx.lineTo(mx + motherW * 0.8, motherY + motherH);
      ctx.closePath();
      ctx.fill();
      // Body
      ctx.fillStyle = '#3a4570';
      ctx.strokeStyle = '#5a6590';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx - motherW / 2, motherY, motherW, motherH, 5);
      ctx.fill();
      ctx.stroke();
      // Label
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = '#8899bb';
      ctx.textAlign = 'center';
      ctx.fillText('MOTHERSHIP', mx, motherY - 8);
    }

    function drawLatch(connected) {
      const mx = w * 0.32;
      const latchY = motherY + motherH;
      if (connected) {
        ctx.fillStyle = '#887744';
        ctx.fillRect(mx - 6, latchY, 12, 12);
        ctx.strokeStyle = '#aa9955';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - 6, latchY, 12, 12);
      } else {
        // Open latch halves
        ctx.fillStyle = '#665533';
        ctx.fillRect(mx - 10, latchY, 6, 8);
        ctx.fillRect(mx + 4, latchY, 6, 8);
      }
    }

    function drawChildDrone(x, y, showProps, time) {
      // Body
      ctx.fillStyle = '#00aadd';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - childSize / 2, y - childSize / 4, childSize, childSize / 2, 3);
      ctx.fill();
      ctx.stroke();

      // Arms
      const armLen = childSize * 0.55;
      ctx.strokeStyle = '#0088aa';
      ctx.lineWidth = 2;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + dir * childSize * 0.3, y - 2);
        ctx.lineTo(x + dir * (childSize * 0.3 + armLen), y - 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + dir * childSize * 0.3, y + 2);
        ctx.lineTo(x + dir * (childSize * 0.3 + armLen), y + 10);
        ctx.stroke();

        // Propellers
        if (showProps && time !== undefined) {
          const positions = [
            { px: x + dir * (childSize * 0.3 + armLen), py: y - 10 },
            { px: x + dir * (childSize * 0.3 + armLen), py: y + 10 },
          ];
          for (const p of positions) {
            const pAng = propAngle + p.px;
            ctx.strokeStyle = 'rgba(0,212,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.px + Math.cos(pAng) * 10, p.py + Math.sin(pAng) * 3);
            ctx.lineTo(p.px - Math.cos(pAng) * 10, p.py - Math.sin(pAng) * 3);
            ctx.stroke();
          }
        }
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffcc';
      ctx.fill();
    }

    function drawThrustParticles() {
      for (let i = thrustParticles.length - 1; i >= 0; i--) {
        const p = thrustParticles[i];
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) { thrustParticles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${150 + Math.floor(p.life * 100)},50,${p.life * 0.6})`;
        ctx.fill();
      }
    }

    function drawAccelGraph(time) {
      const gx = GRAPH_X, gy = GRAPH_Y, gw = GRAPH_W, gh = GRAPH_H;
      // Background
      ctx.fillStyle = 'rgba(10,15,35,0.85)';
      ctx.strokeStyle = 'rgba(0,212,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(gx - 5, gy - 20, gw + 10, gh + 35, 5);
      ctx.fill();
      ctx.stroke();

      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = '#00d4ff';
      ctx.textAlign = 'left';
      ctx.fillText('ACCELEROMETER (g)', gx, gy - 6);

      // Y axis labels
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.font = '8px "Courier New", monospace';
      ctx.textAlign = 'right';
      for (let g = 0; g <= 2; g += 0.5) {
        const ly = gy + gh - (g / 2) * gh;
        ctx.fillText(g.toFixed(1), gx - 4, ly + 3);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,212,255,0.06)';
        ctx.moveTo(gx, ly);
        ctx.lineTo(gx + gw, ly);
        ctx.stroke();
      }

      // Threshold line (0.3g)
      const threshY = gy + gh - (0.3 / 2) * gh;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,50,50,0.6)';
      ctx.lineWidth = 1;
      ctx.moveTo(gx, threshY);
      ctx.lineTo(gx + gw, threshY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'left';
      ctx.fillText('TRIGGER 0.3g', gx + gw - 60, threshY - 4);

      // Data line
      if (accelHistory.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        const maxPts = Math.min(accelHistory.length, Math.floor(gw));
        const startIdx = Math.max(0, accelHistory.length - maxPts);
        for (let i = startIdx; i < accelHistory.length; i++) {
          const px = gx + ((i - startIdx) / maxPts) * gw;
          const py = gy + gh - (Math.min(accelHistory[i], 2) / 2) * gh;
          if (i === startIdx) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    function drawSidePanel(time) {
      const px = PANEL_X, py = GRAPH_Y + GRAPH_H + 40, pw = PANEL_W;

      ctx.fillStyle = 'rgba(10,15,35,0.85)';
      ctx.strokeStyle = 'rgba(0,212,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px - 5, py - 5, pw + 10, 190, 5);
      ctx.fill();
      ctx.stroke();

      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'left';

      // IMU readout
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('IMU READOUT', px, py + 10);

      ctx.fillStyle = 'rgba(200,220,255,0.7)';
      ctx.fillText(`a_x: ${ax.toFixed(2)} m/s²`, px, py + 28);
      ctx.fillText(`a_y: ${ay.toFixed(2)} m/s²`, px, py + 42);
      ctx.fillText(`a_z: ${az.toFixed(2)} m/s²`, px, py + 56);

      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`a_net: ${aNet.toFixed(3)} g`, px, py + 76);

      // Status
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('STATUS:', px, py + 100);
      const statusColors = { DOCKED: '#8888aa', 'FREE-FALL': '#ff4444', TRIGGERED: '#ffcc00', STABILIZING: '#ff8800', ACTIVE: '#00ff88' };
      ctx.fillStyle = statusColors[phase] || '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(phase, px + 55, py + 100);

      // Altitude bar
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('ALTITUDE', px, py + 125);

      const barX = px, barY = py + 132, barW = pw - 10, barH = 12;
      ctx.fillStyle = 'rgba(0,212,255,0.1)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#00d4ff';
      ctx.fillRect(barX, barY, barW * Math.max(0, Math.min(1, altitude)), barH);
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = 'rgba(200,220,255,0.6)';
      ctx.fillText(`${(altitude * 100).toFixed(0)}m`, barX + barW + 4, barY + 10);
    }

    function drawFPVCone(x, y) {
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x - 35, y + 90);
      ctx.lineTo(x + 35, y + 90);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,212,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,212,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function updatePhysics(elapsed) {
      if (elapsed < 1) {
        // Phase 1 - Release
        phase = elapsed < 0.3 ? 'DOCKED' : 'FREE-FALL';
        if (elapsed >= 0.3) {
          childVy += 0.15;
          childY += childVy;
        }
        ax = 0; ay = phase === 'DOCKED' ? 9.8 : 0.5; az = 0;
        aNet = Math.sqrt(ax * ax + ay * ay + az * az) / 9.8;
        altitude = 1 - Math.max(0, (childY - (motherY + motherH / 2 + 10)) / (h - 150));
      } else if (elapsed < 3) {
        // Phase 2 - Free Fall
        phase = 'FREE-FALL';
        childVy += 0.22;
        childY += childVy;
        ax = 0.1 * Math.sin(elapsed * 3);
        ay = 0.8;
        az = 0.05 * Math.cos(elapsed * 5);
        aNet = Math.sqrt(ax * ax + ay * ay + az * az) / 9.8;

        if (aNet < 0.3 && triggerFlash === 0) {
          triggerFlash = elapsed;
          phase = 'TRIGGERED';
        }
        altitude = 1 - Math.max(0, (childY - (motherY + motherH / 2 + 10)) / (h - 150));
      } else if (elapsed < 4.5) {
        // Phase 3 - Motor Activation
        phase = 'STABILIZING';
        childVy *= 0.94;
        childY += childVy;
        propAngle += 0.5;

        const motorProgress = (elapsed - 3) / 1.5;
        ay = 9.8 + motorProgress * 5;
        ax = 0.3 * Math.sin(elapsed * 2);
        az = 0.2 * Math.cos(elapsed * 3);
        aNet = Math.sqrt(ax * ax + ay * ay + az * az) / 9.8;

        // Thrust particles
        if (Math.random() > 0.3) {
          thrustParticles.push({
            x: childX + (Math.random() - 0.5) * 20,
            y: childY + 10,
            vy: 2 + Math.random() * 3,
            r: 2 + Math.random() * 2,
            life: 1,
          });
        }
        altitude = 1 - Math.max(0, (childY - (motherY + motherH / 2 + 10)) / (h - 150));
      } else if (elapsed < 6) {
        // Phase 4 - Stabilization
        phase = 'STABILIZING';
        const hoverY = h * 0.55;
        childVy += (hoverY - childY) * 0.01;
        childVy *= 0.92;
        childY += childVy;
        propAngle += 0.5;
        ax = 0.05 * Math.sin(elapsed); ay = 9.8; az = 0.03;
        aNet = Math.sqrt(ax * ax + ay * ay + az * az) / 9.8;

        if (Math.random() > 0.5) {
          thrustParticles.push({
            x: childX + (Math.random() - 0.5) * 20,
            y: childY + 10,
            vy: 1.5 + Math.random() * 2,
            r: 1.5 + Math.random(),
            life: 0.7,
          });
        }
        altitude = 1 - Math.max(0, (childY - (motherY + motherH / 2 + 10)) / (h - 150));
      } else {
        // Phase 5 - Active mission
        phase = 'ACTIVE';
        const hoverY = h * 0.55;
        childVy += (hoverY - childY) * 0.01;
        childVy *= 0.92;
        childY += childVy;
        childVx = 0.8;
        childX += childVx;
        propAngle += 0.5;
        ax = 0.02; ay = 9.81; az = 0.01;
        aNet = Math.sqrt(ax * ax + ay * ay + az * az) / 9.8;

        if (Math.random() > 0.5) {
          thrustParticles.push({
            x: childX + (Math.random() - 0.5) * 16,
            y: childY + 10,
            vy: 1 + Math.random() * 1.5,
            r: 1 + Math.random(),
            life: 0.5,
          });
        }
        altitude = 1 - Math.max(0, (childY - (motherY + motherH / 2 + 10)) / (h - 150));
      }

      // Clamp child to canvas
      childY = Math.min(childY, h - 40);
      if (childX > w * 0.6) childX = w * 0.6;

      accelHistory.push(aNet);
    }

    function drawFrame(timestamp) {
      if (!running) return;
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));

      drawGradientBg();

      // Stars
      ctx.fillStyle = 'rgba(200,220,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + 13) % w;
        const sy = (i * 53 + 7) % (h * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      updatePhysics(elapsed);
      drawMothership();

      // Latch
      drawLatch(elapsed < 0.3);

      // Thrust particles
      drawThrustParticles();

      // FPV cone in active phase
      if (phase === 'ACTIVE') {
        drawFPVCone(childX, childY);
      }

      // Child drone
      const showProps = elapsed >= 3;
      drawChildDrone(childX, childY, showProps, elapsed);

      // Trigger flash
      if (triggerFlash > 0 && (elapsed - triggerFlash) < 2) {
        const alpha = Math.max(0, 1 - (elapsed - triggerFlash) / 2);
        ctx.font = `bold ${18 + Math.sin(elapsed * 10) * 2}px "Courier New", monospace`;
        ctx.fillStyle = `rgba(255,204,0,${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡ TRIGGER ACTIVATED', w * 0.32, childY - 40);
      }

      // Stabilized label
      if (phase === 'ACTIVE' || (phase === 'STABILIZING' && elapsed > 5.5)) {
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'center';
        ctx.fillText('✓ STABILIZED', childX, childY - 28);
      }

      drawAccelGraph(elapsed);
      drawSidePanel(elapsed);

      animId = requestAnimationFrame(drawFrame);
    }

    function drawInitial() {
      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));
      drawGradientBg();

      ctx.fillStyle = 'rgba(200,220,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + 13) % w;
        const sy = (i * 53 + 7) % (h * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      drawMothership();
      drawLatch(true);
      drawChildDrone(childX, childY, false);
      drawAccelGraph(0);
      drawSidePanel(0);

      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.fillText('PRESS DEPLOY DRONE TO BEGIN SEQUENCE', w * 0.32, h * 0.8);
    }

    function reset() {
      running = false;
      startTime = 0;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      resetState();
      drawInitial();
      btn.textContent = 'Deploy Drone';
    }

    if (btn) {
      btn.addEventListener('click', () => {
        if (!running) {
          running = true;
          startTime = 0;
          btn.textContent = 'Reset';
          animId = requestAnimationFrame(drawFrame);
        } else {
          reset();
        }
      });
    }

    drawInitial();
    window.addEventListener('resize', () => {
      if (!running && isTabVisible('trigger')) drawInitial();
    });
  })();

  // ═══════════════════════════════════════════════════════════════════════
  //  SIMULATION 3: YOLOv5 DETECTION FEED
  // ═══════════════════════════════════════════════════════════════════════
  (() => {
    const canvas = document.getElementById('sim-detection');
    if (!canvas) return;
    let { ctx, w, h } = setupCanvas(canvas, 800, 500);
    const btn = document.getElementById('sim-detection-btn');

    let running = false;
    let startTime = 0;
    let animId = null;
    let scanY = 0;

    // ── Terrain generation (seeded pseudo-random) ──
    function seededRandom(seed) {
      let s = seed;
      return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
      };
    }

    const terrainPatches = [];
    const rng = seededRandom(42);
    // Ground patches
    for (let i = 0; i < 25; i++) {
      terrainPatches.push({
        x: rng() * 800,
        y: rng() * 500,
        w: 30 + rng() * 80,
        h: 30 + rng() * 60,
        color: ['#1a2a1a', '#1e2e18', '#222e20', '#1a261a', '#252e22'][Math.floor(rng() * 5)],
      });
    }
    // Roads
    const roads = [
      { x: 200, y: 0, w: 35, h: 500, color: '#2a2a28' },
      { x: 0, y: 280, w: 800, h: 30, color: '#2a2a28' },
      { x: 500, y: 100, w: 25, h: 300, color: '#282828' },
    ];
    // Buildings
    const buildings = [
      { x: 100, y: 120, w: 55, h: 45, color: '#3a3a38' },
      { x: 400, y: 80, w: 70, h: 50, color: '#353535' },
      { x: 560, y: 200, w: 40, h: 60, color: '#383838' },
      { x: 300, y: 350, w: 50, h: 40, color: '#333333' },
      { x: 650, y: 380, w: 60, h: 45, color: '#363636' },
    ];

    // Detection targets
    const detections = [
      { label: 'person', conf: 0.94, x: 120, y: 180, w: 28, h: 45, color: '#00d4ff', shape: 'person', detected: false, detectAt: 1.2 },
      { label: 'vehicle', conf: 0.91, x: 380, y: 270, w: 60, h: 35, color: '#00ff88', shape: 'vehicle', detected: false, detectAt: 2.5 },
      { label: 'weapon', conf: 0.87, x: 540, y: 230, w: 25, h: 30, color: '#ff3344', shape: 'weapon', detected: false, detectAt: 4.0 },
      { label: 'structure', conf: 0.89, x: 400, y: 85, w: 65, h: 48, color: '#ffaa00', shape: 'structure', detected: false, detectAt: 5.5 },
      { label: 'person', conf: 0.92, x: 650, y: 400, w: 26, h: 42, color: '#00d4ff', shape: 'person', detected: false, detectAt: 7.0 },
    ];

    let detectedCount = 0;

    function drawTerrain() {
      // Base
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(0, 0, w, h);

      // Noise effect
      for (let i = 0; i < 500; i++) {
        const nx = (i * 73 + 11) % w;
        const ny = (i * 47 + 29) % h;
        const alpha = 0.03 + ((i * 13) % 7) * 0.005;
        ctx.fillStyle = `rgba(${20 + (i % 15)},${30 + (i % 10)},${15 + (i % 12)},${alpha})`;
        ctx.fillRect(nx, ny, 3 + (i % 5), 3 + (i % 4));
      }

      for (const p of terrainPatches) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * w / 800, p.y * h / 500, p.w * w / 800, p.h * h / 500);
      }

      for (const r of roads) {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x * w / 800, r.y * h / 500, r.w * w / 800, r.h * h / 500);
      }

      for (const b of buildings) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x * w / 800, b.y * h / 500, b.w * w / 800, b.h * h / 500);
        ctx.strokeStyle = 'rgba(100,100,100,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x * w / 800, b.y * h / 500, b.w * w / 800, b.h * h / 500);
      }
    }

    function drawScanLine(time) {
      scanY = (time * 80) % h;
      const grd = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grd.addColorStop(0, 'rgba(0,255,100,0)');
      grd.addColorStop(0.5, 'rgba(0,255,100,0.06)');
      grd.addColorStop(1, 'rgba(0,255,100,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, scanY - 30, w, 60);

      // Scan line
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.strokeStyle = 'rgba(0,255,100,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawTargetShape(d) {
      const sx = d.x * w / 800;
      const sy = d.y * h / 500;
      const sw = d.w * w / 800;
      const sh = d.h * h / 500;

      if (d.shape === 'person') {
        // Head
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + 6, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,180,160,0.5)';
        ctx.fill();
        // Body
        ctx.beginPath();
        ctx.moveTo(sx + sw / 2, sy + 11);
        ctx.lineTo(sx + sw / 2, sy + sh * 0.6);
        ctx.strokeStyle = 'rgba(200,180,160,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Legs
        ctx.beginPath();
        ctx.moveTo(sx + sw / 2, sy + sh * 0.6);
        ctx.lineTo(sx + sw * 0.3, sy + sh);
        ctx.moveTo(sx + sw / 2, sy + sh * 0.6);
        ctx.lineTo(sx + sw * 0.7, sy + sh);
        ctx.stroke();
        // Arms
        ctx.beginPath();
        ctx.moveTo(sx + sw / 2, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.15, sy + sh * 0.5);
        ctx.moveTo(sx + sw / 2, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.85, sy + sh * 0.5);
        ctx.stroke();
      } else if (d.shape === 'vehicle') {
        ctx.fillStyle = 'rgba(100,110,120,0.6)';
        ctx.beginPath();
        ctx.roundRect(sx + 4, sy + sh * 0.3, sw - 8, sh * 0.6, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(80,90,100,0.5)';
        ctx.fillRect(sx + sw * 0.2, sy + 2, sw * 0.6, sh * 0.35);
      } else if (d.shape === 'weapon') {
        ctx.strokeStyle = 'rgba(180,150,100,0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy + sh - 3);
        ctx.lineTo(sx + sw - 3, sy + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + sw * 0.4, sy + sh * 0.4);
        ctx.lineTo(sx + sw * 0.4, sy + sh * 0.7);
        ctx.stroke();
      } else if (d.shape === 'structure') {
        ctx.fillStyle = 'rgba(120,115,100,0.4)';
        ctx.fillRect(sx + 3, sy + 3, sw - 6, sh - 6);
        ctx.strokeStyle = 'rgba(150,145,130,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);
        // Windows
        for (let wy = 0; wy < 2; wy++) {
          for (let wx = 0; wx < 3; wx++) {
            ctx.fillStyle = 'rgba(180,200,150,0.2)';
            ctx.fillRect(sx + 8 + wx * 18, sy + 8 + wy * 16, 8, 8);
          }
        }
      }
    }

    function drawBoundingBox(d, time) {
      const sx = d.x * w / 800;
      const sy = d.y * h / 500;
      const sw = d.w * w / 800;
      const sh = d.h * h / 500;

      // Animate appearance
      const elapsed = time - d.detectAt;
      const progress = Math.min(1, elapsed / 0.4);
      if (progress <= 0) return;

      const alpha = progress;
      const expandScale = 1 + (1 - progress) * 0.15;

      ctx.save();
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.scale(expandScale, expandScale);
      ctx.translate(-(sx + sw / 2), -(sy + sh / 2));

      // Box
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);

      // Corner brackets
      const cs = 8;
      ctx.lineWidth = 2.5;
      // TL
      ctx.beginPath(); ctx.moveTo(sx - 3, sy - 3 + cs); ctx.lineTo(sx - 3, sy - 3); ctx.lineTo(sx - 3 + cs, sy - 3); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(sx + sw + 3 - cs, sy - 3); ctx.lineTo(sx + sw + 3, sy - 3); ctx.lineTo(sx + sw + 3, sy - 3 + cs); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(sx - 3, sy + sh + 3 - cs); ctx.lineTo(sx - 3, sy + sh + 3); ctx.lineTo(sx - 3 + cs, sy + sh + 3); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(sx + sw + 3 - cs, sy + sh + 3); ctx.lineTo(sx + sw + 3, sy + sh + 3); ctx.lineTo(sx + sw + 3, sy + sh + 3 - cs); ctx.stroke();

      // Label background
      const labelText = `${d.label} ${d.conf.toFixed(2)}`;
      ctx.font = 'bold 10px "Courier New", monospace';
      const tw = ctx.measureText(labelText).width + 8;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillRect(sx - 3, sy - 18, tw, 14);
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = alpha;
      ctx.fillText(labelText, sx + 1, sy - 7);

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawViewfinder() {
      const cs = 20;
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.lineWidth = 1.5;
      // TL
      ctx.beginPath(); ctx.moveTo(8, 8 + cs); ctx.lineTo(8, 8); ctx.lineTo(8 + cs, 8); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(w - 8 - cs, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + cs); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(8, h - 8 - cs); ctx.lineTo(8, h - 8); ctx.lineTo(8 + cs, h - 8); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(w - 8 - cs, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - cs); ctx.stroke();

      // Center crosshair
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = 'rgba(0,212,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12); ctx.stroke();

      // Small grid crosshair detail
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,212,255,0.25)';
      ctx.stroke();
    }

    function drawHUD(time) {
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'left';

      // Top-left info
      ctx.fillStyle = 'rgba(0,212,255,0.85)';
      ctx.fillText('YOLOv5 INFERENCE', 18, 30);
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = 'rgba(0,212,255,0.6)';
      ctx.fillText(`FPS: ${detectedCount > 0 ? 28 : '--'}`, 18, 46);
      ctx.fillText(`OBJECTS: ${detectedCount}`, 18, 60);
      if (detectedCount > 0) {
        const avgConf = detections.filter(d => d.detected).reduce((s, d) => s + d.conf, 0) / detectedCount;
        ctx.fillText(`CONFIDENCE AVG: ${avgConf.toFixed(2)}`, 18, 74);
      }

      // Recording indicator
      if (Math.sin(time * 3) > 0) {
        ctx.beginPath();
        ctx.arc(w - 22, 24, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3344';
        ctx.fill();
      }
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText('REC', w - 32, 28);

      // Timestamp
      ctx.fillText(new Date().toISOString().substr(11, 8), w - 18, h - 16);
    }

    function drawFrame(timestamp) {
      if (!running) return;
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));

      drawTerrain();
      drawScanLine(elapsed);

      // Draw all target shapes always
      for (const d of detections) {
        drawTargetShape(d);
      }

      // Detect and draw bounding boxes
      detectedCount = 0;
      for (const d of detections) {
        if (elapsed >= d.detectAt) {
          if (!d.detected) d.detected = true;
          detectedCount++;
          drawBoundingBox(d, elapsed);
        }
      }

      drawViewfinder();
      drawHUD(elapsed);

      animId = requestAnimationFrame(drawFrame);
    }

    function drawInitial() {
      ({ ctx, w, h } = setupCanvas(canvas, 800, 500));
      drawTerrain();

      for (const d of detections) drawTargetShape(d);

      drawViewfinder();

      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.fillText('PRESS START SCAN TO BEGIN DETECTION', w / 2, h / 2);
    }

    function reset() {
      running = false;
      startTime = 0;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      detectedCount = 0;
      for (const d of detections) d.detected = false;
      drawInitial();
      btn.textContent = 'Start Scan';
    }

    if (btn) {
      btn.addEventListener('click', () => {
        if (!running) {
          running = true;
          startTime = 0;
          btn.textContent = 'Reset';
          animId = requestAnimationFrame(drawFrame);
        } else {
          reset();
        }
      });
    }

    drawInitial();
    window.addEventListener('resize', () => {
      if (!running && isTabVisible('detection')) drawInitial();
    });
  })();
});
