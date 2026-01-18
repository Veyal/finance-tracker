import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './DatePicker.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to format date as YYYY-MM-DD using local timezone (not UTC)
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to parse YYYY-MM-DD string as local date
function parseLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export default function DatePicker({ value, onChange, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        return value ? parseLocalDate(value) : new Date();
    });
    const containerRef = useRef(null);

    // Parse value to Date object using local timezone
    const selectedDate = value ? parseLocalDate(value) : null;

    // Format display value
    const displayValue = selectedDate
        ? selectedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Select date';

    // Click outside to close
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

    // Get days in month
    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // Get first day of month (0 = Sunday)
    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    // Navigate months
    function prevMonth() {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }

    function nextMonth() {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }

    // Select a day
    function selectDay(day) {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Format as YYYY-MM-DD using local timezone (not UTC)
        const formatted = formatLocalDate(newDate);
        onChange(formatted);
        setIsOpen(false);
    }

    // Quick select today
    function selectToday() {
        const today = new Date();
        const formatted = formatLocalDate(today);
        onChange(formatted);
        setIsOpen(false);
    }

    // Quick select yesterday
    function selectYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const formatted = formatLocalDate(yesterday);
        onChange(formatted);
        setIsOpen(false);
    }

    // Check if a day is selected
    function isSelected(day) {
        if (!selectedDate) return false;
        return (
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === viewDate.getMonth() &&
            selectedDate.getFullYear() === viewDate.getFullYear()
        );
    }

    // Check if a day is today
    function isToday(day) {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === viewDate.getMonth() &&
            today.getFullYear() === viewDate.getFullYear()
        );
    }

    // Build calendar grid
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const calendarDays = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <div className="date-picker" ref={containerRef}>
            {label && <label className="date-picker-label">{label}</label>}

            <button
                type="button"
                className={`date-picker-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Calendar size={18} className="date-picker-icon" />
                <span className="date-picker-value">{displayValue}</span>
                <ChevronRight
                    size={16}
                    className={`date-picker-arrow ${isOpen ? 'rotated' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="date-picker-dropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Quick select buttons */}
                        <div className="date-picker-quick">
                            <button type="button" onClick={selectToday}>Today</button>
                            <button type="button" onClick={selectYesterday}>Yesterday</button>
                        </div>

                        {/* Month navigation */}
                        <div className="date-picker-header">
                            <button
                                type="button"
                                className="date-picker-nav"
                                onClick={prevMonth}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="date-picker-month">
                                {MONTHS[month]} {year}
                            </span>
                            <button
                                type="button"
                                className="date-picker-nav"
                                onClick={nextMonth}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Day names */}
                        <div className="date-picker-weekdays">
                            {DAYS.map(day => (
                                <span key={day} className="weekday">{day}</span>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="date-picker-grid">
                            {calendarDays.map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`date-picker-day ${day === null ? 'empty' : ''
                                        } ${day && isSelected(day) ? 'selected' : ''
                                        } ${day && isToday(day) ? 'today' : ''
                                        }`}
                                    onClick={() => day && selectDay(day)}
                                    disabled={day === null}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
