// ==========================================================
// This file only contains functionality (cart, checkout, popup,
// search, video autoplay). It has no photos, names or prices.
// Edit all of those directly in index.html.
// ==========================================================

// ===== HELPERS =====
function $(id) {
  return document.getElementById(id);
}

function money(n) {
  return "KSh " + n.toLocaleString("en-US");
}

// ===== ORDER DETAILS (set on the <body> tag in index.html) =====
const WA = document.body.dataset.whatsapp;
const EMAIL = document.body.dataset.email;

// Finish options. A product offers both only if it has data-framed.
const NORMAL = "Normal print";
const FRAMED = "Framed";

// Turns "A4:1500,A3:2200" into { A4: 1500, A3: 2200 }
function parsePrices(text) {
  const prices = {};
  if (text) {
    text.split(",").forEach((pair) => {
      const [name, price] = pair.split(":");
      prices[name.trim()] = parseInt(price, 10) || 0;
    });
  }
  return prices;
}

// ===== READ PRODUCTS FROM THE PAGE =====
// Each card in the Shop (#cards) and Shop by feel (#feels) sections becomes
// a product the popup and cart can use.
// data-sizes = normal print prices, data-framed = framed prices.
const products = {};

document.querySelectorAll("#cards .pc, #feels .pc").forEach((el) => {
  const sizes = parsePrices(el.dataset.sizes);
  const framed = parsePrices(el.dataset.framed);
  const sizeNames = Object.keys(sizes);
  const extraPhotos = el.dataset.photos
    ? el.dataset.photos.split("|").map((src) => src.trim())
    : [];

  products[el.dataset.id] = {
    id: el.dataset.id,
    name: el.querySelector(".pi b").textContent.trim(),
    // Products with sizes use the first size's price as the default.
    // Products without sizes use data-price.
    price: sizeNames.length
      ? sizes[sizeNames[0]]
      : parseInt(el.dataset.price, 10) || 0,
    old: parseInt(el.dataset.old, 10) || 0,
    photos: [el.querySelector("img").getAttribute("src")].concat(extraPhotos),
    sizes: sizes,
    framed: framed,
    desc: el.dataset.desc || "",
  };
});

function find(id) {
  return products[id];
}

// Price of one piece for the chosen size and finish
function unit(p, size, fin) {
  const table = fin === FRAMED ? p.framed : p.sizes;
  if (size && table[size] !== undefined) return table[size];
  return size && p.sizes[size] !== undefined ? p.sizes[size] : p.price;
}

// ===== CATEGORY BUTTONS AND SEARCH =====
let cat = "All";
let qs = "";

function setTab(name) {
  cat = name;
  document.querySelectorAll("#tabs .tab").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.c === name);
  });
}

function draw() {
  let shown = 0;

  document.querySelectorAll("#cards .pc").forEach((el) => {
    const name = el.querySelector(".pi b").textContent.toLowerCase();
    const match =
      (cat === "All" || el.dataset.cat === cat) && name.indexOf(qs) > -1;

    el.style.display = match ? "" : "none";
    if (match) shown++;
  });

  $("nores").style.display = shown ? "none" : "";
}

// ===== OPEN / CLOSE PANELS =====
function lock() {
  const allClosed = $("menu").hidden && $("cart").hidden && $("pm").hidden;
  document.body.style.overflow = allClosed ? "" : "hidden";
}

function show(id, visible) {
  $(id).hidden = !visible;
  if (id == "menu") $("mo").setAttribute("aria-expanded", visible);
  if (id == "cart" && visible) step(1); // the cart always opens on the item list
  lock();
}

// ===== PRODUCT POPUP =====
let cur = null; // product being viewed
let curSize = ""; // size chosen in the popup
let curFin = ""; // finish chosen in the popup ("" if the product has none)
let ix = 0; // photo number being shown
let mq = 1; // quantity chosen

function photo() {
  $("pi").src = cur.photos[ix];
}

// Updates the price shown in the popup for the chosen size and quantity
function updatePrice() {
  // Size buttons show the price for the chosen finish
  document.querySelectorAll("#pmb .szb[data-size]").forEach((btn) => {
    btn.querySelector("span").textContent = money(
      unit(cur, btn.dataset.size, curFin),
    );
  });

  const u = unit(cur, curSize, curFin);
  $("pp").textContent = money(u * mq);
  $("pn").textContent = mq > 1 ? mq + " x " + money(u) : "";
  if ($("po")) $("po").hidden = mq > 1;
}

