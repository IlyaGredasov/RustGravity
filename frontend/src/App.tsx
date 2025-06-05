import React, { useCallback, useEffect, useState, useRef } from "react";
import { Stage, Container } from "@pixi/react";
// @ts-ignore
import { calculateCanvasSize } from "./common.ts";
import SpaceObjects from "./components/SpaceObjects.jsx";
import SimulationConfigurator from "./components/SimulationConfigurator.jsx";
import CoordinatesDisplay from "./components/CoordinatesDisplay.jsx";
import "./App.css";

const keyMap = new Map([
  ["w", "down"],
  ["s", "up"],
  ["a", "left"],
  ["d", "right"],
]);

const App = () => {
  const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
  const [positions, setPositions] = useState([]);
  const [socketId, setSocketId] = useState();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const socketRef = useRef<WebSocket>();
  const dragState = useRef({
    start: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    active: false
  });

  const updateCanvasSize = useCallback(() => {
    const newSize = calculateCanvasSize();
    setCanvasSize(prev =>
        prev.width !== newSize.width || prev.height !== newSize.height
            ? newSize
            : prev
    );
  }, []);

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updateCanvasSize);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasSize]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:5000/ws");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.user_id) {
          console.log("SID from server:", msg.user_id);
          setSocketId(msg.user_id);
        }

        if (msg.event === "update_step") {
          const newPositions = msg.data.map((obj: any) => Object.values(obj)[0]);
          setPositions(prev =>
              prev.length !== newPositions.length ||
              prev.some((p, i) => p.x !== newPositions[i].x || p.y !== newPositions[i].y)
                  ? newPositions
                  : prev
          );
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err, event.data);
      }
    };

    socket.onclose = () => console.warn("WebSocket closed");

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      const direction = keyMap.get(event.key.toLowerCase());
      if (direction && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
            JSON.stringify({
              event: "button_press",
              data: {
                direction,
                is_pressed: event.type === "keydown"
              }
            })
        );
      }
    };

    window.addEventListener("keydown", handleKeyEvent);
    window.addEventListener("keyup", handleKeyEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyEvent);
      window.removeEventListener("keyup", handleKeyEvent);
    };
  }, []);

  const handleWheel = useCallback((event) => {
    const stage = event.currentTarget;
    const rect = stage.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldXBefore = (mouseX - canvasSize.width / 2 - position.x * scale) / scale;
    const worldYBefore = (mouseY - canvasSize.height / 2 - position.y * scale) / scale;

    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.000001, Math.min(5, scale * delta));

    const newPosition = {
      x: (mouseX - canvasSize.width / 2 - worldXBefore * newScale) / newScale,
      y: (mouseY - canvasSize.height / 2 - worldYBefore * newScale) / newScale,
    };

    setScale(newScale);
    setPosition(newPosition);
  }, [scale, position, canvasSize]);

  const handleDragStart = useCallback((event) => {
    if (event.target.localName !== "canvas") return;
    dragState.current = {
      start: { x: event.clientX, y: event.clientY },
      offset: { x: position.x, y: position.y },
      active: true
    };
  }, [position]);

  const handleDragMove = useCallback((event) => {
    if (!dragState.current.active) return;

    const deltaX = (event.clientX - dragState.current.start.x) / scale;
    const deltaY = (event.clientY - dragState.current.start.y) / scale;

    setPosition({
      x: dragState.current.offset.x + deltaX,
      y: dragState.current.offset.y + deltaY,
    });
  }, [scale]);

  const handleDragEnd = useCallback(() => {
    dragState.current.active = false;
  }, []);

  return (
      <div
          className="simulation-container"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
      >
        <div className="configurator-panel">
          <SimulationConfigurator socketId={socketId} setPosition={setPosition} />
        </div>
        <div className="canvas-panel">
          <Stage width={canvasSize.width} height={canvasSize.height}
                 options={{ backgroundColor: 0x000000, autoDensity: true, antialias: false }} onWheel={handleWheel}>
            <Container scale={scale}
                       x={canvasSize.width / 2 + position.x * scale}
                       y={canvasSize.height / 2 + position.y * scale}>
              <SpaceObjects positions={positions} />
            </Container>
          </Stage>
        </div>
        <CoordinatesDisplay position={position} positions={positions} />
      </div>
  );
};

export default React.memo(App);
