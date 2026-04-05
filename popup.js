document.addEventListener('DOMContentLoaded', () => {
    // Get the current active tab immediately when popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const url = currentTab.url || "";
        
        document.getElementById('url').textContent = url;

        if (!url.startsWith('http')) {
            updateUI(false, "System or internal browser page.", false);
            return;
        }

        // Ask the backend if the URL is a scam
        fetch('http://127.0.0.1:8000/check-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        })
        .then(response => response.json())
        .then(data => {
            updateUI(data.is_scam, data.reason, true);
        })
        .catch(error => {
            console.error('API Error:', error);
            updateUI(false, "Could not connect to Python backend server.", false, true);
        });
    });
});

function updateUI(isScam, reasonText, connected, error = false) {
    const statusBox = document.getElementById('status-box');
    const reason = document.getElementById('reason');

    if (error) {
        statusBox.textContent = "Offline";
        statusBox.className = "loading";
        reason.textContent = "Error: Please make sure the Python backend (main.py) is actively running on port 8000.";
        return;
    }

    if (!connected) {
        statusBox.textContent = "Not Scanned";
        statusBox.className = "loading";
        reason.textContent = reasonText;
        return;
    }

    if (isScam) {
        statusBox.textContent = "⚠️ SCAM DETECTED";
        statusBox.className = "scam";
        reason.innerHTML = `<strong>Reason:</strong> ${reasonText}`;
    } else {
        statusBox.textContent = "✓ Safe Site";
        statusBox.className = "safe";
        reason.textContent = "No threats detected for this URL. Proceed safely.";
    }
}