# 🎮 Know Your Walmart! — Online Deployment Guide

You've confirmed the quiz runs perfectly locally.  
To host it for **remote players in different countries** follow one of the options below.

---

## 🚀 Option 1 — Railway (Recommended, Free, ~5 min)

Railway gives you a public HTTPS URL with WebSocket support. No credit card needed.

### Steps

1. **Push to GitHub** (one-time setup)
   ```
   git init                       # already done
   git add .
   git commit -m "deploy quiz online"
   ```
   Then create a new repo at https://github.com/new and push:
   ```
   git remote add origin https://github.com/YOUR_USER/walmart-quiz.git
   git push -u origin main
   ```

2. **Create Railway account** at https://railway.app → _Sign in with GitHub_

3. **New Project → Deploy from GitHub Repo** → select `walmart-quiz`

4. Railway detects Python automatically.  
   It will use `railway.toml` + `Procfile` to start the server.

5. In the **Settings** tab → **Networking** → click **Generate Domain**  
   You get a URL like `https://walmart-quiz-production.up.railway.app`

6. **Share that URL with your players!**
   - Players go to: `https://your-url.up.railway.app`
   - You host at: `https://your-url.up.railway.app/host/ROOM`

### Notes
- Free tier = 500 hours/month → enough for lots of quiz sessions
- WebSockets are fully supported ✅
- Game state is in-memory; restarting the server clears rooms

---

## 🟣 Option 2 — Render.com (Free, no card)

1. Push code to GitHub (same as Option 1 step 1)
2. Sign up at https://render.com → **New → Web Service**
3. Connect GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
5. Click **Create Web Service** → wait ~2 min
6. Copy the `https://walmart-quiz.onrender.com` URL and share!

### Notes
- Free tier spins down after 15 min idle → first request is slow
- WebSockets supported ✅

---

## 🐳 Option 3 — Any Docker Host (Azure, GCP, AWS)

A `Dockerfile` is included.  Build and run:

```bash
docker build -t walmart-quiz .
docker run -p 8080:8080 -e PORT=8080 walmart-quiz
```

Works on Azure Container Instances, GCP Cloud Run, AWS App Runner, etc.

---

## 🏃 Local LAN (same office/VPN segment only)

If all players are on the **same Walmart Eagle WiFi / VPN subnet**, share:

```
http://10.14.204.49:8899
```

Windows Firewall may show a pop-up → click **Allow access**.

> ⚠️  This will NOT work cross-country. Corporate inbound firewall blocks it.

---

## 🗒️ Game Flow Reminder

| Who | What to open |
|-----|--------------|
| **Host** | `https://your-url/` → Create Room → Share code |
| **Players** | `https://your-url/` → Enter room code |
| **Host** | Start Game → advance questions |
