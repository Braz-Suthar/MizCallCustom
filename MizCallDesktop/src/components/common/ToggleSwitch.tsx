interface ToggleSwitchProps {
  checked: boolean;
  onToggle: () => void;
}

export const ToggleSwitch = ({ checked, onToggle }: ToggleSwitchProps) => (
  <div className={`toggle ${checked ? "on" : "off"}`} onClick={onToggle}>
    <div className="toggle-track">
      <div className="toggle-thumb" />
    </div>
  </div>
);
