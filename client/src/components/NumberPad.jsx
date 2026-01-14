import React from 'react';
import { Delete } from 'lucide-react';
import './NumberPad.css';

export default function NumberPad({ onInput, onDelete, onClear, onDone, value }) {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'delete'];

    const handleTouchStart = (e) => {
        // Prevent default touch behavior (zooming, scrolling) on keypad
        // e.preventDefault(); 
    };

    return (
        <div className="number-pad-container">
            <div className="number-pad-grid">
                {keys.map((key) => {
                    if (key === 'delete') {
                        return (
                            <button
                                key="delete"
                                type="button"
                                className="pad-key action-key"
                                onClick={onDelete}
                                onTouchStart={handleTouchStart}
                            >
                                <Delete size={24} />
                            </button>
                        );
                    }
                    return (
                        <button
                            key={key}
                            type="button"
                            className="pad-key number-key"
                            onClick={() => onInput(key.toString())}
                            onTouchStart={handleTouchStart}
                        >
                            {key}
                        </button>
                    );
                })}
            </div>
            {/* Optional dedicated Done/Next button if needed, but UI usually has a main save button */}
        </div>
    );
}
