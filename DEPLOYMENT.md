# Deployment Guide

This project is fully ready for deployment. The web frontend is integrated directly into the FastAPI backend (served via static files from `/`), meaning you only need to deploy a **single web service**.

Here are the step-by-step guides for deploying to **Render** and **Railway**.

---

## Option 1: Deploying to Render

Render is a popular and free-tier-friendly hosting platform. We have included a `render.yaml` blueprint configuration in this repository to automate your deployment setup.

### Steps:
1. Push your project code to a **GitHub** or **GitLab** repository.
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **"New +"** (top-right) and select **"Blueprint"**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` file, configuring the service name (`ai-behavior-prediction`), build command (`pip install -r requirements.txt`), and start command (`uvicorn api.main:app --host 0.0.0.0 --port $PORT`).
6. Click **"Approve"** to start the deployment. Once built, you will receive a public URL (e.g. `https://ai-behavior-prediction.onrender.com`).

> [!WARNING]
> **Persistent Data Storage:**
> Hosting platforms like Render have an **ephemeral filesystem** by default. If the server restarts or redeploys, your SQLite database (`events.db`) and model weights (`model_weights.pth`) will be wiped.
>
> **To persist your data on Render:**
> 1. Go to your Web Service settings in Render.
> 2. Navigate to the **Disks** section.
> 3. Click **"Add Disk"**.
> 4. Set the Mount Path to `/data` (size: 1 GB is plenty).
> 5. Go to **Environment Variables** and update:
>    * `DATABASE_URL` = `sqlite:////data/events.db`
>    * `MODEL_PATH` = `/data/model_weights.pth`
> 6. Save changes. This will move your SQLite records and trained model weights onto a persistent SSD disk that survives server restarts!

---

## Option 2: Deploying to Railway

Railway is a quick, command-line-friendly deployment platform. We have included a `Procfile` to guide Railway's startup process automatically.

### Steps:
1. Push your project code to a **GitHub** repository.
2. Log in to your [Railway Dashboard](https://railway.app/).
3. Click **"New Project"** -> **"Deploy from GitHub repo"**.
4. Select your repository.
5. Railway will detect `requirements.txt` and the `Procfile` automatically, and run the service using:
   `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

> [!WARNING]
> **Persistent Data Storage on Railway:**
> 1. In your Railway project dashboard, click **"New"** -> **"Volume"** to create a persistent disk.
> 2. Mount the volume to `/data`.
> 3. Go to the variables tab of your service and add:
>    * `DATABASE_URL` = `sqlite:////data/events.db`
>    * `MODEL_PATH` = `/data/model_weights.pth`
> 4. Redeploy. This ensures database histories and model weights are kept permanently on the mounted volume.

---

## Connection Verification
Once deployed, simply navigate to your public URL (e.g., `https://your-app.railway.app/`). 
* The **Event Sandbox** will load immediately.
* The API status indicator at the top right will check `/health` on the backend and pulse green ("API Connection Active") automatically, confirming that the frontend is fully connected to the deployed service.