function openP(id) {
  const p = find(id);
  if (!p) return;

  const sizeNames = Object.keys(p.sizes);
  cur = p;
  curSize = sizeNames[0] || "";
  curFin = Object.keys(p.framed).length ? NORMAL : "";
  ix = 0;
  mq = 1;
  show("menu", false);

  const sizeField = sizeNames.length
    ? '<div><div class="lbl">Choose a size</div><div class="szs">' +
      sizeNames
        .map(
          (k, i) =>
            '<button type="button" class="szb" data-size="' +
            k +
            '" aria-pressed="' +
            (i === 0) +
            '"><b>' +
            k +
            "</b><span>" +
            money(p.sizes[k]) +
            "</span></button>",
        )
        .join("") +
      "</div></div>"
    : "";

  const finishField = curFin
    ? '<div><div class="lbl">Finish</div><div class="szs">' +
      '<button type="button" class="szb" data-fin="' +
      NORMAL +
      '" aria-pressed="true"><b>' +
      NORMAL +
      "</b><span>Print only</span></button>" +
      '<button type="button" class="szb" data-fin="' +
      FRAMED +
      '" aria-pressed="false"><b>' +
      FRAMED +
      "</b><span>With frame</span></button>" +
      "</div></div>"
    : "";

  const oldPrice =
    !sizeNames.length && p.old
      ? ' <s id="po" style="color:var(--gold);font-weight:800">' +
        money(p.old) +
        "</s>"
      : "";

  const arrows =
    p.photos.length > 1
      ? '<button class="n l" data-d="-1" aria-label="Previous photo">&lsaquo;</button>' +
        '<button class="n r" data-d="1" aria-label="Next photo">&rsaquo;</button>'
      : "";

  $("pmb").innerHTML =
    '<div class="ph"><img id="pi" alt="' +
    p.name +
    '">' +
    arrows +
    "</div>" +
    '<div style="display:grid;gap:1rem;align-content:start">' +
    '<h2 style="text-align:left;font-size:1.8rem">' +
    p.name +
    "</h2>" +
    '<div><span id="pp" style="font-size:1.3rem;font-weight:800"></span>' +
    oldPrice +
    ' <span id="pn" style="color:var(--muted);font-size:.9rem"></span></div>' +
    '<p style="color:var(--muted);margin:0">' +
    p.desc +
    "</p>" +
    finishField +
    sizeField +
    '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">' +
    '<div class="q">' +
    '<button data-q="-1" aria-label="Less">&minus;</button>' +
    '<span id="qn">1</span>' +
    '<button data-q="1" aria-label="More">+</button>' +
    "</div>" +
    '<button class="pill" id="add">Add to cart</button>' +
    "</div></div>";

  photo();
  updatePrice();
  show("pm", true);
}

// ===== CART =====
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem("rr_cart") || "[]");
} catch (e) {}

function total() {
  return cart.reduce((sum, item) => {
    const p = find(item.id);
    return sum + unit(p, item.sz, item.fin) * item.q;
  }, 0);
}

function renderCart() {
  // Drop anything in the saved cart that is no longer in the shop
  cart = cart.filter((item) => find(item.id));

  $("cn").textContent = cart.reduce((sum, item) => sum + item.q, 0);

  $("cl").innerHTML = cart.length
    ? cart
        .map((item, k) => {
          const p = find(item.id);
          return (
            '<div class="ci">' +
            '<img src="' +
            p.photos[0] +
            '" alt="">' +
            "<div>" +
            '<b style="text-transform:uppercase;font-size:.85rem">' +
            p.name +
            "</b>" +
            '<div style="color:var(--muted);font-size:.85rem">' +
            (item.sz ? "Size " + item.sz + " &middot; " : "") +
            (item.fin ? item.fin + " &middot; " : "") +
            money(unit(p, item.sz, item.fin)) +
            "</div>" +
            '<div style="display:flex;gap:1rem;align-items:center;margin-top:.5rem">' +
            '<div class="q">' +
            '<button data-ci="' +
            k +
            '" data-d="-1" aria-label="Less">&minus;</button>' +
            "<span>" +
            item.q +
            "</span>" +
            '<button data-ci="' +
            k +
            '" data-d="1" aria-label="More">+</button>' +
            "</div>" +
            '<button class="rm" data-rm="' +
            k +
            '">Remove</button>' +
            "</div></div></div>"
          );
        })
        .join("")
    : '<p style="color:var(--muted)">Your cart is empty.</p>';

  $("ct").textContent = money(total());
  $("ck").hidden = !cart.length;

  // If the cart was emptied while checking out, go back to the item list
  if (!cart.length) step(1);

  try {
    localStorage.setItem("rr_cart", JSON.stringify(cart));
  } catch (e) {}
}

