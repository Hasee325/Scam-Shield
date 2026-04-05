document.addEventListener('DOMContentLoaded', () => {
    const scanForm = document.getElementById('scan-form');
    const urlInput = document.getElementById('url-input');
    const errorMessage = document.getElementById('error-message');
    
    const heroSection = document.getElementById('hero-section');
    const scanningSection = document.getElementById('scanning-section');
    const resultsSection = document.getElementById('results-section');
    
    const scanningUrl = document.getElementById('scanning-url');
    const progressFill = document.getElementById('progress-fill');
    const scanStatus = document.getElementById('scan-status');
    const scanPercentage = document.getElementById('scan-percentage');
    const steps = document.querySelectorAll('.step');
    
    const riskScore = document.getElementById('risk-score');
    const scoreCirclePath = document.getElementById('score-circle-path');
    const safetyStatus = document.getElementById('safety-status');
    const safetyDescription = document.getElementById('safety-description');
    
    const newScanBtn = document.getElementById('new-scan-btn');

    const isSignedIn = localStorage.getItem('isSignedIn') === 'true';

    // Update Sign In / Sign Out button dynamically
    const navButtons = document.querySelectorAll('nav .btn-outline');
    navButtons.forEach(btn => {
        if (isSignedIn) {
            btn.textContent = 'Sign Out';
            btn.href = '#';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('isSignedIn');
                localStorage.removeItem('scanCount');
                alert("Successfully signed out and reset limit!");
                window.location.reload();
            });
        }
    });

    scanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        
        if (!isValidUrl(url)) {
            errorMessage.textContent = 'Please enter a valid URL.';
            errorMessage.classList.add('show');
            return;
        }
        
        // Explicitly check scan limit here!
        if (!isSignedIn) {
            let scanCount = parseInt(localStorage.getItem('scanCount'), 10);
            if (isNaN(scanCount)) {
                scanCount = 0;
            }
            
            // Console log to help debug in browser
            console.log("Current Free Scan Count:", scanCount);

            if (scanCount >= 3) {
                errorMessage.innerHTML = 'Free scan limit reached (3/3). Please <a href="signin.html" style="text-decoration: underline; color: inherit; font-weight: 600;">Sign In</a> to continue.';
                errorMessage.classList.add('show');
                return;
            }
            
            // Increment and save scan count
            localStorage.setItem('scanCount', scanCount + 1);
        }
        
        errorMessage.classList.remove('show');
        startScan(url);
    });

    urlInput.addEventListener('input', () => {
        errorMessage.classList.remove('show');
    });

    newScanBtn.addEventListener('click', () => {
        resetUI();
    });

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) { 
             return string.length > 3 && string.includes('.');
        }
    }

    async function startScan(url) {
        const displayUrl = url.startsWith('http') ? url : 'https://' + url;

        heroSection.classList.add('hidden');
        scanningSection.classList.remove('hidden');
        scanningUrl.textContent = displayUrl;
        
        steps.forEach(step => step.className = 'step pending');
        if (steps[0]) steps[0].className = 'step active';
        scanStatus.textContent = "Connecting to backend engine...";
        scanPercentage.textContent = "0%";
        progressFill.style.width = "0%";
        
        try {
            scanPercentage.textContent = "25%";
            progressFill.style.width = "25%";
            steps[0].className = 'step done';
            if (steps[1]) steps[1].className = 'step active';
            scanStatus.textContent = "Validating SSL & Domain Age...";

            const response = await fetch('https://scam-shield-backend.onrender.com/check-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: displayUrl })
            });

            scanPercentage.textContent = "75%";
            progressFill.style.width = "75%";
            steps[1].className = 'step done';
            if (steps[2]) steps[2].className = 'step active';
            scanStatus.textContent = "Analyzing heuristics...";

            if (!response.ok) {
                throw new Error("Failed to reach scanner backend");
            }
            
            const data = await response.json();
            
            scanPercentage.textContent = "100%";
            progressFill.style.width = "100%";
            steps.forEach(step => step.className = 'step done');
            scanStatus.textContent = "Analysis complete.";
            
            setTimeout(() => showResults(data), 500);

        } catch (error) {
            console.error("Scanning Error:", error);
            alert("Error connecting to Scam Shield API. Is your Python backend running? (python main.py)");
            resetUI();
        }
    }

    function showResults(data) {
        scanningSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        
        const score = data.score;
        const isSecure = data.ssl_valid;
        
        animateScore(score);
        updateResultDetails(score, isSecure);
        
        document.getElementById('ssl-status').textContent = data.ssl_text;
        document.getElementById('ssl-status').style.color = isSecure ? "var(--accent-success)" : "var(--accent-danger)";
        
        document.getElementById('blacklist-status').textContent = data.blacklist_status;
        document.getElementById('blacklist-status').style.color = data.blacklist_status === "Not Listed" ? "var(--text-primary)" : "var(--accent-danger)";
        
        const domainAgeEl = document.getElementById('domain-age');
        domainAgeEl.textContent = data.domain_age_text;
        if (data.domain_age_text.includes('days') || data.domain_age_text === "Lookup Failed") {
            domainAgeEl.style.color = "var(--accent-warning)";
        } else {
            domainAgeEl.style.color = "var(--text-primary)";
        }
    }

    function animateScore(targetScore) {
        let currentScore = 0;
        riskScore.textContent = '0';
        scoreCirclePath.setAttribute('stroke-dasharray', '0, 100');
        
        const duration = 1500;
        const interval = 20;
        const stepsCount = duration / interval;
        const increment = targetScore / stepsCount;
        
        const animation = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(animation);
            }
            riskScore.textContent = Math.round(currentScore);
            scoreCirclePath.setAttribute('stroke-dasharray', `${currentScore}, 100`);
            
            if (currentScore >= 80) {
                scoreCirclePath.style.stroke = 'var(--accent-success)';
            } else if (currentScore >= 50) {
                scoreCirclePath.style.stroke = 'var(--accent-warning)';
            } else {
                scoreCirclePath.style.stroke = 'var(--accent-danger)';
            }
        }, interval);
    }

    function updateResultDetails(score, isSecure) {
        const phishingRisk = document.getElementById('phishing-risk');
        if (score >= 80) {
            safetyStatus.textContent = 'Safe to Browse';
            safetyStatus.className = 'status-safe';
            safetyDescription.textContent = 'Our analysis did not detect any significant threats or malicious activity associated with this URL.';
            phishingRisk.textContent = 'Low';
            phishingRisk.style.color = 'var(--text-primary)';
        } else if (score >= 50) {
            safetyStatus.textContent = 'Use Caution';
            safetyStatus.className = 'status-warning';
            safetyDescription.textContent = 'Some indicators suggest this site may be suspicious. Proceed with caution and do not enter personal information.';
            phishingRisk.textContent = 'Medium';
            phishingRisk.style.color = 'var(--accent-warning)';
        } else {
            safetyStatus.textContent = 'Dangerous';
            safetyStatus.className = 'status-danger';
            safetyDescription.textContent = 'High risk detected! This URL exhibits strong signs of phishing, malware, or fraudulent activity. Do not visit.';
            phishingRisk.textContent = 'High';
            phishingRisk.style.color = 'var(--accent-danger)';
        }
    }

    function resetUI() {
        resultsSection.classList.add('hidden');
        heroSection.classList.remove('hidden');
        urlInput.value = '';
        urlInput.focus();
    }
});
