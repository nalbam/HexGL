/*
 * GamepadController (analog stick + buttons).
 * @author Mahesh Kulkarni <http://twitter.com/maheshkk>
 */

export type GamepadButtonCallback = (controller: GamepadController) => void;

export class GamepadController {
  static isCompatible(): boolean {
    return 'getGamepads' in navigator || 'webkitGetGamepads' in navigator;
  }

  buttonPressCallback: GamepadButtonCallback;
  active: boolean;
  leftStickArray: number[];
  rightStickArray: number[];
  lstickx = 0;
  acceleration: boolean | GamepadButton = false;
  ltrigger: boolean | GamepadButton = false;
  rtrigger: boolean | GamepadButton = false;
  select: boolean | GamepadButton = false;

  constructor(buttonPressCallback: GamepadButtonCallback) {
    this.buttonPressCallback = buttonPressCallback;
    this.active = true;
    this.leftStickArray = [];
    this.rightStickArray = [];
  }

  updateAvailable(): boolean | undefined {
    if (!this.active) return false;
    const gamepads = navigator.getGamepads
      ? navigator.getGamepads()
      : (navigator as any).webkitGetGamepads();
    if (!(gamepads != null ? gamepads[0] : undefined)) return false;
    const gp = gamepads[0]!;
    if (gp.buttons == null || gp.axes == null) return;
    this.lstickx = gp.axes[0];
    const accel = gp.buttons[0];
    const lt = gp.buttons[6];
    const rt = gp.buttons[7];
    const sel = gp.buttons[8];
    this.acceleration = accel.pressed != null ? accel.pressed : accel;
    this.ltrigger = lt.pressed != null ? lt.pressed : lt;
    this.rtrigger = rt.pressed != null ? rt.pressed : rt;
    this.select = sel.pressed != null ? sel.pressed : sel;
    this.buttonPressCallback(this);
    return true;
  }
}
