

const GARMENTS = {
  tshirt: { name: "T-Shirt", weight: 0.20 },
  sportswear: { name: "Sportswear", weight: 0.25 },
  shirt: { name: "Shirt", weight: 0.25 },
  underwear: { name: "Underwear", weight: 0.08 },
  towel: { name: "Towel", weight: 0.50 },
  bedsheet: { name: "Bedsheet", weight: 0.65 },
  jeans: { name: "Jeans", weight: 0.75 },
  wool: { name: "Wool Clothing", weight: 0.40 }
};

const COLORS = {
  white: "White",
  light: "Light",
  dark: "Dark"
};

const MAX_CAPACITY = 7;

function loadData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function storeData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

const basket = loadData("washpilot-basket-v1").filter(
  item =>
    GARMENTS[item.type] &&
    COLORS[item.color] &&
    [30, 40, 60].includes(item.care) &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= 20
);

const savedPlans = loadData("washpilot-plans-v1");

let currentPlan = null;

function element(id) {
  return document.getElementById(id);
}

function createId() {
  return Date.now().toString() +
    Math.random().toString(36).slice(2, 9);
}

function showMessage(message, type = "success") {
  const box = element("formMessage");

  box.textContent = message;
  box.className = "form-message " + type;
}

function calculateWeight(items) {
  return items.reduce((total, item) => {
    return total +
      GARMENTS[item.type].weight * item.quantity;
  }, 0);
}

function countItems(items) {
  return items.reduce(
    (total, item) => total + item.quantity, 0
  );
}

function resetResult() {
  currentPlan = null;

  element("resultEmpty").classList.remove("is-hidden");
  element("resultContent").classList.add("is-hidden");

  element("savePlanBtn").disabled = false;
  element("savePlanBtn").textContent = "Save This Plan";
  element("saveMessage").textContent = "";
}

function addGarment() {
  const type = element("typeInput").value;
  const color = element("colorInput").value;
  const care = Number(element("careInput").value);
  const quantity = Number(element("quantityInput").value);

  if (!GARMENTS[type] || !COLORS[color]) {
    showMessage("Please select a valid garment.", "error");
    return;
  }

  if (!Number.isInteger(quantity) ||
      quantity < 1 || quantity > 20) {
    showMessage(
      "Quantity must be a whole number between 1 and 20.",
      "error"
    );
    return;
  }

  if (![30, 40, 60].includes(care)) {
    showMessage("Please select a valid care label.", "error");
    return;
  }

  const item = {
    id: createId(),
    type: type,
    color: color,
    care: care,
    quantity: quantity
  };

  basket.push(item);

  const stored = storeData("washpilot-basket-v1", basket);

  renderBasket();
  resetResult();

  showMessage(
    stored
      ? "Garment added successfully!"
      : "Added, but browser storage is unavailable.",
    stored ? "success" : "error"
  );

  element("quantityInput").value = 1;
}

