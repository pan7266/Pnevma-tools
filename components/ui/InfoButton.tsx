"use client";

interface InfoButtonProps {
  title: string;
  body: string;
  onOpen: (modal: { title: string; body: string }) => void;
}

export function InfoButton({ title, body, onOpen }: InfoButtonProps) {
  return (
    <button
      className="info-button"
      type="button"
      aria-label={title}
      title={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen({ title, body });
      }}
    >
      i
    </button>
  );
}
