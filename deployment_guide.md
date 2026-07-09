# FastPaper Production Deployment Guide

This guide walks you through deploying the **FastPaper** application live onto your domain **fastpaper.in** purchased through Hostinger. 

It is designed for a single-server deployment where your Node.js/Express backend serves both the API and the compiled React frontend, making it extremely easy to host and maintain.

---

## Architecture Overview
- **Domain:** `fastpaper.in` (Registered via Hostinger)
- **Frontend:** Built with Vite React (`npm run build`), served as static files by the Express backend.
- **Backend:** Express API running on Node.js (Port `5000` by default).
- **Database:** MongoDB (Atlas Cloud URI or local installation).
- **Process Manager:** PM2 (Keeps the backend running 24/7).
- **Web Server:** Nginx (Acts as reverse proxy on port 80/443 to handle HTTPS/SSL).

---

## Step 1: Connect your Domain in Hostinger

To point your domain `fastpaper.in` to your web hosting, you must configure the DNS records in your Hostinger Panel.

### Option A: Pointing to a VPS (Virtual Private Server) IP
If you rented an Ubuntu VPS from Hostinger (or another provider) and have an IP address (e.g., `185.123.45.67`):

1. Log into **Hostinger Control Panel** -> **Domains** -> click **Manage** next to `fastpaper.in`.
2. Go to the **DNS / Nameservers** section.
3. Under the **DNS Zone Editor**, locate or add the following **A Records**:
   - **Type:** `A` | **Name:** `@` | **Points to:** `<Your_VPS_IP>` | **TTL:** `3600` (Default)
   - **Type:** `A` | **Name:** `www` | **Points to:** `<Your_VPS_IP>` | **TTL:** `3600` (Default)
4. Delete any existing conflicting `A` records for `@` and `www`.

### Option B: Pointing to PaaS (Render / Railway / Vercel)
If you deploy the application to Render.com or another platform:

1. Copy the URL of your deployed app from your platform dashboard (e.g., `fastpaper.onrender.com`).
2. In the Hostinger **DNS Zone Editor**, add a **CNAME Record**:
   - **Type:** `CNAME` | **Name:** `www` | **Target:** `<your-app>.onrender.com` | **TTL:** `3600`
   - **Type:** `CNAME` | **Name:** `@` (if allowed by Hostinger redirect) or configure domain forwarding so `fastpaper.in` redirects to `www.fastpaper.in`.

---

## Step 2: VPS Server Setup (Ubuntu Linux)

If you are using a Hostinger Linux VPS, connect to it using SSH:
```bash
ssh root@<Your_VPS_IP>
```

Once connected, run the following commands to install the required environment:

### 1. Update Server Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (Active LTS Version)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verify the installation:
```bash
node -v
npm -v
```

### 3. Install Git & PM2 (Process Manager)
```bash
sudo apt install git -y
sudo npm install -g pm2
```

---

## Step 3: Clone Code and Configure Environment

### 1. Clone your Repository on the Server
```bash
cd /var/www
git clone <your-git-repository-url> fastpaper
cd fastpaper
```

### 2. Create the Backend `.env` File
Create a `.env` file inside the `backend` folder to host secrets:
```bash
cd backend
nano .env
```

Add your production keys:
```env
MONGO_URI=mongodb+srv://lalith:lalith@cluster0.nqxlvac.mongodb.net/vehicle_dashboard?appName=Cluster0
PORT=5000
NODE_ENV=production
VEHICLE_API_URL=https://api.example.com/vehicle
API_KEY=your_production_api_key_here
ATTESTR_API_KEY=your_attestr_production_auth_token_here
```
*Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit nano.*

---

## Step 4: Build Frontend and Run Backend

To make it live, we must first compile the React client into static files so that Express can serve them.

### 1. Build the Frontend
```bash
cd /var/www/fastpaper/frontend
npm install
npm run build
```
This generates the compiled web files in `/var/www/fastpaper/frontend/dist`.

### 2. Run the Express Backend with PM2
```bash
cd /var/www/fastpaper/backend
npm install --omit=dev
pm2 start server.js --name fastpaper
```

Ensure it is running and active:
```bash
pm2 status
```

To make sure PM2 starts automatically if the server reboots:
```bash
pm2 startup
pm2 save
```

---

## Step 5: Configure Nginx as Web Proxy

Nginx will intercept requests coming to `fastpaper.in` on ports `80` (HTTP) and `443` (HTTPS) and route them to port `5000` where our Node app is listening.

### 1. Install Nginx
```bash
sudo apt install nginx -y
```

### 2. Create an Nginx Site Block
```bash
sudo nano /etc/nginx/sites-available/fastpaper
```

Paste the following server configuration:
```nginx
server {
    listen 80;
    server_name fastpaper.in www.fastpaper.in;

    # Maximum upload size for Excel sheets or attachments
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Enable Nginx Configuration & Restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/fastpaper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 6: Enable HTTPS Security (SSL)

To enable secure padlocks (HTTPS) on `fastpaper.in`, use Certbot (Let's Encrypt) to fetch a free SSL certificate.

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Request and Auto-Configure SSL
```bash
sudo certbot --nginx -d fastpaper.in -d www.fastpaper.in
```
- Enter your email when prompted.
- Select `2` to redirect all HTTP traffic to HTTPS (recommended).

Certbot will automatically modify your Nginx config, secure it, and setup a cronjob to renew the certificate automatically every 3 months.

---

## Step 7: How to Deploy Updates in the Future

When you push new changes to Github and want to update the production server, simply run this script or sequence of commands on your VPS:

```bash
cd /var/www/fastpaper
git pull

# Rebuild frontend files
cd frontend
npm install
npm run build

# Restart the Node server to apply backend changes
cd ../backend
npm install --omit=dev
pm2 restart fastpaper
```

---

## Alternative: Easy Deployment via Render.com (No VPS Management Required)

If you don't want to manage an Ubuntu server or IPs directly, you can deploy using **Render**:

1. Create a free account on **Render.com**.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name:** `fastpaper`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && cd ../frontend && npm install && npm run build`
   - **Start Command:** `npm start`
5. In the **Environment** section, add your variables:
   - `MONGO_URI`
   - `NODE_ENV=production`
   - `PORT=10000` (Render allocates this automatically, but you can set it)
   - `VEHICLE_API_URL`
   - `ATTESTR_API_KEY`
6. Once deployed, copy your Render subdomain (e.g. `fastpaper.onrender.com`).
7. Go to **Render Dashboard** -> **Settings** -> **Custom Domains**, add `fastpaper.in` and `www.fastpaper.in`.
8. Point your Hostinger DNS records to Render's instructions (using A record or CNAME record provided by Render).