function renderBasket() {
  const list = element("basketList");
  const count = countItems(basket);
  const weight = calculateWeight(basket);

  element("basketCount").textContent = count + " items";
  element("basketWeight").textContent =
    weight.toFixed(1) + " / 7 kg";

  list.innerHTML = "";

  if (basket.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◌</div>
        Your basket is empty.
      </div>
    `;
    return;
  }

  basket.forEach(item => {
    const row = document.createElement("div");
    row.className = "basket-item";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent =
      item.quantity + " × " + GARMENTS[item.type].name;

    const info = document.createElement("small");
    info.textContent =
      COLORS[item.color] +
      " · Max " + item.care + "°C";

    details.append(title, info);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-btn";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.dataset.remove = item.id;

    row.append(details, removeButton);
    list.appendChild(row);
  });
}

element("basketList").addEventListener("click", event => {
  const button = event.target.closest("button[data-remove]");

  if (!button) return;

  const index = basket.findIndex(
    item => item.id === button.dataset.remove
  );

  if (index !== -1) {
    basket.splice(index, 1);
    storeData("washpilot-basket-v1", basket);
    renderBasket();
    resetResult();
    showMessage("Garment removed.");
  }
});

function clearBasket() {
  basket.length = 0;

  storeData("washpilot-basket-v1", basket);
  renderBasket();
  resetResult();

  showMessage("Basket cleared.");
}

function createWashPlan(items, soil) {
  const weight = calculateWeight(items);
  const count = countItems(items);

  const types = new Set(items.map(item => item.type));
  const colors = new Set(items.map(item => item.color));

  const hasWool = types.has("wool");
  const hasSportswear = types.has("sportswear");

  const onlyShirts = items.every(
    item => item.type === "shirt"
  );

  const cottonCategories = [
    "towel", "bedsheet", "underwear"
  ];

  const onlyCottonCategories = items.every(
    item => cottonCategories.includes(item.type)
  );

  const onlyWhites = items.every(
    item => item.color === "white"
  );

  let program = "Mixed Fabrics";

  if (hasWool) {
    program = "Wool / Delicates";
  } else if (hasSportswear) {
    program = "Synthetics";
  } else if (onlyShirts) {
    program = "Shirts";
  } else if (onlyCottonCategories) {
    program = "Cotton";
  }

  let preferredTemperature = 40;

  if (soil === "light") {
    preferredTemperature = 30;
  }

  if (hasWool || hasSportswear) {
    preferredTemperature = 30;
  }

  if (onlyCottonCategories &&
      onlyWhites &&
      soil === "heavy") {
    preferredTemperature = 60;
  }

  const lowestCareTemperature = Math.min(
    ...items.map(item => item.care)
  );

  const temperature = Math.min(
    preferredTemperature,
    lowestCareTemperature
  );

  let spin = 800;

  if (hasWool) {
    spin = 400;
  } else if (program === "Cotton") {
    spin = 1000;
  }

  const warnings = [];
  const tips = [];


  if (weight > MAX_CAPACITY) {
    warnings.push(
      "The estimated load exceeds 7 kg. Split it into smaller loads."
    );
  }

  if (colors.has("white") && colors.has("dark")) {
    warnings.push(
      "White and dark clothes should be washed separately."
    );
  }


  if (hasWool && types.size > 1) {
    warnings.push(
      "Wool should be separated from other garment types."
    );
  }

  if (hasSportswear &&
      (types.has("towel") || types.has("jeans"))) {
    warnings.push(
      "Wash sportswear separately from towels or jeans."
    );
  }

  if (temperature < preferredTemperature) {
    tips.push(
      "Temperature was reduced to respect the care labels."
    );
  }

  if (hasWool) {
    tips.push(
      "Use wool-safe detergent and check for hand-wash-only labels."
    );
  } else if (hasSportswear) {
    tips.push(
      "Avoid fabric softener on performance sportswear."
    );
  } else {
    tips.push(
      "Choose a suitable detergent for the fabric and colors."
    );
  }

  if (colors.has("dark")) {
    tips.push(
      "Turn dark clothes inside out to help protect their color."
    );
  }

  if (soil === "heavy" && temperature <= 30) {
    tips.push(
      "Pretreat heavy stains before washing at low temperature."
    );
  }

  tips.push(
    "Always check the manufacturer's full care instructions."
  );

  return {
    program: program,
    temperature: temperature,
    spin: spin,
    weight: weight,
    count: count,
    warnings: warnings,
    tips: tips
  };
}

function generatePlan() {
  if (basket.length === 0) {
    showMessage(
      "Please add at least one garment first.",
      "error"
    );
    return;
  }

  const soil = element("soilInput").value;

  currentPlan = createWashPlan(basket, soil);

  element("resultEmpty").classList.add("is-hidden");
  element("resultContent").classList.remove("is-hidden");

  const status = element("planStatus");

  if (currentPlan.warnings.length > 0) {
    status.textContent = "⚠ Review this load";
    status.className = "status warning";
  } else {
    status.textContent = "✓ Plan ready";
    status.className = "status good";
  }

  element("planProgram").textContent = currentPlan.program;

  element("planDescription").textContent =
    "Recommended settings based on your selected garments.";

  element("planTemperature").textContent =
    currentPlan.temperature + "°C";

  element("planSpin").textContent =
    currentPlan.spin + " RPM";

  element("planWeight").textContent =
    currentPlan.weight.toFixed(1) + " kg";

  const notesList = element("planNotes");
  notesList.innerHTML = "";

  currentPlan.warnings.forEach(warning => {
    const note = document.createElement("li");
    note.className = "note-warning";
    note.textContent = warning;
    notesList.appendChild(note);
  });

  currentPlan.tips.forEach(tip => {
    const note = document.createElement("li");
    note.textContent = tip;
    notesList.appendChild(note);
  });

  element("savePlanBtn").disabled = false;
  element("savePlanBtn").textContent = "Save This Plan";
  element("saveMessage").textContent = "";

  showMessage("");

  element("resultContent").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function savePlan() {
  if (!currentPlan) return;

  const savedPlan = {
    ...currentPlan,
    id: createId(),
    date: new Date().toLocaleString("en-GB")
  };

  savedPlans.unshift(savedPlan);

  const stored = storeData(
    "washpilot-plans-v1",
    savedPlans
  );

  renderSavedPlans();

  element("savePlanBtn").disabled = true;
  element("savePlanBtn").textContent = "✓ Saved";

  const message = element("saveMessage");

  message.textContent = stored
    ? "Your wash plan has been saved."
    : "Saved for this session only. Browser storage is unavailable.";

  message.className =
    "form-message " + (stored ? "success" : "error");
}

function renderSavedPlans() {
  const list = element("savedList");
  list.innerHTML = "";

  if (savedPlans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-saved";
    empty.textContent = "No saved plans yet.";
    list.appendChild(empty);
    return;
  }

  savedPlans.forEach(plan => {
    const row = document.createElement("div");
    row.className = "saved-item";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent =
      plan.program + " · " + plan.temperature + "°C";

    const info = document.createElement("small");
    info.textContent =
      plan.date + " · " +
      plan.count + " items · " +
      Number(plan.weight).toFixed(1) + " kg";

    details.append(title, info);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-btn";
    removeButton.textContent = "Delete";
    removeButton.dataset.delete = plan.id;

    row.append(details, removeButton);
    list.appendChild(row);
  });
}

element("savedList").addEventListener("click", event => {
  const button = event.target.closest("button[data-delete]");

  if (!button) return;

  const index = savedPlans.findIndex(
    plan => plan.id === button.dataset.delete
  );

  if (index !== -1) {
    savedPlans.splice(index, 1);
    storeData("washpilot-plans-v1", savedPlans);
    renderSavedPlans();
  }
});

function clearSavedPlans() {
  savedPlans.length = 0;

  storeData("washpilot-plans-v1", savedPlans);
  renderSavedPlans();
}

function setTheme(isDark) {
  document.documentElement.dataset.theme =
    isDark ? "dark" : "light";

  element("themeToggle").textContent =
    isDark ? "☀️ Light" : "🌙 Dark";
}

function toggleTheme() {
  const isDark =
    document.documentElement.dataset.theme !== "dark";

  setTheme(isDark);

  try {
    localStorage.setItem(
      "washpilot-theme-v1",
      isDark ? "dark" : "light"
    );
  } catch (error) {
    
  }
}

element("addBtn").addEventListener("click", addGarment);

element("clearBasketBtn").addEventListener(
  "click",
  clearBasket
);

element("generateBtn").addEventListener(
  "click",
  generatePlan
);

element("savePlanBtn").addEventListener(
  "click",
  savePlan
);

element("clearSavedBtn").addEventListener(
  "click",
  clearSavedPlans
);

element("themeToggle").addEventListener(
  "click",
  toggleTheme
);

element("soilInput").addEventListener(
  "change",
  resetResult
);

let initialDarkTheme = false;

try {
  initialDarkTheme =
    localStorage.getItem("washpilot-theme-v1") === "dark";
} catch (error) {
  initialDarkTheme = false;
}

setTheme(initialDarkTheme);
renderBasket();
renderSavedPlans();

console.log("WashPilot initialized successfully.");
