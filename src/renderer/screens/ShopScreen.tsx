import { useMemo, useState } from 'react';
import { SHOP_ITEMS } from '@shared/shop';
import type { Profile } from '@shared/types';

interface Props {
  profile: Profile;
  onBack: () => void;
  onBuy: (itemId: string) => { ok: boolean; reason?: string };
  onEquip: (itemId: string) => { ok: boolean; reason?: string };
  playClick: () => void;
}

export const ShopScreen = ({ profile, onBack, onBuy, onEquip, playClick }: Props) => {
  const [tab, setTab] = useState<'car' | 'skin'>('car');
  const [message, setMessage] = useState('');
  const items = useMemo(() => SHOP_ITEMS.filter((item) => item.type === tab), [tab]);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>Back</button>
        <h2>Shop</h2>
        <div className="coin-pill">Coins: {profile.stats.coins}</div>
      </div>

      <section className="card">
        <div className="shop-tabs">
          <button className={tab === 'car' ? 'primary' : 'ghost'} onClick={() => setTab('car')}>Cars</button>
          <button className={tab === 'skin' ? 'primary' : 'ghost'} onClick={() => setTab('skin')}>Skins</button>
        </div>
        {message && <p className="muted">{message}</p>}
        <div className="shop-grid">
          {items.map((item) => {
            const owned = item.type === 'car'
              ? profile.stats.inventory.cars.includes(item.id)
              : profile.stats.inventory.skins.includes(item.id);
            const equipped = item.type === 'car'
              ? profile.stats.inventory.equippedCar === item.id
              : profile.stats.inventory.equippedSkin === item.id;

            return (
              <article key={item.id} className="shop-card card">
                <div className={`rarity-tag ${item.rarity}`}>{item.rarity}</div>
                <img src={item.preview} alt={item.name} className="shop-preview" />
                <h3>{item.name}</h3>
                <p className="muted">{item.description}</p>
                <p><strong>{item.price}</strong> coins</p>
                {!owned ? (
                  <button
                    className="primary"
                    onClick={() => {
                      playClick();
                      const res = onBuy(item.id);
                      setMessage(res.ok ? `Unlocked ${item.name}!` : res.reason ?? 'Could not buy item.');
                    }}
                  >
                    Buy
                  </button>
                ) : (
                  <button
                    className={equipped ? 'ghost' : 'primary'}
                    disabled={equipped}
                    onClick={() => {
                      playClick();
                      const res = onEquip(item.id);
                      setMessage(res.ok ? `Equipped ${item.name}.` : res.reason ?? 'Could not equip item.');
                    }}
                  >
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
