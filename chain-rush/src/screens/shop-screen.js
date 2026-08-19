/* Shop screen — each item shows a VISUAL illustration, its price, a BUY
   button and (on >=50% of items) a WATCH AD button (rewarded). */

class ShopScreen extends BaseScreen {
  constructor(game) {
    super(game, 'shop');
  }

  build() {
    const items = this.game.config.shop.items;

    this.el = document.createElement('div');
    this.el.className = 'screen shop-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    const content = document.createElement('div');
    content.className = 'shop-content';
    content.appendChild(this.titleEl('SHOP'));
    content.appendChild(this.coinsEl());
    content.appendChild(this.itemsEl(items));
    content.appendChild(this.backButton().el);
    this.el.appendChild(content);

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

  coinsEl() {
    const row = document.createElement('div');
    row.className = 'shop-coins';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>${this.getCoins()}</span>`;
    return row;
  }

  itemsEl(items) {
    const list = document.createElement('div');
    list.className = 'shop-list';
    items.forEach((item) => {
      list.appendChild(this.itemRow(item));
    });
    return list;
  }

  itemRow(item) {
    const row = document.createElement('div');
    row.className = 'shop-item';

    const top = document.createElement('div');
    top.className = 'shop-item-top';

    const icon = document.createElement('img');
    icon.className = 'shop-item-icon';
    icon.src = item.icon;
    icon.alt = item.name;
    icon.draggable = false;

    const info = document.createElement('div');
    info.className = 'shop-item-info';
    const name = document.createElement('span');
    name.className = 'shop-item-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-item-desc';
    desc.textContent = item.desc || '';
    const owned = document.createElement('span');
    owned.className = 'shop-item-owned';
    owned.textContent = `Owned: ${this.game.storage.get(`power_${item.id}`, 0)}`;
    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(owned);

    const price = document.createElement('div');
    price.className = 'shop-item-price';
    price.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false">${item.price.toLocaleString('en-US')}`;

    top.appendChild(icon);
    top.appendChild(info);
    top.appendChild(price);

    const actions = document.createElement('div');
    actions.className = 'shop-item-actions';

    const buyButton = new Button({
      label: 'BUY',
      variant: 'secondary',
      onClick: () => this.buy(item, row)
    });
    actions.appendChild(buyButton.el);

    const adButton = new Button({
      label: 'WATCH AD',
      variant: 'back',
      ariaLabel: `Watch an ad to get ${item.name} for free`,
      onClick: () => this.watchAd(item, row)
    });
    adButton.el.classList.add('btn-ad');
    adButton.el.title = `Watch an ad to get ${item.name} for free`;
    actions.appendChild(adButton.el);

    row.appendChild(top);
    row.appendChild(actions);
    return row;
  }

  backButton() {
    return new Button({
      label: 'BACK',
      variant: 'back',
      onClick: () => this.game.show('menu')
    });
  }

  getCoins() {
    return this.game.storage.get('coins', 0);
  }

  refreshCoins() {
    const value = this.el.querySelector('.shop-coins span');
    if (value) value.textContent = this.getCoins().toLocaleString('en-US');
  }

  grant(item) {
    const key = `power_${item.id}`;
    this.game.storage.set(key, this.game.storage.get(key, 0) + 1);
    this.game.audio.play('coin');
    this.refreshCoins();
    const owned = this.el.querySelectorAll('.shop-item')[this.indexOf(item)];
    if (owned) {
      const el = owned.querySelector('.shop-item-owned');
      if (el) el.textContent = `Owned: ${this.game.storage.get(key, 0)}`;
    }
  }

  indexOf(item) {
    return this.game.config.shop.items.indexOf(item);
  }

  buy(item) {
    const coins = this.getCoins();
    if (coins >= item.price) {
      this.game.storage.set('coins', coins - item.price);
      this.grant(item);
    } else {
      this.game.audio.play('defeat', 0.4);
    }
  }

  watchAd(item) {
    if (typeof SDK === 'undefined') return;
    this.game.audio.pauseAll();
    SDK.rewarded().then((ok) => {
      this.game.audio.resumeAll();
      if (ok) this.grant(item);
    });
  }
}
