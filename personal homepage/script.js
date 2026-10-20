/* ==========================================================
   PROJECTS SLIDESHOW
   - changes project every 5 seconds
   - the active dot fills up to show the time left
   - pauses on hover, keyboard focus, hidden tab and when off-screen
   - arrows, dots, ← → keys and swipe/drag also change project
   - clicking a preview opens the project
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const SLIDE_DURATION = 5000; // milliseconds per project

  const section = document.querySelector('.projects-section');
  if (!section) return;

  const container = section.querySelector('.projects-container');
  const slides = [...section.querySelectorAll('.project-card')];
  const dots = [...section.querySelectorAll('.slide-dot')];
  const prevButton = section.querySelector('.slide-prev');
  const nextButton = section.querySelector('.slide-next');
  const status = section.querySelector('.slide-status');

  if (!slides.length) return;

  const total = slides.length;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let elapsed = 0;       // time spent on the current slide
  let lastTime = null;   // timestamp of the previous animation frame
  let frameId = null;

  // reasons for not advancing
  let userPaused = prefersReducedMotion; // visitors who prefer less motion never get autoplay
  let hovering = false;
  let focusing = false;
  let inView = true;

  /* ---------- Progress (shared with the CSS through --progress) ---------- */
  function setProgress(value) {
    section.style.setProperty('--progress', value.toFixed(4));
  }

  /* ---------- Show one project ---------- */
  function showSlide(index) {
    current = (index + total) % total;
    elapsed = 0;

    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active; // hidden projects can't be reached with Tab
    });

    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', String(active));
    });

    if (status) {
      status.textContent = 'Project ' + (current + 1) + ' of ' + total;
    }

    setProgress(userPaused ? 1 : 0);
  }

  /* ---------- Autoplay loop ---------- */
  function isRunning() {
    return !userPaused && !hovering && !focusing && inView && !document.hidden && total > 1;
  }

  function tick(now) {
    if (lastTime !== null) elapsed += now - lastTime;
    lastTime = now;

    if (elapsed >= SLIDE_DURATION) {
      showSlide(current + 1);
    } else {
      setProgress(elapsed / SLIDE_DURATION);
    }
    frameId = requestAnimationFrame(tick);
  }

  // Call this whenever something that can pause or resume the slideshow changes.
  function sync() {
    cancelAnimationFrame(frameId);
    frameId = null;
    lastTime = null;

    const running = isRunning();
    if (running) frameId = requestAnimationFrame(tick);

    // announce slide changes to screen readers only when nothing is auto-advancing
    if (status) status.setAttribute('aria-live', running ? 'off' : 'polite');

  }

  /* ---------- Buttons and dots ---------- */
  prevButton?.addEventListener('click', () => showSlide(current - 1));
  nextButton?.addEventListener('click', () => showSlide(current + 1));

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => showSlide(index));
  });


  /* ---------- Pause while the visitor is interacting ---------- */
  // mouse only: a tap on a touch screen must not freeze the slideshow
  container.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') {
      hovering = true;
      sync();
    }
  });

  container.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') {
      hovering = false;
      sync();
    }
  });

  // keyboard focus only: clicking a button with the mouse doesn't count
  section.addEventListener('focusin', (event) => {
    if (event.target.matches(':focus-visible')) {
      focusing = true;
      sync();
    }
  });

  section.addEventListener('focusout', (event) => {
    if (!section.contains(event.relatedTarget)) {
      focusing = false;
      sync();
    }
  });

  document.addEventListener('visibilitychange', sync);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.35 }).observe(container);
  }

  /* ---------- Keyboard ---------- */
  section.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(current + 1);
    }
  });

  /* ---------- Swipe (touch) and drag (mouse) ---------- */
  let startX = null;
  let startY = null;
  let swiped = false;

  container.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiped = false;
  });

  container.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    startX = null;
    startY = null;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      showSlide(current + (dx < 0 ? 1 : -1));
    }
  });

  container.addEventListener('pointercancel', () => {
    startX = null;
    startY = null;
  });

  /* ---------- Click (or Enter) on a preview to open the project ---------- */
  slides.forEach((slide) => {
    const preview = slide.querySelector('.project-preview');
    if (!preview || !preview.dataset.href) return;

    function openProject() {
      window.open(preview.dataset.href, '_blank', 'noopener');
    }

    preview.addEventListener('click', () => {
      if (swiped) {
        swiped = false; // that gesture was a swipe, not a click
        return;
      }
      openProject();
    });

    preview.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProject();
      }
    });
  });

  /* ---------- Start ---------- */
  showSlide(0);
  sync();
});