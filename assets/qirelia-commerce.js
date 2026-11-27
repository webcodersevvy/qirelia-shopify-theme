async function qireliaFetchCartAndDrawer() {
  const sectionId = 'cart-drawer';
  const [cartRes, secRes] = await Promise.all([
    fetch(`${window.QireliaRoutes.cartUrl}.js`),
    fetch(`${window.QireliaRoutes.rootUrl}?section_id=${sectionId}`)
  ]);
  const cart = await cartRes.json();
  const secHtml = await secRes.text();
  const doc = new DOMParser().parseFromString(secHtml, 'text/html');
  const inner = doc.querySelector('[data-cart-drawer-section]')?.innerHTML || '';
  return { cart, drawerHtml: inner };
}

class QireliaProductForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form[action*="/cart/add"]');
    this.variantInput = this.querySelector('input[name="id"]');
    this.submitBtn = this.querySelector('[data-add-to-bag]');
    this.submitText = this.querySelector('[data-add-to-bag-label]');
    this.errorEl = this.querySelector('[data-form-error]');
    this.variantsJson = this.querySelector('[data-variants-json]');
    this.variants = this.variantsJson ? JSON.parse(this.variantsJson.textContent) : [];

    this.querySelectorAll('[data-variant-option]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectVariant(btn));
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }
  }

  selectVariant(btn) {
    const id = Number(btn.dataset.variantId);
    const variant = this.variants.find((v) => v.id === id);
    if (!variant) return;

    this.querySelectorAll('[data-variant-option]').forEach((el) => {
      const active = el === btn;
      el.classList.toggle('is-selected', active);
      el.setAttribute('aria-checked', String(active));
    });

    if (this.variantInput) this.variantInput.value = String(variant.id);

    const priceDisplay = document.querySelector('[data-pdp-price]');
    if (priceDisplay && btn.dataset.variantPrice) {
      priceDisplay.textContent = btn.dataset.variantPrice;
    }

    if (this.submitBtn && this.submitText) {
      this.submitBtn.disabled = !variant.available;
      this.submitText.textContent = variant.available
        ? btn.dataset.ctaLabel || `${this.dataset.addLabel} — ${btn.dataset.variantShortPrice}`
        : this.dataset.soldOutLabel;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('variant', String(variant.id));
    window.history.replaceState({}, '', url.toString());
  }

  async onSubmit(e) {
    e.preventDefault();
    if (!this.form || !this.submitBtn) return;
    if (this.errorEl) {
      this.errorEl.hidden = true;
      this.errorEl.textContent = '';
    }
    const prevLabel = this.submitText ? this.submitText.textContent : '';
    this.submitBtn.disabled = true;
    try {
      const formData = new FormData(this.form);
      const res = await fetch(`${window.QireliaRoutes.cartAddUrl}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || this.dataset.errorLabel);

      const { cart, drawerHtml } = await qireliaFetchCartAndDrawer();
      window.dispatchEvent(new CustomEvent('qirelia:cart-updated', {
        detail: { count: cart.item_count, drawerHtml, openDrawer: true }
      }));
      if (this.submitText && this.dataset.addedLabel) {
        this.submitText.textContent = this.dataset.addedLabel;
        setTimeout(() => { if (this.submitText) this.submitText.textContent = prevLabel; }, 1600);
      }
    } catch (err) {
      if (this.errorEl) {
        this.errorEl.textContent = err.message;
        this.errorEl.hidden = false;
      }
    } finally {
      this.submitBtn.disabled = false;
    }
  }
}

class QireliaCartController extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', (e) => {
      const dec = e.target.closest('[data-qty-dec]');
      const inc = e.target.closest('[data-qty-inc]');
      const rem = e.target.closest('[data-qty-remove]');
      if (dec) this.changeLine(dec.dataset.lineKey, Math.max(0, Number(dec.dataset.qty) - 1));
      if (inc) this.changeLine(inc.dataset.lineKey, Number(inc.dataset.qty) + 1);
      if (rem) this.changeLine(rem.dataset.lineKey, 0);
    });
  }

  async changeLine(key, quantity) {
    try {
      const res = await fetch(`${window.QireliaRoutes.cartChangeUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      });
      if (!res.ok) throw new Error('Cart update failed');
      const { cart, drawerHtml } = await qireliaFetchCartAndDrawer();
      window.dispatchEvent(new CustomEvent('qirelia:cart-updated', {
        detail: { count: cart.item_count, drawerHtml, openDrawer: false }
      }));
      if (this.dataset.cartPage !== undefined) {
        const pageRes = await fetch(`${window.QireliaRoutes.cartUrl}?section_id=${this.dataset.sectionId}`);
        const pageHtml = await pageRes.text();
        const doc = new DOMParser().parseFromString(pageHtml, 'text/html');
        const nextRoot = doc.querySelector('qirelia-cart');
        if (nextRoot) this.innerHTML = nextRoot.innerHTML;
      }
    } catch (_) {
      window.location.reload();
    }
  }
}

class QireliaPredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('[data-predictive-results]');
    this.timer = null;
    if (!this.input || !this.results) return;

    this.input.addEventListener('input', () => {
      clearTimeout(this.timer);
      const q = this.input.value.trim();
      if (q.length < 2) {
        this.results.innerHTML = '';
        this.results.hidden = true;
        return;
      }
      this.timer = setTimeout(async () => {
        try {
          const url = `${window.QireliaRoutes.predictiveSearchUrl}?q=${encodeURIComponent(q)}&section_id=predictive-search`;
          const res = await fetch(url);
          const html = await res.text();
          this.results.innerHTML = html;
          this.results.hidden = false;
        } catch (_) {
          this.results.hidden = true;
        }
      }, 220);
    });
  }
}

if (!customElements.get('qirelia-product-form')) customElements.define('qirelia-product-form', QireliaProductForm);
if (!customElements.get('qirelia-cart')) customElements.define('qirelia-cart', QireliaCartController);
if (!customElements.get('qirelia-predictive-search')) customElements.define('qirelia-predictive-search', QireliaPredictiveSearch);
