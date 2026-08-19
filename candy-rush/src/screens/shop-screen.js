/* ============================================================
   SHOP
   Two sections :
     • coin items (hearts, double points, magnet, shield)
     • video unlocks : ball skins, faces, trails, gate styles —
       each owned by watching a rewarded ad, then equippable.
   ============================================================ */

class ShopScreen extends BaseScreen {
  constructor(game) {
    super(game, 'shop');
  }

  build() {
    const items = this.game.config.shop.items;
    const videoItems = this.game.config.videoItems || [];

    this.el = document.createElement('div');
    this.el.className = 'screen shop-screen';
    this.el.appendChild(BG.build('menu'));

    // No panel image asset here : a plain translucent card contains the
    // items, so nothing ever spills out of it (the old f.png frame used
    // to be too small for the list and the items overflowed it).
    const panel = document.createElement('div');
    panel.className = 'shop-panel';
    const content = document.createElement('div');
    content.className = 'panel-content';
    const children = [this.titleEl(LANG.t('shop.title')), this.coinsEl()];
    if (items.length) children.push(this.sectionLabel(LANG.t('shop.title')), this.itemsEl(items));
    if (videoItems.length) {
      children.push(this.sectionLabel(LANG.t('shop.videoSection')), this.videoItemsEl(videoItems));
    }
    children.push(this.backButton());
    children.forEach((child) => content.appendChild(child.el || child));
    panel.appendChild(content);
    this.el.appendChild(panel);

    this.toast = document.createElement('div');
    this.toast.className = 'shop-toast';
    this.el.appendChild(this.toast);

    this.onKeyDown((event) => {
      if (event.code === 'Escape') this.game.show('menu');
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = text;
    return h;
  }

  sectionLabel(text) {
    const div = document.createElement('div');
    div.className = 'shop-section-label';
    div.textContent = text;
    return div;
  }

  coinsEl() {
    const row = document.createElement('div');
    row.className = 'shop-coins';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>${this.getCoins()}</span>`;
    return row;
  }

  /* ----- coin items ----- */

  itemsEl(items) {
    const list = document.createElement('div');
    list.className = 'shop-list';
    items.forEach((item) => {
      const owned = this.isOwned(item.id);
      const row = document.createElement('div');
      row.className = `shop-item ${owned ? 'owned' : ''}`;
      row.innerHTML = `
        <span class="shop-item-icon">${this.itemIcon(item)}</span>
        <span class="shop-item-name">${LANG.t(item.nameKey)}</span>
        <span class="shop-item-price"><img src="assets/ui/c.png" alt="" draggable="false">${item.price.toLocaleString('en-US')}</span>
      `;
      const buyButton = new Button({
        label: owned ? LANG.t('shop.owned') : LANG.t('shop.buy'),
        variant: 'secondary',
        onClick: (event, btn) => this.buy(item, btn)
      });
      if (owned) {
        buyButton.el.classList.add('btn-owned');
        buyButton.el.disabled = true;
      }
      row.appendChild(buyButton.el);
      list.appendChild(row);
    });
    return list;
  }

  itemIcon(item) {
    return `<img src="${item.icon}" alt="" draggable="false">`;
  }

  /* ----- video unlocks ----- */

  videoItemsEl(items) {
    const grid = document.createElement('div');
    grid.className = 'video-grid';
    items.forEach((item) => {
      const owned = this.isOwned(item.id);
      const equipped = this.getEquipped();
      const catKey = this.categoryKey(item.category);
      const isEquipped = equipped[catKey] === item.id;

      const card = document.createElement('div');
      card.className = `video-card ${owned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="video-card-icon">${item.emoji}</div>
        <div class="video-card-name">${LANG.t(item.nameKey)}</div>
      `;

      let button;
      if (!owned && Bridge.advertisement.isRewardedSupported()) {
        button = new Button({ label: LANG.t('shop.watch'), variant: 'secondary', onClick: (event, btn) => this.watchToUnlock(item, btn) });
        button.el.classList.add('btn-video-watch');
      } else if (!owned) {
        button = new Button({ label: LANG.t('levels.locked'), variant: 'secondary', onClick: null });
        button.el.classList.add('btn-video-watch');
        button.el.disabled = true;
      } else if (isEquipped) {
        button = new Button({ label: LANG.t('shop.equipped'), variant: 'secondary', onClick: null });
        button.el.classList.add('btn-video-equipped');
        button.el.disabled = true;
      } else {
        button = new Button({ label: LANG.t('shop.equip'), variant: 'secondary', onClick: () => this.equip(item) });
        button.el.classList.add('btn-video-equip');
      }
      card.appendChild(button.el);
      grid.appendChild(card);
    });
    return grid;
  }

  categoryKey(category) {
    return { skin: 'skin', face: 'face', trail: 'trail', gate: 'gate' }[category] || category;
  }

  getEquipped() {
    return this.game.storage.get('equipped', {});
  }

  watchToUnlock(item, btn) {
    this.game.audio.click();
    if (btn && btn.el) btn.el.disabled = true;
    const grant = (ok) => {
      if (!ok) {
        if (btn && btn.el) btn.el.disabled = false;
        return;
      }
      const owned = this.game.storage.get('owned', {});
      owned[item.id] = true;
      this.game.storage.set('owned', owned);
      // auto-equip the freshly unlocked item
      const equipped = this.getEquipped();
      equipped[this.categoryKey(item.category)] = item.id;
      this.game.storage.set('equipped', equipped);
      this.game.audio.revive();
      this.showToast(`${LANG.t(item.nameKey)} ✔`);
      this.rebuild();
    };
    if (Bridge.advertisement.isRewardedSupported()) {
      Bridge.advertisement.showRewarded('shop_unlock').then((rewarded) => grant(rewarded));
    } else {
      // No SDK (GitHub Pages / local demo) : instant free unlock
      setTimeout(() => grant(true), 250);
    }
  }

  equip(item) {
    this.game.audio.click();
    const equipped = this.getEquipped();
    equipped[this.categoryKey(item.category)] = item.id;
    this.game.storage.set('equipped', equipped);
    this.showToast(`${LANG.t(item.nameKey)} ${LANG.t('shop.equipped')} ✨`);
    this.rebuild();
  }

  rebuild() {
    const el = this.el;
    const game = this.game;
    const config = this.game.config;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    game.screens.show('shop');
    if (el) el.remove();
  }

  backButton() {
    return new Button({
      label: LANG.t('shop.back'),
      variant: 'back',
      onClick: () => this.game.show('menu')
    });
  }

  getCoins() {
    return this.game.storage.get('coins', 0);
  }

  isOwned(id) {
    const owned = this.game.storage.get('owned', {});
    return !!owned[id];
  }

  buy(item, button) {
    const coins = this.getCoins();
    if (this.isOwned(item.id)) return;
    if (coins >= item.price) {
      this.game.storage.set('coins', coins - item.price);
      const owned = this.game.storage.get('owned', {});
      owned[item.id] = true;
      this.game.storage.set('owned', owned);
      this.game.audio.click();
      button.el.classList.add('btn-owned');
      button.el.disabled = true;
      button.el.querySelector('.btn-label').textContent = LANG.t('shop.owned');
      this.refreshCoins();
      this.showToast(`${LANG.t(item.nameKey)} ✔`);
    } else {
      this.game.audio.hit();
      this.showToast(LANG.t('shop.notEnough'));
    }
  }

  showToast(text) {
    if (!this.toast) return;
    this.toast.textContent = text;
    this.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toast.classList.remove('show'), 1400);
  }

  refreshCoins() {
    const value = this.el.querySelector('.shop-coins span');
    if (value) value.textContent = this.getCoins().toLocaleString('en-US');
  }
}
