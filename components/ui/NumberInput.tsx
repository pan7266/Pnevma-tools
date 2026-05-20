"use client";

import { useEffect, useRef } from "react";
import type { InputHTMLAttributes, KeyboardEvent, WheelEvent as ReactWheelEvent } from "react";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  onValueChange: (value: string) => void;
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

function formatStepValue(value: number, step: unknown): string {
  const places = Math.min(Math.max(decimalPlaces(step), 0), 6);
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
  onValueChange,
  onKeyDown,
  onWheel,
  ...props
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingStepValueRef = useRef<string | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    function lockWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
    input.addEventListener("wheel", lockWheel, { passive: false });
    return () => input.removeEventListener("wheel", lockWheel);
  }, []);

  function stepBy(direction: 1 | -1) {
    if (disabled) return;
    const numericStep = toFiniteNumber(step) ?? 1;
    const current = toFiniteNumber(inputRef.current?.value ?? value);
    const minValue = toFiniteNumber(min);
    const maxValue = toFiniteNumber(max);
    const base = current ?? minValue ?? 0;
    const factor = 10 ** Math.min(Math.max(decimalPlaces(step), 0), 6);
    let next = Math.round((base + direction * numericStep) * factor) / factor;
    if (minValue !== null) next = Math.max(next, minValue);
    if (maxValue !== null) next = Math.min(next, maxValue);
    const nextValue = formatStepValue(next, step);
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
  }

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
