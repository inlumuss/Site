const STRIPE_LINKS = {
  // ── Subscription Payment Links (recurring) ──────────────────
  'europe-sub':  'https://buy.stripe.com/fZu6oG0w0btMbUU5g0a7C01',
  'global-sub':  'https://buy.stripe.com/14A28q3Ic7dwcYYfUEa7C02',

  // ── Archive / One-time Payment Links ────────────────────────
  'archive-1':   'https://buy.stripe.com/fZu6oG0w0btMbUU5g0a7C01',
  'archive-2':   'https://buy.stripe.com/REPLACE_ARCHIVE_2',
  'archive-3':   'https://buy.stripe.com/REPLACE_ARCHIVE_3',
};

// Optional: set to your backend endpoint to handle mixed carts
// e.g. 'https://your-site.com/api/create-checkout-session'
const BACKEND_CHECKOUT_URL = '';

// ── Cart state ──────────────────────────────────────────────
let cart = [];

// ── Helpers ─────────────────────────────────────────────────
const isSubId   = id => id.endsWith('-sub');
const isArchive = id => id.startsWith('archive-');
const hasSub    = ()  => cart.some(i => isSubId(i.id));

function addToCart(name, price, currency, id) {
  // If adding a subscription, remove any existing subscription
  if (isSubId(id)) {
    const existing = cart.find(i => isSubId(i.id));
    if (existing) {
      if (existing.id === id) {
        showNotification('Already in your selection');
        openCart();
        return;
      }
      cart = cart.filter(i => !isSubId(i.id));
      showNotification(`Switched to ${name} ✦`);
    } else {
      showNotification('Added to your selection ✦');
    }
  } else {
    // One-time purchase — check duplicates
    if (cart.find(i => i.id === id)) {
      showNotification('Already in your selection');
      openCart();
      return;
    }
    showNotification('Added to your selection ✦');
  }

  cart.push({ id, name, price, currency });
  renderCart();
  openCart();
}

function renderCart() {
  const itemsEl    = document.getElementById('cartItems');
  const emptyEl    = document.getElementById('cartEmpty');
  const countEl    = document.getElementById('cartCount');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const subNoteEl  = document.getElementById('cartSubNote');

  countEl.textContent = cart.length;
  itemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());

  if (cart.length === 0) {
    emptyEl.style.display = '';
    document.getElementById('cartTotal').textContent = '€0.00';
    checkoutBtn.disabled = true;
    if (subNoteEl) subNoteEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  checkoutBtn.disabled = false;

  let total = 0;
  let subCount = 0;

  cart.forEach((item, idx) => {
    total += item.price;
    if (isSubId(item.id)) subCount++;

    const div = document.createElement('div');
    div.className = 'cart-item';

    const typeLabel = isSubId(item.id)
      ? '<span class="cart-item-type cart-item-type--sub">↻ Monthly subscription</span>'
      : '<span class="cart-item-type cart-item-type--once">✦ One-time purchase</span>';

    const priceLabel = isSubId(item.id)
      ? `${item.currency}${item.price.toFixed(2)}<span class="cart-item-mo">/mo</span>`
      : `${item.currency}${item.price.toFixed(2)}`;

    div.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${typeLabel}
      </div>
      <div class="cart-item-price">${priceLabel}</div>
      <button class="cart-remove" onclick="removeFromCart(${idx})" aria-label="Remove">✕</button>`;
    itemsEl.appendChild(div);
  });

  // Show total note for mixed carts
  const totalLabel = hasSub()
    ? `€${total.toFixed(2)}<span style="font-size:0.7rem;opacity:0.5;">/mo + one-time</span>`
    : `€${total.toFixed(2)}`;
  document.getElementById('cartTotal').innerHTML = totalLabel;

  // Subscription note: only one allowed
  if (subNoteEl) {
    subNoteEl.style.display = subCount > 0 ? 'block' : 'none';
  }
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCart();
}

async function goToCheckout() {
  if (!cart.length) return;

  if (cart.length > 1) {
    showNotification('For now, each item must be purchased separately ✦');
    openCart();
    return;
  }

  const item = cart[0];
  const link = STRIPE_LINKS[item.id];

  if (!link || link.includes('REPLACE_')) {
    showStripeSetupModal(cart);
    return;
  }

  window.location.href = link;
}

async function checkoutViaBackend(cartItems) {
  try {
    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.textContent = '✦ Opening Checkout…';

    const res = await fetch(BACKEND_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else throw new Error('No checkout URL returned');
  } catch (err) {
    console.error('Checkout error:', err);
    showNotification('Checkout error — please try again');
    const btn = document.getElementById('checkoutBtn');
    btn.disabled = false;
    btn.textContent = '✦ Proceed to Checkout';
  }
}

function showStripeSetupModal(cartItems) {
  const items = cartItems.map(i =>
    `• ${i.name} — €${i.price.toFixed(2)}${isSubId(i.id) ? '/mo' : ''}`
  ).join('\n');
  alert(
    '⚙ Stripe not yet configured\n\n' +
    'Replace the STRIPE_LINKS values in the <script> with your\n' +
    'real Stripe Payment Link URLs from your Stripe Dashboard.\n\n' +
    'Items in cart:\n' + items
  );
}
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function showNotification(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}
function toggleMobileMenu() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  const overlay = document.getElementById('mobileOverlay');
  links.classList.toggle('mobile-open');
  burger.classList.toggle('active');
  overlay.classList.toggle('show');
  document.body.style.overflow = links.classList.contains('mobile-open') ? 'hidden' : '';
}
function closeMobileMenu() {
  const links  = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  const overlay = document.getElementById('mobileOverlay');
  links.classList.remove('mobile-open');
  burger.classList.remove('active');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}
