import React from 'react';

export default function AutocompleteField({
  label, field, value, placeholder, suggestions,
  activeDropdown, setActiveDropdown, onChange, disabled
}) {
  const filtered = !value
    ? suggestions
    : suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));

  return (
    <label>
      {label}
      <div className="autocomplete-wrapper">
        <textarea
          rows="2"
          value={value}
          onChange={e => {
            onChange(field, e.target.value);
            setActiveDropdown(e.target.value ? field : null);
          }}
          onFocus={() => value && setActiveDropdown(field)}
          onBlur={() => setTimeout(() => setActiveDropdown(null), 150)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {activeDropdown === field && filtered.length > 0 && (
          <div className="autocomplete-list">
            {filtered.map((s, i) => (
              <div
                key={i}
                className="autocomplete-item"
                onMouseDown={() => {
                  onChange(field, s);
                  setActiveDropdown(null);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
