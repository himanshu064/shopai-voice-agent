import { PrismaClient, OrderStatus, SlotStatus, KnowledgeStatus } from "@prisma/client";
import { AGENT_PROMPT } from "../src/lib/ai/agent-prompt";

const prisma = new PrismaClient();

// ── Catalog data ──────────────────────────────────────────────
const CATEGORIES: { key: string; name: string; description: string }[] = [
  { key: "audio", name: "Audio", description: "Headphones, earbuds and speakers" },
  { key: "wearables", name: "Wearables", description: "Smartwatches and fitness trackers" },
  { key: "smarthome", name: "Smart Home", description: "Lights, plugs, cameras and more" },
  { key: "computing", name: "Computing", description: "Keyboards, mice, monitors and hubs" },
  { key: "gaming", name: "Gaming", description: "Controllers, headsets and gear" },
  { key: "cameras", name: "Cameras", description: "Action cams, drones and webcams" },
  { key: "accessories", name: "Accessories", description: "Chargers, cables and cases" },
  { key: "mobile", name: "Mobile & Tablets", description: "Smartphones, tablets, e-readers and styluses" },
  { key: "networking", name: "Networking", description: "Routers, mesh Wi-Fi, extenders and switches" },
  { key: "storage", name: "Storage & Drives", description: "Portable SSDs, memory cards, NAS and flash drives" },
];

interface SeedVariant { name: string; sku: string; inventory: number; priceDelta?: number }
interface SeedProduct {
  cat: string;
  name: string;
  description: string;
  price: number;
  variants: SeedVariant[];
}

