import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../web/js/motion/app.motion.js', import.meta.url), 'utf8');
function setup({ desktop = true, reduced = true } = {}) {
  class Element {
    closest() { return null; }
  }
  const body = new Element();
  body.appendChild = (node) => { node.parentElement = body; };
  const listeners = {};
  const calls = [];
  let frames = [];
  let time = 1000;
  let active = true;
  let modal = false;
  const window = {
    innerHeight: 800, scrollY: 0,
    requestAnimationFrame: (callback) => { frames.push(callback); },
    matchMedia: (query) => ({ matches: query.includes('reduced') ? reduced : desktop }),
    addEventListener: (type, fn) => { listeners[type] = fn; },
    scrollTo: (options) => { calls.push(options); window.scrollY = options.top; }
  };
  // A full-height intro, a long section, and another full-height section.
  const sections = [[80, 720], [800, 1400], [2200, 720]].map(([top, height]) => ({
    getClientRects: () => [1],
    getBoundingClientRect: () => ({ top: top - window.scrollY, height })
  }));
  const home = {
    classList: { contains: () => active },
    contains: () => true,
    querySelector: () => null,
    querySelectorAll: () => sections
  };
  const context = vm.createContext({
    window, Element,
    document: {
      body, documentElement: new Element(),
      querySelectorAll: () => modal ? [{ getClientRects: () => [1] }] : [],
      querySelector: () => ({ getBoundingClientRect: () => ({ height: 80 }) })
    },
    getComputedStyle: () => ({ overflowY: 'visible' }),
    performance: { now: () => time }
  });
  vm.runInContext(source, context);
  context.initHomeSectionPaging(home);
  return {
    window, calls, context, listeners, sections,
    advance: (ms) => {
      time += ms;
      const pending = frames;
      frames = [];
      pending.forEach((callback) => callback(time));
    },
    setActive: (value) => { active = value; },
    setModal: (value) => { modal = value; },
    wheel(deltaY, extra = {}) {
      const event = { type: 'wheel', target: body, deltaY, deltaX: 0, deltaMode: 0,
        preventDefault() { this.prevented = true; }, ...extra };
      listeners.wheel(event);
      return event;
    },
    key(key) {
      listeners.keydown({ type: 'keydown', target: body, key, preventDefault() {} });
    }
  };
}

test('one wheel gesture advances one section and consumes momentum', () => {
  const app = setup();
  app.wheel(90);
  assert.equal(app.window.scrollY, 720);
  // Continuous momentum, even after the transition lock expires.
  for (let i = 0; i < 20; i++) {
    app.advance(50);
    app.wheel(20 * Math.pow(0.8, i));
  }
  assert.equal(app.window.scrollY, 720);
  assert.equal(app.calls.length, 1);
});

test('long section stops at its end before a fresh gesture advances', () => {
  const app = setup();
  app.window.scrollY = 1395;
  app.wheel(8);
  assert.equal(app.window.scrollY, 1400);
  app.advance(50);
  app.wheel(1);
  assert.equal(app.window.scrollY, 1400);
  app.advance(200);
  app.wheel(100);
  assert.equal(app.window.scrollY, 2120);
});

test('backwards navigation enters the bottom of a long section', () => {
  const app = setup();
  app.window.scrollY = 2120;
  app.wheel(-90);
  assert.equal(app.window.scrollY, 1400);
  app.advance(900);
  assert.equal(app.wheel(-2).prevented, undefined);
  assert.equal(app.window.scrollY, 1400);
});

test('mobile, inactive pages, zoom and visible dialogs retain native behavior', () => {
  assert.equal(setup({ desktop: false }).wheel(100).prevented, undefined);
  const app = setup();
  app.setActive(false);
  assert.equal(app.wheel(100).prevented, undefined);
  app.setActive(true);
  assert.equal(app.wheel(100, { ctrlKey: true }).prevented, undefined);
  app.setModal(true);
  assert.equal(app.wheel(100).prevented, undefined);
  assert.equal(app.calls.length, 0);
});

test('PageDown supports section navigation and reduced motion', () => {
  const app = setup({ reduced: true });
  app.key('PageDown');
  assert.equal(app.window.scrollY, 720);
  assert.equal(app.calls[0].behavior, 'instant');
});

test('footer remains reachable after the last section', () => {
  const app = setup();
  app.window.scrollY = 2120;
  assert.equal(app.wheel(100).prevented, undefined);
  app.window.scrollY = 2200;
  assert.equal(app.wheel(-100).prevented, undefined);
});


