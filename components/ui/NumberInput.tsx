"use client";

import { useCallback, useEffect, useRef } from "react";
import type { InputHTMLAttributes, KeyboardEvent, WheelEvent as ReactWheelEvent } from "react";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  onValueChange: (value: string) => void;
  formatPrecision?: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPlaces(value: unknown): number {
  const text = String(value ?? "");
  if (!text.includes(".")) return 0;
  return text.split(".")[1]?.replace(/0+$/, "").length || 0;
}

function precisionPlaces(step: unknown, formatPrecision?: number): number {
  return Math.min(Math.max(formatPrecision ?? decimalPlaces(step), 0), 6);
}

function formatStepValue(value: number, step: unknown, formatPrecision?: number): string {
  const places = precisionPlaces(step, formatPrecision);
  return places ? value.toFixed(places) : String(Math.round(value));
}

function allowsNumericText(value: string): boolean {
  return value === "" || /^-?\d*(?:[.,]\d*)?$/.test(value);
}

export function NumberInput({
  value,
  min,
  max,
  step = 1,
  disabled,
  className,
  formatPrecision,
  onValueChange,
  onKeyDown,
  onWheel,
  ...props
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingStepValueRef = useRef<string | null>(null);

  const stepBy = useCallback((direction: 1 | -1) => {
    if (disabled) return;
    const numericStep = toFiniteNumber(step) ?? 1;
    const current = toFiniteNumber(inputRef.current?.value ?? value);
    const minValue = toFiniteNumber(min);
    const maxValue = toFiniteNumber(max);
    const base = current ?? minValue ?? 0;
    const factor = 10 ** precisionPlaces(step, formatPrecision);
    let next = Math.round((base + direction * numericStep) * factor) / factor;
    if (minValue !== null) next = Math.max(next, minValue);
    if (maxValue !== null) next = Math.min(next, maxValue);
    const nextValue = formatStepValue(next, step, formatPrecision);
    pendingStepValueRef.current = nextValue;
    onValueChange(nextValue);
    window.requestAnimationFrame(() => {
      if (pendingStepValueRef.current && inputRef.current) {
        inputRef.current.value = pendingStepValueRef.current;
        onValueChange(pendingStepValueRef.current);
        pendingStepValueRef.current = null;
        inputRef.current.focus();
      }
    });
  }, [disabled, formatPrecision, max, min, onValueChange, step, value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    function stepWithWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      stepBy(delta < 0 ? 1 : -1);
    }
    input.addEventListener("wheel", stepWithWheel, { passive: false });
    return () => input.removeEventListener("wheel", stepWithWheel);
  }, [stepBy]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      stepBy(event.key === "ArrowUp" ? 1 : -1);
      return;
    }
    onKeyDown?.(event);
  }

  function handleWheel(event: ReactWheelEvent<HTMLInputElement>) {
    onWheel?.(event);
  }

  return (
    <div className={`number-control ${className || ""}`}>
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        data-min={min}
        data-max={max}
        data-step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          if (allowsNumericText(nextValue)) onValueChange(nextValue);
        }}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
      />
      <div className="number-stepper" aria-hidden={disabled ? "true" : undefined}>
        <button type="button" tabIndex={-1} disabled={disabled} aria-label="Increase value" onClick={() => stepBy(1)}>+</button>
        <button type="button" tabIndex={-1} disabled={disabled} aria-label="Decrease value" onClick={() => stepBy(-1)}>-</button>
      </div>
    </div>
  );
}
