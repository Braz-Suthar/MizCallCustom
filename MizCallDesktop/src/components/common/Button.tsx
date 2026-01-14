import type { ReactNode } from "react";

interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

export const Button = ({
  label,
  onClick,
  variant = "primary",
  loading,
  disabled,
  icon,
}: ButtonProps) => (
  <button
    className={`btn btn-${variant}`}
    onClick={onClick}
    disabled={loading || disabled}
  >
    {loading ? "..." : icon ? <span className="btn-icon">{icon}</span> : null}
    {label}
  </button>
);
