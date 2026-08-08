import { MouseEvent as ReactMouseEvent, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { uid } from "../uid";
import { Point, Shape, ShapeType } from "../types";

export type Tool = ShapeType | "cursor";

export const PRESET_COLORS = [
  "#e2413e",
  "#f5b642",
  "#34c759",
  "#3aa8ff",
  "#c06bf1",
  "#ffffff",
];

export interface EditingText {
  id: string;
  screenX: number;
  screenY: number;
  value: string;
}

export function useDrawingTool(mapKey: string) {
  const { annotations, setAnnotations } = useAppData();
  const shapes = annotations[mapKey] ?? [];
  const [tool, setTool] = useState<Tool>("cursor");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [drawing, setDrawing] = useState<Shape | null>(null);
  const [editingText, setEditingText] = useState<EditingText | null>(null);
  const [movingPreview, setMovingPreview] = useState<{ id: string; points: Point[] } | null>(
    null,
  );
  const movingRef = useRef<{ id: string; start: Point; originalPoints: Point[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function updateShapes(updater: (prev: Shape[]) => Shape[]) {
    setAnnotations((prev) => ({ ...prev, [mapKey]: updater(prev[mapKey] ?? []) }));
  }

  function screenToPoint(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function handlePointerDown(e: ReactMouseEvent<SVGSVGElement>) {
    if (tool === "cursor") return;
    e.stopPropagation();
    const p = screenToPoint(e.clientX, e.clientY);

    if (tool === "text") {
      const id = uid();
      updateShapes((prev) => [...prev, { id, type: "text", color, points: [p], text: "" }]);
      const rect = containerRef.current?.getBoundingClientRect();
      setEditingText({
        id,
        screenX: rect ? e.clientX - rect.left : 0,
        screenY: rect ? e.clientY - rect.top : 0,
        value: "",
      });
      return;
    }

    setDrawing({
      id: uid(),
      type: tool,
      color,
      points: tool === "pen" ? [p] : [p, p],
    });
  }

  function handleShapePointerDown(e: ReactMouseEvent<SVGGElement>, shape: Shape) {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const p = screenToPoint(e.clientX, e.clientY);
    movingRef.current = { id: shape.id, start: p, originalPoints: shape.points };
  }

  function handlePointerMove(e: ReactMouseEvent<SVGSVGElement>) {
    if (movingRef.current) {
      e.stopPropagation();
      const p = screenToPoint(e.clientX, e.clientY);
      const dx = p.x - movingRef.current.start.x;
      const dy = p.y - movingRef.current.start.y;
      const points = movingRef.current.originalPoints.map((pt) => ({
        x: pt.x + dx,
        y: pt.y + dy,
      }));
      setMovingPreview({ id: movingRef.current.id, points });
      return;
    }
    if (!drawing) return;
    e.stopPropagation();
    const p = screenToPoint(e.clientX, e.clientY);
    setDrawing((prev) => {
      if (!prev) return prev;
      if (prev.type === "pen") return { ...prev, points: [...prev.points, p] };
      return { ...prev, points: [prev.points[0], p] };
    });
  }

  function handlePointerUp(e: ReactMouseEvent<SVGSVGElement>) {
    if (movingRef.current) {
      e.stopPropagation();
      if (movingPreview) {
        const id = movingRef.current.id;
        const finalPoints = movingPreview.points;
        updateShapes((prev) =>
          prev.map((s) => (s.id === id ? { ...s, points: finalPoints } : s)),
        );
      }
      movingRef.current = null;
      setMovingPreview(null);
      return;
    }
    if (!drawing) return;
    e.stopPropagation();
    updateShapes((prev) => [...prev, drawing]);
    setDrawing(null);
  }

  function commitText(value: string) {
    if (!editingText) return;
    const trimmed = value.trim();
    updateShapes((prev) =>
      trimmed
        ? prev.map((s) => (s.id === editingText.id ? { ...s, text: trimmed } : s))
        : prev.filter((s) => s.id !== editingText.id),
    );
    setEditingText(null);
  }

  function cancelText() {
    if (!editingText) return;
    updateShapes((prev) => prev.filter((s) => s.id !== editingText.id));
    setEditingText(null);
  }

  function undo() {
    updateShapes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    updateShapes(() => []);
  }

  function addIcon(iconUrl: string, clientX: number, clientY: number, bgColor = "") {
    const p = screenToPoint(clientX, clientY);
    updateShapes((prev) => [
      ...prev,
      { id: uid(), type: "icon", color: bgColor, points: [p], iconUrl },
    ]);
  }

  const visibleShapes = (drawing ? [...shapes, drawing] : shapes).map((s) =>
    movingPreview && movingPreview.id === s.id ? { ...s, points: movingPreview.points } : s,
  );

  return {
    shapes,
    visibleShapes,
    tool,
    setTool,
    color,
    setColor,
    editingText,
    setEditingText,
    svgRef,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleShapePointerDown,
    commitText,
    cancelText,
    undo,
    clearAll,
    addIcon,
  };
}

export type DrawingTool = ReturnType<typeof useDrawingTool>;
