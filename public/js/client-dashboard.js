let currentServiceId = null;

// Check authentication
async function checkAuth() {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) {
      window.location.href = "/login";
      return;
    }
    const user = await response.json();
    if (user.userType !== "client") {
      window.location.href = "/provider-dashboard";
    }
  } catch (error) {
    window.location.href = "/login";
  }
}

// Load services
async function loadServices() {
  try {
    const response = await fetch("/api/services");
    const services = await response.json();

    const container = document.getElementById("servicesContainer");

    if (services.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Nessun servizio disponibile al momento.</p></div>';
      return;
    }

    container.innerHTML = services
      .map(
        (service) => `
            <div class="service-item">
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <p class="price">€${service.price.toFixed(2)}</p>
                <p><small>Fornitore: ${service.providerEmail}</small></p>
                <button onclick="openBookingModal('${
                  service.id
                }')" class="btn btn-primary">Prenota</button>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading services:", error);
  }
}

// Load bookings
async function loadBookings() {
  try {
    const response = await fetch("/api/my-bookings");
    const bookings = await response.json();

    const container = document.getElementById("bookingsContainer");

    if (bookings.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Non hai ancora prenotazioni.</p></div>';
      return;
    }

    container.innerHTML = bookings
      .map(
        (booking) => `
            <div class="booking-item">
                <h3>${booking.serviceTitle}</h3>
                <p><strong>Data:</strong> ${new Date(
                  booking.date
                ).toLocaleDateString("it-IT")}</p>
                <p><strong>Importo:</strong> <span class="price">€${booking.amount.toFixed(
                  2
                )}</span></p>
                <p><strong>Fornitore:</strong> ${booking.providerEmail}</p>
                <p>
                    <strong>Stato:</strong> 
                    <span class="status ${booking.status}">${
          booking.status === "pending" ? "In attesa" : "Completato"
        }</span>
                </p>
                <p>
                    <strong>Pagamento:</strong> 
                    <span class="status ${booking.paymentStatus}">
                        ${
                          booking.paymentStatus === "held_in_escrow"
                            ? "Trattenuto in Escrow"
                            : booking.paymentStatus === "released"
                            ? "Rilasciato al Fornitore"
                            : booking.paymentStatus === "unpaid"
                            ? "Non Pagato"
                            : "Cancellato"
                        }
                    </span>
                </p>
                ${
                  booking.paymentStatus === "unpaid"
                    ? `<button onclick="payForBooking('${booking.id}')" class="btn btn-primary" style="margin-top: 10px;">💳 Paga Ora con Stripe</button>`
                    : ""
                }
                ${
                  booking.photoProof
                    ? `
                    <div class="photo-proof">
                        <p><strong>Prova Fotografica:</strong></p>
                        <img src="${booking.photoProof}" alt="Prova del servizio completato">
                    </div>
                `
                    : ""
                }
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
}

async function payForBooking(bookingId) {
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const session = await response.json();

    if (session.error) {
      alert(session.error);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = session.url;
  } catch (error) {
    console.error("Error initiating payment:", error);
    alert("Errore durante l'inizializzazione del pagamento");
  }
}

// Check for payment status in URL
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get("payment");
const sessionId = urlParams.get("session_id");

if (paymentStatus === "success" && sessionId) {
  // Verify payment with backend
  fetch(`/api/verify-payment?session_id=${sessionId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("✅ Pagamento confermato! I fondi sono ora in escrow.");
        loadBookings(); // Reload to show updated status
      } else {
        alert(
          "⚠️ Impossibile verificare il pagamento: " +
            (data.error || "Errore sconosciuto")
        );
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    })
    .catch((err) => {
      console.error("Verification error:", err);
      alert("Errore durante la verifica del pagamento.");
    });
} else if (paymentStatus === "cancel") {
  alert("❌ Pagamento annullato.");
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Modal functions
function openBookingModal(serviceId) {
  currentServiceId = serviceId;
  document.getElementById("serviceId").value = serviceId;
  document.getElementById("bookingModal").style.display = "block";

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("bookingDate").min = today;
}

function closeBookingModal() {
  document.getElementById("bookingModal").style.display = "none";
  currentServiceId = null;
}

// Handle booking form submission
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const serviceId = document.getElementById("serviceId").value;
  const date = document.getElementById("bookingDate").value;

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serviceId, date }),
    });

    if (response.ok) {
      closeBookingModal();
      alert("Prenotazione creata! Procedi ora con il pagamento.");
      loadBookings();
    } else {
      const data = await response.json();
      alert(data.error || "Errore nella prenotazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
  }
});

// Modal close buttons
document.querySelector(".close").addEventListener("click", closeBookingModal);
window.addEventListener("click", (event) => {
  const modal = document.getElementById("bookingModal");
  if (event.target === modal) {
    closeBookingModal();
  }
});

// Initialize
checkAuth();
loadServices();
loadBookings();