const PRODUCTS: SeedProduct[] = [
  // ── Audio ──
  {
    cat: "audio",
    name: "AeroBuds Pro Wireless Headphones",
    description:
      "Over-ear wireless headphones with active noise cancellation and up to 30 hours of battery life on a single charge.",
    price: 129,
    variants: [
      { name: "Black", sku: "AERO-PRO-BLK", inventory: 25 },
      { name: "White", sku: "AERO-PRO-WHT", inventory: 12 },
      { name: "Navy", sku: "AERO-PRO-NVY", inventory: 0 },
    ],
  },
  {
    cat: "audio",
    name: "SoundWave Mini Bluetooth Speaker",
    description:
      "Pocket-sized waterproof Bluetooth speaker with 12 hours of playtime and deep bass.",
    price: 49,
    variants: [
      { name: "Charcoal", sku: "SW-MINI-CHR", inventory: 40 },
      { name: "Teal", sku: "SW-MINI-TEL", inventory: 18 },
    ],
  },
  {
    cat: "audio",
    name: "EchoBeat Wireless Earbuds",
    description:
      "True-wireless earbuds with a compact charging case, touch controls and 24 hours total battery.",
    price: 79,
    variants: [
      { name: "White", sku: "ECHO-EB-WHT", inventory: 30 },
      { name: "Black", sku: "ECHO-EB-BLK", inventory: 22 },
    ],
  },
  {
    cat: "audio",
    name: "BassPulse Studio Headphones",
    description:
      "Reference over-ear studio headphones with a detachable cable and rich, accurate sound.",
    price: 199,
    variants: [{ name: "Black", sku: "BASS-STU-BLK", inventory: 8 }],
  },
  {
    cat: "audio",
    name: "SoundWave Max Party Speaker",
    description:
      "Big-room Bluetooth speaker with 24-hour battery, RGB lighting and IPX5 splash resistance.",
    price: 149,
    variants: [{ name: "Black", sku: "SW-MAX-BLK", inventory: 14 }],
  },
  // ── Wearables ──
  {
    cat: "wearables",
    name: "Pulse Fit Smartwatch",
    description:
      "Fitness smartwatch with heart-rate tracking, GPS and a 7-day battery life. Water resistant to 50m.",
    price: 179,
    variants: [
      { name: "40mm / Black", sku: "PULSE-40-BLK", inventory: 15 },
      { name: "44mm / Silver", sku: "PULSE-44-SLV", inventory: 9, priceDelta: 20 },
    ],
  },
  {
    cat: "wearables",
    name: "Pulse Band 2 Fitness Tracker",
    description:
      "Slim fitness band with step, sleep and heart-rate tracking and a 10-day battery.",
    price: 59,
    variants: [
      { name: "Black", sku: "PBAND2-BLK", inventory: 35 },
      { name: "Coral", sku: "PBAND2-COR", inventory: 20 },
    ],
  },
  {
    cat: "wearables",
    name: "Pulse Fit Pro GPS Watch",
    description:
      "Premium multisport GPS watch with AMOLED display, offline maps and up to 14-day battery.",
    price: 249,
    variants: [
      { name: "Graphite", sku: "PFPRO-GRP", inventory: 7 },
      { name: "Rose Gold", sku: "PFPRO-ROSE", inventory: 5 },
    ],
  },
  {
    cat: "wearables",
    name: "ZenRing Smart Ring",
    description:
      "Discreet smart ring tracking sleep, recovery and activity with a 5-day battery.",
    price: 199,
    variants: [
      { name: "Silver", sku: "ZEN-RING-SLV", inventory: 11 },
      { name: "Matte Black", sku: "ZEN-RING-BLK", inventory: 9 },
    ],
  },
  // ── Smart Home ──
  {
    cat: "smarthome",
    name: "GlowBulb Smart LED (4-pack)",
    description:
      "Color-changing Wi-Fi smart bulbs with app and voice control. No hub required.",
    price: 39,
    variants: [{ name: "4-pack", sku: "GLOW-4PK", inventory: 50 }],
  },
  {
    cat: "smarthome",
    name: "PlugSmart Wi-Fi Smart Plug",
    description:
      "Turn any outlet smart — schedule, automate and monitor energy from your phone.",
    price: 19,
    variants: [
      { name: "Single", sku: "PLUG-1", inventory: 60 },
      { name: "2-pack", sku: "PLUG-2", inventory: 33, priceDelta: 12 },
    ],
  },
  {
    cat: "smarthome",
    name: "GuardCam Indoor Security Camera",
    description:
      "1080p indoor camera with night vision, motion alerts and two-way audio.",
    price: 59,
    variants: [{ name: "White", sku: "GUARD-CAM-WHT", inventory: 17 }],
  },
  {
    cat: "smarthome",
    name: "Hearth Smart Thermostat",
    description:
      "Learning smart thermostat that cuts energy bills with schedules and geofencing.",
    price: 129,
    variants: [{ name: "Standard", sku: "HEARTH-STD", inventory: 13 }],
  },
  // ── Computing ──
  {
    cat: "computing",
    name: "TypeMaster Mechanical Keyboard",
    description:
      "Hot-swappable mechanical keyboard with tactile switches and per-key RGB backlighting.",
    price: 89,
    variants: [
      { name: "Black", sku: "TYPE-KB-BLK", inventory: 21 },
      { name: "White", sku: "TYPE-KB-WHT", inventory: 16 },
    ],
  },
  {
    cat: "computing",
    name: "GlideMouse Wireless Ergonomic Mouse",
    description:
      "Contoured wireless mouse with silent clicks and up to 18 months of battery life.",
    price: 45,
    variants: [
      { name: "Black", sku: "GLIDE-MS-BLK", inventory: 28 },
      { name: "Grey", sku: "GLIDE-MS-GRY", inventory: 19 },
    ],
  },
  {
    cat: "computing",
    name: "ClearView 27\" 4K Monitor",
    description:
      "27-inch 4K UHD monitor with USB-C, 99% sRGB color and a height-adjustable stand.",
    price: 329,
    variants: [{ name: "Black", sku: "CLEAR-27-4K", inventory: 6 }],
  },
  {
    cat: "computing",
    name: "DockPro 8-in-1 USB-C Hub",
    description:
      "Expand your laptop with HDMI 4K, gigabit Ethernet, SD and three USB ports.",
    price: 69,
    variants: [{ name: "Space Grey", sku: "DOCK-8IN1", inventory: 24 }],
  },
  // ── Gaming ──
  {
    cat: "gaming",
    name: "Vortex Wireless Game Controller",
    description:
      "Low-latency wireless controller with hall-effect sticks and remappable back buttons.",
    price: 59,
    variants: [
      { name: "Black", sku: "VTX-CTL-BLK", inventory: 26 },
      { name: "White", sku: "VTX-CTL-WHT", inventory: 18 },
    ],
  },
  {
    cat: "gaming",
    name: "Vortex Pro Gaming Headset",
    description:
      "Surround-sound gaming headset with a noise-cancelling mic and memory-foam earcups.",
    price: 99,
    variants: [{ name: "Black", sku: "VTX-HS-BLK", inventory: 15 }],
  },
  {
    cat: "gaming",
    name: "RGB Glide Gaming Mousepad XL",
    description:
      "Extra-large desk mat with a smooth micro-textured surface and RGB edge lighting.",
    price: 25,
    variants: [{ name: "Black", sku: "RGB-PAD-XL", inventory: 44 }],
  },
  // ── Cameras ──
  {
    cat: "cameras",
    name: "SnapCam 4K Action Camera",
    description:
      "Waterproof 4K action camera with electronic stabilization and a front display.",
    price: 199,
    variants: [{ name: "Black", sku: "SNAP-4K-BLK", inventory: 10 }],
  },
  {
    cat: "cameras",
    name: "AeroDrone Mini Camera Drone",
    description:
      "Sub-250g foldable drone with a 4K gimbal camera and 30-minute flight time.",
    price: 299,
    variants: [{ name: "Grey", sku: "AERO-DRN-GRY", inventory: 4 }],
  },
  {
    cat: "cameras",
    name: "StreamCam 1080p Webcam",
    description:
      "Full-HD webcam with autofocus, dual stereo mics and a privacy shutter.",
    price: 69,
    variants: [{ name: "Black", sku: "STREAM-1080", inventory: 27 }],
  },
  // ── Accessories ──
  {
    cat: "accessories",
    name: "ChargePad 3-in-1 Wireless Charger",
    description:
      "Fast-charge your phone, earbuds and watch simultaneously on one sleek aluminium pad.",
    price: 39,
    variants: [{ name: "Standard", sku: "CHG-3IN1-STD", inventory: 60 }],
  },
  {
    cat: "accessories",
    name: "PowerCore 20K Portable Battery",
    description:
      "20,000mAh power bank with 30W USB-C fast charging — refuels a phone up to four times.",
    price: 49,
    variants: [
      { name: "Black", sku: "PWR-20K-BLK", inventory: 31 },
      { name: "White", sku: "PWR-20K-WHT", inventory: 20 },
    ],
  },
  {
    cat: "accessories",
    name: "FlexCable USB-C Braided Cable (2-pack)",
    description:
      "Tangle-free braided USB-C cables rated for 100W charging and fast data.",
    price: 15,
    variants: [{ name: "Black", sku: "FLEX-C-2PK", inventory: 80 }],
  },
  {
    cat: "accessories",
    name: "GuardCase Rugged Phone Case",
    description:
      "Drop-tested protective case with raised edges and a clear anti-yellow back.",
    price: 22,
    variants: [
      { name: "Black", sku: "GUARD-CASE-BLK", inventory: 38 },
      { name: "Clear", sku: "GUARD-CASE-CLR", inventory: 29 },
    ],
  },

  // ── Audio (more) ──
  {
    cat: "audio",
    name: "StudioPro Wireless Over-Ear Headphones",
    description:
      "Reference-grade wireless headphones with adaptive noise cancellation and up to 40 hours of battery life.",
    price: 249,
    variants: [
      { name: "Midnight", sku: "STUDIO-PRO-MID", inventory: 18 },
      { name: "Silver", sku: "STUDIO-PRO-SLV", inventory: 9 },
    ],
  },
  {
    cat: "audio",
    name: "AeroBuds Sport Open-Ear Earbuds",
    description:
      "Water-resistant open-ear earbuds that hook securely for running, with 8 hours of playtime.",
    price: 89,
    variants: [
      { name: "Black", sku: "AERO-SPORT-BLK", inventory: 34 },
      { name: "Lime", sku: "AERO-SPORT-LIM", inventory: 21 },
    ],
  },
  {
    cat: "audio",
    name: "SoundWave Home Smart Speaker",
    description:
      "Room-filling smart speaker with voice assistant support and multi-room audio over Wi-Fi.",
    price: 119,
    variants: [
      { name: "Charcoal", sku: "SW-HOME-CHR", inventory: 26 },
      { name: "Sand", sku: "SW-HOME-SND", inventory: 14 },
    ],
  },
  {
    cat: "audio",
    name: "ThunderBass Portable Party Speaker",
    description:
      "Waterproof portable speaker with thunderous bass, RGB lighting and 24 hours of playtime.",
    price: 149,
    variants: [{ name: "Black", sku: "THUNDER-PARTY-BLK", inventory: 12 }],
  },
  {
    cat: "audio",
    name: "ClearCall USB Conference Speakerphone",
    description:
      "360° omnidirectional speakerphone with echo cancellation for crystal-clear video calls.",
    price: 99,
    variants: [{ name: "Graphite", sku: "CLEARCALL-GRA", inventory: 0 }],
  },

  // ── Wearables (more) ──
  {
    cat: "wearables",
    name: "Pulse Fit Lite Smartwatch",
    description:
      "Lightweight everyday smartwatch with heart-rate tracking, notifications and 10-day battery life.",
    price: 99,
    variants: [
      { name: "Black", sku: "PULSE-LITE-BLK", inventory: 40 },
      { name: "Pink", sku: "PULSE-LITE-PNK", inventory: 22 },
    ],
  },
  {
    cat: "wearables",
    name: "Pulse Watch Ultra Titanium",
    description:
      "Rugged titanium adventure watch with dual-band GPS, dive-ready design and 14-day battery life.",
    price: 399,
    variants: [
      { name: "Titanium", sku: "PULSE-ULTRA-TI", inventory: 7 },
      { name: "Graphite", sku: "PULSE-ULTRA-GRP", inventory: 5 },
    ],
  },
  {
    cat: "wearables",
    name: "ZenBand Sleep & Recovery Tracker",
    description:
      "Screen-free wristband focused on sleep staging and recovery insights, with 7-day battery life.",
    price: 69,
    variants: [{ name: "Slate", sku: "ZENBAND-SLT", inventory: 30 }],
  },
  {
    cat: "wearables",
    name: "Pulse Kids GPS Watch",
    description:
      "Kid-friendly GPS watch with geofencing, two-way calling and a durable water-resistant band.",
    price: 89,
    variants: [
      { name: "Blue", sku: "PULSE-KIDS-BLU", inventory: 25 },
      { name: "Coral", sku: "PULSE-KIDS-COR", inventory: 19 },
    ],
  },
  {
    cat: "wearables",
    name: "AuraRing Smart Health Ring",
    description:
      "Discreet smart ring tracking sleep, heart-rate and temperature trends, with 6-day battery life.",
    price: 249,
    variants: [
      { name: "Silver", sku: "AURA-RING-SLV", inventory: 12 },
      { name: "Black", sku: "AURA-RING-BLK", inventory: 8 },
    ],
  },
  {
    cat: "wearables",
    name: "Pulse Fit Active Band",
    description:
      "Slim activity band with step, sleep and workout tracking and an impressive 14-day battery life.",
    price: 49,
    variants: [
      { name: "Black", sku: "PULSE-ACT-BLK", inventory: 55 },
      { name: "Teal", sku: "PULSE-ACT-TEL", inventory: 33 },
    ],
  },

  // ── Smart Home (more) ──
  {
    cat: "smarthome",
    name: "GlowStrip RGB LED Light Strip (5m)",
    description:
      "App- and voice-controlled 5-metre RGB light strip with music sync and adhesive backing.",
    price: 39,
    variants: [{ name: "5m", sku: "GLOWSTRIP-5M", inventory: 48 }],
  },
  {
    cat: "smarthome",
    name: "PlugSmart Outdoor Smart Plug",
    description:
      "Weatherproof outdoor smart plug with two independent sockets and scheduling.",
    price: 29,
    variants: [{ name: "Black", sku: "PLUG-OUT-BLK", inventory: 37 }],
  },
  {
    cat: "smarthome",
    name: "GuardCam Outdoor Security Camera",
    description:
      "Weatherproof 2K outdoor security camera with colour night vision, spotlight and motion alerts.",
    price: 99,
    variants: [{ name: "White", sku: "GUARD-CAM-OUT", inventory: 21 }],
  },
  {
    cat: "smarthome",
    name: "AquaSense Smart Water Leak Sensor",
    description:
      "Wi-Fi water leak sensor that sends instant phone alerts to help prevent costly damage.",
    price: 34,
    variants: [{ name: "White", sku: "AQUA-LEAK-WHT", inventory: 42 }],
  },
  {
    cat: "smarthome",
    name: "ThermoSmart Wi-Fi Thermostat",
    description:
      "Smart thermostat with adaptive scheduling and energy reports, controllable by app and voice.",
    price: 129,
    variants: [{ name: "White", sku: "THERMO-WIFI-WHT", inventory: 16 }],
  },
  {
    cat: "smarthome",
    name: "DoorGuard Video Doorbell",
    description:
      "1080p video doorbell with two-way audio, motion zones and a weather-resistant design.",
    price: 119,
    variants: [
      { name: "Satin Nickel", sku: "DOORGUARD-NKL", inventory: 18 },
      { name: "Venetian Bronze", sku: "DOORGUARD-BRZ", inventory: 11 },
    ],
  },

  // ── Computing (more) ──
  {
    cat: "computing",
    name: "KeyForge Mechanical Keyboard",
    description:
      "Hot-swappable mechanical keyboard with tactile switches, PBT keycaps and per-key RGB.",
    price: 109,
    variants: [
      { name: "Black", sku: "KEYFORGE-BLK", inventory: 24 },
      { name: "White", sku: "KEYFORGE-WHT", inventory: 15 },
    ],
  },
  {
    cat: "computing",
    name: "GlidePro Wireless Mouse",
    description:
      "Silent-click wireless mouse with an ergonomic shape and up to 90 days of battery life.",
    price: 45,
    variants: [
      { name: "Graphite", sku: "GLIDEPRO-GRA", inventory: 40 },
      { name: "Rose", sku: "GLIDEPRO-ROS", inventory: 26 },
    ],
  },
  {
    cat: "computing",
    name: "ClearView 27\" 4K Monitor",
    description:
      "27-inch 4K UHD monitor with a USB-C dock, 99% sRGB colour and a height-adjustable stand.",
    price: 329,
    variants: [{ name: "Black", sku: "CLEARVIEW-27-4K", inventory: 9 }],
  },
  {
    cat: "computing",
    name: "PortHub USB-C 8-in-1 Docking Station",
    description:
      "Turn one USB-C port into HDMI, Ethernet, card readers and three USB ports for your laptop.",
    price: 79,
    variants: [{ name: "Space Grey", sku: "PORTHUB-8IN1", inventory: 33 }],
  },
  {
    cat: "computing",
    name: "SwiftType Ergonomic Split Keyboard",
    description:
      "Contoured split keyboard with a cushioned palm rest designed to reduce wrist strain.",
    price: 139,
    variants: [{ name: "Grey", sku: "SWIFTTYPE-GRY", inventory: 12 }],
  },
  {
    cat: "computing",
    name: "AeroRiser Aluminium Laptop Stand",
    description:
      "Adjustable aluminium laptop stand that lifts your screen to eye level and improves airflow.",
    price: 59,
    variants: [
      { name: "Silver", sku: "AERORISER-SLV", inventory: 28 },
      { name: "Space Grey", sku: "AERORISER-GRY", inventory: 17 },
    ],
  },

  // ── Gaming (more) ──
  {
    cat: "gaming",
    name: "StormPad Pro Wireless Controller",
    description:
      "Pro wireless controller with mappable back paddles, hall-effect sticks and 20 hours of battery.",
    price: 69,
    variants: [
      { name: "Black", sku: "STORMPAD-BLK", inventory: 30 },
      { name: "White", sku: "STORMPAD-WHT", inventory: 20 },
    ],
  },
  {
    cat: "gaming",
    name: "NightHawk Wireless Gaming Headset",
    description:
      "Low-latency wireless gaming headset with spatial audio and a flip-to-mute mic, 24-hour battery.",
    price: 89,
    variants: [{ name: "Black", sku: "NIGHTHAWK-BLK", inventory: 22 }],
  },
  {
    cat: "gaming",
    name: "RapidKeys RGB Gaming Keyboard",
    description:
      "Optical-switch gaming keyboard with a rapid actuation, aluminium top plate and full RGB.",
    price: 119,
    variants: [{ name: "Black", sku: "RAPIDKEYS-BLK", inventory: 17 }],
  },
  {
    cat: "gaming",
    name: "Precision 26K Gaming Mouse",
    description:
      "Ultra-light 58g gaming mouse with a 26,000 DPI sensor and 70 hours of wireless battery.",
    price: 59,
    variants: [
      { name: "Black", sku: "PRECISION-26K-BLK", inventory: 26 },
      { name: "White", sku: "PRECISION-26K-WHT", inventory: 0 },
    ],
  },
  {
    cat: "gaming",
    name: "BoostDock Console Charging Station",
    description:
      "Dual-controller charging dock that refuels two controllers in under three hours.",
    price: 39,
    variants: [{ name: "Black", sku: "BOOSTDOCK-BLK", inventory: 41 }],
  },
  {
    cat: "gaming",
    name: "VoltGrip Mobile Gaming Trigger Set",
    description:
      "Clip-on mobile trigger set for shooters, with tactile buttons and a foldable design.",
    price: 25,
    variants: [{ name: "Black", sku: "VOLTGRIP-BLK", inventory: 60 }],
  },
  {
    cat: "gaming",
    name: "FlexArm Gaming Monitor Light Bar",
    description:
      "Screen-mounted light bar with adjustable colour temperature to reduce eye strain during play.",
    price: 45,
    variants: [{ name: "Black", sku: "FLEXARM-LIGHT", inventory: 23 }],
  },

  // ── Cameras (more) ──
  {
    cat: "cameras",
    name: "SnapCam Pro 5K Action Camera",
    description:
      "Waterproof 5K action camera with pro stabilization, dual displays and 120-minute recording.",
    price: 349,
    variants: [{ name: "Black", sku: "SNAP-PRO-5K", inventory: 8 }],
  },
  {
    cat: "cameras",
    name: "AeroDrone Pro 4K Camera Drone",
    description:
      "Foldable pro drone with a 3-axis gimbal 4K camera, obstacle sensing and 40-minute flight time.",
    price: 499,
    variants: [{ name: "Grey", sku: "AERO-PRO-DRN", inventory: 4 }],
  },
  {
    cat: "cameras",
    name: "StreamCam 4K Pro Webcam",
    description:
      "4K webcam with autofocus, HDR, dual noise-cancelling mics and a magnetic privacy shutter.",
    price: 149,
    variants: [{ name: "Black", sku: "STREAM-4K-PRO", inventory: 19 }],
  },
  {
    cat: "cameras",
    name: "VistaCam 360 Panoramic Camera",
    description:
      "Pocket 360° camera capturing 5.7K immersive video with in-app reframing and stabilization.",
    price: 259,
    variants: [{ name: "Black", sku: "VISTA-360-BLK", inventory: 11 }],
  },
  {
    cat: "cameras",
    name: "PocketGimbal 3-Axis Stabilizer",
    description:
      "Foldable 3-axis smartphone gimbal with active tracking and up to 12 hours of battery.",
    price: 99,
    variants: [
      { name: "Grey", sku: "POCKETGIMBAL-GRY", inventory: 20 },
      { name: "White", sku: "POCKETGIMBAL-WHT", inventory: 13 },
    ],
  },
  {
    cat: "cameras",
    name: "TrailWatch Wildlife Trail Camera",
    description:
      "Weatherproof trail camera with no-glow night vision, motion triggers and long standby battery.",
    price: 89,
    variants: [{ name: "Camo", sku: "TRAILWATCH-CAM", inventory: 24 }],
  },
  {
    cat: "cameras",
    name: "LivePod Wireless Lavalier Mic",
    description:
      "Dual-channel wireless lavalier microphone set with noise cancellation and 8-hour battery.",
    price: 79,
    variants: [{ name: "Black", sku: "LIVEPOD-BLK", inventory: 28 }],
  },

  // ── Accessories (more) ──
  {
    cat: "accessories",
    name: "VoltCore 20000mAh Power Bank",
    description:
      "Slim 20,000mAh power bank with 65W USB-C output and a built-in digital charge display.",
    price: 49,
    variants: [
      { name: "Black", sku: "VOLTCORE-20K-BLK", inventory: 45 },
      { name: "Blue", sku: "VOLTCORE-20K-BLU", inventory: 27 },
    ],
  },
  {
    cat: "accessories",
    name: "TravelPro Universal Travel Adapter",
    description:
      "All-in-one travel adapter covering 150+ countries with dual USB-C PD and USB-A ports.",
    price: 39,
    variants: [{ name: "White", sku: "TRAVELPRO-WHT", inventory: 52 }],
  },
  {
    cat: "accessories",
    name: "BraidLink USB-C to USB-C Cable (2m)",
    description:
      "Two-metre braided USB-C cable rated for 100W charging and 480Mbps data transfer.",
    price: 15,
    variants: [
      { name: "Black", sku: "BRAIDLINK-2M-BLK", inventory: 90 },
      { name: "Grey", sku: "BRAIDLINK-2M-GRY", inventory: 70 },
    ],
  },
  {
    cat: "accessories",
    name: "MagMount Wireless Car Charger",
    description:
      "Magnetic vent-mount car charger with 15W fast wireless charging and secure one-hand docking.",
    price: 35,
    variants: [{ name: "Black", sku: "MAGMOUNT-BLK", inventory: 38 }],
  },
  {
    cat: "accessories",
    name: "GripStand Phone Ring Holder",
    description:
      "Slim adhesive ring holder that doubles as a kickstand, with a 360° rotating base.",
    price: 12,
    variants: [
      { name: "Black", sku: "GRIPSTAND-BLK", inventory: 100 },
      { name: "Rose Gold", sku: "GRIPSTAND-RSG", inventory: 64 },
    ],
  },
  {
    cat: "accessories",
    name: "ToughGlass Screen Protector (2-pack)",
    description:
      "Tempered-glass screen protectors with an easy-align frame and oleophobic anti-smudge coating.",
    price: 14,
    variants: [{ name: "Clear", sku: "TOUGHGLASS-2PK", inventory: 120 }],
  },

  // ── Mobile & Tablets ──
  {
    cat: "mobile",
    name: "Zephyr X5 Smartphone",
    description:
      "6.7-inch flagship smartphone with a triple 50MP camera, 120Hz display and all-day battery life.",
    price: 599,
    variants: [
      { name: "Obsidian / 128GB", sku: "ZEPHYR-X5-128", inventory: 20 },
      { name: "Obsidian / 256GB", sku: "ZEPHYR-X5-256", inventory: 12, priceDelta: 60 },
      { name: "Sky / 256GB", sku: "ZEPHYR-X5-256-SKY", inventory: 6, priceDelta: 60 },
    ],
  },
  {
    cat: "mobile",
    name: "Zephyr Lite 5G Smartphone",
    description:
      "Affordable 5G smartphone with a 90Hz display, 5000mAh battery and a dependable dual camera.",
    price: 329,
    variants: [
      { name: "Graphite", sku: "ZEPHYR-LITE-GRP", inventory: 30 },
      { name: "Mint", sku: "ZEPHYR-LITE-MNT", inventory: 18 },
    ],
  },
  {
    cat: "mobile",
    name: "Zephyr Fold Foldable Phone",
    description:
      "Book-style foldable phone that opens into a 7.6-inch tablet with a durable hinge and flex display.",
    price: 999,
    variants: [{ name: "Phantom Black / 256GB", sku: "ZEPHYR-FOLD-256", inventory: 5 }],
  },
  {
    cat: "mobile",
    name: "SlateTab 11 Tablet",
    description:
      "11-inch tablet with a 120Hz display, quad speakers and 12 hours of video battery life.",
    price: 429,
    variants: [
      { name: "Grey / 128GB", sku: "SLATE-11-128", inventory: 16 },
      { name: "Grey / 256GB", sku: "SLATE-11-256", inventory: 9, priceDelta: 80 },
    ],
  },
  {
    cat: "mobile",
    name: "SlateTab Pro 12.9 Tablet",
    description:
      "Pro 12.9-inch tablet with a laminated display, four speakers and 14 hours of battery for creative work.",
    price: 699,
    variants: [{ name: "Space Grey / 256GB", sku: "SLATE-PRO-256", inventory: 7 }],
  },
  {
    cat: "mobile",
    name: "SlateTab Mini Tablet",
    description:
      "Compact 8.3-inch tablet that's perfect for reading and travel, with 10 hours of battery life.",
    price: 299,
    variants: [
      { name: "Starlight", sku: "SLATE-MINI-STR", inventory: 22 },
      { name: "Purple", sku: "SLATE-MINI-PUR", inventory: 14 },
    ],
  },
  {
    cat: "mobile",
    name: "InkReader Paperlight E-Reader",
    description:
      "Glare-free 6-inch e-reader with a warm front light, waterproof body and weeks of battery life.",
    price: 139,
    variants: [
      { name: "Black", sku: "INKREADER-BLK", inventory: 35 },
      { name: "Sage", sku: "INKREADER-SGE", inventory: 21 },
    ],
  },
  {
    cat: "mobile",
    name: "StylusPro Active Pen",
    description:
      "Pressure-sensitive active stylus with tilt support and magnetic charging for compatible tablets.",
    price: 79,
    variants: [{ name: "White", sku: "STYLUSPRO-WHT", inventory: 40 }],
  },
  {
    cat: "mobile",
    name: "TabFolio Keyboard Case",
    description:
      "Detachable keyboard folio with a trackpad and adjustable stand that turns a tablet into a laptop.",
    price: 89,
    variants: [{ name: "Black", sku: "TABFOLIO-BLK", inventory: 19 }],
  },
  {
    cat: "mobile",
    name: "ClipMount Car Phone Holder",
    description:
      "One-touch dashboard and vent car phone mount with a secure spring clamp and full articulation.",
    price: 25,
    variants: [{ name: "Black", sku: "CLIPMOUNT-BLK", inventory: 58 }],
  },

  // ── Networking ──
  {
    cat: "networking",
    name: "NovaMesh Wi-Fi 6 System (3-pack)",
    description:
      "Whole-home Wi-Fi 6 mesh system covering up to 5,500 sq ft with seamless roaming and no dead zones.",
    price: 249,
    variants: [{ name: "White / 3-pack", sku: "NOVAMESH-6-3PK", inventory: 15 }],
  },
  {
    cat: "networking",
    name: "NovaMesh Mini (2-pack)",
    description:
      "Compact dual-band mesh Wi-Fi for apartments and smaller homes, covering up to 3,000 sq ft.",
    price: 149,
    variants: [{ name: "White / 2-pack", sku: "NOVAMESH-MINI-2PK", inventory: 24 }],
  },
  {
    cat: "networking",
    name: "NovaRouter AX5400 Gaming Router",
    description:
      "Wi-Fi 6 gaming router with a 2.5G WAN port, QoS prioritisation and eight high-gain antennas.",
    price: 189,
    variants: [{ name: "Black", sku: "NOVAROUTER-AX5400", inventory: 12 }],
  },
  {
    cat: "networking",
    name: "RangeBoost Wi-Fi Extender",
    description:
      "Plug-in dual-band Wi-Fi range extender that adds up to 1,500 sq ft of coverage in minutes.",
    price: 39,
    variants: [{ name: "White", sku: "RANGEBOOST-WHT", inventory: 46 }],
  },
  {
    cat: "networking",
    name: "PowerLink Powerline Adapter Kit",
    description:
      "Powerline adapter kit that carries a stable wired connection through your home's electrical wiring.",
    price: 59,
    variants: [{ name: "White / 2-pack", sku: "POWERLINK-2PK", inventory: 20 }],
  },
  {
    cat: "networking",
    name: "SwiftSwitch 8-Port Gigabit Switch",
    description:
      "Fanless 8-port gigabit Ethernet switch with a metal case for quiet, reliable wired networking.",
    price: 45,
    variants: [{ name: "Black", sku: "SWIFTSWITCH-8P", inventory: 31 }],
  },
  {
    cat: "networking",
    name: "GuardVPN Travel Router",
    description:
      "Pocket travel router with VPN support that turns any hotel or café connection into your own secure Wi-Fi.",
    price: 79,
    variants: [{ name: "Grey", sku: "GUARDVPN-TRV", inventory: 17 }],
  },
  {
    cat: "networking",
    name: "NovaHotspot 5G Mobile Router",
    description:
      "Battery-powered 5G mobile hotspot sharing fast internet with up to 32 devices, 12 hours per charge.",
    price: 129,
    variants: [{ name: "Black", sku: "NOVAHOTSPOT-5G", inventory: 9 }],
  },
  {
    cat: "networking",
    name: "FiberLink 2.5G USB Network Adapter",
    description:
      "USB-C to 2.5-gigabit Ethernet adapter for fast, dependable wired networking on laptops.",
    price: 35,
    variants: [{ name: "Space Grey", sku: "FIBERLINK-25G", inventory: 40 }],
  },
  {
    cat: "networking",
    name: "CablePro Cat8 Ethernet Cable (3m)",
    description:
      "Shielded 3-metre Cat8 Ethernet cable rated for 40Gbps and 2000MHz for high-speed connections.",
    price: 19,
    variants: [
      { name: "Black", sku: "CABLEPRO-CAT8-BLK", inventory: 85 },
      { name: "Blue", sku: "CABLEPRO-CAT8-BLU", inventory: 60 },
    ],
  },

  // ── Storage & Drives ──
  {
    cat: "storage",
    name: "RapidSSD Portable SSD 1TB",
    description:
      "Palm-sized 1TB portable SSD with up to 1,050MB/s transfer speeds over USB-C and a shock-resistant shell.",
    price: 109,
    variants: [
      { name: "Black / 1TB", sku: "RAPIDSSD-1TB", inventory: 33 },
      { name: "Blue / 1TB", sku: "RAPIDSSD-1TB-BLU", inventory: 21 },
    ],
  },
  {
    cat: "storage",
    name: "RapidSSD Portable SSD 2TB",
    description:
      "High-capacity 2TB portable SSD with 1,050MB/s USB-C speeds for photographers and video editors.",
    price: 179,
    variants: [{ name: "Black / 2TB", sku: "RAPIDSSD-2TB", inventory: 18 }],
  },
  {
    cat: "storage",
    name: "RapidSSD Pro NVMe 2TB",
    description:
      "Blazing 2,000MB/s external NVMe SSD in an aluminium heat-dissipating body for pro workflows.",
    price: 199,
    variants: [{ name: "Grey / 2TB", sku: "RAPIDSSD-PRO-2TB", inventory: 10 }],
  },
  {
    cat: "storage",
    name: "VaultDrive Rugged SSD 1TB",
    description:
      "Water-resistant, drop-proof 1TB rugged SSD built for the field, with a carabiner loop.",
    price: 139,
    variants: [{ name: "Orange / 1TB", sku: "VAULT-RGD-1TB", inventory: 16 }],
  },
  {
    cat: "storage",
    name: "VaultDrive External HDD 4TB",
    description:
      "Spacious 4TB desktop hard drive for backups and media libraries, with one-touch backup software.",
    price: 99,
    variants: [{ name: "Black / 4TB", sku: "VAULT-HDD-4TB", inventory: 27 }],
  },
  {
    cat: "storage",
    name: "MicroVault microSD Card 512GB",
    description:
      "512GB microSD card with A2 app performance and 4K-ready write speeds for phones, cameras and consoles.",
    price: 59,
    variants: [{ name: "512GB", sku: "MICROVAULT-512", inventory: 54 }],
  },
  {
    cat: "storage",
    name: "SnapCard SD Card 256GB UHS-II",
    description:
      "Fast 256GB UHS-II SD card with up to 300MB/s read speeds for high-resolution photo and video.",
    price: 49,
    variants: [{ name: "256GB", sku: "SNAPCARD-256", inventory: 38 }],
  },
  {
    cat: "storage",
    name: "FlashKey USB-C Flash Drive 256GB",
    description:
      "Dual USB-C and USB-A flash drive with 256GB capacity and a durable metal swivel body.",
    price: 39,
    variants: [{ name: "256GB", sku: "FLASHKEY-256", inventory: 62 }],
  },
  {
    cat: "storage",
    name: "NestNAS 2-Bay Network Storage",
    description:
      "Two-bay network-attached storage for private cloud backups and media streaming across your home.",
    price: 299,
    variants: [{ name: "Diskless", sku: "NESTNAS-2BAY", inventory: 8 }],
  },
  {
    cat: "storage",
    name: "HubVault USB-C SSD Enclosure",
    description:
      "Tool-free NVMe SSD enclosure delivering up to 10Gbps over USB-C to turn a bare drive into a portable SSD.",
    price: 45,
    variants: [{ name: "Space Grey", sku: "HUBVAULT-ENC", inventory: 29 }],
  },

  // ── Extra additions ──
  {
    cat: "audio",
    name: "SoundWave Soundbar 2.1 Home Theatre",
    description:
      "2.1-channel soundbar with a wireless subwoofer, Dolby Audio and Bluetooth for immersive movie nights.",
    price: 179,
    variants: [{ name: "Black", sku: "SW-BAR-21-BLK", inventory: 20 }],
  },
  {
    cat: "computing",
    name: "ClearView 34\" Ultrawide Monitor",
    description:
      "34-inch WQHD ultrawide curved monitor with a 144Hz refresh rate, USB-C dock and 99% sRGB colour.",
    price: 449,
    variants: [{ name: "Black", sku: "CLEARVIEW-34-UW", inventory: 8 }],
  },
];

