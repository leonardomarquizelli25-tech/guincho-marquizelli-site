const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const trackingScript = fs.readFileSync(path.join(projectRoot, "ads-conversions.js"), "utf8");

class ClickTarget {
  constructor(link) {
    this.link = link;
  }

  closest(selector) {
    assert.equal(selector, "a[href]");
    return this.link;
  }
}

function setup(gtag) {
  const listeners = [];
  const timers = new Map();
  const navigations = [];
  let nextTimer = 1;
  const window = {
    gtag,
    setTimeout(callback) {
      const id = nextTimer++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    location: { assign(url) { navigations.push(url); } }
  };
  const document = {
    addEventListener(type, listener) {
      assert.equal(type, "click");
      listeners.push(listener);
    }
  };
  vm.runInNewContext(trackingScript, { document, window, Element: ClickTarget });
  assert.equal(listeners.length, 1);

  function click(href, target = "") {
    const link = {
      href,
      target,
      getAttribute(name) { return name === "href" ? href : null; }
    };
    const event = {
      target: new ClickTarget(link),
      button: 0,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }
    };
    listeners[0](event);
    return event;
  }

  return { click, timers, navigations };
}

test("uma tag base e um script delegado em cada página pública", () => {
  for (const page of ["index.html", "404.html"]) {
    const html = fs.readFileSync(path.join(projectRoot, page), "utf8");
    assert.match(html, /<head>\s*<!-- Google tag \(gtag\.js\) -->/);
    assert.equal((html.match(/gtag\/js\?id=AW-18146977499/g) || []).length, 1, page);
    assert.equal((html.match(/gtag\('config', 'AW-18146977499'\)/g) || []).length, 1, page);
    assert.equal((html.match(/ads-conversions\.js\?v=/g) || []).length, 1, page);
    assert.doesNotMatch(html, /GTM-[A-Z0-9]+|Recanto Floren[çc]a/i);
  }
});

test("um clique WhatsApp e um clique telefone emitem um evento correto cada", () => {
  const calls = [];
  const page = setup((...args) => calls.push(args));
  const whatsapp = page.click("https://wa.me/5514997036966", "_blank");
  const phone = page.click("tel:+5514997036966");

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "event");
  assert.equal(calls[0][1], "conversion");
  assert.equal(calls[0][2].send_to, "AW-18146977499/Qa1CCO334IEdENvNk81D");
  assert.equal(calls[1][2].send_to, "AW-18146977499/U5ORCPD34IEdENvNk81D");
  for (const call of calls) {
    assert.equal(call[2].value, 1.0);
    assert.equal(call[2].currency, "BRL");
    assert.equal(typeof call[2].event_callback, "function");
  }
  assert.equal(whatsapp.defaultPrevented, false);
  assert.equal(phone.defaultPrevented, false);
  assert.equal(page.timers.size, 0);
  assert.deepEqual(page.navigations, []);
});

test("links futuros usam o mesmo listener e outros links não geram conversão", () => {
  const calls = [];
  const page = setup((...args) => calls.push(args));
  page.click("#contato");
  page.click("mailto:contato@example.com");
  assert.equal(calls.length, 0);
  page.click("tel:+5514999041010");
  assert.equal(calls.length, 1);
});

test("sem gtag o clique mantém a navegação original", () => {
  const page = setup(undefined);
  const click = page.click("https://wa.me/5514997036966");
  assert.equal(click.defaultPrevented, false);
  assert.equal(page.timers.size, 0);
});

test("WhatsApp na mesma aba navega uma vez pelo callback ou fallback", () => {
  const calls = [];
  const page = setup((...args) => calls.push(args));
  const click = page.click("https://wa.me/5514997036966");
  assert.equal(click.defaultPrevented, true);
  assert.equal(page.timers.size, 1);
  calls[0][2].event_callback();
  calls[0][2].event_callback();
  assert.deepEqual(page.navigations, ["https://wa.me/5514997036966"]);
  assert.equal(page.timers.size, 0);

  const fallbackCalls = [];
  const fallbackPage = setup((...args) => fallbackCalls.push(args));
  fallbackPage.click("https://wa.me/5514997036966");
  [...fallbackPage.timers.values()][0]();
  fallbackCalls[0][2].event_callback();
  assert.deepEqual(fallbackPage.navigations, ["https://wa.me/5514997036966"]);
});
