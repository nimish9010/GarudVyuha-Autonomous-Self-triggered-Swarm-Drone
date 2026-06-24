document.addEventListener('DOMContentLoaded', () => {

  // ─────────────────────────────────────────────
  // 1. DRONE SWARM PARTICLE SYSTEM
  // ─────────────────────────────────────────────
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 90;
    const CONNECTION_DIST = 150;

    const resizeCanvas = () => {
      heroCanvas.width = heroCanvas.parentElement?.offsetWidth || window.innerWidth;
      heroCanvas.height = heroCanvas.parentElement?.offsetHeight || window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      constructor() {
        this.x = Math.random() * heroCanvas.width;
        this.y = Math.random() * heroCanvas.height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 1.8 + 0.8;
        this.opacity = Math.random() * 0.5 + 0.4;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > heroCanvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > heroCanvas.height) this.vy *= -1;

        this.x = Math.max(0, Math.min(heroCanvas.width, this.x));
        this.y = Math.max(0, Math.min(heroCanvas.height, this.y));
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${this.opacity})`;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const opacity = 1 - dist / CONNECTION_DIST;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${opacity * 0.25})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      drawConnections();
      requestAnimationFrame(animateParticles);
    };

    initParticles();
    animateParticles();
  }

  // ─────────────────────────────────────────────
  // 2. SCROLL-TRIGGERED REVEAL ANIMATIONS
  // ─────────────────────────────────────────────
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  }

  // ─────────────────────────────────────────────
  // 3. ANIMATED NUMBER COUNTERS
  // ─────────────────────────────────────────────
  const counters = document.querySelectorAll('.counter');

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 2000;
    const startTime = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.floor(easedProgress * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target + suffix;
      }
    };

    requestAnimationFrame(tick);
  };

  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    counters.forEach((el) => counterObserver.observe(el));
  }

  // ─────────────────────────────────────────────
  // 4. NAVBAR SCROLL BEHAVIOR
  // ─────────────────────────────────────────────
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');

  const handleNavScroll = () => {
    if (!navbar) return;

    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Highlight active nav link
    let currentSection = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', handleNavScroll);
  handleNavScroll();

  // ─────────────────────────────────────────────
  // 5. MOBILE NAV TOGGLE
  // ─────────────────────────────────────────────
  const navToggle = document.querySelector('.nav-toggle');
  const navLinksContainer = document.querySelector('.nav-links');

  if (navToggle && navLinksContainer) {
    navToggle.addEventListener('click', () => {
      navLinksContainer.classList.toggle('mobile-open');
    });

    // Close mobile menu when a link is clicked
    navLinksContainer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('mobile-open');
      });
    });
  }

  // ─────────────────────────────────────────────
  // 6. ARCHITECTURE LAYER ACCORDION
  // ─────────────────────────────────────────────
  const archLayers = document.querySelectorAll('.arch-layer');

  if (archLayers.length > 0) {
    // Set the first layer as active by default
    archLayers[0].classList.add('active');

    archLayers.forEach((layer) => {
      layer.addEventListener('click', () => {
        const isActive = layer.classList.contains('active');

        archLayers.forEach((l) => l.classList.remove('active'));

        if (!isActive) {
          layer.classList.add('active');
        }
      });
    });
  }

  // ─────────────────────────────────────────────
  // 7. BAR CHART ANIMATION
  // ─────────────────────────────────────────────
  const barFills = document.querySelectorAll('.bar-fill');

  if (barFills.length > 0) {
    // Reset all bars to 0 width initially
    barFills.forEach((bar) => {
      bar.style.width = '0%';
      bar.style.transition = 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });

    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const bars = entry.target.querySelectorAll('.bar-fill');
            bars.forEach((bar, index) => {
              const targetWidth = bar.getAttribute('data-width') || '0';
              setTimeout(() => {
                bar.style.width = targetWidth + '%';
              }, index * 150);
            });
            barObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    // Observe the parent container of bars
    const barContainers = new Set();
    barFills.forEach((bar) => {
      const container = bar.closest('section') || bar.parentElement?.parentElement;
      if (container) barContainers.add(container);
    });

    barContainers.forEach((container) => barObserver.observe(container));
  }

  // ─────────────────────────────────────────────
  // 8. RADAR CHART
  // ─────────────────────────────────────────────
  const radarCanvas = document.getElementById('radar-chart');
  if (radarCanvas) {
    radarCanvas.width = 300;
    radarCanvas.height = 300;
    const rctx = radarCanvas.getContext('2d');

    const labels = ['Person', 'Weapon', 'Vehicle', 'Structure', 'Background', 'Low-Light'];
    const yoloData = [95, 91, 93, 90, 88, 72];
    const cnnData = [88, 82, 85, 87, 90, 65];
    const numAxes = labels.length;
    const centerX = 150;
    const centerY = 135;
    const maxRadius = 100;
    const angleStep = (Math.PI * 2) / numAxes;
    const startAngle = -Math.PI / 2; // Start from top

    // Draw concentric scale hexagons
    const scaleSteps = [0.2, 0.4, 0.6, 0.8, 1.0];
    scaleSteps.forEach((scale) => {
      rctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const angle = startAngle + i * angleStep;
        const x = centerX + Math.cos(angle) * maxRadius * scale;
        const y = centerY + Math.sin(angle) * maxRadius * scale;
        if (i === 0) rctx.moveTo(x, y);
        else rctx.lineTo(x, y);
      }
      rctx.closePath();
      rctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      rctx.lineWidth = 1;
      rctx.stroke();
    });

    // Draw axis lines
    for (let i = 0; i < numAxes; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;
      rctx.beginPath();
      rctx.moveTo(centerX, centerY);
      rctx.lineTo(x, y);
      rctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      rctx.lineWidth = 1;
      rctx.stroke();
    }

    // Draw data polygon helper
    const drawDataPolygon = (data, fillColor, strokeColor) => {
      rctx.beginPath();
      data.forEach((value, i) => {
        const angle = startAngle + i * angleStep;
        const r = (value / 100) * maxRadius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) rctx.moveTo(x, y);
        else rctx.lineTo(x, y);
      });
      rctx.closePath();
      rctx.fillStyle = fillColor;
      rctx.fill();
      rctx.strokeStyle = strokeColor;
      rctx.lineWidth = 2;
      rctx.stroke();

      // Draw data points
      data.forEach((value, i) => {
        const angle = startAngle + i * angleStep;
        const r = (value / 100) * maxRadius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        rctx.beginPath();
        rctx.arc(x, y, 3, 0, Math.PI * 2);
        rctx.fillStyle = strokeColor;
        rctx.fill();
      });
    };

    // Draw YOLOv5 polygon (blue)
    drawDataPolygon(yoloData, 'rgba(0, 212, 255, 0.2)', 'rgba(0, 212, 255, 0.9)');

    // Draw CNN polygon (purple)
    drawDataPolygon(cnnData, 'rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.9)');

    // Draw labels
    rctx.font = '11px "Share Tech Mono", "Courier New", monospace';
    rctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';

    labels.forEach((label, i) => {
      const angle = startAngle + i * angleStep;
      const labelRadius = maxRadius + 20;
      let x = centerX + Math.cos(angle) * labelRadius;
      let y = centerY + Math.sin(angle) * labelRadius;

      // Adjust alignment for edge labels
      if (Math.abs(Math.cos(angle)) > 0.9) {
        rctx.textAlign = Math.cos(angle) > 0 ? 'left' : 'right';
      } else {
        rctx.textAlign = 'center';
      }

      if (Math.sin(angle) < -0.5) {
        y -= 4;
      } else if (Math.sin(angle) > 0.5) {
        y += 4;
      }

      rctx.fillText(label, x, y);
    });

    // Draw legend at the bottom of the canvas
    const legendY = 280;

    // YOLOv5 legend
    rctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
    rctx.fillRect(75, legendY - 5, 12, 12);
    rctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    rctx.font = '11px "Share Tech Mono", "Courier New", monospace';
    rctx.textAlign = 'left';
    rctx.fillText('YOLOv5', 92, legendY + 2);

    // CNN legend
    rctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
    rctx.fillRect(165, legendY - 5, 12, 12);
    rctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    rctx.textAlign = 'left';
    rctx.fillText('CNN', 182, legendY + 2);
  }

  // ─────────────────────────────────────────────
  // 9. SMOOTH SCROLL FOR ANCHOR LINKS
  // ─────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // ─────────────────────────────────────────────
  // 10. TYPING EFFECT ON HERO TAGLINE
  // ─────────────────────────────────────────────
  const heroTagline = document.getElementById('hero-tagline-text');
  if (heroTagline) {
    const fullText = 'Autonomous. Decentralized. Unstoppable.';
    let charIndex = 0;
    heroTagline.textContent = '';

    // Add a blinking cursor span
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';
    cursor.style.cssText =
      'animation: blink-cursor 0.75s step-end infinite; font-weight: 300; opacity: 0.8;';
    heroTagline.parentElement?.appendChild(cursor);

    // Inject keyframe animation for cursor blink if not already present
    if (!document.getElementById('typing-cursor-style')) {
      const style = document.createElement('style');
      style.id = 'typing-cursor-style';
      style.textContent = `
        @keyframes blink-cursor {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const typeChar = () => {
      if (charIndex < fullText.length) {
        heroTagline.textContent += fullText[charIndex];
        charIndex++;
        setTimeout(typeChar, 60);
      }
      // After completion the cursor span keeps blinking via CSS
    };

    // Small initial delay before typing starts
    setTimeout(typeChar, 500);
  }
});
