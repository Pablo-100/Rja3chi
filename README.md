# Rja3chi (رجعلكم الضو؟) ⚡🇹🇳

> **Crowdsourced Real-Time Incident Tracker for Tunisia (Electricity, Water, Fire)**

**Rja3chi** (*رجعلكم الضو؟*) is an advanced, privacy-first, community-driven platform built to track electricity outages/restorations, water incidents, and fire incidents across all 24 Governorates (*ولايات*) of Tunisia in real time. Built with robust anti-fake detection protocols, regional granularity down to the neighborhood level, and community consensus verification.

---

## 🌟 Key Features

### 📍 1. Complete Tunisian Location Coverage
- **Full Geographic Hierarchy**: Coverage of all **24 Governorates** (*ولاية*), **260+ Delegations** (*معتمدية*), and custom user-added **Districts & Neighborhoods** (*عمادة / حومة*).
- **Dynamic Location Search**: Instant search in both Arabic (*تونس, صفاقس, سوسة*) and Latin characters (*Tunis, Sfax, Sousse*).

### ⚡ 2. Real-Time Incident Reporting
- **Incident Categories**:
  - ⚡ **Electricity (Dhaw)**
  - 💧 **Water (Mee / Eau)**
  - 🔥 **Fire (7ri9a / Incendie)**
- **Outage Types**:
  - 🔴 **In9i6a3 (انقطاع كامل)** — Total Power Outage
  - 🟢 **Rja3 الضو (رجوع الكهرباء)** — Power Restored
  - 🟡 **Dhaw D3if (ضعف الكهرباء)** — Low Voltage / Unstable Current
  - 🔵 **In9i6a3 Mubarmaj (انقطاع مبرمج)** — Scheduled STEG Maintenance
- **Affected Categories**: Residential, Commercial & Small Business, Industrial, Agricultural, Health & Emergency Facilities.

### 🛡️ 3. Anti-Fake & Security System
- **Real Device Fingerprinting**: Persistent client hardware fingerprinting (`dev-tn-*`) preventing spam and multi-account manipulation.
- **Public Network IP Hash Tracking**: Real IP resolution to prevent location spoofing.
- **Rate-Limiting & Cooldowns**: Strict submission cooldowns per district to prevent flood attacks.
- **Reputation Scoring**: Trust levels assigned based on report confirmations (*Verified Citizen*, *Standard*, *Flagged*).

### 👥 4. Community Consensus & Verification
- **Community Upvotes & Confirmations**: Nearby citizens can confirm outages or report restored electricity.
- **Dispute & Fake Flagging**: Misleading reports are auto-moderated and deprioritized when flagged by multiple users.
- **Urgent STEG & Public Alerts**: Broadcast system for major national grid incidents and scheduled maintenance notices.

### 📊 5. Analytics & Tunisia Map
- **Tunisia Map View**: Live map centered on Tunisia with clustered incident markers.
- **GPS Reporting Flow**: Reporters can attach browser geolocation coordinates; if denied/unavailable, reporting still works with manual location selection.
- **Live Regional Heatmaps**: Quick visual status of grid stability and incidents across North, Central, and South Tunisia.
- **Governorate Leaderboards**: Filter by highest active outages, recent restorations, and average blackout duration.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Dark/Light mode support, Arabic typography integration)
- **Animations**: Motion (`motion/react`)
- **Icons**: Lucide React
- **Persistence**: Hybrid LocalStorage engine with real-time browser caching
- **Security Protocols**: Browser fingerprint hashing, ipify Network API integration

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/rja3chi.git
   cd rja3chi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000` to preview the app.

---

## 📦 Build & Deployment

To create an optimized production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run start
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Made with ⚡ for the Tunisian Community • <b>Rja3chi - رجعلكم الضو؟</b>
</p>