const CAT_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.name]));

// ── Generators for highlights / specs / reviews ───────────────
const CATEGORY_HIGHLIGHTS: Record<string, string[]> = {
  Audio: [
    "Wireless Bluetooth 5.3 connectivity",
    "Rich, balanced sound signature",
    "Built-in microphone for hands-free calls",
  ],
  Wearables: [
    "Heart-rate & activity tracking",
    "Bright always-on display",
    "Companion app for iOS & Android",
  ],
  "Smart Home": [
    "Easy app & voice control",
    "No hub required — connects over Wi-Fi",
    "Energy-efficient design",
  ],
  Computing: [
    "Plug-and-play setup",
    "Durable premium build",
    "Designed for all-day use",
  ],
  Gaming: [
    "Low-latency wireless performance",
    "Ergonomic, comfortable grip",
    "Built for long play sessions",
  ],
  Cameras: [
    "Crisp high-resolution capture",
    "Compact and travel-ready",
    "Long recording battery",
  ],
  Accessories: [
    "Universal USB-C compatibility",
    "Fast, reliable charging",
    "Compact and durable",
  ],
  "Mobile & Tablets": [
    "Vivid high-refresh display",
    "All-day battery life",
    "Fast USB-C charging",
  ],
  Networking: [
    "Easy app-guided setup",
    "Strong, stable coverage",
    "Backwards compatible with older devices",
  ],
  "Storage & Drives": [
    "Fast USB-C transfer speeds",
    "Plug-and-play — no software needed",
    "Durable, portable design",
  ],
};

