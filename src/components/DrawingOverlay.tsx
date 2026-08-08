import { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent } from "react";
import { DrawingTool, PRESET_COLORS, Tool, useDrawingTool } from "../hooks/useDrawingTool";
import { Shape } from "../types";
import {
  ArrowToolIcon,
  CircleToolIcon,
  CursorIcon,
  LineToolIcon,
  PenToolIcon,
  RectToolIcon,
  TextToolIcon,
  TrashIcon,
  UndoIcon,
  XIcon,
} from "./icons";

function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 28): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  return `${x2},${y2} ${x2 + size * Math.cos(a1)},${y2 + size * Math.sin(a1)} ${
    x2 + size * Math.cos(a2)
  },${y2 + size * Math.sin(a2)}`;
}

function renderShapeGeometry(shape: Shape) {
  const [p0, p1] = shape.points;
  const scale = shape.sizeScale ?? 1;
  switch (shape.type) {
    case "line":
      return (
        <line
          x1={p0.x}
          y1={p0.y}
          x2={p1?.x ?? p0.x}
          y2={p1?.y ?? p0.y}
          stroke={shape.color}
          strokeWidth={6 * scale}
          strokeLinecap="round"
        />
      );
    case "arrow":
      return (
        <g>
          <line
            x1={p0.x}
            y1={p0.y}
            x2={p1?.x ?? p0.x}
            y2={p1?.y ?? p0.y}
            stroke={shape.color}
            strokeWidth={6 * scale}
            strokeLinecap="round"
          />
          <polygon
            points={arrowHead(p0.x, p0.y, p1?.x ?? p0.x, p1?.y ?? p0.y, 28 * scale)}
            fill={shape.color}
          />
        </g>
      );
    case "rect": {
      if (!p1) return null;
      const x = Math.min(p0.x, p1.x);
      const y = Math.min(p0.y, p1.y);
      return (
        <rect
          x={x}
          y={y}
          width={Math.abs(p1.x - p0.x)}
          height={Math.abs(p1.y - p0.y)}
          fill="none"
          stroke={shape.color}
          strokeWidth={6 * scale}
        />
      );
    }
    case "circle": {
      if (!p1) return null;
      const r = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      return (
        <circle cx={p0.x} cy={p0.y} r={r} fill="none" stroke={shape.color} strokeWidth={6 * scale} />
      );
    }
    case "pen":
      return (
        <polyline
          points={shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={shape.color}
          strokeWidth={6 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "text":
      return shape.text ? (
        <text x={p0.x} y={p0.y} fill={shape.color} fontSize={30 * scale} fontWeight={700}>
          {shape.text}
        </text>
      ) : null;
    case "icon": {
      if (!shape.iconUrl) return null;
      const size = 28 * scale;
      return (
        <g>
          {shape.color && (
            <circle cx={p0.x} cy={p0.y} r={size / 2 + 5} fill={shape.color} />
          )}
          <image
            href={shape.iconUrl}
            x={p0.x - size / 2}
            y={p0.y - size / 2}
            width={size}
            height={size}
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          />
        </g>
      );
    }
    default:
      return null;
  }
}

function ShapeRenderer({
  shape,
  tool,
  onShapePointerDown,
}: {
  shape: Shape;
  tool: Tool;
  onShapePointerDown: (e: ReactMouseEvent<SVGGElement>, shape: Shape) => void;
}) {
  const geometry = renderShapeGeometry(shape);
  if (!geometry) return null;
  const interactive = tool === "cursor";
  return (
    <g
      style={{ pointerEvents: interactive ? "auto" : "none", cursor: interactive ? "grab" : undefined }}
      onMouseDown={interactive ? (e) => onShapePointerDown(e, shape) : undefined}
    >
      {geometry}
    </g>
  );
}

export function DrawingCanvas({
  dt,
  style,
  className,
  iconColor,
}: {
  dt: DrawingTool;
  style?: CSSProperties;
  className?: string;
  iconColor?: string;
}) {
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("application/x-icon-url")) {
      e.preventDefault();
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    const iconUrl = e.dataTransfer.getData("application/x-icon-url");
    if (!iconUrl) return;
    e.preventDefault();
    dt.addIcon(iconUrl, e.clientX, e.clientY, iconColor);
  }

  function handleContainerMouseDown() {
    if (dt.tool === "cursor") dt.clearSelection();
  }

  const selectedShape = dt.shapes.find((s) => s.id === dt.selectedShapeId);

  return (
    <div
      className={`drawing-canvas-wrap ${className ?? ""}`}
      ref={dt.containerRef}
      style={style}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleContainerMouseDown}
    >
      <svg
        ref={dt.svgRef}
        className="drawing-svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        onMouseDown={dt.handlePointerDown}
        onMouseMove={dt.handlePointerMove}
        onMouseUp={dt.handlePointerUp}
        onMouseLeave={dt.handlePointerUp}
        style={{
          pointerEvents: dt.tool === "cursor" ? "none" : "auto",
          cursor: dt.tool === "cursor" ? "default" : "crosshair",
        }}
      >
        {dt.visibleShapes.map((s) => (
          <ShapeRenderer
            key={s.id}
            shape={s}
            tool={dt.tool}
            onShapePointerDown={dt.handleShapePointerDown}
          />
        ))}
      </svg>

      {dt.editingText && (
        <input
          className="drawing-text-input"
          style={{ left: dt.editingText.screenX, top: dt.editingText.screenY }}
          autoFocus
          value={dt.editingText.value}
          onChange={(e) => dt.setEditingText({ ...dt.editingText!, value: e.target.value })}
          onBlur={() => dt.commitText(dt.editingText!.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") dt.commitText(dt.editingText!.value);
            if (e.key === "Escape") dt.cancelText();
          }}
        />
      )}

      {selectedShape && dt.selectedShapeScreenPos && (
        <div
          className="drawing-shape-options"
          style={{ left: dt.selectedShapeScreenPos.x, top: dt.selectedShapeScreenPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={selectedShape.sizeScale ?? 1}
            onChange={(e) => dt.setSelectedShapeSize(Number(e.target.value))}
            aria-label="Taille"
          />
          <button type="button" onClick={dt.deleteSelected} aria-label="Supprimer">
            <TrashIcon size={13} />
          </button>
          <button type="button" onClick={dt.clearSelection} aria-label="Fermer">
            <XIcon size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

export function DrawingToolbar({ dt }: { dt: DrawingTool }) {
  return (
    <div className="drawing-toolbar">
      <button
        type="button"
        className={dt.tool === "cursor" ? "is-active" : ""}
        onClick={() => dt.setTool("cursor")}
        aria-label="Selection"
      >
        <CursorIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "line" ? "is-active" : ""}
        onClick={() => dt.setTool("line")}
        aria-label="Ligne"
      >
        <LineToolIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "arrow" ? "is-active" : ""}
        onClick={() => dt.setTool("arrow")}
        aria-label="Fleche"
      >
        <ArrowToolIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "rect" ? "is-active" : ""}
        onClick={() => dt.setTool("rect")}
        aria-label="Rectangle"
      >
        <RectToolIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "circle" ? "is-active" : ""}
        onClick={() => dt.setTool("circle")}
        aria-label="Cercle"
      >
        <CircleToolIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "text" ? "is-active" : ""}
        onClick={() => dt.setTool("text")}
        aria-label="Texte"
      >
        <TextToolIcon />
      </button>
      <button
        type="button"
        className={dt.tool === "pen" ? "is-active" : ""}
        onClick={() => dt.setTool("pen")}
        aria-label="Crayon"
      >
        <PenToolIcon />
      </button>

      <div className="drawing-colors">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`drawing-color ${dt.color === c ? "is-active" : ""}`}
            style={{ backgroundColor: c }}
            onClick={() => dt.setColor(c)}
            aria-label={`Couleur ${c}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={dt.undo}
        disabled={dt.shapes.length === 0}
        aria-label="Annuler"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={dt.clearAll}
        disabled={dt.shapes.length === 0}
        aria-label="Tout effacer"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function DrawingOverlay({
  mapKey,
  iconColor,
}: {
  mapKey: string;
  iconColor?: string;
}) {
  const dt = useDrawingTool(mapKey);
  return (
    <div className="drawing-overlay-container">
      <DrawingCanvas dt={dt} className="drawing-canvas-fill" iconColor={iconColor} />
      <DrawingToolbar dt={dt} />
    </div>
  );
}
