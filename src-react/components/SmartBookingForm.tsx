import React, { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import {
  schedulingService,
  SQUARE_METERS_OPTIONS,
  WINDOWS_COUNT_OPTIONS,
  TimeSlot,
} from "../services/schedulingService";
import AddressAutocomplete from "./AddressAutocomplete";
import "../styles/SmartBookingForm.css";

// Registra la locale italiana
registerLocale("it", it);

interface SmartBookingFormProps {
  service: {
    id: string;
    title: string;
    price: number;
  };
  onSubmit: (bookingData: SmartBookingData) => void;
  onCancel: () => void;
}

export interface SmartBookingData {
  date: string;
  squareMetersRange: string;
  windowsCount: number;
  startTime: string;
  endTime: string;
  clientPhone?: string;
  notes?: string;
  address?: string;
  calculatedPrice: number;
  estimatedDuration: number;
}

const SmartBookingForm: React.FC<SmartBookingFormProps> = ({
  service,
  onSubmit,
  onCancel,
}) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form data
  const [squareMetersRange, setSquareMetersRange] = useState<string>("");
  const [windowsCount, setWindowsCount] = useState<number>(4);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");

  // Calculated values
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(service.price);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Calculate duration when apartment details change
  useEffect(() => {
    if (squareMetersRange) {
      calculateDuration();
    }
  }, [squareMetersRange, windowsCount]);

  // Fetch available slots when date and duration are set
  useEffect(() => {
    if (selectedDate && squareMetersRange && estimatedMinutes > 0) {
      fetchAvailableSlots();
    }
  }, [selectedDate, estimatedMinutes]);

  const calculateDuration = async () => {
    try {
      const result = await schedulingService.getEstimatedDuration(
        squareMetersRange,
        windowsCount
      );
      setEstimatedDuration(result.formatted);
      setEstimatedMinutes(result.minutes);

      // Also get price estimate
      const priceResult = await schedulingService.getPriceEstimate(
        service.id,
        squareMetersRange,
        windowsCount
      );
      setCalculatedPrice(priceResult.calculatedPrice);
    } catch (error) {
      console.error("Error calculating duration:", error);
    }
  };

  const fetchAvailableSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const result = await schedulingService.getAvailableSlots(
        service.id,
        selectedDate,
        squareMetersRange,
        windowsCount
      );
      setAvailableSlots(result.slots);
      setCalculatedPrice(result.calculatedPrice);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const canProceedToStep2 = squareMetersRange !== "";
  const canProceedToStep3 = selectedDate !== "" && selectedSlot !== null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!selectedSlot) return;
    if (!address.trim()) {
      alert("Per favore inserisci l'indirizzo dove effettuare il servizio");
      return;
    }

    onSubmit({
      date: selectedDate,
      squareMetersRange,
      windowsCount,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      clientPhone,
      notes,
      address,
      calculatedPrice,
      estimatedDuration: estimatedMinutes,
    });
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Minimum booking is tomorrow
    return today.toISOString().split("T")[0];
  };

  return (
    <div className="smart-booking-form">
      {/* Progress indicator */}
      <div className="progress-steps">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`step ${currentStep >= step ? "active" : ""} ${
              currentStep > step ? "completed" : ""
            }`}
          >
            <div className="step-number">{step}</div>
            <div className="step-label">
              {step === 1 && "Dettagli Casa"}
              {step === 2 && "Data e Ora"}
              {step === 3 && "Conferma"}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Apartment Details */}
      {currentStep === 1 && (
        <div className="form-step">
          <h3>📐 Dicci di più sulla tua casa</h3>
          <p className="step-description">
            Questi dettagli ci aiutano a stimare la durata del servizio
          </p>

          <div className="form-group">
            <label>Dimensione appartamento *</label>
            <div className="square-meters-options">
              {SQUARE_METERS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`sqm-option ${
                    squareMetersRange === option.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="squareMeters"
                    value={option.value}
                    checked={squareMetersRange === option.value}
                    onChange={(e) => setSquareMetersRange(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    <span className="option-desc">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Numero di finestre</label>
            <div className="windows-options">
              {WINDOWS_COUNT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`windows-option ${
                    windowsCount === option.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="windowsCount"
                    value={option.value}
                    checked={windowsCount === option.value}
                    onChange={() => setWindowsCount(option.value)}
                  />
                  <div className="option-content">
                    <span className="option-label">🪟 {option.label}</span>
                    <span className="option-desc">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
            <small className="help-text">
              Include finestre, portefinestre e vetrate
            </small>
          </div>

          {estimatedDuration && (
            <div className="estimate-box">
              <div className="estimate-item">
                <span className="estimate-icon">⏱️</span>
                <div>
                  <strong>Durata stimata:</strong>
                  <span className="estimate-value">{estimatedDuration}</span>
                </div>
              </div>
              <div className="estimate-item">
                <span className="estimate-icon">💰</span>
                <div>
                  <strong>Prezzo:</strong>
                  <span className="estimate-value price">
                    €{calculatedPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date and Time Selection */}
      {currentStep === 2 && (
        <div className="form-step">
          <h3>📅 Scegli data e orario</h3>
          <p className="step-description">
            Seleziona quando vuoi che il cleaner venga da te
          </p>

          <div className="form-group">
            <label>Data del servizio *</label>
            <DatePicker
              selected={selectedDateObj}
              onChange={(date: Date | null) => {
                setSelectedDateObj(date);
                if (date) {
                  const formattedDate = date.toISOString().split("T")[0];
                  setSelectedDate(formattedDate);
                } else {
                  setSelectedDate("");
                }
                setSelectedSlot(null);
              }}
              minDate={new Date()}
              locale="it"
              dateFormat="dd MMMM yyyy"
              placeholderText="Seleziona una data"
              className="date-input custom-datepicker"
              calendarClassName="custom-calendar"
              showPopperArrow={false}
              inline
            />
          </div>

          {selectedDate && (
            <div className="form-group">
              <label>Orario disponibile *</label>
              {isLoadingSlots ? (
                <div className="loading-slots">
                  <span className="spinner"></span>
                  Caricamento orari disponibili...
                </div>
              ) : availableSlots.filter((slot) => slot.available).length ===
                0 ? (
                <div className="no-slots">
                  <p>😔 Nessun orario disponibile per questa data</p>
                  <small>Prova a selezionare un'altra data</small>
                </div>
              ) : (
                <div className="time-slots-grid">
                  {availableSlots
                    .filter((slot) => slot.available)
                    .map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`time-slot ${
                          selectedSlot?.startTime === slot.startTime
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <span className="slot-time">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className="selected-summary">
              <strong>Hai selezionato:</strong>
              <p>
                📅{" "}
                {new Date(selectedDate).toLocaleDateString("it-IT", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                ⏰ Dalle {selectedSlot.startTime} alle {selectedSlot.endTime}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && (
        <div className="form-step">
          <h3>✅ Conferma prenotazione</h3>
          <p className="step-description">
            Verifica i dettagli e aggiungi informazioni di contatto
          </p>

          <div className="booking-summary">
            <h4>{service.title}</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">📐 Dimensione:</span>
                <span className="value">
                  {
                    SQUARE_METERS_OPTIONS.find(
                      (o) => o.value === squareMetersRange
                    )?.label
                  }
                </span>
              </div>
              <div className="summary-item">
                <span className="label">🪟 Finestre:</span>
                <span className="value">
                  {WINDOWS_COUNT_OPTIONS.find((o) => o.value === windowsCount)
                    ?.label || windowsCount}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">📅 Data:</span>
                <span className="value">
                  {new Date(selectedDate).toLocaleDateString("it-IT")}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">⏰ Orario:</span>
                <span className="value">
                  {selectedSlot?.startTime} - {selectedSlot?.endTime}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">⏱️ Durata:</span>
                <span className="value">{estimatedDuration}</span>
              </div>
              <div className="summary-item highlight">
                <span className="label">💰 Totale:</span>
                <span className="value price">
                  €{calculatedPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Telefono di contatto</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+39 333 1234567"
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>Indirizzo del servizio *</label>
            <AddressAutocomplete
              initialValue={address}
              onSelect={(location) => setAddress(location.address)}
            />
            <small
              style={{ color: "#666", marginTop: "4px", display: "block" }}
            >
              Inizia a digitare e seleziona l'indirizzo corretto dai
              suggerimenti
            </small>
          </div>

          <div className="form-group">
            <label>Note per il cleaner</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es: citofono 'Rossi', terzo piano senza ascensore, animali domestici..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="payment-info">
            <p>
              💳 <strong>Pagamento sicuro</strong>
            </p>
            <small>
              Sarai reindirizzato alla pagina di pagamento. L'importo sarà
              trattenuto in escrow fino al completamento del servizio.
            </small>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="form-navigation">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          {currentStep === 1 ? "Annulla" : "← Indietro"}
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            disabled={
              (currentStep === 1 && !canProceedToStep2) ||
              (currentStep === 2 && !canProceedToStep3)
            }
          >
            Avanti →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-success"
            onClick={handleSubmit}
          >
            💳 Procedi al Pagamento
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartBookingForm;
