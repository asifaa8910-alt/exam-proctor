# Complete Setup & Installation Guide

This guide details instructions for setting up the ExamPortal stack locally, configuring Docker/Docker-Compose, installing Jenkins, and wiring Git-triggered automatic deployments.

---

## 📋 Prerequisites
Ensure you have the following packages installed on your host machine:
- **Node.js**: v20 or newer
- **Git**: v2.30+
- **Docker Desktop**: v20+

---

## 🛠️ Exposing Local Port for GitHub Hook (Ngrok)
Since your local Jenkins server runs behind a firewall at `http://localhost:8080`, we use **Ngrok** to create a public URL tunnel:

1. **Install Ngrok**:
   ```bash
   # MacOS
   brew install ngrok/ngrok/ngrok
   ```
2. **Start the Tunnel**:
   ```bash
   ngrok http 8080
   ```
3. Copy the generated HTTPS forwarding url (e.g. `https://xxxx.ngrok-free.app`).

---

## 📂 Run Stack Locally

### 1. Docker Compose (Production Build)
Build and run the entire containerized suite in a single action:
```bash
# Using helper scripts
chmod +x scripts/*.sh
./scripts/deploy.sh
```
Or directly:
```bash
docker compose up --build -d
```
- **Access Frontend**: http://localhost:3000
- **Access Backend REST APIs**: http://localhost:5002

To stop and remove containers:
```bash
./scripts/cleanup.sh
```

### 2. Standard Local Run (Development)
For hot-reloading development support:

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5002` (using `backend/.env` PORT).
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5173`. Proxies `/api` requests to `http://localhost:5002`.

---

## ⚙️ Jenkins Installation & Setup

### 1. Installation via Docker (Recommended)
1. Run Jenkins with Docker support:
   ```bash
   docker run -d -p 8080:8080 -p 50000:50000 --name jenkins -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts
   ```
2. Retrieve the unlock password from logs:
   ```bash
   docker logs jenkins
   ```
3. Access http://localhost:8080 and install **Suggested Plugins**.

### 2. Credentials Configuration
To allow pushing to your Docker Hub repository securely:
1. Navigate to **Dashboard** → **Manage Jenkins** → **Credentials** → **System** → **Global credentials**.
2. Click **Add Credentials**:
   - **Kind**: Username with password
   - **Scope**: Global
   - **ID**: `docker-hub-credentials` *(Must match the ID in the Jenkinsfile)*
   - **Username**: Your Docker Hub Username
   - **Password**: Your Docker Hub Access Token / Password
3. Click **Create**.

---

## 🔗 GitHub Webhook Trigger Configuration

To automatically trigger builds on code updates:

1. Navigate to your project on GitHub.
2. Go to **Settings** → **Webhooks** → **Add Webhook**.
3. Input details:
   - **Payload URL**: `https://<your-ngrok-subdomain>.ngrok-free.app/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Just the `push` event.
4. Add the webhook and verify connection (wait for the green checkmark).

In the **Jenkins Project Configuration**:
- Check **GitHub project** under General and add repository URL.
- Check **GitHub hook trigger for GITScm polling** under Build Triggers.
