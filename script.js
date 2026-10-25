// ========================================================
// ROBS COOKIES
// Cart, checkout ke Google Apps Script, navigasi,
// FAQ, scroll reveal, dan efek visual.
// ========================================================

// Ganti dengan URL Web App Apps Script Anda yang berakhiran /exec.
const CHECKOUT_ENDPOINT =
  "/api/checkout";

let cartItems = [];

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
});

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

  cartBtn?.addEventListener("click", openCart);
  closeBtn?.addEventListener("click", closeCart);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeCart();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCart();
  });
}

// ========================================================
// Checkout dengan format request Apps Script:
// { action: "createOrder", order: { customer, buyerEmail, items } }
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

    if (CHECKOUT_ENDPOINT.includes("ID_DEPLOYMENT_ANDA")) {
      showCheckoutMessage(
        "Isi URL Web App Apps Script di CHECKOUT_ENDPOINT pada script.js.",
        "error"
      );
      return;
    }

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
      /*
       * Apps Script Web App tidak menyediakan endpoint OPTIONS khusus.
       * text/plain membantu browser mengirim POST tanpa preflight CORS.
       * Isi request tetap JSON dan dibaca melalui postData.contents.
       */
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Respons Apps Script tidak terbaca. Periksa URL dan akses deployment."
        );
      }

      if (!response.ok || result.ok !== true) {
        throw new Error(
          result.error || "Pesanan gagal dikirim. Silakan coba lagi."
        );
      }

      const orderId =
        result.order && result.order.id
          ? ` Nomor pesanan: ${result.order.id}.`
          : "";

      const emailMessage =
        result.emailSent === false
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
          : "Tidak dapat menghubungi Apps Script. Silakan coba lagi.",
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
  element.classList.add(
    type === "success" ? "is-success" : "is-error"
  );
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

      if (imageBox) {
        imageBox.style.transform = "translateZ(20px)";
      }
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(800px) rotateX(0deg) rotateY(0deg) " +
        "translateY(0) scale3d(1, 1, 1)";

      if (imageBox) {
        imageBox.style.transform = "translateZ(0)";
      }
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
    elements.forEach(element => {
      element.classList.add("is-visible");
    });
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

function addSingleToCart(name, price, event) {
  const productName = String(name || "").trim();
  const productPrice = Number(price);

  if (
    !productName ||
    !Number.isFinite(productPrice) ||
    productPrice < 0
  ) {
    return;
  }

  const existingItem = cartItems.find(
    item => item.name === productName
  );

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cartItems.push({
      name: productName,
      price: productPrice,
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

  item.qty += Number(change) || 0;

  if (item.qty <= 0) {
    cartItems.splice(index, 1);
  }

  renderCartDrawer();
}

function renderCartDrawer() {
  const listElement = document.getElementById("drawerItemsList");
  const countElement = document.getElementById("drawerCount");
  const badgeElement = document.getElementById("cartBadge");
  const subtotalElement = document.getElementById("drawerSubtotal");

  if (!listElement) return;

  const count = cartItems.reduce(
    (sum, item) => sum + item.qty,
    0
  );

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