function battFromDesc(p: SeedProduct): string {
  const m = p.description.match(/(\d+)\s*hours?/i);
  return m ? `Up to ${m[1]} hours` : "";
}

function genHighlights(p: SeedProduct, catName: string): string[] {
  const out: string[] = [];
  const battery = battFromDesc(p);
  if (battery) out.push(`${battery} of battery life`);
  const water = p.description.match(/water[- ]?(resistant|proof)/i);
  if (water) out.push("Water resistant for everyday use");
  if (p.variants.length > 1) out.push(`Available in ${p.variants.length} colours`);
  return [...out, ...(CATEGORY_HIGHLIGHTS[catName] ?? [])].slice(0, 5);
}

const CATEGORY_SPECS: Record<
  string,
  (p: SeedProduct) => { group: string; rows: string[][] }
> = {
  Audio: (p) => ({
    group: "Sound & Connectivity",
    rows: [
      ["Connectivity", "Bluetooth 5.3"],
      ["Battery life", battFromDesc(p) || "Up to 20 hours"],
      ["Noise cancellation", /noise cancell/i.test(p.description) ? "Active (ANC)" : "Passive isolation"],
      ["Water resistance", /waterproof|water[- ]resistant/i.test(p.description) ? "IPX5" : "—"],
      ["Controls", "Touch / in-line"],
      ["Microphone", "Built-in"],
    ],
  }),
  Wearables: () => ({
    group: "Display & Health",
    rows: [
      ["Display", "AMOLED touchscreen"],
      ["Sensors", "Heart-rate, accelerometer, GPS"],
      ["Water resistance", "50 m (5 ATM)"],
      ["Battery life", "Up to 7 days"],
      ["Compatibility", "iOS & Android"],
    ],
  }),
  "Smart Home": () => ({
    group: "Connectivity & Features",
    rows: [
      ["Connectivity", "Wi-Fi 2.4 GHz"],
      ["Voice control", "Alexa & Google Assistant"],
      ["App", "ShopAI Home (iOS/Android)"],
      ["Hub required", "No"],
      ["Power", "Mains / USB-C"],
    ],
  }),
  Computing: () => ({
    group: "Connectivity & Compatibility",
    rows: [
      ["Connectivity", "USB-C / 2.4 GHz wireless"],
      ["Compatibility", "Windows, macOS, Linux"],
      ["Build", "Aluminium & ABS"],
      ["Cable length", "1.5 m"],
    ],
  }),
  Gaming: () => ({
    group: "Performance",
    rows: [
      ["Connectivity", "2.4 GHz wireless / USB-C"],
      ["Latency", "< 10 ms"],
      ["Compatibility", "PC, console & mobile"],
      ["Battery life", "Up to 20 hours"],
    ],
  }),
  Cameras: () => ({
    group: "Camera & Recording",
    rows: [
      ["Max resolution", "4K @ 60 fps"],
      ["Stabilization", "Electronic (EIS)"],
      ["Water resistance", "Up to 10 m"],
      ["Battery life", "Up to 90 min recording"],
      ["Storage", "microSD up to 512 GB"],
    ],
  }),
  Accessories: () => ({
    group: "Compatibility",
    rows: [
      ["Compatibility", "Universal (USB-C)"],
      ["Material", "Aluminium / braided nylon"],
      ["Fast charging", "Yes"],
    ],
  }),
  "Mobile & Tablets": (p) => ({
    group: "Display & Performance",
    rows: [
      ["Display", "High-refresh (up to 120Hz)"],
      ["Connectivity", "5G / Wi-Fi 6 / Bluetooth 5.3"],
      ["Battery life", battFromDesc(p) || "All-day"],
      ["Charging", "USB-C fast charging"],
      ["Options", p.variants.map((v) => v.name).join(", ")],
    ],
  }),
  Networking: () => ({
    group: "Networking",
    rows: [
      ["Wi-Fi standard", "Wi-Fi 6 (802.11ax)"],
      ["Bands", "Dual-band 2.4 GHz + 5 GHz"],
      ["Ports", "Gigabit Ethernet"],
      ["Setup", "Guided via companion app"],
      ["Security", "WPA3"],
    ],
  }),
  "Storage & Drives": () => ({
    group: "Storage & Performance",
    rows: [
      ["Interface", "USB-C (USB 3.2)"],
      ["Transfer speed", "Up to 1,050 MB/s"],
      ["Compatibility", "Windows, macOS, Android, consoles"],
      ["Format", "exFAT (reformattable)"],
    ],
  }),
};

