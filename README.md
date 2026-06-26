# ExamProctor: Secure Assessment & Automated Proctoring Network

ExamProctor is a secure, enterprise-ready full-stack online examination portal designed to handle exam creation, student management, proctoring (webcam snapshots, browser tab focus checking), automatic submissions, grading controls, and comprehensive platform auditing logs.

---

## 🚀 Project Architecture

The CI/CD pipeline automates integration and delivery from local commits directly to the live container deployment.

```
  [ Developer Push ]
          │
          ▼
   [ GitHub Repo ]
          │
    (Webhook Trigger)
          ▼
   [ Ngrok Tunnel ]
          │
          ▼
  [ Local Jenkins ]
          │
  (Jenkinsfile Steps)
          ▼
   [ Build Images ]
          │
          ▼
  [ Push Docker Hub ]
          │
          ▼
  [ Deploy Containers ]
```

---

## 🛠️ Tech Stack

- **Frontend**: React.js (v19) powered by Vite, Vanilla CSS for modern design, and Lucide React icons.
- **Backend**: Node.js & Express.js server, JWT-based user session validation, and bcrypt password hashing.
- **Database**: SQLite3 (via `sqlite3` and `sqlite` native promises) mapped locally to `backend/database/database.sqlite`.
- **DevOps**:
  - **Docker**: Single service encapsulation via lightweight base images.
  - **Docker Compose**: Multi-container orchestrator mapping frontend port `3000` and backend port `5002`.
  - **Jenkins**: Continuous integration declarative pipeline automation.
  - **GitHub**: Source code hosting and Webhook integrations.
  - **Docker Hub**: Remote container registry holding pushed images.

---

## 📂 Folder Structure

```
fullstack/
│
├── frontend/                         # React Frontend Application
│   ├── public/                       # Graphic assets, illustration vector
│   ├── src/                          # React context, assets, services, pages
│   │   ├── assets/                   # Local frontend assets
│   │   ├── components/               # Custom UI Components
│   │   ├── context/                  # Global Contexts (AuthContext, ExamContext)
│   │   ├── pages/                    # Portals (Student, Examiner, Superadmin)
│   │   └── services/                 # centralized API fetch service (api.js)
│   ├── .env.example
│   ├── Dockerfile                    # Multi-stage production Nginx container build
│   ├── nginx.conf                    # Nginx routes proxy and SPA fallback routing
│   ├── package.json
│   └── vite.config.js
│
├── backend/                          # Node.js/Express API Backend
│   ├── src/
│   │   ├── config/                   # Configs (db.js SQLite connection)
│   │   ├── controllers/              # [Placeholder] Controllers
│   │   ├── middleware/               # Auth validator (authMiddleware.js)
│   │   ├── models/                   # [Placeholder] Data Models
│   │   ├── routes/                   # Routing endpoints (auth.js, exams.js)
│   │   ├── services/                 # [Placeholder] Services
│   │   ├── validations/              # [Placeholder] Schema validations
│   │   └── utils/                    # [Placeholder] Helper scripts
│   ├── database/                     # Host sqlite db mount folder
│   │   └── database.sqlite
│   ├── .env.example
│   ├── Dockerfile                    # Production node container build
│   └── package.json
│
├── jenkins/
│   └── Jenkinsfile                   # Declarative Jenkins CI/CD pipeline
│
├── scripts/                          # Host deployment scripts
│   ├── deploy.sh
│   └── cleanup.sh
│
├── docs/                             # Setup documentation and guides
│   ├── architecture/
│   │   └── README.md                 # Architecture breakdown guide
│   ├── screenshots/                  # Submitted verification screenshots
│   └── setup-guide.md                # Multi-host setup instruction manual
│
├── .dockerignore                     # Global docker ignore rules
├── .gitignore                        # Global git ignore rules
├── docker-compose.yml                # Main multi-container orchestrator
└── LICENSE                           # MIT License file
```

---

## 🔑 Key Features

### 1. Student Module
- Sleek glassmorphic examination lobby.
- **Examiner-Association**: Students must select their assigned Examiner from the registry upon logging in.
- **Tab Focus Proctoring**: Automatically tracks browser tab-switching activity. Exceeding allowed tab switches triggers a warning and auto-submits the exam.

### 2. Examiner Module
- Dedicated exam creation lobby to design custom tests with durations and subjects.
- Student list tracking, marking exam results, and publishing grades directly to student dashboards.
- Detailed proctoring violation logs.

### 3. Admin / Super Admin Module
- Comprehensive Analytics view with custom distributions charts.
- **System Policies**: Control student registration settings, toggle proctoring modules, set max switch counts, and post platform-wide alerts.
- **System Maintenance**: Confirm prompts to reset database, wipe audit logs, and generate mock tests dynamically.

---

## 🚀 Setup & Installation

### Running with Docker Compose (Recommended)
You can launch the entire stack in one click:
```bash
./scripts/deploy.sh
```
- **Frontend URL**: http://localhost:3000
- **Backend URL**: http://localhost:5002

To stop and remove active resources:
```bash
./scripts/cleanup.sh
```

### Running Locally for Development

1. **Start Backend API Server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Open browser at http://localhost:5173 (or http://localhost:5174).

---

## 🔄 Jenkins Pipeline Stages

The declarative `Jenkinsfile` runs the following stages on every branch merge:
1. **Checkout Source Code**: Clones SCM tree from GitHub.
2. **Verify Environment**: Diagnostics checks on `node`, `npm`, and `docker` configurations.
3. **Install Frontend Dependencies**: Pulls frontend package dependencies.
4. **Build Frontend**: Compiles React output files using Vite.
5. **Install Backend Dependencies**: Installs node modules inside the `backend` directory.
6. **Build Docker Images**: Builds and tags the frontend and backend images locally.
7. **Docker Hub Login**: Securely authenticates with Docker Hub credentials.
8. **Push Frontend Image**: Pushes `exam-frontend:latest` to Docker Hub registry.
9. **Push Backend Image**: Pushes `exam-backend:latest` to Docker Hub registry.
10. **Stop Existing Containers**: Stops active deployments.
11. **Pull Latest Images**: Pulls freshly built images from the Docker Hub.
12. **Deploy Latest Containers**: Starts compose containers.
13. **Verify Deployment**: Logs status check of containers (`docker ps`).

---

## 🔮 Future Enhancements
- **AWS Deployment**: Deploy using ECS/Fargate container hosting.
- **Kubernetes Deployment**: Orchestrate containers using EKS.
- **Monitoring**: Plug in Prometheus and Grafana for server diagnostic timeline gauges.
- **Infrastructure as Code (IaC)**: Automate host provisioning using Terraform.
