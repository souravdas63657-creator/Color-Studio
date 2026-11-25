// 1. State (Source of Truth)

let palette = [
  { hex: "#0F172A", locked: false },
  { hex: "#334155", locked: false },
  { hex: "#64748B", locked: false },
  { hex: "#CBD5E1", locked: false },
  { hex: "#F8FAFC", locked: false }
];

let savedPalettes = JSON.parse(localStorage.getItem("savedPalettes")) || [];

// DOM References
const paletteGrid = document.getElementById("paletteGrid");
const generateBtn = document.getElementById("generateBtn");
const toast = document.getElementById("toast");
const saveBtn = document.getElementById("saveBtn");
const toggleDrawerBtn = document.getElementById("toggleDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const savedDrawer = document.getElementById("savedDrawer");
const savedList = document.getElementById("savedList");

let toastTimeout;

// 3. Random Hex Color Generator

function generateHex() {
    const chars = "0123456789ABCDEF";
    let hex = "#";

    for(let i = 0; i < 6; i++){
        const randomIndex = Math.floor(Math.random() * chars.length);
        hex += chars[randomIndex]
    }

    return hex;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return { r, g, b };
}

// 3C. Calculate WCAG Relative Luminance (0 = pure black, 1 = pure white)
function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);

  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// 3D. Calculate Contrast Ratio Between Two Colors (1 to 21)
function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// 3E. Pick Best Text Color & WCAG Badge
function getContrastInfo(bgHex) {
  const whiteContrast = getContrastRatio(bgHex, "#FFFFFF");
  const blackContrast = getContrastRatio(bgHex, "#000000");

  const useWhiteText = whiteContrast >= blackContrast;
  const textColor = useWhiteText ? "#FFFFFF" : "#0F172A";
  const bestRatio = useWhiteText ? whiteContrast : blackContrast;

  let grade = "Fail";
  if (bestRatio >= 7) {
    grade = "AAA";
  } else if (bestRatio >= 4.5) {
    grade = "AA";
  }

  return {
    textColor,
    ratio: bestRatio.toFixed(1),
    grade
  };
}

// 4. Render Palette to the Screen

// 4. Render Palette to the Screen
function renderPalette() {
  const columnsHTML = palette
    .map((color, index) => {
      const lockIcon = color.locked ? "🔒" : "🔓";
      const { textColor, ratio, grade } = getContrastInfo(color.hex);

      return `
        <section class="color-col" data-index="${index}" style="background-color: ${color.hex}; color: ${textColor};">
          <button class="lock-btn" aria-label="Lock color">${lockIcon}</button>
          <button class="hex-code">${color.hex}</button>
          <span class="contrast-badge">${ratio}:1 · ${grade}</span>
        </section>
      `;
    })
    .join("");

  paletteGrid.innerHTML = columnsHTML;
}

// 5. Update Unlocked Colors
function generatePalette() {
  palette = palette.map((color) => {
    if (color.locked) {
      return color;
    }
    return { ...color, hex: generateHex() };
  });

  renderPalette();
}

// 6. Event Listeners
generateBtn.addEventListener("click", generatePalette);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    generatePalette();
  }
});

// 6B. Show Toast Notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 1500);
}

// 6C. Copy Hex Code to Clipboard
async function copyHex(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    showToast(`Copied ${hex} to clipboard!`);
  } catch (error) {
    showToast("Failed to copy color.");
  }
}

// 6D. Toggle Lock State
function toggleLock(index) {
  palette[index].locked = !palette[index].locked;
  renderPalette();
}

// 6E. Event Delegation on the Palette Grid
paletteGrid.addEventListener("click", (event) => {
  const column = event.target.closest(".color-col");
  if (!column) return;

  const index = Number(column.dataset.index);

  if (event.target.closest(".lock-btn")) {
    toggleLock(index);
  } else if (event.target.closest(".hex-code")) {
    copyHex(palette[index].hex);
  }
});

// 6F. Save Array to localStorage
function persistPalettes() {
  localStorage.setItem("savedPalettes", JSON.stringify(savedPalettes));
}

// 6G. Render Saved Palettes in the Drawer
function renderSavedPalettes() {
  if (savedPalettes.length === 0) {
    savedList.innerHTML = `<p class="empty-msg">No saved palettes yet.</p>`;
    return;
  }

  savedList.innerHTML = savedPalettes
    .map((item) => {
      const swatchesHTML = item.colors
        .map((hex) => `<div class="swatch" style="background-color: ${hex};" title="${hex}"></div>`)
        .join("");

      return `
        <div class="saved-card" data-id="${item.id}">
          <div class="swatch-strip" title="Click to load palette">
            ${swatchesHTML}
          </div>
          <button class="delete-btn" aria-label="Delete palette">✕</button>
        </div>
      `;
    })
    .join("");
}

// 6H. Save, Load, and Delete Functions
function saveCurrentPalette() {
  const newEntry = {
    id: Date.now(),
    colors: palette.map((color) => color.hex)
  };

  savedPalettes.unshift(newEntry);
  persistPalettes();
  renderSavedPalettes();
  showToast("Palette saved!");
}

function loadPalette(id) {
  const found = savedPalettes.find((item) => item.id === id);
  if (!found) return;

  palette = found.colors.map((hex) => ({ hex, locked: false }));
  renderPalette();
  toggleDrawer(false);
  showToast("Palette loaded!");
}

function deletePalette(id) {
  savedPalettes = savedPalettes.filter((item) => item.id !== id);
  persistPalettes();
  renderSavedPalettes();
  showToast("Palette deleted.");
}

// 6I. Open / Close Drawer
function toggleDrawer(forceState) {
  const isOpen = savedDrawer.classList.toggle("open", forceState);
  savedDrawer.setAttribute("aria-hidden", String(!isOpen));
}

// 6J. Drawer & Save Event Listeners
saveBtn.addEventListener("click", saveCurrentPalette);
toggleDrawerBtn.addEventListener("click", () => toggleDrawer());
closeDrawerBtn.addEventListener("click", () => toggleDrawer(false));

savedList.addEventListener("click", (event) => {
  const card = event.target.closest(".saved-card");
  if (!card) return;

  const id = Number(card.dataset.id);

  if (event.target.closest(".delete-btn")) {
    deletePalette(id);
  } else if (event.target.closest(".swatch-strip")) {
    loadPalette(id);
  }
});

// 7. Initial Render on Page Load
renderPalette();
renderSavedPalettes();