function genSpecs(p: SeedProduct, catName: string) {
  const brand = p.name.split(" ")[0];
  const general = {
    group: "General",
    rows: [
      ["Brand", brand],
      ["Model", p.name],
      ["Category", catName],
      ["Colour options", p.variants.map((v) => v.name).join(", ")],
      ["In the box", `1 × ${p.name}, USB-C cable, Quick-start guide, Warranty card`],
    ],
  };
  const specific = CATEGORY_SPECS[catName]?.(p) ?? {
    group: "Features",
    rows: [["Highlights", "See product highlights"]],
  };
  const warranty = {
    group: "Warranty",
    rows: [
      ["Warranty", "1 year manufacturer warranty"],
      ["Warranty type", "Carry-in"],
      ["Covered", "Manufacturing defects"],
    ],
  };
  return [general, specific, warranty];
}

const REVIEW_AUTHORS = [
  "Rahul S.", "Priya M.", "James T.", "Aisha K.", "Wei Chen", "Carlos R.",
  "Emma W.", "Diego F.", "Sana P.", "Tom H.", "Nina B.", "Omar A.",
];
const REVIEW_LOCS = [
  "San Francisco", "Austin", "Seattle", "New York", "London",
  "Toronto", "Berlin", "Sydney", "Dublin", "Singapore",
];
const REVIEW_SNIPPETS = [
  { r: 5, t: "Absolutely love it", b: "Exceeded my expectations — great quality and it works flawlessly. Would buy again." },
  { r: 5, t: "Best purchase this year", b: "Fantastic value for the price. Setup was quick and it does exactly what I needed." },
  { r: 4, t: "Really good", b: "Solid overall. A couple of minor niggles but nothing that affects daily use. Recommended." },
  { r: 4, t: "Happy with it", b: "Feels premium and performs as advertised. Been using it daily with no issues." },
  { r: 3, t: "Decent for the price", b: "Works fine but I expected a little more. Still okay value when it's on offer." },
  { r: 5, t: "Highly recommend", b: "Holding up great after a few weeks of heavy use. No complaints at all." },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function genReviews(productId: string, index: number) {
  const count = 4 + (index % 2); // 4 or 5
  return Array.from({ length: count }).map((_, i) => {
    const s = REVIEW_SNIPPETS[(index + i) % REVIEW_SNIPPETS.length];
    return {
      productId,
      author: REVIEW_AUTHORS[(index * 3 + i) % REVIEW_AUTHORS.length],
      location: REVIEW_LOCS[(index * 2 + i) % REVIEW_LOCS.length],
      rating: s.r,
      title: s.t,
      body: s.b,
      verified: i % 4 !== 3,
      helpful: 8 + ((index * 7 + i * 13) % 380),
      createdAt: daysAgo(10 + i * 21 + (index % 5) * 9),
    };
  });
}

async function main() {
  console.log("🌱 Seeding ShopAI database…");

  // ── Clean slate (safe for a demo DB) ─────────────────────────
  await prisma.$transaction([
    prisma.toolCall.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.consultationSlot.deleteMany(),
    prisma.returnRefund.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.review.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.knowledgeDocument.deleteMany(),
    prisma.agentConfig.deleteMany(),
    prisma.user.deleteMany(),
    prisma.customer.deleteMany(),
  ]);

  // ── Categories ────────────────────────────────────────────────
  const categoryIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({
      data: { name: c.name, description: c.description },
    });
    categoryIds[c.key] = created.id;
  }
  console.log(`  • ${CATEGORIES.length} categories created`);

  // ── Products + variants + highlights/specs/reviews ────────────
  let reviewTotal = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const catName = CAT_NAME[p.cat];
    const avgRating = Math.round((4.2 + (i % 7) * 0.1) * 10) / 10; // 4.2–4.8
    const reviewCount = 60 + ((i * 137) % 3000);

    const product = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId: categoryIds[p.cat],
        highlights: genHighlights(p, catName),
        specs: genSpecs(p, catName),
        avgRating,
        reviewCount,
        variants: {
          create: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            inventory: v.inventory,
            priceDelta: v.priceDelta ?? 0,
          })),
        },
      },
    });

    const reviews = genReviews(product.id, i);
    await prisma.review.createMany({ data: reviews });
    reviewTotal += reviews.length;
  }
  const variantCount = PRODUCTS.reduce((n, p) => n + p.variants.length, 0);
  console.log(
    `  • ${PRODUCTS.length} products (${variantCount} variants, ${reviewTotal} reviews) created`,
  );

  // ── Demo customer + user ──────────────────────────────────────
  const customer = await prisma.customer.create({
    data: {
      name: "Alex Demo",
      email: "alex@demo.shopai.test",
      phone: "+15555550123",
      address: "123 Market Street, San Francisco, CA 94103",
    },
  });

  await prisma.user.create({
    data: {
      email: "alex@demo.shopai.test",
      passwordHash: "demo",
      role: "CUSTOMER",
      customerId: customer.id,
    },
  });

  // ── Sample orders ─────────────────────────────────────────────
  const [product1, variant1] = await resolveVariant("AERO-PRO-BLK");
  const [product2, variant2] = await resolveVariant("SW-MINI-TEL");

  await prisma.order.create({
    data: {
      customerId: customer.id,
      status: OrderStatus.DELIVERED,
      total: 129,
      shippingAddress: customer.address!,
      trackingNumber: "1Z999AA10123456784",
      estimatedDelivery: new Date("2026-08-20T00:00:00Z"),
      createdAt: new Date("2026-08-12T00:00:00Z"),
      items: {
        create: [
          { productId: product1, variantId: variant1, quantity: 1, unitPrice: 129 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      customerId: customer.id,
      status: OrderStatus.SHIPPED,
      total: 49,
      shippingAddress: customer.address!,
      trackingNumber: "1Z999AA10987654321",
      estimatedDelivery: new Date("2026-09-02T00:00:00Z"),
      createdAt: new Date("2026-08-27T00:00:00Z"),
      items: {
        create: [
          { productId: product2, variantId: variant2, quantity: 1, unitPrice: 49 },
        ],
      },
    },
  });
  console.log("  • 2 orders created (DELIVERED, SHIPPED)");

  // ── Consultation slots (for booking workflow) ─────────────────
  const services = [
    "Product Expert Consultation",
    "Audio Specialist Session",
    "Smart Home Setup Advice",
  ];
  const base = new Date("2026-08-31T09:00:00Z"); // day after the seeded "today"
  const hours = [9, 11, 14, 16];
  const slotData = [] as {
    service: string;
    startsAt: Date;
    endsAt: Date;
    status: SlotStatus;
  }[];
  for (let day = 0; day < 3; day++) {
    for (const hour of hours) {
      const service = services[(day + hour) % services.length];
      const start = new Date(base);
      start.setUTCDate(base.getUTCDate() + day);
      start.setUTCHours(hour, 0, 0, 0);
      slotData.push({
        service,
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60 * 1000),
        status: SlotStatus.OPEN,
      });
    }
  }
  await prisma.consultationSlot.createMany({ data: slotData });
  console.log(`  • ${slotData.length} consultation slots created`);

  // ── Knowledge documents (metadata; PDFs uploaded to ElevenLabs later) ──
  await prisma.knowledgeDocument.createMany({
    data: [
      { title: "Shipping Policy", source: "shipping-policy.md", status: KnowledgeStatus.ACTIVE },
      { title: "Returns & Refunds Policy", source: "returns-refunds-policy.md", status: KnowledgeStatus.ACTIVE },
      { title: "Warranty Policy", source: "warranty-policy.md", status: KnowledgeStatus.ACTIVE },
      { title: "Product FAQ", source: "product-faq.md", status: KnowledgeStatus.ACTIVE },
      { title: "Customer Support Guidelines", source: "support-guidelines.md", status: KnowledgeStatus.ACTIVE },
      { title: "Privacy & Account Policy", source: "privacy-account-policy.md", status: KnowledgeStatus.ACTIVE },
    ],
  });
  console.log("  • 6 knowledge documents created");

  // ── Initial agent config (spec §10 prompt) ────────────────────
  await prisma.agentConfig.create({
    data: {
      version: 1,
      isActive: true,
      voiceId: null,
      prompt: AGENT_PROMPT,
    },
  });
  console.log("  • agent config v1 created");

  console.log("✅ Seed complete.");
}

/** Resolve a variant + its product id by SKU. */
async function resolveVariant(sku: string): Promise<[string, string]> {
  const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku } });
  return [variant.productId, variant.id];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
