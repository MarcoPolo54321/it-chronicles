import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const app = 'ru.itchronicles.game';
const apk = process.argv[2];
assert.ok(apk, 'Pass the APK to install.');
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000 }).trim();

async function waitFor(check) {
  let failure;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      failure = error;
    }
    await delay(400);
  }
  throw new Error('Timed out waiting for the Android WebView', { cause: failure });
}

async function openWebView() {
  adb('shell', 'am', 'start', '-W', '-n', `${app}/.MainActivity`);
  const pid = await waitFor(() => adb('shell', 'pidof', '-s', app));
  adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`);
  const target = await waitFor(async () => {
    const response = await fetch('http://127.0.0.1:9222/json/list', { signal: AbortSignal.timeout(2000) });
    return (await response.json()).find(page => page.webSocketDebuggerUrl);
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  async function evaluate(expression) {
    const id = nextId++;
    const message = JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true, userGesture: true } });
    return new Promise((resolve, reject) => {
      const timer = AbortSignal.timeout(5000);
      socket.addEventListener('message', event => {
        const reply = JSON.parse(event.data);
        if (reply.id !== id) return;
        if (reply.error || reply.result.exceptionDetails) {
          reject(new Error(reply.error?.message || reply.result.exceptionDetails.exception?.description || reply.result.exceptionDetails.text));
        } else {
          resolve(reply.result.result.value);
        }
      }, { signal: timer });
      timer.addEventListener('abort', () => reject(timer.reason), { once: true });
      socket.send(message);
    });
  }
  return { evaluate, close: () => { socket.close(); adb('forward', '--remove', 'tcp:9222'); } };
}

function buttonFits(selector, textSelector = selector) {
  return [...document.querySelectorAll(selector)].every(button => {
    const label = button.matches(textSelector) ? button : button.querySelector(textSelector);
    const range = document.createRange();
    range.selectNodeContents(label);
    const text = range.getBoundingClientRect();
    const bounds = button.getBoundingClientRect();
    return text.left >= bounds.left && text.right <= bounds.right && text.top >= bounds.top && text.bottom <= bounds.bottom;
  });
}

assert.match(adb('install', '-r', apk), /Success/);
adb('shell', 'cmd', 'uimode', 'night', 'yes');
adb('shell', 'settings', 'put', 'system', 'font_scale', '1.3');

for (const width of [320, 393]) {
  adb('shell', 'am', 'force-stop', app);
  adb('shell', 'wm', 'size', `${Math.round(width * 1.5)}x1280`);
  adb('shell', 'wm', 'density', '240');
  const { evaluate, close } = await openWebView();
  try {
    await waitFor(() => evaluate('Boolean(document.querySelector(".entry-card"))'));
    if (width === 320) {
      await evaluate(`(async () => {
        const { createNewGame } = await import('/js/core/game.js');
        const slots = Array(10).fill(null);
        for (let i = 0; i < slots.length; i++) {
          const game = createNewGame({ name: i === 0 ? 'Данила' : 'Александр Александров', avatar: 'sysadmin' });
          game.settings.themeMode = 'dark';
          game.settings.onboardingSeen = true;
          slots[i] = game;
        }
        localStorage.setItem('itc_theme', 'dark');
        localStorage.setItem('it_chronicles_profiles_v2', JSON.stringify(slots));
      })()`);
      await evaluate('setTimeout(() => location.reload(), 0); true');
    }
    assert.equal(await waitFor(() => evaluate('document.querySelectorAll(".profile-open").length')), 10);
    assert.equal(await evaluate('getComputedStyle(document.documentElement).colorScheme'), 'light');
    assert.ok(await evaluate(`Math.abs(innerWidth - ${width}) <= 2`), 'Android device width was not applied');
    assert.equal(await evaluate(`(${buttonFits})('.profile-open')`), true);
    assert.equal(await evaluate(`(() => {
      document.querySelectorAll('.profile-open').forEach(button => { button.style.fontSize = '28px'; });
      const cards = [...document.querySelectorAll('.profile-slot.panel-soft')];
      return cards.every(card => {
        const opener = card.querySelector('.profile-open').getBoundingClientRect();
        const remover = card.querySelector('[data-action="delete-profile"]').getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        return opener.right <= bounds.right && remover.right <= bounds.right && (opener.right <= remover.left || opener.bottom <= remover.top);
      });
    })()`), true, 'Profile actions overlap at large text size');
    assert.equal(await evaluate(`(${buttonFits})('.profile-open')`), true, 'Open label overflows at large text size');

    await evaluate('document.querySelector(".profile-open").click(); true');
    assert.equal(await evaluate('Boolean(document.querySelector(".app-header"))'), true);
    assert.equal(await evaluate(`(${buttonFits})('.bottom-nav button', 'small')`), true);
    await evaluate(`document.querySelector('[data-action="main-tab"][data-value="orders"]').click(); true`);
    assert.ok(await evaluate('document.querySelectorAll(".action-button-with-icon").length > 0'));
    assert.equal(await evaluate(`(${buttonFits})('.action-button-with-icon', 'span:last-child')`), true);
    console.log(`Android WebView ${width}px: ten saved profiles, light theme, large text, navigation and order buttons passed`);
  } finally {
    close();
  }
}
