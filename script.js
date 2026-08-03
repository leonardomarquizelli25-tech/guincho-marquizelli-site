(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  const progress = document.querySelector(".scroll-progress span");
  const wipe = document.querySelector(".page-wipe");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const closeMenu = () => {
    body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Abrir menu");
  };

  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    body.classList.toggle("menu-open", !isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
  });

  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 960) closeMenu();
  });

  let ticking = false;
  const updateScrollUI = () => {
    const top = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle("is-scrolled", top > 24);
    if (progress) {
      progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(top / scrollable, 1) : 0})`;
    }
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }, { passive: true });
  updateScrollUI();

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const current = link.getAttribute("href") === `#${entry.target.id}`;
          if (current) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const fallbackMotion = () => {
    root.classList.add("no-gsap");
    if (wipe) wipe.style.display = "none";
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    const animated = new WeakSet();
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || animated.has(entry.target)) return;
        animated.add(entry.target);
        entry.target.animate([
          { opacity: 0, transform: "translateY(32px)" },
          { opacity: 1, transform: "translateY(0)" }
        ], { duration: 650, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
        instance.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
  };

  const initGsap = () => {
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      fallbackMotion();
      return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
    intro
      .to(wipe, { xPercent: 112, duration: 1.05, ease: "power4.inOut", delay: 0.08 })
      .from(header, { yPercent: -110, duration: 0.75 }, "-=0.6")
      .from(".hero-kicker", { y: 20, opacity: 0, duration: 0.55 }, "-=0.45")
      .from(".title-line > span", { yPercent: 115, duration: 0.9, stagger: 0.08 }, "-=0.3")
      .from(".hero-lead, .hero-actions", { y: 32, opacity: 0, duration: 0.75, stagger: 0.12 }, "-=0.55")
      .from(".hero-stamp, .scroll-cue", { opacity: 0, y: 20, duration: 0.55, stagger: 0.1 }, "-=0.45")
      .set(wipe, { display: "none" });

    gsap.to(".hero-media img", {
      yPercent: 12,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.to(".hero-angle", {
      xPercent: 18,
      yPercent: -8,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1
      }
    });

    gsap.utils.toArray("[data-reveal]").forEach((element) => {
      if (element.closest(".hero")) return;
      gsap.from(element, {
        y: 58,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true
        }
      });
    });

    gsap.to(".story-media img", {
      yPercent: 9,
      ease: "none",
      scrollTrigger: {
        trigger: ".brand-story",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.to(".story-shape", {
      xPercent: 12,
      ease: "none",
      scrollTrigger: {
        trigger: ".brand-story",
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    });

    gsap.utils.toArray(".fleet-card img").forEach((image) => {
      gsap.fromTo(image, { scale: 1.08 }, {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: image,
          start: "left right",
          end: "right left",
          scrub: true,
          horizontal: true
        }
      });
    });

    const matchMedia = gsap.matchMedia();
    matchMedia.add("(min-width: 960px)", () => {
      const track = document.querySelector(".fleet-track");
      const pin = document.querySelector(".fleet-pin");
      if (!track || !pin) return undefined;

      const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.08);
      const horizontal = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${getDistance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      return () => horizontal.kill();
    });

    gsap.to(".coverage-word", {
      xPercent: -10,
      ease: "none",
      scrollTrigger: {
        trigger: ".coverage",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh, { once: true });
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
  };

  try {
    initGsap();
  } catch (_error) {
    fallbackMotion();
  }
})();
