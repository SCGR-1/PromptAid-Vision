import React from 'react';
import styles from './CustomSwitch.module.css';

interface CustomSwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export default function CustomSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  name
}: CustomSwitchProps) {
  return (
    <label className={`${styles.switchLabel} ${disabled ? styles.disabled : ''}`}>
      {label && <span className={styles.switchText}>{label}</span>}
      <div className={styles.switchContainer}>
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={styles.switchInput}
        />
        <span className={`${styles.slider} ${checked ? styles.checked : ''}`} />
      </div>
    </label>
  );
}

