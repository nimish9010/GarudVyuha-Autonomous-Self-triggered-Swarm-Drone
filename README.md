# 🦅 GarudVyuha: Autonomous Self-Triggered Swarm Drone System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Interactive%20Simulation-00d4ff?style=for-the-badge&logo=javascript&logoColor=black)](https://nimish9010.github.io/GarudVyuha-Autonomous-Self-triggered-Swarm-Drone/)
[![Project Status](https://img.shields.io/badge/Project%20Status-Completed-00ff88?style=for-the-badge)](https://github.com/nimish9010/GarudVyuha-Autonomous-Self-triggered-Swarm-Drone)
[![Department](https://img.shields.io/badge/Department-Data%20Science-purple?style=for-the-badge)](https://github.com/nimish9010/GarudVyuha-Autonomous-Self-triggered-Swarm-Drone)

> **Autonomous Self-Triggered Swarm Drone Formations for Tactical Reconnaissance.** An IoT-enabled decentralized drone swarm system equipped with automated IMU trigger mechanisms, LoRa mesh networking, and edge-processed YOLOv5 computer vision for target tracking and reconnaissance.

---

## 🔗 Live Implementation & Simulation
Experience the live system behavior, flight telemetry patterns, and FPV neural network detection feed directly in your browser:

### 🚀 **[Launch Live Interactive Simulation](https://nimish9010.github.io/GarudVyuha-Autonomous-Self-triggered-Swarm-Drone/)**

---

## ⚙️ Core System Objectives & Features
* **Tactical Reconnaissance:** Automated tracking, localization, and classification of vehicles, structures, and threats.
* **Decentralized Swarm Logic:** Swarm units communicate peer-to-peer using **LoRa Mesh SX1278** to share target coordinates, avoid collisions, and coordinate formations without a central base station.
* **Autonomous Self-Trigger Sequence:** Child drones launch from a carrier mothership. An onboard **MPU6050 IMU** detects free-fall ($a_{net} \le 0.3g$), activating the motors autonomously mid-air.
* **Onboard Edge AI:** Real-time object detection processing via **YOLOv5** and **ESP32-CAM** with 93% classification accuracy and sub-120ms latency.

---

## 🛠️ Technology & Hardware Stack

| Subsystem | Hardware / Components | Software & Protocols |
| :--- | :--- | :--- |
| **Flight Control & Frame** | Pixhawk 2.4.8, F450 Frame, A2212 1000KV BLDC Motors | ArduPilot, PID Tuning |
| **Self-Trigger Sensor** | MPU6050 Accelerometer & Gyroscope | C++ (Arduino Core) |
| **Edge Intelligence** | ESP32-CAM (OV2640 Module) | YOLOv5, OpenCV, Python |
| **Swarm Communication** | LoRa SX1278 Mesh Nodes | ESP-NOW, P2P Broadcast |

---

## 📦 How to Run the Showcase Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/nimish9010/GarudVyuha-Autonomous-Self-triggered-Swarm-Drone.git
   ```
2. Navigate to the project directory:
   ```bash
   cd GarudVyuha-Autonomous-Self-triggered-Swarm-Drone
   ```
3. Open `index.html` in your web browser, or launch a quick HTTP server:
   ```bash
   python -m http.server 8000
   ```
   Now visit [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 🏆 Key Achievements
* **Research Paper:** Accepted for publication under the title *"GarudVyuha: Autonomous Self-Triggered Swarm Drone Formations for Tactical Reconnaissance"* — **SmartCom2026**.
* **Intellectual Property:** Copyright registered with the Copyright Office, Government of India.
* **Project Funding:** Secured ₹31,000 in full academic/corporate sponsorship for drone hardware components.

---

## 👥 The Team
* **Aaditya Khillare** — Hardware & Flight Systems
* **Dibyakanta Jena** — Swarm Communication
* **Nimish Pardhi** — AI/ML & Vision Systems

**Guide:** Prof. Arti Patle & Prof. Deepika Ajalkar  
*Department of Data Science, GHRCEM Pune, India (2025-26)*
