let currentBookingId = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        const user = await response.json();
        if (user.userType !== 'provider') {
            window.location.href = '/client-dashboard';
        }
    } catch (error) {
        window.location.href = '/login';
    }
}

// Load services
async function loadServices() {
    try {
        const response = await fetch('/api/my-services');
        const services = await response.json();
        
        const container = document.getElementById('servicesContainer');
        
        if (services.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Non hai ancora creato servizi. Clicca sul pulsante sopra per aggiungerne uno.</p></div>';
            return;
        }
        
        container.innerHTML = services.map(service => `
            <div class="service-item">
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                ${service.address ? `<p class="service-location">📍 ${service.address}</p>` : ''}
                <p class="price">€${service.price.toFixed(2)}</p>
                <p><small>Creato il: ${new Date(service.createdAt).toLocaleDateString('it-IT')}</small></p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/provider-bookings');
        const bookings = await response.json();
        
        const container = document.getElementById('bookingsContainer');
        
        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Non hai ancora ricevuto prenotazioni.</p></div>';
            return;
        }
        
        container.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <h3>${booking.serviceTitle}</h3>
                <p><strong>Cliente:</strong> ${booking.clientEmail}</p>
                <p><strong>Data:</strong> ${new Date(booking.date).toLocaleDateString('it-IT')}</p>
                <p><strong>Importo:</strong> <span class="price">€${booking.amount.toFixed(2)}</span></p>
                <p>
                    <strong>Stato:</strong> 
                    <span class="status ${booking.status}">${booking.status === 'pending' ? 'In attesa' : 'Completato'}</span>
                </p>
                <p>
                    <strong>Pagamento:</strong> 
                    <span class="status ${booking.paymentStatus}">
                        ${booking.paymentStatus === 'held_in_escrow' ? 'Trattenuto in Escrow' : 'Rilasciato'}
                    </span>
                </p>
                ${booking.status === 'pending' ? `
                    <button onclick="openCompleteModal('${booking.id}')" class="btn btn-success">
                        Completa Servizio & Rilascia Payout
                    </button>
                ` : ''}
                ${booking.photoProof ? `
                    <div class="photo-proof">
                        <p><strong>Prova Fotografica Caricata:</strong></p>
                        <img src="${booking.photoProof}" alt="Prova del servizio completato">
                    </div>
                ` : ''}
                <button onclick="openChatModal('${booking.id}', '${booking.clientEmail}')" class="btn btn-chat">
                    💬 Apri Chat
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Modal functions for service
function openServiceModal() {
    document.getElementById('serviceModal').style.display = 'block';
}

function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
    document.getElementById('serviceForm').reset();
}

// Modal functions for complete booking
function openCompleteModal(bookingId) {
    currentBookingId = bookingId;
    document.getElementById('bookingId').value = bookingId;
    document.getElementById('completeModal').style.display = 'block';
}

function closeCompleteModal() {
    document.getElementById('completeModal').style.display = 'none';
    document.getElementById('completeForm').reset();
    currentBookingId = null;
}

// Initialize Google Maps Autocomplete
function initAutocomplete() {
    const addressInput = document.getElementById('serviceAddress');
    if (!addressInput || !window.google || !window.google.maps) return;
    
    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ['address'],
        componentRestrictions: { country: 'it' }
    });
    
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
            document.getElementById('serviceLatitude').value = place.geometry.location.lat();
            document.getElementById('serviceLongitude').value = place.geometry.location.lng();
        }
    });
}

// Load Google Maps script
function loadGoogleMapsScript() {
    const apiKeyMeta = document.querySelector('meta[name="google-maps-api-key"]');
    const apiKey = apiKeyMeta ? apiKeyMeta.getAttribute('content') : '';
    
    if (!apiKey) return; // Skip if no API key
    
    if (window.google && window.google.maps) {
        initAutocomplete();
        return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => initAutocomplete();
    document.head.appendChild(script);
}

// Handle service form submission
document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('serviceTitle').value;
    const description = document.getElementById('serviceDescription').value;
    const price = document.getElementById('servicePrice').value;
    const address = document.getElementById('serviceAddress').value;
    const latitude = document.getElementById('serviceLatitude').value;
    const longitude = document.getElementById('serviceLongitude').value;
    
    const serviceData = { title, description, price };
    
    // Add location data if provided
    if (address) {
        serviceData.address = address;
        if (latitude && longitude) {
            serviceData.latitude = parseFloat(latitude);
            serviceData.longitude = parseFloat(longitude);
        }
    }
    
    try {
        const response = await fetch('/api/services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });
        
        if (response.ok) {
            closeServiceModal();
            alert('Servizio creato con successo!');
            loadServices();
        } else {
            const data = await response.json();
            alert(data.error || 'Errore nella creazione del servizio');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
});

// Handle complete booking form submission
document.getElementById('completeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookingId = document.getElementById('bookingId').value;
    const photoFile = document.getElementById('photoProof').files[0];
    
    if (!photoFile) {
        alert('Devi caricare una foto prova del servizio completato');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/complete`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            closeCompleteModal();
            alert('Servizio completato! Il pagamento è stato rilasciato dall\'escrow.');
            loadBookings();
        } else {
            const data = await response.json();
            alert(data.error || 'Errore nel completamento del servizio');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
});

// Add service button
document.getElementById('addServiceBtn').addEventListener('click', openServiceModal);

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Chat functions
let chatBookingId = null;
let chatInterval = null;

function openChatModal(bookingId, clientEmail) {
    chatBookingId = bookingId;
    document.getElementById('chatBookingId').value = bookingId;
    document.getElementById('chatWithEmail').textContent = clientEmail;
    document.getElementById('chatModal').style.display = 'flex';
    loadChatMessages();
    // Poll for new messages every 3 seconds
    chatInterval = setInterval(loadChatMessages, 3000);
}

function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
    document.getElementById('chatMessageInput').value = '';
    chatBookingId = null;
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
}

