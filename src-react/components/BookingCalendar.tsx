import React, { useState, useMemo, useCallback, memo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
} from "date-fns";
import { it } from "date-fns/locale";
import "../styles/BookingCalendar.css";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  time?: string;
  status: string;
  amount?: number;
  clientName?: string;
  providerName?: string;
  address?: string;
}

interface BookingCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  userType: "provider" | "client";
}

// Helper function to safely parse dates
const safeParseISO = (dateString: string): Date | null => {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    console.warn(`Invalid date string: ${dateString}`);
    return null;
  }
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  events,
  onEventClick,
  userType,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group events by date - with safe parsing
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    events.forEach((event) => {
      const parsedDate = safeParseISO(event.date);
      if (parsedDate) {
        const dateKey = format(parsedDate, "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });
    return grouped;
  }, [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  // Navigation handlers with useCallback to prevent unnecessary re-renders
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    onEventClick?.(event);
  }, [onEventClick]);

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={handlePrevMonth}
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <h2 className="calendar-month-title">
          {format(currentMonth, "MMMM yyyy", { locale: it })}
        </h2>
        <button
          className="calendar-nav-btn"
          onClick={handleNextMonth}
          aria-label="Mese successivo"
        >
          ›
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    return (
      <div className="calendar-days-row">
        {days.map((day) => (
          <div key={day} className="calendar-day-name">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDate[dateKey] || [];
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const hasEvents = dayEvents.length > 0;

        // Count events by status
        const pendingCount = dayEvents.filter(
          (e) => e.status === "pending" || e.status === "confirmed"
        ).length;
        const completedCount = dayEvents.filter(
          (e) => e.status === "completed"
        ).length;

        const currentDay = day;
        days.push(
          <div
            key={dateKey}
            className={`calendar-cell ${!isCurrentMonth ? "disabled" : ""} ${
              isSelected ? "selected" : ""
            } ${isToday ? "today" : ""} ${hasEvents ? "has-events" : ""}`}
            onClick={() => isCurrentMonth && handleDateSelect(currentDay)}
            role="button"
            tabIndex={isCurrentMonth ? 0 : -1}
            aria-label={`${format(day, "d MMMM yyyy", { locale: it })}${hasEvents ? `, ${dayEvents.length} appuntamenti` : ""}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                isCurrentMonth && handleDateSelect(currentDay);
              }
            }}
          >
            <span className="calendar-day-number">{format(day, "d")}</span>
            {hasEvents && (
              <div className="calendar-event-dots">
                {pendingCount > 0 && (
                  <span
                    className="event-dot pending"
                    title={`${pendingCount} in attesa`}
                  />
                )}
                {completedCount > 0 && (
                  <span
                    className="event-dot completed"
                    title={`${completedCount} completat${
                      completedCount > 1 ? "i" : "o"
                    }`}
                  />
                )}
              </div>
            )}
            {dayEvents.length > 0 && (
              <span className="calendar-event-count">{dayEvents.length}</span>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={`row-${rows.length}`} className="calendar-row">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="calendar-body">{rows}</div>;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "In attesa";
      case "confirmed":
        return "Confermato";
      case "completed":
        return "Completato";
      case "cancelled":
        return "Annullato";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  const renderEventsList = () => {
    if (!selectedDate) {
      return (
        <div className="calendar-events-placeholder">
          <span className="placeholder-icon">📅</span>
          <p>Seleziona un giorno per vedere i dettagli</p>
        </div>
      );
    }

    if (selectedDateEvents.length === 0) {
      return (
        <div className="calendar-events-placeholder">
          <span className="placeholder-icon">✨</span>
          <p>Nessun appuntamento per questa data</p>
        </div>
      );
    }

    return (
      <div className="calendar-events-list">
        <h3 className="events-list-title">
          {format(selectedDate, "EEEE d MMMM", { locale: it })}
        </h3>
        {selectedDateEvents.map((event) => (
          <div
            key={event.id}
            className={`calendar-event-card ${getStatusClass(event.status)}`}
            onClick={() => handleEventClick(event)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleEventClick(event);
              }
            }}
          >
            <div className="event-card-header">
              <span className="event-time">{event.time || "Orario TBD"}</span>
              <span className={`event-status ${getStatusClass(event.status)}`}>
                {getStatusLabel(event.status)}
              </span>
            </div>
            <h4 className="event-title">{event.title}</h4>
            {userType === "provider" && event.clientName && (
              <p className="event-client">👤 {event.clientName}</p>
            )}
            {userType === "client" && event.providerName && (
              <p className="event-provider">🧹 {event.providerName}</p>
            )}
            {event.address && (
              <p className="event-address">📍 {event.address}</p>
            )}
            {event.amount && (
              <p className="event-amount">💰 €{event.amount.toFixed(2)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Stats summary - with safe date parsing
  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((e) => {
      const parsedDate = safeParseISO(e.date);
      return (
        (e.status === "pending" || e.status === "confirmed") &&
        parsedDate &&
        parsedDate >= now
      );
    }).length;
    const completed = events.filter((e) => e.status === "completed").length;
    const thisMonth = events.filter((e) => {
      const parsedDate = safeParseISO(e.date);
      return parsedDate && isSameMonth(parsedDate, currentMonth);
    }).length;
    return { upcoming, completed, thisMonth };
  }, [events, currentMonth]);

  return (
    <div className="booking-calendar-container">
      <div className="calendar-stats">
        <div className="calendar-stat">
          <span className="stat-value">{stats.upcoming}</span>
          <span className="stat-label">In programma</span>
        </div>
        <div className="calendar-stat">
          <span className="stat-value">{stats.thisMonth}</span>
          <span className="stat-label">Questo mese</span>
        </div>
        <div className="calendar-stat">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completati</span>
        </div>
      </div>

      <div className="calendar-main">
        <div className="calendar-grid">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
        <div className="calendar-sidebar">{renderEventsList()}</div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot pending"></span>
          <span>In attesa/Confermato</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot completed"></span>
          <span>Completato</span>
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(BookingCalendar);
