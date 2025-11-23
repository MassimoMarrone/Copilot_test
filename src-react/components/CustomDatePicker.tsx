import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale/it";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/CustomDatePicker.css";

// Register Italian locale
registerLocale("it", it);

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  minDate?: Date;
  filterDate?: (date: Date) => boolean;
  className?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selected,
  onChange,
  placeholderText,
  minDate,
  filterDate,
  className,
}) => {
  return (
    <div className="custom-datepicker-wrapper">
      <DatePicker
        selected={selected}
        onChange={onChange}
        locale="it"
        dateFormat="EEEE d MMMM yyyy"
        placeholderText={placeholderText}
        minDate={minDate}
        filterDate={filterDate}
        className={`custom-datepicker-input ${className || ""}`}
        calendarClassName="custom-datepicker-calendar"
        showPopperArrow={false}
        popperProps={{ strategy: "fixed" }}
        isClearable
      />
      <span className="calendar-icon">📅</span>
    </div>
  );
};

export default CustomDatePicker;
