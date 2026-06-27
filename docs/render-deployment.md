# Deploying the Full Stack Exam Proctoring System to Render

This guide provides step-by-step instructions for deploying both the Frontend (React + Vite) and the Backend (Node.js + Express + SQLite) of the Exam Proctoring System to **Render.com**. 

---

## 🛠️ Step 1: Deploy the Backend (Web Service with Docker)

Since the backend uses a Dockerfile and requires persistent disk storage for SQLite, you will deploy it as a **Docker Web Service** on Render.

1.  Sign in to **[Render.com](https://render.com/)**.
2.  Click **New +** (top right) and select **Web Service**.
3.  Connect your GitHub repository: `asifaa8910-alt/exam-proctor`.
4.  Configure the service details:
    *   **Name**: `exam-proctor-api`
    *   **Region**: Select the region closest to you (e.g., Singapore or Oregon).
    *   **Branch**: `main`
    *   **Root Directory**: `backend` *(This runs the build inside the backend folder context)*
    *   **Runtime**: **Docker**
5.  Scroll down to **Instance Type** and select the **Free** tier (or any tier of your choice).
6.  Click **Advanced** to configure Environment Variables and Disk Mounts:
    *   **Environment Variables**:
        *   `PORT`: `5000`
        *   `NODE_ENV`: `production`
    *   **Persistent Disk** (Required for SQLite database to persist across restarts):
        *   Click **Add Disk**.
        *   **Name**: `database-volume`
        *   **Mount Path**: `/usr/src/app/database` *(This matches the container path where SQLite database.sqlite is created)*
        *   **Size**: `1 GiB` (Free tier)
7.  Click **Create Web Service**.

Render will now pull the repository, build the backend Docker container, mount the persistent volume, and deploy the service. Once successfully deployed, copy the **Backend Service URL** (e.g., `https://exam-proctor-api.onrender.com`).

---

## ⚛️ Step 2: Deploy the Frontend (Static Site)

The frontend is a static React Single Page Application (SPA). You will deploy it as a **Static Site** on Render.

1.  On the Render Dashboard, click **New +** and select **Static Site**.
2.  Connect the same GitHub repository: `asifaa8910-alt/exam-proctor`.
3.  Configure the site details:
    *   **Name**: `exam-proctor-portal`
    *   **Branch**: `main`
    *   **Root Directory**: `frontend`
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
4.  Under **Advanced**, add the following **Environment Variables** so the frontend can communicate with the backend:
    *   `VITE_API_URL`: Paste your **Backend Service URL** (with `/api` appended at the end).
        *   *Example*: `https://exam-proctor-api.onrender.com/api`
5.  Click **Create Static Site**.

---

## 🔗 Step 3: Configure React Router Fallback (Essential)

To ensure that direct page refreshes (e.g. going directly to `/student/dashboard` or `/login`) work correctly without returning 404 errors:

1.  In the Render Dashboard for your **Frontend Static Site**, go to **Redirects/Rewrites** in the left menu.
2.  Click **Add Rule**.
3.  Fill in the rule parameters:
    *   **Source Route**: `/*`
    *   **Destination**: `/index.html`
    *   **Action**: `Rewrite`
4.  Click **Save Changes**.

---

## ✅ Deployment Checklist

Once both services are active:
1.  Open your Frontend URL (e.g., `https://exam-proctor-portal.onrender.com`).
2.  Try signing in using default examiner credentials:
    *   **Email**: `admin@exam.com`
    *   **Password**: `admin123`
3.  Verify that exams load, submissions register, and no 404/network errors appear in the browser console.
