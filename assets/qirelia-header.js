class QireliaHeader extends HTMLElement {
  connectedCallback() {
    this.megaBtn = this.querySelector('[data-mega-trigger]');
    this.megaDrawer = this.querySelector('[data-drawer="mega"]');
    this.bagTriggers = this.querySelectorAll('[data-bag-trigger]');
    this.bagDrawer = this.querySelector('[data-drawer="bag"]');
    this.menuTrigger = this.querySelector('[data-menu-trigger]');
    this.mobileDrawer = this.querySelector('[data-drawer="mobile"]');
    this.backdrop = this.querySelector('[data-backdrop]');
    this.activeDrawer = null;
    this.hoverTimer = null;

    if (this.megaBtn && this.megaDrawer) {
      const parentLi = this.megaBtn.closest('[data-mega-hover-scope]') || this.megaBtn;
      parentLi.addEventListener('mouseenter', () => {
        if (window.innerWidth >= 1024) {
          clearTimeout(this.hoverTimer);
          this.openDrawer('mega');
        }
      });
      this.addEventListener('mouseleave', () => {
        if (window.innerWidth >= 1024 && this.activeDrawer === 'mega') {
          this.hoverTimer = setTimeout(() => this.closeAll(), 140);
        }
      });
      this.megaDrawer.addEventListener('mouseenter', () => clearTimeout(this.hoverTimer));
      this.megaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleDrawer('mega');
      });
    }

    this.bagTriggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (this.dataset.cartType === 'drawer' && this.bagDrawer) {
          e.preventDefault();
          this.toggleDrawer('bag');
        }
      });
    });

    if (this.menuTrigger && this.mobileDrawer) {
      this.menuTrigger.addEventListener('click', () => {
        if (this.activeDrawer === 'mobile' || this.activeDrawer === 'mega') {
          this.closeAll();
        } else {
          this.openDrawer('mobile');
        }
      });
    }

    this.querySelectorAll('[data-open-mobile-mega]').forEach((el) => {
      el.addEventListener('click', () => this.openDrawer('mega'));
    });

    this.querySelectorAll('[data-back-to-menu]').forEach((el) => {
      el.addEventListener('click', () => this.openDrawer('mobile'));
    });

    this.querySelectorAll('[data-close-drawers]').forEach((el) => {
      el.addEventListener('click', () => this.closeAll());
    });

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.closeAll());
    }

    this.initMegaPreview();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeDrawer) {
        this.closeAll();
      }
    });

    window.addEventListener('qirelia:cart-updated', (e) => {
      if (e.detail && typeof e.detail.count === 'number') {
        this.updateBagCount(e.detail.count);
      }
      if (e.detail && e.detail.drawerHtml) {
        const mount = this.querySelector('[data-cart-drawer-mount]');
        if (mount) mount.innerHTML = e.detail.drawerHtml;
      }
      if (e.detail && e.detail.openDrawer && this.dataset.cartType === 'drawer') {
        this.openDrawer('bag');
      }
    });
  }

  initMegaPreview() {
    const rows = this.querySelectorAll('[data-mega-row]');
    const covers = this.querySelectorAll('[data-mega-cover]');
    const captions = this.querySelectorAll('[data-mega-caption]');
    const activate = (key) => {
      rows.forEach((r) => r.classList.toggle('is-active', r.dataset.megaRow === key));
      covers.forEach((c) => c.classList.toggle('is-active', c.dataset.megaCover === key));
      captions.forEach((p) => p.classList.toggle('is-active', p.dataset.megaCaption === key));
    };
    rows.forEach((row) => {
      row.addEventListener('mouseenter', () => activate(row.dataset.megaRow));
      row.addEventListener('focus', () => activate(row.dataset.megaRow));
      row.addEventListener('click', (e) => {
        if (window.innerWidth < 1024 && !row.classList.contains('is-active')) {
          e.preventDefault();
          activate(row.dataset.megaRow);
        }
      });
    });
  }

  toggleDrawer(name) {
    if (this.activeDrawer === name) this.closeAll();
    else this.openDrawer(name);
  }

  openDrawer(name) {
    this.activeDrawer = name;
    this.classList.add('is-drawer-open');
    [this.megaDrawer, this.bagDrawer, this.mobileDrawer].forEach((d) => {
      if (d) d.classList.toggle('is-open', d.dataset.drawer === name);
    });
    if (this.backdrop) this.backdrop.classList.toggle('is-visible', Boolean(name));
    if (this.megaBtn) this.megaBtn.setAttribute('aria-expanded', String(name === 'mega'));
    if (this.menuTrigger) this.menuTrigger.setAttribute('aria-expanded', String(name === 'mobile' || name === 'mega'));
    this.bagTriggers.forEach((b) => b.setAttribute('aria-expanded', String(name === 'bag')));
  }

  closeAll() {
    this.activeDrawer = null;
    this.classList.remove('is-drawer-open');
    [this.megaDrawer, this.bagDrawer, this.mobileDrawer].forEach((d) => {
      if (d) d.classList.remove('is-open');
    });
    if (this.backdrop) this.backdrop.classList.remove('is-visible');
    if (this.megaBtn) this.megaBtn.setAttribute('aria-expanded', 'false');
    if (this.menuTrigger) this.menuTrigger.setAttribute('aria-expanded', 'false');
    this.bagTriggers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  updateBagCount(count) {
    this.querySelectorAll('[data-bag-count]').forEach((el) => {
      el.textContent = `(${count})`;
    });
  }
}

if (!customElements.get('qirelia-header')) {
  customElements.define('qirelia-header', QireliaHeader);
}
