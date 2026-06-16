// ===== VOICE ASSISTANT =====
let recognition = null;
let isRecording = false;
let lastCommandId = null; // Store last command ID for feedback

function startVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice recognition not supported in this browser. Please use Chrome.');
        return;
    }

    if (isRecording) {
        recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecording = true;
        document.getElementById('micBtn').classList.add('btn-danger', 'recording');
        document.getElementById('micBtn').classList.remove('btn-purple');
        document.getElementById('micIcon').className = 'fas fa-stop';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('voiceInput').value = transcript;
        sendCommand();
    };

    recognition.onend = () => {
        isRecording = false;
        document.getElementById('micBtn').classList.remove('btn-danger', 'recording');
        document.getElementById('micBtn').classList.add('btn-purple');
        document.getElementById('micIcon').className = 'fas fa-microphone';
    };

    recognition.onerror = (e) => {
        console.error('Voice error:', e);
        isRecording = false;
    };

    recognition.start();
}

function changePageSize(size) {
    const url = new URL(window.location.href);
    url.searchParams.set('size', size);
    url.searchParams.set('page', 0);
    window.location.href = url.toString();
}

async function sendCommand() {
    const input = document.getElementById('voiceInput');
    const transcript = input.value.trim();
    if (!transcript) return;

    // Show typing indicator if available
    if (typeof typingIndicator !== 'undefined') {
        typingIndicator.showProcessing();
    }

    try {
        const res = await fetch('/api/voice/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript })
        });
        const data = await res.json();
        
        const responseDiv = document.getElementById('voiceResponse');
        const responseText = document.getElementById('responseText');
        responseText.textContent = data.response || 'Command processed successfully!';
        responseDiv.classList.remove('d-none');
        
        // Store command ID for feedback
        if (data.id) {
            lastCommandId = data.id;
        }

        // Show feedback buttons
        const feedbackDiv = document.getElementById('feedbackButtons');
        if (feedbackDiv) {
            feedbackDiv.style.display = 'block';
            feedbackDiv.innerHTML = `
                <span class="text-muted small me-2">Was this helpful?</span>
                <button class="btn btn-sm btn-success" onclick="submitFeedback('UP')">
                    <i class="fas fa-thumbs-up"></i> Yes
                </button>
                <button class="btn btn-sm btn-danger" onclick="submitFeedback('DOWN')">
                    <i class="fas fa-thumbs-down"></i> No
                </button>
            `;
        }

        // Hide typing indicator
        if (typeof typingIndicator !== 'undefined') {
            typingIndicator.hide();
        }

        input.value = '';

    } catch (err) {
        console.error('Error sending command:', err);
        if (typeof typingIndicator !== 'undefined') {
            typingIndicator.hide();
        }
        if (typeof toast !== 'undefined') {
            toast.error('Error processing command', 'Error');
        }
    }
}

// Submit feedback for voice command
function submitFeedback(type) {
    if (!lastCommandId) {
        if (typeof toast !== 'undefined') {
            toast.error('No command to rate. Try a voice command first.', 'Error');
        }
        return;
    }

    const userId = localStorage.getItem('userId') || 1;

    fetch(`/api/voice/feedback?commandId=${lastCommandId}&userId=${userId}&feedback=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof toast !== 'undefined') {
                toast.success('Thank you for your feedback!', 'Feedback');
            }
            const feedbackDiv = document.getElementById('feedbackButtons');
            if (feedbackDiv) {
                feedbackDiv.innerHTML = '<span class="text-muted">✅ Feedback submitted</span>';
            }
        } else {
            if (typeof toast !== 'undefined') {
                toast.error('Error submitting feedback', 'Error');
            }
        }
    })
    .catch(err => {
        if (typeof toast !== 'undefined') {
            toast.error('Network error. Please try again.', 'Error');
        }
    });
}

// Allow Enter key to send command
document.addEventListener('DOMContentLoaded', () => {
    const voiceInput = document.getElementById('voiceInput');
    if (voiceInput) {
        voiceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendCommand();
        });
    }
});

// ===== QUICK COMPLAINT (Dashboard) =====
function getJwt() {
    return localStorage.getItem('token');
}

function withAuthHeaders(headers = {}) {
    const token = getJwt();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

async function quickFileComplaint() {
    const name = document.getElementById('qName')?.value?.trim();
    const apt = document.getElementById('qApt')?.value?.trim();
    const category = document.getElementById('qCategory')?.value;
    const desc = document.getElementById('qDesc')?.value?.trim();

    if (!name || !desc) {
        alert('Please fill in required fields (Name and Description).');
        return;
    }

    const complaint = {
        residentName: name,
        apartmentNumber: apt || null,
        category: category || 'OTHER',
        description: desc
    };

    try {
        const res = await fetch('/api/complaints', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(complaint)
        });
        if (res.ok) {
            document.getElementById('complaintSuccess').classList.remove('d-none');
            document.getElementById('qName').value = '';
            document.getElementById('qApt').value = '';
            document.getElementById('qDesc').value = '';
            setTimeout(() => {
                document.getElementById('complaintSuccess').classList.add('d-none');
                location.reload();
            }, 2000);
        }
    } catch (err) {
        console.error('Error filing complaint:', err);
    }
}

// ===== COMPLAINT MODAL (Complaints page) =====
async function submitComplaint() {
    const complaint = {
        residentName: document.getElementById('m_name')?.value?.trim(),
        apartmentNumber: document.getElementById('m_apt')?.value?.trim() || null,
        contactEmail: document.getElementById('m_email')?.value?.trim() || null,
        category: document.getElementById('m_category')?.value || 'OTHER',
        description: document.getElementById('m_desc')?.value?.trim()
    };

    if (!complaint.residentName || !complaint.description) {
        alert('Please fill in required fields.');
        return;
    }

    try {
        const res = await fetch('/api/complaints', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(complaint)
        });
        if (res.ok) {
            location.reload();
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

async function updateComplaintStatus(id) {
    const status = prompt('Enter new status (OPEN, IN_PROGRESS, RESOLVED, CLOSED):');
    if (!status) return;
    try {
        await fetch(`/api/complaints/${id}/status?status=${status.toUpperCase()}`, { method: 'PUT', headers: withAuthHeaders() });
        location.reload();
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

// ===== EVENT MODAL =====
async function submitEvent() {
    const event = {
        name: document.getElementById('ev_name')?.value?.trim(),
        description: document.getElementById('ev_desc')?.value?.trim(),
        category: document.getElementById('ev_cat')?.value,
        location: document.getElementById('ev_loc')?.value?.trim(),
        eventDate: document.getElementById('ev_date')?.value,
        maxCapacity: parseInt(document.getElementById('ev_cap')?.value || '50'),
        organizer: document.getElementById('ev_org')?.value?.trim(),
        active: true
    };

    if (!event.name) {
        alert('Event name is required.');
        return;
    }

    try {
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(event)
        });
        if (res.ok) location.reload();
    } catch (err) {
        console.error('Error creating event:', err);
    }
}

async function registerEvent(id) {
    try {
        const res = await fetch(`/api/events/${id}/register`, { method: 'POST', headers: withAuthHeaders() });
        if (res.ok) {
            alert('Successfully registered for the event!');
            location.reload();
        } else {
            const msg = await res.text();
            alert('Registration failed: ' + msg);
        }
    } catch (err) {
        console.error('Error registering:', err);
    }
}