// ===== CHECKOUT =====
// Step 1 = items in the cart, step 2 = delivery details
function step(n) {
  $("cstep1").hidden = n !== 1;
  $("ckf").hidden = n !== 2;
  $("cart-title").textContent = n === 1 ? "Your cart" : "Checkout";
  $("sent").hidden = true;
  if (n === 2) renderSummary();
}

// Delivery price of the option the customer picked (from data-fee in index.html)
function deliveryFee() {
  const opt = $("zone").selectedOptions[0];
  return opt && opt.dataset.fee ? parseInt(opt.dataset.fee, 10) || 0 : 0;
}

// The order summary shown above the WhatsApp button
function renderSummary() {
  const fee = deliveryFee();
  const chosen = $("zone").value !== "";

  const items = cart
    .map((item) => {
      const p = find(item.id);
      return (
        '<div class="sl"><span>' +
        item.q +
        " x " +
        p.name +
        (item.sz || item.fin
          ? " (" + [item.sz, item.fin].filter(Boolean).join(", ") + ")"
          : "") +
        "</span><b>" +
        money(unit(p, item.sz, item.fin) * item.q) +
        "</b></div>"
      );
    })
    .join("");

  $("sum").innerHTML =
    items +
    '<div class="sl sd"><span>Subtotal</span><b>' +
    money(total()) +
    "</b></div>" +
    '<div class="sl"><span>Delivery</span><b>' +
    (chosen ? (fee ? money(fee) : "Free") : "Choose an option") +
    "</b></div>" +
    '<div class="sl st"><span>Total</span><b>' +
    money(total() + fee) +
    "</b></div>";
}

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Builds the WhatsApp message (*text* is bold in WhatsApp)
function orderMessage() {
  const f = $("ckf");
  const fee = deliveryFee();
  const lines = [
    "Hello Room Rewrite, I'd like to order:",
    "",
    "*Order details:*",
  ];

  cart.forEach((item, i) => {
    const p = find(item.id);
    const price = unit(p, item.sz, item.fin);
    lines.push(i + 1 + ". *" + p.name + "*");
    if (item.sz) lines.push("   Size: " + item.sz);
    if (item.fin) lines.push("   Finish: " + item.fin);
    lines.push(
      "   Qty: " +
        item.q +
        " x " +
        money(price) +
        " = " +
        money(price * item.q),
    );
  });

  lines.push(
    "",
    "*Delivery:*",
    "Option: " + f.elements.zone.value,
    "Location: " + f.elements.lc.value,
  );
  if (f.elements.dt.value)
    lines.push("Preferred date: " + formatDate(f.elements.dt.value));

  lines.push(
    "",
    "*Price breakdown:*",
    "Subtotal: " + money(total()),
    "Delivery: " + (fee ? money(fee) : "Free"),
    "*Total: " + money(total() + fee) + "*",
    "",
    "*Customer:*",
    "Name: " + f.elements.nm.value,
    "Phone: " + f.elements.ph.value,
  );

  if (f.elements.nt.value.trim())
    lines.push("", "*Notes:*", f.elements.nt.value.trim());

  lines.push("", "Please confirm availability and payment details. Thank you!");

  return lines.join("\n");
}

$("go").onclick = () => step(2);
$("clr").onclick = () => {
  if (confirm("Remove everything from your cart?")) {
    cart = [];
    renderCart();
  }
};
$("back").onclick = () => step(1);
$("zone").addEventListener("change", renderSummary);

// Earliest delivery date the customer can pick is today
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
$("dt").min = today.toISOString().slice(0, 10);

// The browser checks the required fields, then this opens WhatsApp
$("ckf").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cart.length) {
    step(1);
    return;
  }

  window.open(
    "https://wa.me/" + WA + "?text=" + encodeURIComponent(orderMessage()),
    "_blank",
  );
  $("sent").hidden = false;
});

