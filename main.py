import urllib.parse
import socket
import ssl
import whois
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Scam Site Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

BLACKLISTED_DOMAINS = ["scam-website.com", "fake-bank.net", "cheap-roblox-robux.com"]
SUSPICIOUS_KEYWORDS = ["free-money", "login-secure", "update-paypal", "verify-account", "password-reset"]

def check_ssl(hostname):
    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        with socket.create_connection((hostname, 443), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                return True, "Valid (Active)"
    except Exception as e:
        return False, "Missing / Invalid"

def get_domain_age(hostname):
    try:
        w = whois.whois(hostname)
        creation_date = w.creation_date
        
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
            
        if creation_date:
            age = (datetime.now() - creation_date).days
            if age > 365:
                years = age // 365
                months = (age % 365) // 30
                return age, f"{years} years, {months} months"
            else:
                return age, f"{age} days"
    except Exception:
        pass
    
    return -1, "Unknown"

@app.post("/check-url")
def check_url(request: URLRequest):
    raw_url = request.url.lower().strip()
    if not raw_url.startswith(("http://", "https://")):
        raw_url = "http://" + raw_url
        
    try:
        parsed = urllib.parse.urlparse(raw_url)
        hostname = parsed.hostname
        if not hostname:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format")

    risk_score = 100 # 100 is perfectly safe, 0 is absolutely malicious
    
    # 1. SSL Check
    ssl_valid, ssl_text = check_ssl(hostname)
    if not ssl_valid:
        risk_score -= 30
        
    # 2. Domain Age Check
    age_days, age_text = get_domain_age(hostname)
    if age_days != -1:
        if age_days < 30:
            risk_score -= 40
        elif age_days < 180:
            risk_score -= 20
    else:
        risk_score -= 10
        age_text = "Lookup Failed"
        
    # 3. Heuristics & Blacklist
    blacklist_status = "Not Listed"
    for domain in BLACKLISTED_DOMAINS:
        if domain in hostname:
            risk_score -= 60
            blacklist_status = "Flagged in blacklist"
            break
            
    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword in raw_url:
            risk_score -= 20
            
    if len(raw_url) > 75:
        risk_score -= 10
    
    risk_score = max(0, min(100, risk_score))
    
    return {
        "url": raw_url,
        "score": risk_score,
        "ssl_valid": ssl_valid,
        "ssl_text": ssl_text,
        "domain_age_text": age_text,
        "blacklist_status": blacklist_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)