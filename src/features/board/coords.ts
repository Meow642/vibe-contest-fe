export const LOGICAL_W = 4000;
export const LOGICAL_H = 3000;

export interface Viewport {
  height: number;
  width: number;
}

export interface LogicalPosition {
  x: number;
  y: number;
}

export function clampLogicalPosition(position: LogicalPosition): LogicalPosition {
  return {
    x: Math.min(LOGICAL_W, Math.max(0, Number(position.x.toFixed(1)))),
    y: Math.min(LOGICAL_H, Math.max(0, Number(position.y.toFixed(1)))),
  };
}

export const toLogical = (
  clientX: number,
  clientY: number,
  viewport: Viewport,
) =>
  clampLogicalPosition({
    x: (clientX / viewport.width) * LOGICAL_W,
    y: (clientY / viewport.height) * LOGICAL_H,
  });

export const toScreen = (x: number, y: number, viewport: Viewport) => ({
  left: (x / LOGICAL_W) * viewport.width,
  top: (y / LOGICAL_H) * viewport.height,
});
