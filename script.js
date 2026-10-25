// ========================================================
// MOON SOFTCOOKIES
// Produk dari Google Sheets melalui /api/product,
// checkout melalui /api/checkout, keranjang, navigasi,
// FAQ, scroll reveal, dan efek visual.
// ========================================================

const CHECKOUT_ENDPOINT = "/api/checkout";
const PRODUCTS_ENDPOINT = "/api/product";
const FALLBACK_PRODUCTS_ENDPOINT = "/api/products";

let cartItems = [];
let productsByName = new Map();

document.addEventListener("DOMContentLoaded", () => {
  initMobileDrawer();
  initCartDrawer();
  initCheckoutForm();
  initFaqAccordion();
  initNavbarScroll();
  initHero3DParallax();
  initCard3DTilt();
  initScrollReveal();
  renderCartDrawer();
  loadProducts();
});

// ========================================================
// Sinkronisasi katalog dari database
// ========================================================

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  const message = document.getElementById("productLoadMessage");

  if (!grid) {
    console.error('Elemen dengan id="productGrid" tidak ditemukan.');
    return;
  }

  if (message) message.textContent = "";
  grid.innerHTML = `
    <div class="product-loading">
      <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
      Memuat produk dari database...
    </div>
  `;

  try {
    let response = await fetch(PRODUCTS_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (response.status === 404) {
      response = await fetch(FALLBACK_PRODUCTS_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
    }

    const result = await response.json();

    if (!response.ok || result.ok !== true || !Array.isArray(result.products)) {
      throw new Error(result.error || `Gagal memuat produk (status ${response.status})`);
    }

    const products = result.products
      .filter(product =>
        product &&
        String(product.name || "").trim() &&
        Number.isFinite(Number(product.price)) &&
        product.active !== false
      )
      .map(product => ({
        name: String(product.name).trim(),
        category: String(product.category || "").trim(),
        price: Number(product.price),
        stock: Math.max(0, Number(product.stock) || 0),
        active: product.active !== false,
        image: product.image || product.photo || product.img || null
      }));

    productsByName = new Map(
      products.map(product => [
        normalizeProductName(product.name),
        product
      ])
    );

    renderProducts(products);
  } catch (error) {
    console.error("Gagal memuat produk dari database:", error);
    grid.innerHTML = `
      <div class="product-loading is-error">
        <i class="fa-solid fa-circle-exclamation" style="margin-right: 8px;"></i>
        ${escapeHtml(error.message || "Produk gagal dimuat dari database.")}
      </div>
    `;
  }
}

function getDefaultProductImage(name, index) {
  const norm = normalizeProductName(name);
  if (norm.includes("choco") || norm.includes("cokelat")) {
    return "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80";
  }
  if (norm.includes("red velvet")) {
    return "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=400&q=80";
  }
  if (norm.includes("matcha") || norm.includes("green tea")) {
    return "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80";
  }
  if (norm.includes("butter") || norm.includes("honey") || norm.includes("glaze")) {
    return "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=400&q=80";
  }
  const fallbackList = [
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=400&q=80"
  ];
  return fallbackList[index % fallbackList.length];
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const message = document.getElementById("productLoadMessage");

  if (!grid) return;

  if (products.length === 0) {
    if (message) message.textContent = "Belum ada produk aktif.";
    return;
  }

  if (message) message.textContent = "";

  grid.innerHTML = products.map((product, index) => {
    const soldOut = product.stock <= 0;
    const photoUrl = product.image || getDefaultProductImage(product.name, index);
    const delayClass = index > 0 ? ` delay-${Math.min(index, 5)}` : "";

    return `
      <article class="product-item-card reveal-on-scroll${delayClass}">
        <div class="card-glare"></div>
        <div class="prod-img-box">
          <img
            class="prod-photo"
            src="${escapeHtml(photoUrl)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
          >
        </div>
        <div class="prod-info">
          <h4>${escapeHtml(product.name)}</h4>
          <div class="prod-bottom">
            <span class="prod-price">${formatRupiah(product.price)}</span>
            <button
              class="btn-cart-add"
              type="button"
              data-product-name="${escapeHtml(product.name)}"
              ${soldOut ? "disabled" : ""}
              aria-label="${
                soldOut
                  ? `Stok ${escapeHtml(product.name)} habis`
                  : `Tambah ${escapeHtml(product.name)} ke keranjang`
              }"
            >${soldOut ? "✕" : "+"}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".btn-cart-add[data-product-name]").forEach(button => {
    button.addEventListener("click", event => {
      addProductToCart(button.dataset.productName, event);
    });
  });

  initCard3DTilt();
  initScrollReveal();
}

function normalizeProductName(name) {
  return String(name || "")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function addSingleToCart(name, price, event) {
  addProductToCart(name, event);
}
window.addSingleToCart = addSingleToCart;

// ========================================================
// Navigasi mobile
// ========================================================

function initMobileDrawer() {
  const toggleBtn = document.getElementById("mobileMenuBtn");
  const drawer = document.getElementById("mobileDrawer");

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener("click", event => {
    event.stopPropagation();

    const isOpen = drawer.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  drawer
    .querySelectorAll(".mobile-link, .mobile-staff-btn")
    .forEach(link => {
      link.addEventListener("click", () => {
        drawer.classList.remove("open");
        toggleBtn.setAttribute("aria-expanded", "false");
      });
    });

  document.addEventListener("click", event => {
    if (!drawer.contains(event.target) && !toggleBtn.contains(event.target)) {
      drawer.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });
}

// ========================================================
// Buka dan tutup drawer keranjang
// ========================================================

function initCartDrawer() {
  const cartBtn = document.getElementById("cartOpenBtn");
  const overlay = document.getElementById("cartOverlay");
  const closeBtn = document.getElementById("closeCartBtn");

  if (!overlay) return;

  function openCart() {
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (cartBtn) cartBtn.addEventListener("click", openCart);
  if (closeBtn) closeBtn.addEventListener("click", closeCart);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeCart();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCart();
  });
}

// ========================================================
// Checkout
// Apps Script menghitung ulang harga dan stok dari sheet.
// Browser hanya mengirim nama produk dan jumlah.
// ========================================================

function initCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (cartItems.length === 0) {
      showCheckoutMessage(
        "Keranjang masih kosong. Tambahkan produk terlebih dahulu.",
        "error"
      );
      return;
    }

    if (!form.reportValidity()) return;

    const formData = new FormData(form);

    const payload = {
      action: "createOrder",
      order: {
        customer: String(formData.get("customer") || "").trim(),
        buyerEmail: String(formData.get("buyerEmail") || "")
          .trim()
          .toLowerCase(),
        items: cartItems.map(item => ({
          name: item.name,
          qty: item.qty
        }))
      }
    };

    const submitButton = document.getElementById("checkoutSubmitBtn");
    const originalText = submitButton
      ? submitButton.textContent
      : "KIRIM PESANAN";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "MENGIRIM PESANAN...";
    }

    showCheckoutMessage("", "");

    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Respons server tidak valid. Periksa konfigurasi Vercel dan Apps Script."
        );
      }

      if (!response.ok || result.ok !== true) {
        throw new Error(
          result.error || "Pesanan gagal dikirim. Silakan coba lagi."
        );
      }

      const orderId = result.order && result.order.id
        ? ` Nomor pesanan: ${result.order.id}.`
        : "";

      const emailMessage = result.emailSent === false
        ? " Pesanan tersimpan, tetapi email konfirmasi gagal dikirim."
        : " Konfirmasi akan dikirim ke email Anda.";

      showCheckoutMessage(
        `Pesanan berhasil dibuat.${orderId}${emailMessage}`,
        "success"
      );

      cartItems = [];
      renderCartDrawer();
      form.reset();

      window.setTimeout(() => {
        const overlay = document.getElementById("cartOverlay");

        if (overlay) {
          overlay.classList.remove("open");
          overlay.setAttribute("aria-hidden", "true");
        }

        document.body.style.overflow = "";
      }, 4000);
    } catch (error) {
      showCheckoutMessage(
        error && error.message
          ? error.message
          : "Tidak dapat menghubungi server. Silakan coba lagi.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

function showCheckoutMessage(message, type) {
  const element = document.getElementById("checkoutMessage");
  if (!element) return;

  element.textContent = message;
  element.className = "checkout-message";

  if (!message) return;

  element.classList.add("is-visible");
  element.classList.add(type === "success" ? "is-success" : "is-error");
}

// ========================================================
// Navbar scroll dan highlight bagian aktif
// ========================================================

function initNavbarScroll() {
  const navbar = document.querySelector(".navbar");
  const navItems = document.querySelectorAll(".nav-menu .nav-item");
  const mobileLinks = document.querySelectorAll(
    ".mobile-drawer .mobile-link"
  );
  const sections = document.querySelectorAll("main section[id]");

  if (!navbar) return;

  function updateNavbar() {
    const scrollPosition = window.scrollY;
    navbar.classList.toggle("scrolled", scrollPosition > 25);

    let currentSectionId = "";

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 130;
      const sectionBottom = sectionTop + section.offsetHeight;

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionBottom
      ) {
        currentSectionId = section.id;
      }
    });

    if (!currentSectionId) return;

    navItems.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentSectionId}`
      );
    });

    mobileLinks.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentSectionId}`
      );
    });
  }

  window.addEventListener("scroll", updateNavbar, { passive: true });
  updateNavbar();
}

// ========================================================
// Efek parallax hero
// ========================================================

function initHero3DParallax() {
  const heroSection = document.querySelector(".hero-section");
  const platterDish = document.querySelector(".platter-dish");
  const dishGlare = document.getElementById("dishGlare");
  const floatingElements = document.querySelectorAll(
    ".floating-badge, .floating-crumb, .floating-promo-card"
  );

  if (!heroSection || !platterDish) return;

  let ticking = false;

  heroSection.addEventListener("mousemove", event => {
    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      const rect = heroSection.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        ticking = false;
        return;
      }

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const tiltX = -y * 18;
      const tiltY = x * 18;

      platterDish.style.transform =
        `perspective(900px) rotateX(${tiltX}deg) ` +
        `rotateY(${tiltY}deg) scale3d(1.03, 1.03, 1.03)`;

      platterDish.style.boxShadow =
        `${-tiltY * 2.8}px ${Math.abs(tiltX) * 2.2 + 25}px ` +
        "65px rgba(41, 33, 29, 0.32), 0 10px 22px rgba(41, 33, 29, 0.14)";

      if (dishGlare) {
        const glareX = 50 + tiltY * 2.2;
        const glareY = 50 - tiltX * 2.2;

        dishGlare.style.background =
          `radial-gradient(circle at ${glareX}% ${glareY}%, ` +
          "rgba(255, 255, 255, 0.38) 0%, transparent 60%)";
      }

      floatingElements.forEach(element => {
        const depth =
          parseFloat(element.getAttribute("data-depth")) || 1.5;

        const moveX = x * depth * 38;
        const moveY = y * depth * 38;
        const rotation = x * depth * 8;

        element.style.transform =
          `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, ` +
          `${depth * 25}px) rotate(${rotation.toFixed(1)}deg)`;
      });

      ticking = false;
    });
  });

  heroSection.addEventListener("mouseleave", () => {
    platterDish.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    platterDish.style.boxShadow = "";

    if (dishGlare) {
      dishGlare.style.background =
        "radial-gradient(circle at 40% 30%, " +
        "rgba(255, 255, 255, 0.28) 0%, transparent 60%)";
    }

    floatingElements.forEach(element => {
      element.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    });
  });
}

// ========================================================
// Efek tilt kartu produk
// ========================================================

function initCard3DTilt() {
  const cards = document.querySelectorAll(
    ".product-item-card, .recipe-card, .vertical-promo-banner"
  );

  cards.forEach(card => {
    if (card.dataset.tiltInitialized === "true") return;
    card.dataset.tiltInitialized = "true";

    const glare = card.querySelector(".card-glare");
    const imageBox = card.querySelector(".prod-img-box");

    card.addEventListener("mousemove", event => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (!centerX || !centerY) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y - centerY) / centerY) * -12;
      const rotateY = ((x - centerX) / centerX) * 12;

      card.style.transform =
        `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) ` +
        `rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) ` +
        "scale3d(1.02, 1.02, 1.02)";

      if (glare) {
        glare.style.background =
          `radial-gradient(circle at ${x}px ${y}px, ` +
          "rgba(255, 255, 255, 0.45) 0%, transparent 65%)";
      }

      if (imageBox) imageBox.style.transform = "translateZ(20px)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(800px) rotateX(0deg) rotateY(0deg) " +
        "translateY(0) scale3d(1, 1, 1)";

      if (imageBox) imageBox.style.transform = "translateZ(0)";
      if (glare) glare.style.background = "transparent";
    });
  });
}

// ========================================================
// Scroll reveal
// ========================================================

function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal-on-scroll");
  if (!elements.length) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  elements.forEach(element => observer.observe(element));
}

// ========================================================
// Operasi keranjang
// ========================================================

function addProductToCart(name, event) {
  const key = normalizeProductName(name);
  const product = productsByName.get(key);

  if (!product || !product.active) return;

  const existingItem = cartItems.find(
    item => normalizeProductName(item.name) === key
  );

  const currentQty = existingItem ? existingItem.qty : 0;

  if (currentQty >= product.stock) {
    showCheckoutMessage(
      `Stok ${product.name} tidak mencukupi.`,
      "error"
    );
    return;
  }

  if (existingItem) {
    existingItem.qty += 1;
    existingItem.price = product.price;
  } else {
    cartItems.push({
      name: product.name,
      price: product.price,
      qty: 1
    });
  }

  if (event) showFloatingPlusOne(event);

  const badge = document.getElementById("cartBadge");

  if (badge) {
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }

  renderCartDrawer();
}

function updateCartQty(index, change) {
  const item = cartItems[index];
  if (!item) return;

  const product = productsByName.get(normalizeProductName(item.name));
  const nextQty = item.qty + (Number(change) || 0);

  if (nextQty <= 0) {
    cartItems.splice(index, 1);
    renderCartDrawer();
    return;
  }

  if (product && nextQty > product.stock) {
    showCheckoutMessage(
      `Stok ${product.name} tidak mencukupi.`,
      "error"
    );
    return;
  }

  item.qty = nextQty;
  renderCartDrawer();
}

function renderCartDrawer() {
  const listElement = document.getElementById("drawerItemsList");
  const countElement = document.getElementById("drawerCount");
  const badgeElement = document.getElementById("cartBadge");
  const subtotalElement = document.getElementById("drawerSubtotal");

  if (!listElement) return;

  const count = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  if (countElement) countElement.textContent = String(count);
  if (badgeElement) badgeElement.textContent = String(count);

  if (subtotalElement) {
    subtotalElement.textContent = formatRupiah(subtotal);
  }

  if (cartItems.length === 0) {
    listElement.innerHTML =
      '<p class="empty-cart-message">' +
      "Keranjang belanja Anda masih kosong." +
      "</p>";
    return;
  }

  listElement.innerHTML = cartItems
    .map((item, index) => `
      <div class="drawer-item-row">
        <div class="drawer-item-info">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${formatRupiah(item.price)} / buah</span>
        </div>

        <div class="drawer-qty-ctrl">
          <button
            class="btn-qty"
            type="button"
            data-cart-index="${index}"
            data-cart-change="-1"
            aria-label="Kurangi ${escapeHtml(item.name)}"
          >−</button>

          <span class="cart-item-qty">${item.qty}</span>

          <button
            class="btn-qty"
            type="button"
            data-cart-index="${index}"
            data-cart-change="1"
            aria-label="Tambah ${escapeHtml(item.name)}"
          >+</button>
        </div>
      </div>
    `)
    .join("");

  listElement.querySelectorAll("[data-cart-index]").forEach(button => {
    button.addEventListener("click", () => {
      updateCartQty(
        Number(button.dataset.cartIndex),
        Number(button.dataset.cartChange)
      );
    });
  });
}

function showFloatingPlusOne(event) {
  const x = event.clientX || window.innerWidth / 2;
  const y = event.clientY || window.innerHeight / 2;

  const plusOne = document.createElement("div");
  plusOne.className = "cart-particle";
  plusOne.textContent = "+1";
  plusOne.style.left = `${x - 14}px`;
  plusOne.style.top = `${y - 28}px`;
  document.body.appendChild(plusOne);

  window.setTimeout(() => plusOne.remove(), 750);

  const colors = [
    "#DF6836",
    "#F59E0B",
    "#E39D62",
    "#78350F",
    "#FFE0B2"
  ];

  for (let index = 0; index < 10; index++) {
    const crumb = document.createElement("div");
    const angle =
      (Math.PI * 2 * index) / 10 +
      (Math.random() - 0.5) * 0.5;
    const distance = Math.floor(Math.random() * 45) + 30;

    crumb.className = "burst-crumb";
    crumb.style.width = `${Math.floor(Math.random() * 6) + 4}px`;
    crumb.style.height = crumb.style.width;
    crumb.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    crumb.style.left = `${x}px`;
    crumb.style.top = `${y}px`;
    crumb.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    crumb.style.setProperty(
      "--ty",
      `${Math.sin(angle) * distance + 18}px`
    );
    crumb.style.setProperty(
      "--rot",
      `${(Math.random() - 0.5) * 360}deg`
    );

    document.body.appendChild(crumb);
    window.setTimeout(() => crumb.remove(), 750);
  }
}

// ========================================================
// FAQ accordion
// ========================================================

function initFaqAccordion() {
  const items = document.querySelectorAll(".acc-item");

  items.forEach(item => {
    const trigger = item.querySelector(".acc-trigger");
    if (!trigger) return;

    trigger.addEventListener("click", () => {
      const wasOpen = item.classList.contains("active");

      items.forEach(otherItem => {
        otherItem.classList.remove("active");

        const otherTrigger = otherItem.querySelector(".acc-trigger");
        if (otherTrigger) {
          otherTrigger.setAttribute("aria-expanded", "false");
        }
      });

      if (!wasOpen) {
        item.classList.add("active");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });
}

// ========================================================
// Helpers
// ========================================================

function formatRupiah(value) {
  return "Rp " +
    new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

// Fallback otomatis jika ada gambar yang gagal dimuat dari jaringan
window.addEventListener("error", event => {
  if (event.target && event.target.tagName === "IMG") {
    const img = event.target;
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = "true";
      img.src = "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80";
    }
  }
}, true);