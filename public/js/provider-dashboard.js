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

// Handle service form submission
document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('serviceTitle').value;
    const description = document.getElementById('serviceDescription').value;
    const price = document.getElementById('servicePrice').value;
    
    try {
        const response = await fetch('/api/services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, price })
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

// Modal close buttons
document.querySelector('.close').addEventListener('click', closeServiceModal);
document.querySelector('.close-complete').addEventListener('click', closeCompleteModal);

window.addEventListener('click', (event) => {
    const serviceModal = document.getElementById('serviceModal');
    const completeModal = document.getElementById('completeModal');
    
    if (event.target === serviceModal) {
        closeServiceModal();
    }
    if (event.target === completeModal) {
        closeCompleteModal();
    }
});

// Initialize
checkAuth();
loadServices();
loadBookings();
