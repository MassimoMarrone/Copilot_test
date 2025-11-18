document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;
    const acceptedTerms = document.getElementById('acceptedTerms').checked;
    const errorMessage = document.getElementById('errorMessage');
    
    if (!acceptedTerms) {
        errorMessage.textContent = 'Devi accettare i Termini e Condizioni per continuare.';
        errorMessage.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, userType, acceptedTerms })
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
            errorMessage.textContent = data.error || 'Registrazione fallita';
            errorMessage.classList.add('show');
        }
    } catch (error) {
        errorMessage.textContent = 'Errore di connessione';
        errorMessage.classList.add('show');
    }
});