// ===== CLICKS (one listener handles the whole page) =====
document.addEventListener("click", (e) => {
  const t = e.target;
  let c;

  // Clicking the dark background closes cart and product popup
  if (t.id == "cart" || t.id == "pm") {
    show(t.id, false);
    return;
  }

  // Close buttons
  if ((c = t.closest("[data-x]"))) {
    show(c.dataset.x, false);
    return;
  }

  // Any product card (shop, trending, calendar) opens the popup
  if ((c = t.closest(".pc"))) {
    e.preventDefault();
    openP(c.dataset.id);
    return;
  }

  // "View calendar" button
  if ((c = t.closest("[data-open]"))) {
    openP(c.dataset.open);
    return;
  }

  // Finish buttons in the popup (Normal print / Framed)
  if ((c = t.closest("[data-fin]"))) {
    curFin = c.dataset.fin;
    document.querySelectorAll("#pmb [data-fin]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.fin === curFin);
    });
    updatePrice();
    return;
  }

  // Size buttons in the popup
  if ((c = t.closest("[data-size]"))) {
    curSize = c.dataset.size;
    document.querySelectorAll("#pmb [data-size]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.size === curSize);
    });
    updatePrice();
    return;
  }

  // Category buttons
  if ((c = t.closest(".tab"))) {
    setTab(c.dataset.c);
    draw();
    return;
  }

  // Cart item + and -
  if ((c = t.closest("[data-ci]"))) {
    const item = cart[c.dataset.ci];
    item.q += +c.dataset.d;
    if (item.q < 1) cart.splice(c.dataset.ci, 1);
    renderCart();
    return;
  }

  // Cart item remove
  if ((c = t.closest("[data-rm]"))) {
    cart.splice(c.dataset.rm, 1);
    renderCart();
    return;
  }

  // Previous / next photo in popup
  if ((c = t.closest(".n[data-d]"))) {
    ix = (ix + +c.dataset.d + cur.photos.length) % cur.photos.length;
    photo();
    return;
  }

  // Quantity + and - in popup
  if ((c = t.closest("[data-q]"))) {
    mq = Math.max(1, mq + +c.dataset.q);
    $("qn").textContent = mq;
    updatePrice();
    return;
  }

  // Add to cart
  if (t.id == "add") {
    const existing = cart.filter(
      (i) => i.id == cur.id && i.sz == curSize && (i.fin || "") == curFin,
    )[0];

    if (existing) existing.q += mq;
    else cart.push({ id: cur.id, sz: curSize, fin: curFin, q: mq });

    renderCart();
    show("pm", false);
    show("cart", true);
    return;
  }

  // Menu links close the menu
  if (t.closest("#ml a")) show("menu", false);
});

document.addEventListener("keydown", (e) => {
  if (e.key == "Escape") {
    show("menu", false);
    show("cart", false);
    show("pm", false);
  }
});

$("mo").onclick = () => show("menu", true);
$("mc").onclick = () => show("menu", false);
$("cb").onclick = () => show("cart", true);

// ===== SEARCH =====
$("q").addEventListener("input", (e) => {
  qs = e.target.value.toLowerCase();
  setTab("All");
  draw();
});

$("q").addEventListener("keydown", (e) => {
  if (e.key == "Enter") {
    show("menu", false);
    $("shop").scrollIntoView();
  }
});

// ===== TIKTOK VIDEOS: PLAY WHEN VISIBLE =====
// The videos themselves are in index.html. This only plays and
// pauses them as you scroll. Keep "muted" on each video tag, or
// browsers will block autoplay.
const videos = document.querySelectorAll("#tt video");

if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
  videos.forEach((v) => {
    v.controls = true;
  });
} else {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      });
    },
    { threshold: 0.5 },
  );

  videos.forEach((v) => {
    videoObserver.observe(v);
    v.addEventListener("click", () => {
      v.muted = !v.muted;
    });
  });
}

// ===== REVIEWS =====
// Shown automatically once you add a <blockquote> inside #rvl in index.html
if ($("rvl").children.length) $("reviews").hidden = false;

// ===== CONTACT FORM =====
$("cf").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const body =
    "Name: " +
    f.elements.name.value +
    "\nEmail: " +
    f.elements.email.value +
    "\n\n" +
    f.elements.msg.value;

  window.location.href =
    "mailto:" +
    EMAIL +
    "?subject=" +
    encodeURIComponent("Room Rewrite enquiry") +
    "&body=" +
    encodeURIComponent(body);
});

// ===== BACK TO TOP AND YEAR =====
$("top-btn").onclick = () => window.scrollTo({ top: 0 });
$("yr").textContent = new Date().getFullYear();

// ===== START =====
draw();
renderCart();