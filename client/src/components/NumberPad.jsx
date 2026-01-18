import React, { useState, useCallback } from 'react';
import { Delete } from 'lucide-react';
import './NumberPad.css';

export default function NumberPad({ onInput, onDelete, onClear, onDone, value }) {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'delete'];
    const [ripples, setRipples] = useState({});

    const handleTouchStart = (e) => {
        // Prevent default touch behavior (zooming, scrolling) on keypad
        // e.preventDefault(); 
    };

    // Create ripple effect on button press
    const createRipple = useCallback((key, e) => {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();

        const size = Math.max(rect.width, rect.height);
        const x = e.clientX ? e.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
        const y = e.clientY ? e.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

        const id = Date.now();

        setRipples(prev => ({
            ...prev,
            [key]: { id, x, y, size }
        }));

        // Remove ripple after animation
        setTimeout(() => {
            setRipples(prev => {
                const copy = { ...prev };
                if (copy[key]?.id === id) {
                    delete copy[key];
                }
                return copy;
            });
        }, 400);
    }, []);

    const handleKeyPress = useCallback((key, e) => {
        createRipple(key, e);

        if (key === 'delete') {
            onDelete();
        } else {
            onInput(key.toString());
        }
    }, [createRipple, onDelete, onInput]);

    return (
        <div className="number-pad-container">
            <div className="number-pad-grid">
                {keys.map((key) => {
                    const ripple = ripples[key];

                    if (key === 'delete') {
                        return (
                            <button
                                key="delete"
                                type="button"
                                className="pad-key action-key"
                                onClick={(e) => handleKeyPress(key, e)}
                                onTouchStart={handleTouchStart}
                            >
                                <Delete size={24} />
                                {ripple && (
                                    <span
                                        className="ripple"
                                        style={{
                                            left: ripple.x,
                                            top: ripple.y,
                                            width: ripple.size,
                                            height: ripple.size,
                                        }}
                                    />
                                )}
                            </button>
                        );
                    }
                    return (
                        <button
                            key={key}
                            type="button"
                            className="pad-key number-key"
                            onClick={(e) => handleKeyPress(key, e)}
                            onTouchStart={handleTouchStart}
                        >
                            {key}
                            {ripple && (
                                <span
                                    className="ripple"
                                    style={{
                                        left: ripple.x,
                                        top: ripple.y,
                                        width: ripple.size,
                                        height: ripple.size,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
