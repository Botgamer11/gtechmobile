  import React, { useState, useEffect } from 'react';
  import { 
    Home, Trophy, ShoppingBag, Zap, Star, Newspaper, Trash2, Ban, Play, Settings2, 
    Package, Gavel, CheckSquare, Tag, Wallet, X, Clock, Flame, Globe, Search, ShieldCheck,
    Link2, Plus, ChevronRight, AlertCircle, ClipboardList, Ghost, Sparkles, Gift, Ticket,
    Snowflake, Coins, ArrowLeft
  } from 'lucide-react';

  // --- REUSABLE EMPTY STATE COMPONENT ---
  const EmptyState = ({ icon: Icon, text }) => (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-white/5 border border-dashed border-white/10 rounded-[40px] animate-in fade-in duration-700">
      <Icon size={48} className="text-gray-800 mb-4 opacity-40" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 text-center leading-relaxed">
        {text || 'Здесь пока ничего нет'}
      </p>
    </div>
  );

  // --- SNOW EFFECT ---
  const Snowfall = () => {
    return (
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute text-white/20 animate-bounce" style={{ left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`, fontSize: `${Math.random() * 10 + 5}px`, animation: `fall ${Math.random() * 5 + 5}s linear infinite`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() }}>❄</div>
        ))}
        <style>{`@keyframes fall { 0% { transform: translateY(0vh) rotate(0deg); } 100% { transform: translateY(110vh) rotate(360deg); } }`}</style>
      </div>
    );
  };

  const GtechApp = () => {
    const OWNER_ID = 6595683709;

    const [db, setDb] = useState(() => {
      const saved = localStorage.getItem('gtech_v25_db');
      return saved ? JSON.parse(saved) : {
        users: [{ id: OWNER_ID, username: 'NASWAYQ', balance: 100000, tickets: 100, role: 'owner', dailyScore: 0, totalScore: 0, inventory: [], completedTasks: [], usedPromos: [], banInfo: { isBanned: false, reason: '' } }],
        shopItems: [], news: [], tasks: [], promoCodes: [], links: { play: 'https://play.google.com', apk: 'https://gtech.com/game.apk' }
      };
    });

    const [currentUser, setCurrentUser] = useState(db.users[0]);
    const [activeTab, setActiveTab] = useState('home');
    const [modal, setModal] = useState({ show: false, title: '', text: '' });
    const [promoInput, setPromoInput] = useState({ show: false, value: '' });
    const [playMenu, setPlayMenu] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [topType, setTopType] = useState('daily');
    const [selectedRarity, setSelectedRarity] = useState('COMMON');
    const [giveAmount, setGiveAmount] = useState({});

    const RARITIES = {
      COMMON: { label: 'Обычный', color: 'text-gray-400', border: 'border-white/10', bg: 'bg-white/5' },
      RARE: { label: 'Редкий', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
      EPIC: { label: 'Эпик', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
      LEGENDARY: { label: 'Легенда', color: 'text-yellow-500', border: 'border-yellow-500/40', bg: 'bg-yellow-500/5' },
      EXCLUSIVE: { label: 'Эксклюзив', color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-500/10' }
    };

    const handleOpenLink = (url) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank');
    };

    useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        const exists = db.users.find(x => x.id === u.id);
        const name = (u.username || u.first_name || `USER_${u.id}`).toUpperCase();
        if (!exists) {
          const newUser = { id: u.id, username: name, balance: 1000, tickets: 1, role: 'user', dailyScore: 0, totalScore: 0, inventory: [], completedTasks: [], usedPromos: [], banInfo: { isBanned: false, reason: '' } };
          setDb(prev => ({ ...prev, users: [...prev.users, newUser] }));
          setCurrentUser(newUser);
        } else setCurrentUser({ ...exists, username: name });
      }
      tg?.expand();
    }, []);

    useEffect(() => { localStorage.setItem('gtech_v25_db', JSON.stringify(db)); }, [db]);

    const isOwner = currentUser.id === OWNER_ID;
    const showAlert = (title, text) => setModal({ show: true, title, text });

    const updateUserData = (userId, fields) => {
      setDb(prev => ({ ...prev, users: prev.users.map(u => u.id === userId ? { ...u, ...fields } : u) }));
      if (currentUser.id === userId) setCurrentUser(prev => ({ ...prev, ...fields }));
    };

    if (currentUser.banInfo.isBanned) return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
        <Gavel size={60} className="text-red-600 mb-4" />
        <h1 className="text-2xl font-black text-white uppercase italic">Access Denied</h1>
        <p className="text-gray-500 mt-2 text-xs">{currentUser.banInfo.reason}</p>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#020202] text-white font-sans pb-32 overflow-x-hidden relative">
        <Snowfall />

        {/* Play Menu Modal */}
        {playMenu && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl p-8 flex flex-col justify-center animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-8 right-8"><button onClick={() => setPlayMenu(false)} className="p-3 bg-white/5 rounded-full"><X /></button></div>
            <h2 className="text-3xl font-black uppercase italic mb-12 tracking-tighter">GTECH ONLINE</h2>
            <div className="space-y-4">
              <button onClick={() => handleOpenLink(db.links.play)} className="w-full flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-[35px] active:scale-95 transition-all">
                <div className="flex items-center gap-4"><Globe className="text-green-500" /><span className="font-black uppercase text-sm tracking-widest">Google Play</span></div>
                <ChevronRight size={18} className="text-gray-700" />
              </button>
              <button onClick={() => handleOpenLink(db.links.apk)} className="w-full flex items-center justify-between bg-blue-600 p-6 rounded-[35px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">
                <div className="flex items-center gap-4"><Zap fill="white" /><span className="font-black uppercase text-sm tracking-widest">Скачать APK</span></div>
                <ChevronRight size={18} className="text-white/50" />
              </button>
              <button onClick={() => setPlayMenu(false)} className="w-full mt-8 py-5 rounded-[30px] border border-white/5 bg-white/5 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 active:bg-white/10 transition-all">
                <ArrowLeft size={14} /> Назад
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="p-6 flex justify-between items-center bg-black/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/20">{currentUser.username[0]}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-tight">{currentUser.username}</h2>
                <Snowflake size={12} className="text-blue-400 animate-pulse" />
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full font-bold uppercase tracking-widest">{isOwner ? 'OWNER' : 'PLAYER'}</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'inventory' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 border-white/10'}`}><Package size={20} /></button>
        </header>

        <main className="p-6 space-y-8 relative z-10">
          {/* HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 rounded-[40px] p-8 shadow-2xl relative">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Баланс GTC</p>
                <div className="flex items-baseline gap-3 mb-10">
                  <h3 className="text-6xl font-black tracking-tighter">{currentUser.balance.toLocaleString()}</h3>
                  <span className="text-blue-500 font-black text-lg">GTC</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-[25px] p-5 border border-white/5 flex items-center gap-4">
                    <Star size={18} className="text-orange-500" fill="currentColor" />
                    <div><p className="text-[8px] text-gray-500 font-bold uppercase">Билеты</p><p className="font-black text-sm">{currentUser.tickets}</p></div>
                  </div>
                  <div className="bg-white/5 rounded-[25px] p-5 border border-white/5 flex items-center gap-4">
                    <Zap size={18} className="text-blue-500" fill="currentColor" />
                    <div><p className="text-[8px] text-gray-500 font-bold uppercase">Опыт</p><p className="font-black text-sm">{currentUser.dailyScore}</p></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <button onClick={() => setPlayMenu(true)} className="bg-blue-600 h-44 rounded-[40px] flex flex-col items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-600/20">
                  <Play fill="white" size={28} />
                  <span className="font-black uppercase text-xs tracking-widest">Play Now</span>
                </button>
                <div className="grid gap-5">
                  <button onClick={() => setActiveTab('tasks')} className="bg-[#111] border border-white/10 rounded-[30px] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                    <CheckSquare className="text-purple-500" size={24} />
                    <span className="font-black uppercase text-[10px] tracking-widest">Задания</span>
                  </button>
                  <button onClick={() => setPromoInput({ ...promoInput, show: true })} className="bg-[#111] border border-white/10 rounded-[30px] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                    <Tag className="text-green-500" size={24} />
                    <span className="font-black uppercase text-[10px] tracking-widest">Промокод</span>
                  </button>
                </div>
              </div>

              <button onClick={() => setActiveTab('news')} className="w-full bg-white/5 border border-white/10 p-6 rounded-[35px] flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400"><Newspaper size={20} /></div>
                  <span className="font-black uppercase text-xs tracking-tight">Новости проекта</span>
                </div>
                <ChevronRight size={20} className="text-gray-700 group-hover:translate-x-1 transition-transform" />
              </button>

              {isOwner && (
                <button onClick={() => setActiveTab('admin_panel')} className="w-full bg-red-600/10 border border-red-600/20 p-6 rounded-[35px] flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-600"><Settings2 size={20} /></div>
                    <span className="font-black uppercase text-xs tracking-tight text-red-600">Админ-панель</span>
                  </div>
                  <ShieldCheck size={20} className="text-red-600/50" />
                </button>
              )}
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Новости</h2>
              {db.news.length === 0 ? <EmptyState icon={Newspaper} text="Новостей пока нет" /> : (
                <div className="space-y-4">
                  {db.news.map(n => (
                    <div key={n.id} className="bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4"><h4 className="font-black uppercase text-sm text-blue-500 tracking-tight">{n.title}</h4><span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{n.date}</span></div>
                      <p className="text-gray-400 text-xs leading-relaxed font-medium">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SHOP TAB */}
          {activeTab === 'shop' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Market</h2>
              {db.shopItems.length === 0 ? <EmptyState icon={ShoppingBag} text="Магазин пуст" /> : (
                <div className="grid gap-4">
                  {db.shopItems.map(item => {
                    const r = RARITIES[item.rarity || 'COMMON'];
                    return (
                      <div key={item.id} className={`p-6 rounded-[35px] border transition-all ${r.border} ${r.bg}`}>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1"><h4 className="font-black uppercase text-sm tracking-tight">{item.name}</h4>{item.rarity === 'EXCLUSIVE' && <Flame size={14} className="text-red-500 animate-pulse" />}</div>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${r.color}`}>{r.label}</p>
                          </div>
                        </div>
                        <button onClick={() => {
                          if (currentUser.balance >= item.price) {
                            updateUserData(currentUser.id, { balance: currentUser.balance - item.price, inventory: [...(currentUser.inventory || []), item] });
                            showAlert('Успех', 'Куплено!');
                          } else showAlert('Ошибка', 'Недостаточно GTC');
                        }} className={`w-full py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 ${item.rarity === 'EXCLUSIVE' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white text-black'}`}>{item.price.toLocaleString()} GTC</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Storage</h2>
              {currentUser.inventory?.length === 0 ? <EmptyState icon={Package} text="Ваш инвентарь пуст" /> : (
                <div className="grid gap-4">
                  {currentUser.inventory.map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[30px] flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500"><Package size={20} /></div><div><p className="font-black uppercase text-xs tracking-tight">{item.name}</p><p className={`text-[9px] font-bold uppercase tracking-widest ${RARITIES[item.rarity || 'COMMON'].color}`}>{RARITIES[item.rarity || 'COMMON'].label}</p></div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADMIN PANEL */}
          {activeTab === 'admin_panel' && isOwner && (
            <div className="space-y-10 animate-in fade-in duration-400 pb-20">
              <h2 className="text-3xl font-black uppercase italic text-red-600 tracking-tighter">Admin Panel</h2>
              
              {/* NEWS MANAGER */}
              <section className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
                <div className="flex items-center gap-3"><Newspaper size={18} className="text-blue-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Новости</h3></div>
                <div className="space-y-4">
                  <input id="ad_nw_t" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" placeholder="Заголовок" />
                  <textarea id="ad_nw_x" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none h-24" placeholder="Текст новости..." />
                  <button onClick={() => {
                    const t = document.getElementById('ad_nw_t').value; const x = document.getElementById('ad_nw_x').value;
                    if (t && x) { setDb(prev => ({ ...prev, news: [{ id: Date.now(), title: t, text: x, date: new Date().toLocaleDateString() }, ...prev.news] })); showAlert('Ок', 'Опубликовано'); }
                  }} className="w-full bg-blue-600 py-5 rounded-[25px] font-black uppercase text-[10px]">Опубликовать</button>
                </div>
                {db.news.length === 0 ? <p className="text-[8px] text-center text-gray-700 uppercase font-black">Список новостей пуст</p> : (
                  <div className="pt-6 border-t border-white/5 space-y-2">
                    {db.news.map(n => (
                      <div key={n.id} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black uppercase truncate pr-4">{n.title}</span>
                        <button onClick={() => setDb(prev => ({ ...prev, news: prev.news.filter(x => x.id !== n.id) }))} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* SHOP MANAGER */}
          <section className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
            <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-orange-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Магазин</h3></div>
            <div className="space-y-4">
              <input id="ad_sh_n" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" placeholder="Название товара" />
              <input id="ad_sh_p" type="number" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" placeholder="Цена GTC" />
              <div className="flex flex-wrap gap-2">
                {Object.keys(RARITIES).map(key => (
                  <button key={key} onClick={() => setSelectedRarity(key)} className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${selectedRarity === key ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{RARITIES[key].label}</button>
                ))}
              </div>
              <button onClick={() => {
                const n = document.getElementById('ad_sh_n').value; const p = Number(document.getElementById('ad_sh_p').value);
                if (n && p) { setDb(prev => ({ ...prev, shopItems: [...prev.shopItems, { id: Date.now(), name: n, price: p, rarity: selectedRarity }] })); showAlert('Ок', 'Добавлено'); }
              }} className="w-full bg-orange-600 py-5 rounded-[25px] font-black uppercase text-[10px]">Добавить товар</button>
            </div>
            {db.shopItems.length === 0 ? <p className="text-[8px] text-center text-gray-700 uppercase font-black">Товаров в базе нет</p> : (
              <div className="pt-6 border-t border-white/5 space-y-2">
                {db.shopItems.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className={`text-[10px] font-black uppercase ${RARITIES[i.rarity || 'COMMON'].color}`}>{i.name}</span>
                    <button onClick={() => setDb(prev => ({ ...prev, shopItems: prev.shopItems.filter(x => x.id !== i.id) }))} className="text-red-500"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PROMO MANAGER */}
          <section className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
            <div className="flex items-center gap-3"><Ticket size={18} className="text-green-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Промокоды</h3></div>
            <div className="space-y-3">
              <input id="ad_pr_c" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none uppercase font-black" placeholder="КОД" />
              <div className="grid grid-cols-2 gap-3">
                <input id="ad_pr_r" type="number" className="bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" placeholder="Награда" />
                <input id="ad_pr_l" type="number" className="bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" placeholder="Лимит" />
              </div>
              <button onClick={() => {
                const c = document.getElementById('ad_pr_c').value.toUpperCase(); const r = Number(document.getElementById('ad_pr_r').value); const l = Number(document.getElementById('ad_pr_l').value);
                if (c && r && l) { setDb(prev => ({ ...prev, promoCodes: [...prev.promoCodes, { code: c, reward: r, limit: l, uses: 0 }] })); showAlert('Ок', 'Создан'); }
              }} className="w-full bg-green-600 py-5 rounded-[25px] font-black uppercase text-[10px]">Создать</button>
            </div>
            {db.promoCodes.length === 0 ? <p className="text-[8px] text-center text-gray-700 uppercase font-black">Промокодов нет</p> : (
              <div className="pt-6 border-t border-white/5 space-y-2">
                {db.promoCodes.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-green-500">{p.code} ({p.uses}/{p.limit})</span>
                    <button onClick={() => setDb(prev => ({ ...prev, promoCodes: prev.promoCodes.filter(x => x.code !== p.code) }))} className="text-red-500"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* LINKS MANAGER */}
          <section className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
            <div className="flex items-center gap-3"><Link2 size={18} className="text-purple-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ссылки на игру</h3></div>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black uppercase text-gray-600 mb-2 ml-2">Google Play URL</p>
                <input value={db.links.play} onChange={(e) => setDb({...db, links: {...db.links, play: e.target.value}})} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-gray-600 mb-2 ml-2">Direct APK URL</p>
                <input value={db.links.apk} onChange={(e) => setDb({...db, links: {...db.links, apk: e.target.value}})} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none" />
              </div>
            </div>
          </section>
        </div>
      )}
      {/* STROGO */}
      {activeTab === 'strogo' && isOwner && (
        <div className="space-y-8 animate-in fade-in duration-400 pb-20">
          <h2 className="text-3xl font-black uppercase italic text-red-600 tracking-tighter">Strict Access</h2>
          <div className="relative">
            <Search className="absolute left-5 top-5 text-gray-600 w-5 h-5" />
            <input className="w-full bg-white/5 border border-white/10 rounded-[25px] py-5 pl-14 pr-6 text-sm outline-none" placeholder="Поиск..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} />
          </div>
          <div className="space-y-4">
            {db.users.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase()) || u.id.toString().includes(adminSearch)).length === 0 ? <EmptyState icon={Ghost} text="Игроки не найдены" /> : (
              db.users.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase()) || u.id.toString().includes(adminSearch)).map(u => (
                <div key={u.id} className="bg-[#0a0a0a] border border-white/10 rounded-[35px] p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div><p className="font-black uppercase text-sm">{u.username} {u.banInfo.isBanned && '🔴'}</p><p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">ID: {u.id}</p></div>
                    <button onClick={() => updateUserData(u.id, { banInfo: { isBanned: !u.banInfo.isBanned, reason: 'Нарушение правил' } })} className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.banInfo.isBanned ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><Ban size={20} /></button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input type="number" className="flex-1 bg-black border border-white/10 rounded-xl p-4 text-xs outline-none" placeholder="Сумма..." value={giveAmount[u.id] || ''} onChange={(e) => setGiveAmount({...giveAmount, [u.id]: e.target.value})} />
                      <button onClick={() => { const amt = Number(giveAmount[u.id]); if (amt) { updateUserData(u.id, { balance: u.balance + amt }); setGiveAmount({...giveAmount, [u.id]: ''}); showAlert('Ок', `Выдано ${amt}`); } }} className="bg-blue-600 px-6 rounded-xl font-black uppercase text-[10px]">Выдать</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TOP */}
      {activeTab === 'top' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center"><h2 className="text-3xl font-black uppercase italic tracking-tighter">Top</h2><div className="flex bg-white/5 p-1 rounded-2xl border border-white/10"><button onClick={() => setTopType('daily')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase ${topType === 'daily' ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}>День</button><button onClick={() => setTopType('total')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase ${topType === 'total' ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}>Все</button></div></div>
          <div className="space-y-3">
            {db.users.length === 0 ? <EmptyState icon={Trophy} text="Рейтинг пуст" /> : (
              db.users.sort((a, b) => topType === 'daily' ? b.dailyScore - a.dailyScore : b.totalScore - a.totalScore).map((u, i) => (
                <div key={u.id} className={`p-6 rounded-[35px] flex items-center justify-between border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center gap-5"><span className={`font-black italic text-2xl ${i === 0 ? 'text-yellow-500' : 'text-gray-800'}`}>#{i + 1}</span><div><p className="font-black uppercase text-xs tracking-tight">{u.username}</p><p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{topType === 'daily' ? u.dailyScore : u.totalScore} XP</p></div></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>

    {/* BOTTOM NAV */}
    <nav className="fixed bottom-8 left-6 right-6 z-[70]">
      <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[40px] p-2 flex items-center justify-between shadow-2xl">
        {[
          { id: 'home', icon: <Home size={22} />, label: 'Home' },
          { id: 'shop', icon: <ShoppingBag size={22} />, label: 'Shop' },
          { id: 'top', icon: <Trophy size={22} />, label: 'Top' },
          { id: 'strogo', icon: <Gavel size={22} />, label: 'Strict', adminOnly: true },
        ].map((tab) => {
          if (tab.adminOnly && !isOwner) return null;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[30px] transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-black shadow-xl scale-105' : 'text-gray-500 hover:text-gray-300'}`}>
              {tab.icon}
              <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>

    {/* PROMO MODAL */}
    {promoInput.show && (
      <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-[45px] p-10 w-full max-w-xs text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500"><Tag size={32} /></div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Промокод</h3>
          <input className="w-full bg-black border border-white/10 rounded-2xl p-5 text-center text-sm font-black uppercase mb-8 outline-none" placeholder="ВВЕДИТЕ КОД" value={promoInput.value} onChange={(e) => setPromoInput({ ...promoInput, value: e.target.value.toUpperCase() })} />
          <div className="flex gap-3">
            <button onClick={() => setPromoInput({ show: false, value: '' })} className="flex-1 bg-white/5 py-4 rounded-2xl font-black uppercase text-[9px]">Отмена</button>
            <button onClick={() => {
              const p = db.promoCodes.find(x => x.code === promoInput.value);
              if (p) {
                if (currentUser.usedPromos?.includes(p.code)) showAlert('Ошибка', 'Уже использовано');
                else if (p.uses >= p.limit) showAlert('Ошибка', 'Лимит исчерпан');
                else {
                  updateUserData(currentUser.id, { balance: currentUser.balance + p.reward, usedPromos: [...(currentUser.usedPromos || []), p.code] });
                  setDb(prev => ({ ...prev, promoCodes: prev.promoCodes.map(x => x.code === p.code ? { ...x, uses: x.uses + 1 } : x) }));
                  setPromoInput({ show: false, value: '' });
                  showAlert('Успех', `Получено ${p.reward} GTC!`);
                }
              } else showAlert('Ошибка', 'Код не найден');
            }} className="flex-1 bg-green-600 py-4 rounded-2xl font-black uppercase text-[9px]">Ввод</button>
          </div>
        </div>
      </div>
    )}

    {/* GLOBAL MODAL */}
    {modal.show && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
        <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[45px] p-10 text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500"><AlertCircle size={32} /></div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-2">{modal.title}</h3>
          <p className="text-gray-500 text-xs font-medium mb-10">{modal.text}</p>
          <button onClick={() => setModal({ ...modal, show: false })} className="w-full bg-white text-black py-5 rounded-[25px] font-black uppercase text-[10px]">Понятно</button>
        </div>
      </div>
    )}
  </div>
);
};

export default GtechApp;