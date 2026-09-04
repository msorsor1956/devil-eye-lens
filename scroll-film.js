(() => {
  const track = document.querySelector(".film-track");
  const stage = document.querySelector(".film-stage");
  const video = document.querySelector(".scene--film");
  const chapters = [...document.querySelectorAll(".chapter")];
  const navButtons = [...document.querySelectorAll("[data-chapter-jump]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!track || !stage || !video || reducedMotion.matches) return;

  let targetProgress = 0;
  let renderedProgress = 0;
  let lastFrameTime = performance.now();
  let duration = 15;
  let filmReady = false;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const measureProgress = () => {
    const rect = track.getBoundingClientRect();
    const range = Math.max(track.offsetHeight - window.innerHeight, 1);
    targetProgress = clamp(-rect.top / range);
  };

  const chapterOpacity = (progress, start, peak, end) => {
    if (progress <= start || progress >= end) return 0;
    if (progress <= peak) return clamp((progress - start) / (peak - start));
    return clamp((end - progress) / (end - peak));
  };

  const draw = (now) => {
    const seconds = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    const ease = 1 - Math.exp(-seconds * 7.5);
    renderedProgress += (targetProgress - renderedProgress) * ease;

    if (Math.abs(targetProgress - renderedProgress) < 0.00005) {
      renderedProgress = targetProgress;
    }

    const crossfade = filmReady ? clamp(renderedProgress / 0.045) : 0;
    const interfaceOpacity = filmReady ? clamp((renderedProgress - 0.035) / 0.035) : 0;
    const cueOpacity = clamp(1 - Math.abs(renderedProgress - 0.075) / 0.05) * 0.75;

    stage.style.setProperty("--static-opacity", (1 - crossfade).toFixed(4));
    stage.style.setProperty("--film-opacity", crossfade.toFixed(4));
    stage.style.setProperty("--interface-opacity", interfaceOpacity.toFixed(4));
    stage.style.setProperty("--interface-events", interfaceOpacity > 0.8 ? "auto" : "none");
    stage.style.setProperty("--cue-opacity", cueOpacity.toFixed(4));

    if (video.readyState >= 1) {
      duration = Number.isFinite(video.duration) ? video.duration : duration;
      const requestedTime = renderedProgress * Math.max(duration - 0.001, 0);
      if (Math.abs(video.currentTime - requestedTime) > 0.002) {
        video.currentTime = requestedTime;
      }
    }

    let activeIndex = 0;
    let strongestOpacity = -1;
    chapters.forEach((chapter, index) => {
      const opacity = chapterOpacity(
        renderedProgress,
        Number(chapter.dataset.start),
        Number(chapter.dataset.peak),
        Number(chapter.dataset.end)
      );
      chapter.style.setProperty("--chapter-opacity", opacity.toFixed(4));
      if (opacity > strongestOpacity) {
        strongestOpacity = opacity;
        activeIndex = index;
      }
    });

    navButtons.forEach((button, index) => {
      if (index === activeIndex && renderedProgress >= 0.035) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    requestAnimationFrame(draw);
  };

  const jumpToChapter = (progress) => {
    const range = Math.max(track.offsetHeight - window.innerHeight, 1);
    const top = window.scrollY + track.getBoundingClientRect().top;
    window.scrollTo({ top: top + range * progress, behavior: "smooth" });
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => jumpToChapter(Number(button.dataset.chapterJump)));
  });

  video.addEventListener("loadedmetadata", () => {
    filmReady = true;
    track.classList.remove("film-unavailable");
    track.classList.add("film-ready");
    duration = video.duration;
    video.pause();
    measureProgress();
  });

  video.addEventListener("error", () => {
    filmReady = false;
    track.classList.remove("film-ready");
    track.classList.add("film-unavailable");
    stage.style.setProperty("--static-opacity", "1");
    stage.style.setProperty("--film-opacity", "0");
    stage.style.setProperty("--interface-opacity", "0");
    stage.style.setProperty("--interface-events", "none");
  });

  window.addEventListener("scroll", measureProgress, { passive: true });
  window.addEventListener("resize", measureProgress, { passive: true });
  measureProgress();
  requestAnimationFrame(draw);
})();
