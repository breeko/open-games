import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAutosave } from '../../../src/shared/persistence/autosave';

test('autosave flushes on a schedule, backgrounding and pagehide; stop removes listeners and timer', async () => {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  let saves = 0;
  const autosave = startAutosave(() => { saves++; }, { intervalMs: 10, lifecycle: { document, window } });
  try {
    await new Promise(resolve => setTimeout(resolve, 35));
    assert.ok(saves > 0, 'periodic saves run');
    const before = saves;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(saves, before, 'visible events do not save');
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    autosave.flush();
    assert.equal(saves, before + 3);
    autosave.stop();
    const stopped = saves;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    autosave.flush();
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(saves, stopped);
  } finally { autosave.stop(); }
});
