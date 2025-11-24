import React, { useState } from "react";
import CustomDatePicker from "./CustomDatePicker";
import "../styles/AvailabilityManager.css";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface ProviderAvailability {
  weekly: WeeklySchedule;
  blockedDates: string[];
}

export const defaultDaySchedule: DaySchedule = {
  enabled: true,
  slots: [{ start: "09:00", end: "17:00" }],
};

export const defaultWeeklySchedule: WeeklySchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule, enabled: false },
  sunday: { ...defaultDaySchedule, enabled: false },
};

interface AvailabilityManagerProps {
  value: ProviderAvailability;
  onChange: (newAvailability: ProviderAvailability) => void;
  bookedDates?: string[]; // Array of YYYY-MM-DD strings
}

const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({
  value,
  onChange,
  bookedDates = [],
}) => {
  const [newBlockedDate, setNewBlockedDate] = useState<Date | null>(null);

  const handleDayToggle = (day: keyof WeeklySchedule) => {
    const newAvailability = {
      ...value,
      weekly: {
        ...value.weekly,
        [day]: {
          ...value.weekly[day],
          enabled: !value.weekly[day].enabled,
        },
      },
    };
    onChange(newAvailability);
  };

  const handleTimeChange = (
    day: keyof WeeklySchedule,
    index: number,
    field: "start" | "end",
    newValue: string
  ) => {
    const newSlots = [...value.weekly[day].slots];
    newSlots[index] = { ...newSlots[index], [field]: newValue };

    const newAvailability = {
      ...value,
      weekly: {
        ...value.weekly,
        [day]: {
          ...value.weekly[day],
          slots: newSlots,
        },
      },
    };
    onChange(newAvailability);
  };

  const isDateSelectable = (date: Date) => {
    // Check if day is enabled in weekly schedule
    const dayMap: (keyof WeeklySchedule)[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayKey = dayMap[date.getDay()];
    if (!value.weekly[dayKey].enabled) return false;

    // Check if date is already blocked
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    return !value.blockedDates.includes(dateString);
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;

    // Format date to YYYY-MM-DD
    const year = newBlockedDate.getFullYear();
    const month = String(newBlockedDate.getMonth() + 1).padStart(2, "0");
    const day = String(newBlockedDate.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    if (value.blockedDates.includes(dateString)) {
        alert("Data già bloccata.");
        return;
    }

    if (bookedDates.includes(dateString)) {
      alert("Impossibile bloccare questa data: ci sono già prenotazioni attive.");
      return;
    }

    const newAvailability = {
      ...value,
      blockedDates: [...value.blockedDates, dateString].sort(),
    };
    onChange(newAvailability);
    setNewBlockedDate(null);
  };

  const removeBlockedDate = (dateToRemove: string) => {
    const newAvailability = {
      ...value,
      blockedDates: value.blockedDates.filter((d) => d !== dateToRemove),
    };
    onChange(newAvailability);
  };

  const days: (keyof WeeklySchedule)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const dayLabels: Record<keyof WeeklySchedule, string> = {
    monday: "Lunedì",
    tuesday: "Martedì",
    wednesday: "Mercoledì",
    thursday: "Giovedì",
    friday: "Venerdì",
    saturday: "Sabato",
    sunday: "Domenica",
  };

  return (
    <div className="availability-manager">
      <h3>Gestione Disponibilità Servizio</h3>

      <div className="weekly-schedule">
        <h4>Orari Settimanali</h4>
        {days.map((day) => (
          <div key={day} className="day-row">
            <div className="day-label">
              <input
                type="checkbox"
                checked={value.weekly[day].enabled}
                onChange={() => handleDayToggle(day)}
                id={`day-${day}`}
              />
              <label htmlFor={`day-${day}`}>{dayLabels[day]}</label>
            </div>
            {value.weekly[day].enabled && (
              <div className="time-slots">
                {value.weekly[day].slots.map((slot, index) => (
                  <div key={index} className="time-slot">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        handleTimeChange(day, index, "start", e.target.value)
                      }
                    />
                    <span> - </span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        handleTimeChange(day, index, "end", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {!value.weekly[day].enabled && (
              <span className="closed-label">Chiuso</span>
            )}
          </div>
        ))}
      </div>

      <div className="blocked-dates">
        <h4>Date Bloccate (Ferie/Chiusura)</h4>
        <div className="form-group">
          <label style={{ marginBottom: "8px", display: "block" }}>
            Seleziona una data da bloccare:
          </label>
          <div className="add-date-group">
            <CustomDatePicker
              selected={newBlockedDate}
              onChange={(date) => setNewBlockedDate(date)}
              placeholderText="Seleziona una data"
              filterDate={isDateSelectable}
              highlightDates={[
                {
                  "booked-date-highlight": bookedDates.map((d) => new Date(d)),
                },
              ]}
            />
            <button
              type="button"
              onClick={addBlockedDate}
              disabled={!newBlockedDate}
              className="btn btn-primary"
            >
              Aggiungi Data
            </button>
          </div>
        </div>
        <ul className="blocked-dates-list">
          {value.blockedDates.map((date) => (
            <li key={date}>
              {new Date(date).toLocaleDateString("it-IT")}
              <button
                type="button"
                onClick={() => removeBlockedDate(date)}
                className="remove-date-btn"
              >
                &times;
              </button>
            </li>
          ))}
          {value.blockedDates.length === 0 && <li>Nessuna data bloccata.</li>}
        </ul>
      </div>
    </div>
  );
};

export default AvailabilityManager;