test('animated transitions progress smoothly and unlock on arrival', () => {
  const app = setup({ reduced: false });
  app.wheel(90);
  assert.equal(app.window.scrollY, 0);
  app.advance(120);
  const first = app.window.scrollY;
  assert.ok(first > 0 && first < 720);
  app.advance(120);
  assert.ok(app.window.scrollY > first && app.window.scrollY < 720);
  app.advance(500);
  assert.equal(app.window.scrollY, 720);
  assert.equal(app.wheel(2).prevented, undefined);
  app.advance(700);
  assert.equal(app.window.scrollY, 720);
});

test('animation stops when navigating away from Home', () => {
  const app = setup({ reduced: false });
  app.wheel(90);
  app.advance(100);
  const position = app.window.scrollY;
  app.setActive(false);
  app.advance(100);
  assert.equal(app.window.scrollY, position);
});

test('related links and FAQ belong to one outer paging section', () => {
  const html = readFileSync(new URL('../../web/partials/home.html', import.meta.url), 'utf8');
  const sectionStack = [];
  const parents = {};
  for (const match of html.matchAll(/<section\b[^>]*>|<\/section>/g)) {
    if (match[0] === '</section>') sectionStack.pop();
    else {
      const classes = match[0].match(/class="([^"]*)"/)?.[1] || '';
      if (classes === 'home-related' || classes === 'home-help') {
        parents[classes] = sectionStack.at(-1);
      }
      sectionStack.push(classes);
    }
  }
  assert.equal(parents['home-related'], 'home-support-panel');
  assert.equal(parents['home-help'], 'home-support-panel');
  assert.equal(sectionStack.length, 0);
});


test('light and strong wheel gestures have the same destination for section transitions', () => {
  for (const start of [0]) {
    const light = setup();
    const strong = setup();
    light.window.scrollY = start;
    strong.window.scrollY = start;
    light.wheel(1);
    strong.wheel(900);
    assert.equal(light.window.scrollY, strong.window.scrollY);
    assert.ok(light.window.scrollY > start);
  }
});


test('indicators follow scrolling, navigate to a section, and omit hidden sections', () => {
  const app = setup();
  const buttons = app.sections.map((_, index) => ({
    dataset: { homeSection: String(index) },
    attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(_, callback) { this.click = callback; }
  }));
  const nav = { hidden: true, querySelectorAll: () => buttons };
  const home = {
    querySelector: () => nav,
    querySelectorAll: () => app.sections,
    classList: { contains: () => true }
  };
  const destinations = [];
  app.context.initHomeSectionIndicators(home, (top) => destinations.push(top));
  assert.equal(nav.hidden, false);
  assert.equal(nav.parentElement, app.context.document.body);
  assert.equal(buttons[0].attributes['aria-current'], 'step');
  buttons[2].click();
  assert.equal(destinations[0], 2120);
  app.window.scrollY = 1000;
  app.listeners.scroll();
  app.advance(16);
  assert.equal(buttons[1].attributes['aria-current'], 'step');
  assert.equal(buttons[0].attributes['aria-current'], undefined);
  app.sections[1].hidden = true;
  app.listeners.resize();
  app.advance(16);
  assert.equal(buttons[1].hidden, true);
});

test('a light new gesture works after a short pause and shows motion immediately', () => {
  const app = setup({ reduced: false });
  app.wheel(0.5);
  app.advance(16);
  assert.ok(app.window.scrollY > 0 && app.window.scrollY < 10, 'first frame starts moving without a large jump');
  app.advance(600);
  assert.equal(app.window.scrollY, 720);
  assert.equal(app.wheel(0.5).prevented, undefined);
  app.advance(16);
  assert.equal(app.window.scrollY, 720);
});

test('a short pause rearms the wheel while continuous momentum remains suppressed', () => {
  const app = setup();
  app.wheel(1);
  app.advance(50);
  app.wheel(0.5);
  assert.equal(app.window.scrollY, 720);
  app.advance(110);
  app.wheel(0.5);
  assert.equal(app.window.scrollY, 720);
});


test('wheel events during animation cannot queue a second transition', () => {
  const app = setup({ reduced: false });
  app.wheel(1);
  app.advance(200);
  app.wheel(1);
  // The remainder of the same gesture must not create more queued moves.
  app.advance(30);
  app.wheel(0.5);
  app.advance(400);
  assert.equal(app.window.scrollY, 720);
  app.advance(600);
  assert.equal(app.window.scrollY, 720);
  app.advance(600);
  assert.equal(app.window.scrollY, 720);
});

test('queued input is discarded when Home is no longer active', () => {
  const app = setup({ reduced: false });
  app.wheel(1);
  app.advance(200);
  app.wheel(1);
  app.setActive(false);
  const position = app.window.scrollY;
  app.advance(800);
  assert.equal(app.window.scrollY, position);
});


