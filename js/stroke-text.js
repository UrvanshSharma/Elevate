/**
 * StrokeText — Dynamic SVG Glyphs with GSAP Stroke Drawing & Fill Reveal
 * Ported from React Bits for Vanilla JS / DOM integration.
 */
(function (global) {
  'use strict';

  let idCounter = 0;

  function getWipeFrames(box, wipeFrom) {
    const end = { x: box.x, y: box.y, width: box.width, height: box.height };
    if (wipeFrom === 'right') return { start: { ...end, x: box.x + box.width, width: 0 }, end };
    if (wipeFrom === 'top') return { start: { ...end, height: 0 }, end };
    if (wipeFrom === 'bottom') return { start: { ...end, y: box.y + box.height, height: 0 }, end };
    return { start: { ...end, width: 0 }, end };
  }

  function getDashPattern(strokeStyle, dashLength, strokeWidth) {
    const width = Math.max(Number(strokeWidth) || 0, 0.1);
    const length = Math.max(Number(dashLength) || 0, 1);
    if (strokeStyle === 'dotted') {
      const gap = Math.max(length, width * 1.8);
      return { array: `0 ${gap}`, period: gap };
    }
    if (strokeStyle === 'dashed') {
      const on = Math.max(length - width, 0.5);
      const off = length * 0.6 + width;
      return { array: `${on} ${off}`, period: on + off };
    }
    return null;
  }

  function createSvgElement(name, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, val] of Object.entries(attrs)) {
      if (val !== undefined && val !== null) {
        el.setAttribute(key, val);
      }
    }
    return el;
  }

  class StrokeText {
    constructor(target, options = {}) {
      this.target = typeof target === 'string' ? document.querySelector(target) : target;
      if (!this.target) {
        console.warn(`[StrokeText] Target not found:`, target);
        return;
      }

      this.options = Object.assign(
        {
          text: 'WITHOUT LIMITS.',
          strokeColor: '#DF493C',
          fillColor: null,
          strokeWidth: 1.4,
          drawDuration: 1.6,
          fillDelay: 0.2,
          stagger: 0.05,
          ease: 'power2.out',
          trigger: 'mount',
          fillMode: 'wipe',
          wipeFrom: 'left',
          fontSize: 128,
          fontWeight: 800,
          fontFamily: 'inherit',
          letterSpacing: -4,
          reverse: false,
          strokeStyle: 'solid',
          dashLength: 10,
          marching: false,
          hoverRedraw: true,
          shadow: false,
          shadowColor: null,
          className: '',
          align: 'left' // 'left' | 'center'
        },
        options
      );

      this.id = `stroke-text-${++idCounter}`;
      this.init();
    }

    init() {
      const {
        text,
        strokeColor,
        fillColor,
        strokeWidth,
        fontSize,
        fontWeight,
        fontFamily,
        letterSpacing,
        strokeStyle,
        dashLength,
        shadow,
        shadowColor,
        fillMode,
        className,
        trigger,
        align
      } = this.options;

      const characters = Array.from(String(text ?? ''));
      const pattern = getDashPattern(strokeStyle, dashLength, strokeWidth);
      const dashArray = pattern ? pattern.array : null;
      const lift = fontSize * 0.06;
      const softness = fontSize * 0.016;
      const castShadow = shadow && fillMode !== 'none';

      // Root wrapper
      const root = document.createElement('span');
      root.className = `stroke-text ${trigger === 'hover' ? 'stroke-text--hover' : ''} ${className}`.trim();
      root.setAttribute('role', 'img');
      root.setAttribute('aria-label', String(text ?? ''));
      this.root = root;

      // SVG
      const svg = createSvgElement('svg', {
        class: 'stroke-text__svg',
        viewBox: `0 ${-fontSize} 600 ${fontSize * 1.3}`,
        preserveAspectRatio: align === 'left' ? 'xMinYMid meet' : 'xMidYMid meet',
        'aria-hidden': 'true',
        style: 'visibility: hidden;'
      });
      this.svg = svg;

      // Defs
      const defs = createSvgElement('defs');
      const wipeId = `${this.id}-wipe`;
      const revealId = `${this.id}-reveal`;
      const erodeId = `${this.id}-erode`;
      const shadowId = `${this.id}-shadow`;

      let wipeRect = null;
      if (fillMode === 'wipe') {
        const clipPath = createSvgElement('clipPath', {
          id: wipeId,
          clipPathUnits: 'userSpaceOnUse'
        });
        wipeRect = createSvgElement('rect', { x: 0, y: 0, width: 0, height: 0 });
        clipPath.appendChild(wipeRect);
        defs.appendChild(clipPath);
        this.wipeRect = wipeRect;
      }

      let shadowFilter = null;
      if (castShadow) {
        shadowFilter = createSvgElement('filter', {
          id: shadowId,
          filterUnits: 'userSpaceOnUse',
          colorInterpolationFilters: 'sRGB'
        });
        const feDropShadow = createSvgElement('feDropShadow', {
          dx: lift,
          dy: lift,
          stdDeviation: softness,
          floodColor: shadowColor || strokeColor,
          floodOpacity: 0.5
        });
        shadowFilter.appendChild(feDropShadow);
        defs.appendChild(shadowFilter);
        this.shadowFilter = feDropShadow;
      }

      svg.appendChild(defs);

      const fontStyle = `font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; letter-spacing: ${letterSpacing}px;`;

      // Stroke Layer
      const strokeText = createSvgElement('text', {
        class: 'stroke-text__stroke',
        x: '0',
        y: '0',
        fill: 'none',
        stroke: strokeColor,
        'stroke-width': strokeWidth,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        style: fontStyle
      });
      if (dashArray) {
        strokeText.setAttribute('stroke-dasharray', dashArray);
      }

      characters.forEach((char) => {
        const tspan = createSvgElement('tspan');
        tspan.textContent = char;
        if (!dashArray) {
          tspan.setAttribute('data-stroke-char', 'true');
        }
        strokeText.appendChild(tspan);
      });
      svg.appendChild(strokeText);
      this.strokeText = strokeText;

      // Fill Layer
      const fillGroup = createSvgElement('g');
      if (castShadow) {
        fillGroup.setAttribute('filter', `url(#${shadowId})`);
      }

      const fillText = createSvgElement('text', {
        class: 'stroke-text__fill',
        x: '0',
        y: '0',
        fill: fillColor || 'currentColor',
        stroke: 'none',
        style: fontStyle
      });

      if (fillMode === 'wipe') {
        fillText.setAttribute('clip-path', `url(#${wipeId})`);
      }

      characters.forEach((char) => {
        const tspan = createSvgElement('tspan');
        tspan.textContent = char;
        tspan.setAttribute('data-fill-char', 'true');
        fillText.appendChild(tspan);
      });

      fillGroup.appendChild(fillText);
      svg.appendChild(fillGroup);
      this.fillText = fillText;

      root.appendChild(svg);

      // Mount into target
      this.target.innerHTML = '';
      this.target.appendChild(root);

      // Measure text bbox once DOM & fonts are ready
      this.measureAndAnimate();
    }

    measureAndAnimate() {
      const doMeasure = () => {
        if (!this.strokeText) return;
        let bbox;
        try {
          bbox = this.strokeText.getBBox();
        } catch (e) {
          return;
        }

        if (!bbox || !bbox.width) return;

        const { fontSize, strokeWidth } = this.options;
        const pad = Math.max(Number(strokeWidth) || 1, fontSize * 0.1);
        const box = {
          x: bbox.x - pad,
          y: bbox.y - pad,
          width: bbox.width + pad * 2,
          height: bbox.height + pad * 2
        };
        this.box = box;

        this.svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
        this.svg.style.visibility = 'visible';
        this.root.style.setProperty('--stroke-text-width', `${box.width}px`);

        if (this.wipeRect) {
          const frames = getWipeFrames(box, this.options.wipeFrom);
          this.wipeRect.setAttribute('x', frames.start.x);
          this.wipeRect.setAttribute('y', frames.start.y);
          this.wipeRect.setAttribute('width', frames.start.width);
          this.wipeRect.setAttribute('height', frames.start.height);
        }

        this.setupAnimation();
      };

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(doMeasure).catch(doMeasure);
      } else {
        setTimeout(doMeasure, 50);
      }

      window.addEventListener('resize', () => {
        if (this.strokeText) {
          try {
            const bbox = this.strokeText.getBBox();
            if (bbox && bbox.width) {
              const pad = Math.max(Number(this.options.strokeWidth) || 1, this.options.fontSize * 0.1);
              this.svg.setAttribute(
                'viewBox',
                `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
              );
            }
          } catch (e) { }
        }
      });
    }

    setupAnimation() {
      if (typeof gsap === 'undefined' || !this.box) return;

      const {
        fontSize,
        drawDuration,
        fillDelay,
        stagger,
        ease,
        trigger,
        fillMode,
        wipeFrom,
        reverse,
        hoverRedraw,
        strokeStyle,
        dashLength,
        strokeWidth,
        marching
      } = this.options;

      const strokes = gsap.utils.toArray(this.root.querySelectorAll('[data-stroke-char]'));
      const fills = gsap.utils.toArray(this.root.querySelectorAll('[data-fill-char]'));
      const wipe = this.wipeRect;
      const drop = this.shadowFilter;
      const outline = this.strokeText;

      const dash = Math.max(fontSize * 7, 200);
      const pattern = getDashPattern(strokeStyle, dashLength, strokeWidth);
      const dashArray = pattern ? pattern.array : null;
      const dashPeriod = pattern ? pattern.period : 0;
      const lift = fontSize * 0.06;
      const fillEnabled = fillMode !== 'none';
      const useWipe = fillEnabled && fillMode === 'wipe';
      const fillDuration = Math.max(0.4, drawDuration * 0.5);
      const staggerConfig = reverse ? { each: stagger, from: 'end' } : stagger;
      const frames = getWipeFrames(this.box, wipeFrom);
      const lifted = { dx: lift, dy: lift, 'flood-opacity': 0.5 };
      const grounded = { dx: 0, dy: 0, 'flood-opacity': 0 };
      const targets = [...strokes, ...fills, wipe, drop].filter(Boolean);

      const setStart = () => {
        gsap.killTweensOf(targets);
        gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash, strokeOpacity: 1 });
        gsap.set(fills, { opacity: useWipe ? 1 : 0 });
        if (wipe) gsap.set(wipe, { attr: frames.start });
        if (drop) gsap.set(drop, { attr: grounded });
      };

      const setEnd = () => {
        gsap.killTweensOf(targets);
        gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0, strokeOpacity: 1 });
        gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
        if (wipe) gsap.set(wipe, { attr: fillEnabled ? frames.end : frames.start });
        if (drop) gsap.set(drop, { attr: fillEnabled ? lifted : grounded });
      };

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setEnd();
        return;
      }

      const build = () => {
        setStart();
        const looping = trigger === 'loop';
        const tl = gsap.timeline({
          paused: true,
          repeat: looping ? -1 : 0,
          repeatDelay: looping ? 0.9 : 0,
          yoyo: looping,
          defaults: { overwrite: 'auto' }
        });

        tl.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig }, 0);

        if (useWipe && wipe) {
          tl.to(wipe, { attr: frames.end, duration: fillDuration, ease: 'power2.inOut' }, drawDuration + fillDelay);
        } else if (fillEnabled) {
          tl.to(
            fills,
            { opacity: 1, duration: fillDuration, ease: 'power2.out', stagger: staggerConfig },
            drawDuration + fillDelay
          );
        }

        if (drop && fillEnabled) {
          tl.to(
            drop,
            { attr: lifted, duration: fillDuration * 1.4, ease: 'power3.out' },
            drawDuration + fillDelay + fillDuration * 0.3
          );
        }

        return tl;
      };

      let timeline = null;
      let redraw = null;

      if (trigger === 'hover') {
        setEnd();
        this.root.addEventListener('pointerenter', () => {
          timeline?.kill();
          timeline = build();
          timeline.play(0);
        });
      } else {
        timeline = build();
        if (trigger === 'scroll' && typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.create({
            trigger: this.root,
            start: 'top 82%',
            once: true,
            onEnter: () => timeline?.play(0)
          });
        } else {
          timeline.play(0);
        }

        if (hoverRedraw && trigger !== 'loop') {
          this.root.addEventListener('pointerenter', () => {
            if (!timeline || timeline.progress() < 1 || redraw?.isActive()) return;
            redraw?.kill();
            redraw = gsap
              .timeline()
              .to(strokes, { strokeOpacity: 0, duration: 0.2, ease: 'power1.out' })
              .set(strokes, { strokeDashoffset: dash, strokeOpacity: 1 })
              .to(strokes, { strokeDashoffset: 0, duration: drawDuration * 0.8, ease, stagger: staggerConfig });
          });
        }
      }

      if (dashArray && marching && outline) {
        gsap.fromTo(
          outline,
          { strokeDashoffset: 0 },
          { strokeDashoffset: -dashPeriod, duration: dashPeriod / (fontSize * 0.22), ease: 'none', repeat: -1 }
        );
      }
    }
  }

  // Export to global scope
  global.StrokeText = StrokeText;

  // Auto-initialize elements with [data-stroke-text]
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-stroke-text]').forEach((el) => {
      let config = {};
      try {
        if (el.dataset.strokeConfig) {
          config = JSON.parse(el.dataset.strokeConfig);
        }
      } catch (e) { }

      const text = el.dataset.strokeText || el.textContent.trim() || undefined;
      new StrokeText(el, Object.assign({ text }, config));
    });
  });
})(typeof window !== 'undefined' ? window : this);
