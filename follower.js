document.addEventListener("DOMContentLoaded", () => {

    // ═══════════════════════════════════════════════════════════════
    // 1. MOVEMENT CONTROLS
    // ═══════════════════════════════════════════════════════════════
  
    const FOLLOW_LERP       = 0.2;
    const DELAY_FRAMES      = 3;
    const THRESHOLD         = 20;
  
    const TRAIL_LERP        = 0.15;
    const TRAIL_DELAY       = 4;
    const TRAIL_THRESHOLD   = 25;
  
    // ═══════════════════════════════════════════════════════════════
    // 2. COLORS
    // ═══════════════════════════════════════════════════════════════
  
    const COLORS = {
      primary:   "oklch(0.8883 0.0586 205.57)",
      secondary: "oklch(0.8375 0.1029 307.72)",
      accent:    "oklch(0.9379 0.2138 121.42)",
    };
  
    function alpha(color, a) {
      return color.replace(")", " / " + a + ")");
    }

    function preset(color, midA, edgeA, stopIn, stopMid, stopEdge, scale, opacity) {
      return {
        colorInner: color,
        colorMid:   alpha(color, midA),
        colorEdge:  alpha(color, edgeA),
        stopInner:  stopIn,
        stopMid:    stopMid,
        stopEdge:   stopEdge,
        scale:      scale,
        opacity:    opacity,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. PRESETS
    // ═══════════════════════════════════════════════════════════════
    //
    //  preset( color, midA, edgeA, stopIn, stopMid, stopEdge, scale, opacity )
    //
    // ═══════════════════════════════════════════════════════════════

    const PRESETS = {
      softPrimary:       preset(COLORS.primary,   0.4, 0, "10%", "30%", "50%", 1,   0.5),
      softSecondary:     preset(COLORS.secondary, 0.4, 0, "40%", "55%", "75%", 1,   0.5),
      hidden:            preset(COLORS.primary,   0,   0, "20%", "50%", "75%", 0.3, 0),
      focused:           preset(COLORS.primary,   0.4, 0, "30%", "50%", "75%", 0.2, 0.2),
      centeredPrimary:   preset(COLORS.primary,   0.4, 0, "20%", "40%", "70%", 1,   1),
      centeredSecondary: preset(COLORS.secondary, 0.4, 0, "25%", "45%", "75%", 1,   1),
    };

    // ═══════════════════════════════════════════════════════════════
    // 4. DEFAULTS
    // ═══════════════════════════════════════════════════════════════
  
    const DEFAULT_STATE     = "default";
    const DEFAULT_RETURN    = { duration: 1, ease: "back.out(1.7)" };
  
    // ═══════════════════════════════════════════════════════════════
    // 5. STATE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════
    //
    // Trigger usage:  data-trigger="stateName"
    //
    // Each state references presets for "follower" and optionally "trail".
    // If "trail" is omitted it inherits from "follower".
    //
    // centered → locks movement, tweens both followers to container center
    // transition → { duration, ease }
    // ═══════════════════════════════════════════════════════════════

    const STATES = {

      default: {
        follower: PRESETS.softPrimary,
        trail:    PRESETS.softSecondary,
      },

      hide: {
        follower:   PRESETS.hidden,
        transition: { duration: 0.3, ease: "power2.in" },
      },

      focus: {
        follower:   PRESETS.focused,
        transition: { duration: 0.35, ease: "power2.out" },
      },

      centered: {
        centered: true,
        follower:   PRESETS.centeredPrimary,
        trail:      PRESETS.centeredSecondary,
        transition: { duration: 1, ease: "back.out(1.7)" },
      },
    };
  
  
    // ═══════════════════════════════════════════════════════════════
    // ENGINE
    // ═══════════════════════════════════════════════════════════════
  
    var container  = document.querySelector('[cs-el="followerContainer"]');
    var followerEl = container ? container.querySelector('[cs-el="followerElm"]') : null;
    var trailEl    = container ? container.querySelector('[cs-el="followerElmTrail"]') : null;
    var triggers   = document.querySelectorAll("[data-trigger]");
  
    if (!container || !followerEl) {
      console.warn("Follower: missing container or follower element — skipping init.");
      return;
    }
  
    var hasTrail = !!trailEl;
  
    // ── Apply state to element ────────────────────────────────────
  
    function applyState(el, def, animate, transition) {
      gsap.set(el, {
        "--_gradient---inner": def.colorInner,
        "--_gradient---mid":   def.colorMid,
        "--_gradient---edge":  def.colorEdge,
      });
  
      var tweenProps = {
        "--_gradient---stop-inner": def.stopInner,
        "--_gradient---stop-mid":   def.stopMid,
        "--_gradient---stop-edge":  def.stopEdge,
      };
  
      if (def.scale   !== undefined) tweenProps.scale   = def.scale;
      if (def.opacity !== undefined) tweenProps.opacity = def.opacity;
  
      if (animate) {
        gsap.to(el, Object.assign({}, tweenProps, {
          duration:  transition.duration,
          ease:      transition.ease,
          overwrite: "auto",
        }));
      } else {
        gsap.set(el, tweenProps);
      }
    }
  
    function transitionTo(stateName, opts) {
      opts = opts || {};
      var state = STATES[stateName];
      if (!state) { console.warn('Follower: unknown state "' + stateName + '"'); return; }
  
      var fDef = state.follower;
      var tDef = state.trail || state.follower;
      var tr   = opts.transition || state.transition || { duration: 0.5, ease: "power2.out" };
  
      applyState(followerEl, fDef, true, tr);
      if (hasTrail) applyState(trailEl, tDef, true, tr);
    }
  
    // ── Set initial state ─────────────────────────────────────────
  
    var init = STATES[DEFAULT_STATE];
    applyState(followerEl, init.follower, false);
    if (hasTrail) applyState(trailEl, init.trail || init.follower, false);
  
    // ── Movement ──────────────────────────────────────────────────
  
    var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  
    followerEl.style.willChange = "transform";
    gsap.set(followerEl, { xPercent: -50, yPercent: -50, force3D: true });
    var fPos    = { x: mouse.x, y: mouse.y };
    var fBufLen = Math.max(DELAY_FRAMES, 1);
    var fBuf    = [];
    for (var i = 0; i < fBufLen; i++) fBuf.push({ x: mouse.x, y: mouse.y });
    var fHead = 0;
  
    var tPos, tBuf, tBufLen, tHead;
    if (hasTrail) {
      trailEl.style.willChange = "transform";
      gsap.set(trailEl, { xPercent: -50, yPercent: -50, force3D: true });
      tPos    = { x: mouse.x, y: mouse.y };
      tBufLen = Math.max(TRAIL_DELAY, 1);
      tBuf    = [];
      for (var j = 0; j < tBufLen; j++) tBuf.push({ x: mouse.x, y: mouse.y });
      tHead   = 0;
    }
  
    window.addEventListener("pointermove", function(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
  
    // ── Ticker ────────────────────────────────────────────────────
  
    var movementLocked = false;
    var threshSq  = THRESHOLD * THRESHOLD;
    var tThreshSq = TRAIL_THRESHOLD * TRAIL_THRESHOLD;
  
    gsap.ticker.add(function() {
      if (movementLocked) {
        if (centeredTriggerEl) {
          var rect = centeredTriggerEl.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 2;
          gsap.set(followerEl, { x: cx, y: cy });
          if (hasTrail) gsap.set(trailEl, { x: cx, y: cy });
          fPos.x = cx; fPos.y = cy;
          if (hasTrail) { tPos.x = cx; tPos.y = cy; }
        }
        return;
      }
  
      fBuf[fHead].x = mouse.x;
      fBuf[fHead].y = mouse.y;
      var fDelayed = fBuf[(fHead + 1) % fBufLen];
      fHead = (fHead + 1) % fBufLen;
  
      var dx = fDelayed.x - fPos.x;
      var dy = fDelayed.y - fPos.y;
      if (dx * dx + dy * dy > threshSq) {
        fPos.x += dx * FOLLOW_LERP;
        fPos.y += dy * FOLLOW_LERP;
      }
      gsap.set(followerEl, { x: fPos.x, y: fPos.y });
  
      if (hasTrail) {
        tBuf[tHead].x = mouse.x;
        tBuf[tHead].y = mouse.y;
        var tDelayed = tBuf[(tHead + 1) % tBufLen];
        tHead = (tHead + 1) % tBufLen;
  
        dx = tDelayed.x - tPos.x;
        dy = tDelayed.y - tPos.y;
        if (dx * dx + dy * dy > tThreshSq) {
          tPos.x += dx * TRAIL_LERP;
          tPos.y += dy * TRAIL_LERP;
        }
        gsap.set(trailEl, { x: tPos.x, y: tPos.y });
      }
    });
  
    // ── Triggers ──────────────────────────────────────────────────
  
    var activeTrigger = null;
    var centeredTriggerEl = null;
  
    if (triggers.length === 0) return;
  
    for (var t = 0; t < triggers.length; t++) {
      (function(trigger) {
        trigger.addEventListener("mouseenter", function() {
          var name = trigger.getAttribute("data-trigger");
          if (!name || !STATES[name]) return;
  
          activeTrigger = name;
          var state = STATES[name];
  
          if (state.centered) {
            movementLocked = true;
            var rect = trigger.getBoundingClientRect();
            var cx   = rect.left + rect.width / 2;
            var cy   = rect.top + rect.height / 2;

            gsap.to(followerEl, {
              x: cx, y: cy,
              duration: (state.transition && state.transition.duration) || 0.6,
              ease:     (state.transition && state.transition.ease) || "power3.inOut",
              overwrite: "auto",
              onComplete: function() { centeredTriggerEl = trigger; },
            });
            if (hasTrail) {
              gsap.to(trailEl, {
                x: cx, y: cy,
                duration: ((state.transition && state.transition.duration) || 0.6) * 1.2,
                ease:     (state.transition && state.transition.ease) || "power3.inOut",
                overwrite: "auto",
              });
            }
          }
  
          transitionTo(name);
        });
  
        trigger.addEventListener("mouseleave", function() {
          var name = trigger.getAttribute("data-trigger");
          if (!name || activeTrigger !== name) return;
  
          var state = STATES[name];
          activeTrigger = null;
  
          if (state.centered) {
            gsap.killTweensOf(followerEl, "x,y");
            if (hasTrail) gsap.killTweensOf(trailEl, "x,y");
            centeredTriggerEl = null;
            for (var i = 0; i < fBufLen; i++) { fBuf[i].x = mouse.x; fBuf[i].y = mouse.y; }
            if (hasTrail) {
              for (var j = 0; j < tBufLen; j++) { tBuf[j].x = mouse.x; tBuf[j].y = mouse.y; }
            }
            movementLocked = false;
          }
  
          transitionTo(DEFAULT_STATE, { transition: DEFAULT_RETURN });
        });
      })(triggers[t]);
    }
  
  });