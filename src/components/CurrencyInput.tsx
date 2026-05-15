import React, { useState, useEffect } from "react";

interface CurrencyInputProps {
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  disabled?: boolean;
  onBlur?: () => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className = "",
  prefix = "Rp",
  disabled = false,
  onBlur,
}) => {
  const [displayValue, setDisplayValue] = useState("");

  // Format number to IDR style: 10.000
  const formatNumber = (num: number | ""): string => {
    if (num === "" || isNaN(num)) return "";
    return new Intl.NumberFormat("id-ID").format(num);
  };

  // Sync internal display value when external value changes
  useEffect(() => {
    const formatted = formatNumber(value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, ""); // Remove all dots
    
    if (rawValue === "") {
      setDisplayValue("");
      onChange("");
      return;
    }

    // Only allow numbers
    if (!/^\d+$/.test(rawValue)) return;

    const numericValue = parseInt(rawValue, 10);
    const safeValue = Math.max(0, numericValue);
    
    setDisplayValue(formatNumber(safeValue));
    onChange(safeValue);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={`${prefix ? "pl-12" : "px-4"} ${className} [appearance:textfield]`}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
};
