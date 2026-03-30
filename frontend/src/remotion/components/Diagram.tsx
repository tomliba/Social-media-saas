import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  ACCENT,
  FONT_FAMILY,
} from "../mg-constants";

interface DiagramProps {
  steps: string[];
  style?: "flowchart" | "linear" | "circular";
  startFrame: number;
  endFrame: number;
}

const BOX_BG = "#1a1a2e";
const STEP_DELAY = 15;

export const Diagram: React.FC<DiagramProps> = ({
  steps,
  style = "linear",
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const capped = steps.slice(0, 6);

  if (style === "circular") {
    return <CircularDiagram steps={capped} startFrame={startFrame} frame={frame} fps={fps} />;
  }

  if (style === "flowchart" && capped.length > 3) {
    return <FlowchartDiagram steps={capped} startFrame={startFrame} frame={frame} fps={fps} />;
  }

  // ── Linear (default) ──
  const boxH = 56;
  const gap = 20;
  const arrowH = 36;
  const totalH = capped.length * boxH + (capped.length - 1) * (gap + arrowH + gap);
  const startY = (960 - totalH) / 2;

  return (
    <div style={{ ...mgContainerStyle, padding: 40 }}>
      <svg
        width={CANVAS_W}
        height={960}
        viewBox={`0 0 ${CANVAS_W} 960`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {capped.map((_, i) => {
          if (i === capped.length - 1) return null;
          const arrowDelay = startFrame + i * STEP_DELAY + 8;
          const arrowProgress = mgSpring(frame, fps, arrowDelay);

          const y1 = startY + (i + 1) * boxH + i * (gap + arrowH + gap) + gap;
          const y2 = y1 + arrowH;
          const cx = CANVAS_W / 2;

          return (
            <g key={`arrow-${i}`} opacity={arrowProgress}>
              <line
                x1={cx}
                y1={y1}
                x2={cx}
                y2={y2 - 8}
                stroke={ACCENT}
                strokeWidth={2}
                strokeDasharray={arrowH}
                strokeDashoffset={(1 - arrowProgress) * arrowH}
              />
              <polygon
                points={`${cx - 6},${y2 - 10} ${cx + 6},${y2 - 10} ${cx},${y2}`}
                fill={ACCENT}
              />
            </g>
          );
        })}
      </svg>

      {capped.map((step, i) => {
        const boxDelay = startFrame + i * STEP_DELAY;
        const p = mgSpring(frame, fps, boxDelay);
        const y = startY + i * (boxH + gap + arrowH + gap);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y,
              left: "50%",
              transform: `translateX(-50%) scale(${0.8 + p * 0.2})`,
              opacity: p,
              background: BOX_BG,
              border: `1px solid ${ACCENT}`,
              borderRadius: 12,
              padding: "12px 32px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                fontSize: 32,
                color: "white",
              }}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CANVAS_W = 1080;

// ── Flowchart variant ──

function FlowchartDiagram({
  steps,
  startFrame,
  frame,
  fps,
}: {
  steps: string[];
  startFrame: number;
  frame: number;
  fps: number;
}) {
  // Top row: first ceil(n/2) items, bottom row: rest
  const topCount = Math.ceil(steps.length / 2);
  const topRow = steps.slice(0, topCount);
  const bottomRow = steps.slice(topCount);

  const boxW = 200;
  const boxH = 56;
  const rowGap = 100;
  const colGap = 40;

  const topStartX = (CANVAS_W - (topRow.length * boxW + (topRow.length - 1) * colGap)) / 2;
  const botStartX = (CANVAS_W - (bottomRow.length * boxW + (bottomRow.length - 1) * colGap)) / 2;
  const topY = 300;
  const botY = topY + boxH + rowGap;

  return (
    <div style={{ ...mgContainerStyle, padding: 40 }}>
      <svg
        width={CANVAS_W}
        height={960}
        viewBox={`0 0 ${CANVAS_W} 960`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Horizontal arrows in top row */}
        {topRow.map((_, i) => {
          if (i === topRow.length - 1) return null;
          const p = mgSpring(frame, fps, startFrame + i * STEP_DELAY + 8);
          const x1 = topStartX + (i + 1) * boxW + i * colGap;
          const x2 = x1 + colGap;
          const cy = topY + boxH / 2;
          return (
            <g key={`ta-${i}`} opacity={p}>
              <line x1={x1} y1={cy} x2={x2 - 6} y2={cy} stroke={ACCENT} strokeWidth={2} />
              <polygon points={`${x2 - 8},${cy - 5} ${x2 - 8},${cy + 5} ${x2},${cy}`} fill={ACCENT} />
            </g>
          );
        })}
        {/* Vertical arrow from last top to first bottom */}
        {bottomRow.length > 0 && (() => {
          const p = mgSpring(frame, fps, startFrame + (topRow.length - 1) * STEP_DELAY + 8);
          const cx = topStartX + (topRow.length - 1) * (boxW + colGap) + boxW / 2;
          const y1 = topY + boxH;
          const y2 = botY;
          return (
            <g opacity={p}>
              <line x1={cx} y1={y1} x2={cx} y2={y2 - 6} stroke={ACCENT} strokeWidth={2} />
              <polygon points={`${cx - 5},${y2 - 8} ${cx + 5},${y2 - 8} ${cx},${y2}`} fill={ACCENT} />
            </g>
          );
        })()}
        {/* Horizontal arrows in bottom row */}
        {bottomRow.map((_, i) => {
          if (i === bottomRow.length - 1) return null;
          const p = mgSpring(frame, fps, startFrame + (topRow.length + i) * STEP_DELAY + 8);
          const x1 = botStartX + (i + 1) * boxW + i * colGap;
          const x2 = x1 + colGap;
          const cy = botY + boxH / 2;
          return (
            <g key={`ba-${i}`} opacity={p}>
              <line x1={x1} y1={cy} x2={x2 - 6} y2={cy} stroke={ACCENT} strokeWidth={2} />
              <polygon points={`${x2 - 8},${cy - 5} ${x2 - 8},${cy + 5} ${x2},${cy}`} fill={ACCENT} />
            </g>
          );
        })}
      </svg>

      {/* Top row boxes */}
      {topRow.map((step, i) => {
        const p = mgSpring(frame, fps, startFrame + i * STEP_DELAY);
        const x = topStartX + i * (boxW + colGap);
        return (
          <div
            key={`t-${i}`}
            style={{
              position: "absolute",
              top: topY,
              left: x,
              width: boxW,
              opacity: p,
              transform: `scale(${0.8 + p * 0.2})`,
              background: BOX_BG,
              border: `1px solid ${ACCENT}`,
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 28, color: "white" }}>
              {step}
            </span>
          </div>
        );
      })}

      {/* Bottom row boxes */}
      {bottomRow.map((step, i) => {
        const p = mgSpring(frame, fps, startFrame + (topRow.length + i) * STEP_DELAY);
        const x = botStartX + i * (boxW + colGap);
        return (
          <div
            key={`b-${i}`}
            style={{
              position: "absolute",
              top: botY,
              left: x,
              width: boxW,
              opacity: p,
              transform: `scale(${0.8 + p * 0.2})`,
              background: BOX_BG,
              border: `1px solid ${ACCENT}`,
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 28, color: "white" }}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Circular variant ──

function CircularDiagram({
  steps,
  startFrame,
  frame,
  fps,
}: {
  steps: string[];
  startFrame: number;
  frame: number;
  fps: number;
}) {
  const cx = CANVAS_W / 2;
  const cy = 480;
  const radius = 280;
  const n = steps.length;

  return (
    <div style={{ ...mgContainerStyle, padding: 40 }}>
      <svg
        width={CANVAS_W}
        height={960}
        viewBox={`0 0 ${CANVAS_W} 960`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Arcs between steps */}
        {steps.map((_, i) => {
          const p = mgSpring(frame, fps, startFrame + i * STEP_DELAY + 8);
          const angle1 = (i / n) * Math.PI * 2 - Math.PI / 2;
          const angle2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
          const midAngle = (angle1 + angle2) / 2;

          const x1 = cx + Math.cos(angle1) * (radius - 40);
          const y1 = cy + Math.sin(angle1) * (radius - 40);
          const x2 = cx + Math.cos(angle2) * (radius - 40);
          const y2 = cy + Math.sin(angle2) * (radius - 40);

          // Control point for curve
          const cpR = radius - 80;
          const cpx = cx + Math.cos(midAngle) * cpR;
          const cpy = cy + Math.sin(midAngle) * cpR;

          return (
            <path
              key={`arc-${i}`}
              d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2}
              opacity={p}
              strokeDasharray={200}
              strokeDashoffset={(1 - p) * 200}
            />
          );
        })}
      </svg>

      {/* Step boxes positioned in a circle */}
      {steps.map((step, i) => {
        const p = mgSpring(frame, fps, startFrame + i * STEP_DELAY);
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y - 28,
              left: x - 90,
              width: 180,
              opacity: p,
              transform: `scale(${0.8 + p * 0.2})`,
              background: BOX_BG,
              border: `1px solid ${ACCENT}`,
              borderRadius: 12,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 24, color: "white" }}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
