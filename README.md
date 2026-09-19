# ⚡ Sadik Sons | Tool Custody & Asset Network

An internal enterprise tool tracking, check-in, and check-out network system built for **Sadik Sons**.

---

## 🪟 How to Install & Run on Windows

### Requirements:
1. Install **Node.js** (LTS version, 1-minute install): https://nodejs.org
2. That's it! (No SQL server to install — SQLite is built-in).

### Quick Start:
1. **Clone or Download this repository:**
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd sadik-sons-tools
   ```
   *(Or click green **Code -> Download ZIP** on GitHub and unzip it anywhere, e.g., `C:\SadikSonsTools`)*.

2. **Launch the Desktop Application:**
   * Double-click **`Start_Sadik_Sons_Tools_Windows.bat`**!
   * It starts the local SQLite server and immediately opens the dedicated desktop window.

3. **Create a Desktop Shortcut:**
   * Right-click `Start_Sadik_Sons_Tools_Windows.bat` $\rightarrow$ **Send to -> Desktop (create shortcut)**.
   * Rename it to **"Sadik Sons Tools"**.
   * Now the warehouse manager can open it anytime directly from their Windows desktop!

---

## 🍏 How to Run on macOS

1. **In Launchpad or Finder:**
   * Open **Launchpad** or go to `/Applications`.
   * Click **Sadik Sons Tools**!
2. **Or from Terminal:**
   ```bash
   node server.cjs
   ```
   and open `http://localhost:3000`.

---

## 📱 How Technicians Use It on Phones (Android & iPhone)

* **No App Store / Play Store download needed!**
* Connect the phone to the company Wi-Fi (or 4G if using Cloudflare/domain).
* Point the phone's regular camera at any physical QR tag on a tool.
* The phone opens:
  ```
  http://<OFFICE_IP>:3000/scan?id=SS-TL-001
  ```
* **To Check Out:** Technician selects their name $\rightarrow$ selects Job Site $\rightarrow$ taps **Confirm Check-Out**.
* **To Return:** Technician taps **Confirm Return to Crib** and selects condition (Good / Needs Service / Damaged).