async function loadChatMessages() {
    if (!chatBookingId) return;
    
    try {
        const response = await fetch(`/api/bookings/${chatBookingId}/messages`);
        if (response.ok) {
            const messages = await response.json();
            displayChatMessages(messages);
        }
    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="chat-empty">Nessun messaggio ancora. Inizia la conversazione!</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isOwnMessage = msg.senderType === 'provider';
        const time = formatChatTime(msg.createdAt);
        
        return `
            <div class="chat-message ${isOwnMessage ? 'own-message' : 'other-message'}">
                <div class="message-bubble">
                    <div class="message-text">${escapeHtml(msg.message)}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function formatChatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
        return 'Ora';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} min fa`;
    } else if (diffInHours < 24) {
        return `${diffInHours} ora fa`;
    } else if (diffInDays === 1) {
        return 'Ieri';
    } else if (diffInDays < 7) {
        return `${diffInDays} giorni fa`;
    } else {
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chat form submission
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = document.getElementById('chatMessageInput').value.trim();
    if (!message) return;
    
    try {
        const response = await fetch(`/api/bookings/${chatBookingId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            document.getElementById('chatMessageInput').value = '';
            loadChatMessages();
        } else {
            const data = await response.json();
            alert(data.error || 'Errore nell\'invio del messaggio');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
});

// Modal close buttons
document.querySelector('.close').addEventListener('click', closeServiceModal);
document.querySelector('.close-complete').addEventListener('click', closeCompleteModal);
document.querySelector('.chat-close').addEventListener('click', closeChatModal);

window.addEventListener('click', (event) => {
    const serviceModal = document.getElementById('serviceModal');
    const completeModal = document.getElementById('completeModal');
    const chatModal = document.getElementById('chatModal');
    
    if (event.target === serviceModal) {
        closeServiceModal();
    }
    if (event.target === completeModal) {
        closeCompleteModal();
    }
    if (event.target === chatModal) {
        closeChatModal();
    }
});

// Initialize
checkAuth();
loadServices();
loadBookings();
loadGoogleMapsScript();