test('a momentum spike cannot trigger a second section without a new gesture', () => {
  const app = setup();
  app.wheel(8);
  app.advance(50);
  app.wheel(0.4);
  assert.equal(app.window.scrollY, 720);
  app.advance(50);
  app.wheel(1);
  assert.equal(app.window.scrollY, 720);
  app.advance(110);
  app.wheel(1);
  assert.equal(app.window.scrollY, 720);
});

test('deliberate steady wheel input resumes without requiring silence', () => {
  const app = setup();
  app.wheel(4);
  for (let i = 0; i < 16; i++) {
    app.advance(50);
    app.wheel(4);
  }
  assert.equal(app.window.scrollY, 720);
});


test('a new trackpad push after animation responds without waiting for silence', () => {
  const app = setup({ reduced: false });
  app.wheel(12);
  for (let i = 0; i < 12; i++) {
    app.advance(50);
    app.wheel(8 * Math.pow(0.75, i));
  }
  assert.equal(app.window.scrollY, 720);
  app.advance(30);
  app.wheel(0.7);
  app.advance(30);
  assert.equal(app.wheel(1.2).prevented, undefined);
  app.advance(16);
  assert.equal(app.window.scrollY, 720);
  app.advance(600);
  assert.equal(app.window.scrollY, 720);
});

test('a single spike in the tail after animation still cannot double-step', () => {
  const app = setup({ reduced: false });
  app.wheel(12);
  for (let i = 0; i < 12; i++) {
    app.advance(50);
    app.wheel(8 * Math.pow(0.75, i));
  }
  for (const delta of [2, 1.5, 1, 0.7, 0.4]) {
    app.advance(30);
    app.wheel(delta);
  }
  app.advance(700);
  assert.equal(app.window.scrollY, 720);
});


test('long-section reading leaves small wheel deltas native in both directions', () => {
  const app = setup({ reduced: false });
  app.window.scrollY = 1000;
  for (const delta of [0.5, 8, 40, -0.5, -8, -40]) {
    assert.equal(app.wheel(delta).prevented, undefined);
  }
  assert.equal(app.calls.length, 0, 'no scripted animation while reading');
});

test('upward reading clamps at the section start and consumes the remaining tail', () => {
  const app = setup();
  app.window.scrollY = 730;
  app.wheel(-40);
  assert.equal(app.window.scrollY, 720);
  app.advance(30);
  app.wheel(-20);
  assert.equal(app.window.scrollY, 720);
  app.advance(150);
  app.wheel(-1);
  assert.equal(app.window.scrollY, 0);
});

test('delayed native movement is contained before returning to section paging', () => {
  const app = setup();
  app.window.scrollY = 1300;
  assert.equal(app.wheel(40).prevented, undefined);
  // The browser applies accumulated native scrolling after wheel dispatch.
  app.window.scrollY = 1470;
  app.listeners.scroll();
  assert.equal(app.window.scrollY, 1400);
  app.advance(150);
  app.wheel(1);
  assert.equal(app.window.scrollY, 2120);
  app.listeners.scroll();
  assert.equal(app.window.scrollY, 2120, 'reading boundary must release for the transition');
  app.advance(150);
  app.wheel(-1);
  assert.equal(app.window.scrollY, 1400, 'section paging still works after leaving long content');
});

test('delayed upward movement stops at the long-section start', () => {
  const app = setup();
  app.window.scrollY = 800;
  assert.equal(app.wheel(-20).prevented, undefined);
  app.window.scrollY = 680;
  app.listeners.scroll();
  assert.equal(app.window.scrollY, 720);
  app.advance(150);
  app.wheel(-1);
  assert.equal(app.window.scrollY, 0);
});

test('the final long section flows into the footer without clamping or a second gesture', () => {
  const app = setup();
  app.sections[2].getBoundingClientRect = () => ({ top: 2200 - app.window.scrollY, height: 1400 });
  app.window.scrollY = 2790;
  assert.equal(app.wheel(40).prevented, undefined);
  app.window.scrollY = 2830;
  app.listeners.scroll();
  assert.equal(app.window.scrollY, 2830);
  assert.equal(app.calls.length, 0, 'no snap-back at the footer boundary');
  assert.equal(app.wheel(20).prevented, undefined);
  // Its upper boundary still protects the previous section when scrolling back.
  app.window.scrollY = 2110;
  app.listeners.scroll();
  assert.equal(app.window.scrollY, 2120);
});

test('section animation gently accelerates and decelerates without changing duration', () => {
  const app = setup({ reduced: false });
  app.wheel(1);
  const distances = [];
  let previous = 0;
  for (let i = 0; i < 6; i++) {
    app.advance(100);
    distances.push(app.window.scrollY - previous);
    previous = app.window.scrollY;
  }
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
  assert.ok(distances[3] > distances[4] && distances[4] > distances[5]);
  assert.equal(app.window.scrollY, 720);
});
