interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoFocus,
}: InputProps) => (
  <label className="field">
    <span>{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  </label>
);
