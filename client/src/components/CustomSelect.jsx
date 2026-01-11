import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    valueKey = 'id',
    labelKey = 'name',
    onAddNew,
    addNewLabel = 'Add New'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt[valueKey] === value);
    const displayLabel = selectedOption ? selectedOption[labelKey] : placeholder;

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    function handleSelect(optionValue) {
        onChange(optionValue);
        setIsOpen(false);
    }

    function handleAddNew() {
        setIsOpen(false);
        if (onAddNew) {
            onAddNew();
        }
    }

    return (
        <div className="custom-select" ref={containerRef}>
            {label && <label className="input-label">{label}</label>}
            <button
                type="button"
                className={`custom-select-trigger ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`custom-select-value ${!value ? 'placeholder' : ''}`}>
                    {displayLabel}
                </span>
                <ChevronDown
                    size={18}
                    className={`custom-select-icon ${isOpen ? 'rotated' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {/* Empty option */}
                    <button
                        type="button"
                        className={`custom-select-option ${!value ? 'selected' : ''}`}
                        onClick={() => handleSelect('')}
                    >
                        <span className="option-label">{placeholder}</span>
                        {!value && <Check size={16} className="option-check" />}
                    </button>

                    {options.map((option) => (
                        <button
                            key={option[valueKey]}
                            type="button"
                            className={`custom-select-option ${value === option[valueKey] ? 'selected' : ''}`}
                            onClick={() => handleSelect(option[valueKey])}
                        >
                            <span className="option-label">{option[labelKey]}</span>
                            {value === option[valueKey] && <Check size={16} className="option-check" />}
                        </button>
                    ))}

                    {/* Add New option */}
                    {onAddNew && (
                        <button
                            type="button"
                            className="custom-select-option add-new-option"
                            onClick={handleAddNew}
                        >
                            <Plus size={16} className="add-new-icon" />
                            <span className="option-label">{addNewLabel}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

