// Keyboard input: held keys plus edge-triggered actions consumed once per frame.

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'boost', ShiftRight: 'boost',
};

export function createInput() {
  const held = new Set();
  const heldCodes = new Set();
  const pressed = new Set();
  let lastPressed = new Set();
  let anyKey = false;

  function onDown(e) {
    if (e.repeat) return;
    const action = KEYMAP[e.code];
    if (action) held.add(action);
    heldCodes.add(e.code);
    pressed.add(e.code);
    anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  }
  function onUp(e) {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
    heldCodes.delete(e.code);
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  return {
    held,
    /** True while the physical key is held, for any code (KeyE, Space, ...). */
    isDown(code) { return heldCodes.has(code); },
    /** True once for the frame the key went down; read after takeActions in the same frame. */
    was(code) { return lastPressed.has(code); },
    axis() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const y = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
      return { x, y };
    },
    takeActions() {
      const out = new Set(pressed);
      pressed.clear();
      lastPressed = out;
      return out;
    },
    consumeAnyKey() { const v = anyKey; anyKey = false; return v; },
  };
}
