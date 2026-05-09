const menuToggle = document.querySelector("#menu-toggle");
const newsletterForm = document.querySelector("#email-form");
const newsletterMessage = document.querySelector("#form-message");
const franchiseForm = document.querySelector(".franchise-form");
const menuGrid = document.querySelector("#menu-grid");
const orderForm = document.querySelector("#order-form");
const orderSelect = document.querySelector("#order-item");
const orderMessage = document.querySelector("#order-message");

let menuItems = [];

async function apiRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Something went wrong");
  }
  return result;
}

function showMessage(element, text) {
  element.textContent = text;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 4500);
}

function renderMenu(items) {
  menuGrid.innerHTML = items
    .map(
      (item) => `
        <article class="menu-card">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <span>${item.tag}</span>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <strong class="menu-price">Rs. ${item.price}</strong>
          </div>
        </article>
      `
    )
    .join("");

  orderSelect.innerHTML = '<option value="">Select menu item</option>';
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = `${item.name} - Rs. ${item.price}`;
    orderSelect.appendChild(option);
  });
}

async function loadMenu() {
  try {
    const response = await fetch("/api/menu");
    menuItems = await response.json();
    renderMenu(menuItems);
  } catch (error) {
    console.warn("Menu API unavailable. Static menu remains visible.");
  }
}

document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.checked = false;
  });
});

newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = newsletterForm.querySelector("input").value;

  try {
    await apiRequest("/api/newsletter", { email });
    newsletterForm.reset();
    showMessage(newsletterMessage, "Thanks, you are on the list.");
  } catch (error) {
    showMessage(newsletterMessage, error.message);
  }
});

franchiseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = franchiseForm.querySelector("button");
  const [firstName, secondName, contact, email, market] = franchiseForm.querySelectorAll("input");
  const message = franchiseForm.querySelector("textarea");

  try {
    await apiRequest("/api/franchise", {
      firstName: firstName.value,
      secondName: secondName.value,
      contact: contact.value,
      email: email.value,
      market: market.value,
      message: message.value
    });
    button.textContent = "Request Sent";
    franchiseForm.reset();
  } catch (error) {
    button.textContent = error.message;
  }

  setTimeout(() => {
    button.textContent = "Send Request";
  }, 4500);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await apiRequest("/api/orders", {
      item: orderSelect.value,
      name: document.querySelector("#order-name").value,
      phone: document.querySelector("#order-phone").value,
      address: document.querySelector("#order-address").value
    });
    orderForm.reset();
    showMessage(orderMessage, "Order saved successfully.");
  } catch (error) {
    showMessage(orderMessage, error.message);
  }
});

loadMenu();
