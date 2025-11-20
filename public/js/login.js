document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Redirect based on user type
            if (data.userType === 'client') {
                window.location.href = '/client-dashboard';
            } else {
                window.location.href = '/provider-dashboard';
            }
        } else {
            errorMessage.textContent = data.error || 'Login fallito';
            errorMessage.classList.add('show');
        }
    } catch (error) {
        errorMessage.textContent = 'Errore di connessione';
        errorMessage.classList.add('show');
    }
});
