import React, { useState, useEffect } from 'react';
import { Heart, Gift, DollarSign, Lock, Trash2, Plus, ExternalLink, AlertCircle, CheckCircle, Send, Info, Edit, X, MessageCircle, ChevronUp } from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import './App.css';

const CATEGORIES = ['Todos', 'Cozinha', 'Quarto', 'Sala', 'Banheiro', 'Eletro', 'Decoração', 'Outros'];

// --- ESTILOS DE CATEGORIA ---
const CATEGORY_STYLES = {
  'Todos':      { bg: '#f3f4f6', text: '#374151', activeBg: '#374151' },
  'Cozinha':    { bg: '#ffedd5', text: '#c2410c', activeBg: '#c2410c' },
  'Quarto':     { bg: '#f3e8ff', text: '#7e22ce', activeBg: '#7e22ce' },
  'Sala':       { bg: '#dbeafe', text: '#1d4ed8', activeBg: '#1d4ed8' },
  'Banheiro':   { bg: '#ccfbf1', text: '#0f766e', activeBg: '#0f766e' },
  'Eletro':     { bg: '#e2e8f0', text: '#475569', activeBg: '#475569' },
  'Decoração':  { bg: '#fce7f3', text: '#be185d', activeBg: '#be185d' },
  'Outros':     { bg: '#dcfce7', text: '#15803d', activeBg: '#15803d' }
};

// --- FUNÇÕES AUXILIARES ---
const maskPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .substring(0, 15);
};

const maskCurrency = (value) => {
  let v = value.replace(/\D/g, '');
  v = (v / 100).toFixed(2) + '';
  v = v.replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return 'R$ ' + v;
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export default function WeddingGiftSite() {
  const [currentPage, setCurrentPage] = useState('home'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [currentGuest, setCurrentGuest] = useState(null);
  
  const [gifts, setGifts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [pixContributions, setPixContributions] = useState([]);
  
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [pixAmount, setPixAmount] = useState('');
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedPix, setSelectedPix] = useState(null);
  
  const [guestMessage, setGuestMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showPixDetails, setShowPixDetails] = useState(false);
  
  const [toast, setToast] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [newGift, setNewGift] = useState({
    name: '',
    description: '',
    image: '',
    link: '',
    category: 'Outros', 
    allowMultiple: false,
    maxQuantity: 1
  });

  useEffect(() => {
    loadGifts();
    loadGuests();
    loadPixContributions();

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadGifts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gifts'));
      const giftsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGifts(giftsData);
    } catch (error) { console.error('Erro:', error); }
  };

  const loadGuests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'guests'));
      const guestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuests(guestsData);
    } catch (error) { console.error('Erro:', error); }
  };

  const loadPixContributions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'pixContributions'));
      const pixData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPixContributions(pixData);
    } catch (error) { console.error('Erro:', error); }
  };

  const totalPixValue = pixContributions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  // --- AÇÕES ---

  const handlePhoneChange = (e) => {
    setGuestPhone(maskPhone(e.target.value));
  };

  const handleGuestIdentification = async () => {
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (!guestName || cleanPhone.length < 10) {
      showToast('Preencha seu nome e um telefone válido.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const guest = {
        name: guestName,
        phone: guestPhone, 
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'guests'), guest);
      setCurrentGuest({ id: docRef.id, ...guest });
      setCurrentPage('intro'); 
      await loadGuests();
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGift = async (gift) => {
    if (gift.reserved) {
      showToast('Este presente já foi totalmente comprado.', 'error');
      return;
    }
    setSelectedGift(gift);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePixChange = (e) => {
    setPixAmount(maskCurrency(e.target.value));
  };

  const handleSelectPix = () => {
    const cleanValue = pixAmount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const numericValue = parseFloat(cleanValue);
    
    if (isNaN(numericValue) || numericValue <= 0) {
      showToast('Insira um valor válido para o PIX', 'error');
      return;
    }

    setSelectedPix({ amount: numericValue });
    setPixAmount(''); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePixPreset = (value) => {
    setSelectedPix({ amount: value });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveGiftSelection = () => setSelectedGift(null);
  const handleRemovePixSelection = () => setSelectedPix(null);

  const handleFinalConfirmation = async () => {
    if (!selectedGift && !selectedPix) {
      showToast('Selecione um presente ou PIX.', 'error');
      return;
    }

    if (!window.confirm('Deseja confirmar sua participação?')) return;

    setLoading(true);
    try {
      const updateData = { confirmedAt: serverTimestamp() };

      if (selectedGift) {
        const giftRef = doc(db, 'gifts', selectedGift.id);
        const currentCount = selectedGift.purchaseCount || 0;
        const newCount = currentCount + 1;
        const limit = selectedGift.maxQuantity || 1; 
        const isFullyReserved = newCount >= limit;

        await updateDoc(giftRef, {
          purchaseCount: newCount,
          reserved: isFullyReserved,
          reservedBy: currentGuest.name,
          reservedById: currentGuest.id,
          reservedAt: serverTimestamp()
        });
        updateData.giftId = selectedGift.id;
        updateData.giftName = selectedGift.name;
      }
      
      if (selectedPix) {
        await addDoc(collection(db, 'pixContributions'), {
          guestName: currentGuest.name,
          guestId: currentGuest.id,
          guestPhone: currentGuest.phone,
          amount: selectedPix.amount,
          timestamp: serverTimestamp()
        });
        updateData.pixAmount = selectedPix.amount;
      }

      const guestRef = doc(db, 'guests', currentGuest.id);
      await updateDoc(guestRef, updateData);
      
      await loadGifts();
      await loadGuests();
      await loadPixContributions();
      
      setCurrentPage('thanks');
      
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao confirmar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!guestMessage.trim()) return;
    setLoading(true);
    try {
      const guestRef = doc(db, 'guests', currentGuest.id);
      await updateDoc(guestRef, {
        message: guestMessage,
        messageAt: serverTimestamp()
      });
      setMessageSent(true);
      await loadGuests();
      showToast('Mensagem enviada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao enviar mensagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN ---

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const adminDoc = await getDoc(doc(db, 'config', 'admin'));
      if (!adminDoc.exists() || adminPassword !== adminDoc.data().password) {
        showToast('Senha incorreta.', 'error');
      } else {
        setIsAdmin(true);
        setCurrentPage('admin');
        setAdminPassword('');
      }
    } catch (error) { showToast('Erro de conexão.', 'error'); } finally { setLoading(false); }
  };

  const handleStartEdit = (gift) => {
    setNewGift({
      name: gift.name,
      description: gift.description,
      image: gift.image || '',
      link: gift.link || '',
      category: gift.category || 'Outros',
      allowMultiple: gift.allowMultiple || false,
      maxQuantity: gift.maxQuantity || 1
    });
    setEditingId(gift.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewGift({ name: '', description: '', image: '', link: '', category: 'Outros', allowMultiple: false, maxQuantity: 1 });
  };

  const handleSaveGift = async () => {
    if (!newGift.name || !newGift.description) { showToast('Preencha nome e descrição', 'error'); return; }
    setLoading(true);
    try {
      const finalMaxQuantity = newGift.allowMultiple ? parseInt(newGift.maxQuantity) : 1;
      const giftData = { ...newGift, maxQuantity: finalMaxQuantity, updatedAt: serverTimestamp() };

      if (editingId) {
        await updateDoc(doc(db, 'gifts', editingId), giftData);
        showToast('Item atualizado!', 'success');
      } else {
        await addDoc(collection(db, 'gifts'), { 
          ...giftData, 
          reserved: false, 
          purchaseCount: 0, 
          reservedBy: null, 
          createdAt: serverTimestamp() 
        });
        showToast('Item adicionado!', 'success');
      }
      await loadGifts();
      handleCancelEdit();
    } catch (error) { showToast('Erro ao salvar item.', 'error'); } finally { setLoading(false); }
  };

  const handleDeleteGift = async (giftId) => {
    if (!window.confirm('Tem certeza?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'gifts', giftId));
      await loadGifts();
      if (editingId === giftId) handleCancelEdit();
      showToast('Item removido.', 'success');
    } catch (error) { showToast('Erro ao remover.', 'error'); } finally { setLoading(false); }
  };

  // --- COMPONENTE TOAST ---
  const ToastNotification = () => (
    toast ? (
      <div className="toast-container">
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>
            <X size={18} />
          </button>
        </div>
      </div>
    ) : null
  );

  // --- RENDERIZAÇÃO ---

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient">
        <ToastNotification />
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <Heart className="icon-center text-pink-500 mb-4 animate-pulse" size={64} />
            <h1 className="text-5xl font-bold text-gray-800 mb-2">Caio & Evelyn</h1>
            <p className="text-xl text-gray-600 mb-6">Chá de Casa Nova / Enxoval</p>
            <div className="divider mb-8"></div>
            <p className="welcome-text">
              "Sua presença e carinho são os melhores presentes."
            </p>
          </div>

          <div className="card mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">Identifique-se</h2>
            
            {/* AUMENTADO O ESPAÇAMENTO AQUI (space-y-6) */}
            <div className="space-y-6">
              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Nome Completo *</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input" placeholder="Seu nome" disabled={loading} />
              </div>
              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Telefone *</label>
                <input type="tel" value={guestPhone} onChange={handlePhoneChange} className="input" placeholder="(00) 00000-0000" disabled={loading} maxLength={15} />
              </div>
              <button onClick={handleGuestIdentification} disabled={loading} className="btn btn-primary">{loading ? 'Aguarde...' : 'Entrar'}</button>
            </div>

            {/* AUMENTADO O ESPAÇAMENTO AQUI (mt-8) */}
            <button onClick={() => setCurrentPage('adminLogin')} className="btn-text btn-text-gray w-full mt-8">
              <Lock size={16} /> Área do Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'intro' && currentGuest) {
    return (
      <div className="min-h-screen bg-gradient py-12 px-4">
        <ToastNotification />
        <div className="card mx-auto text-center">
          <Info className="icon-center text-blue-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Como funciona?</h2>
          <div className="text-left space-y-4 mb-8 text-gray-600">
            <p className="text-lg">Olá <strong>{currentGuest.name}</strong>!</p>
            <p>Para nos ajudar a montar nosso cantinho, você pode escolher:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Um <strong>valor via PIX</strong> (qualquer valor ajuda muito!).</li>
              <li>E/ou um <strong>item da nossa lista</strong> de sugestões.</li>
            </ol>
            <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
              <p className="text-sm text-blue-800"><strong>Nota:</strong> Você pode selecionar as duas opções se desejar!</p>
            </div>
          </div>
          <button onClick={() => { setCurrentPage('gifts'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn btn-primary">
            Ver lista de presentes
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'gifts' && currentGuest) {
    const hasSelection = selectedGift || selectedPix;
    const filteredGifts = categoryFilter === 'Todos' ? gifts : gifts.filter(g => g.category === categoryFilter);
    
    return (
      <div className="min-h-screen bg-gradient py-8 px-4">
        <ToastNotification />
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Olá, {currentGuest.name}! 👋</h2>
            <p className="text-gray-600">Escolha como prefere nos presentear</p>
          </div>

          {hasSelection && (
            <div className="card mb-8" style={{backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981'}}>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <CheckCircle size={24} style={{color: '#10b981', marginRight: '0.5rem'}} />
                Selecionados
              </h3>
              <div style={{backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>
                {selectedGift && (
                  <div className="mb-4 pb-4 border-b border-gray-100 flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">🎁 Presente:</p>
                      <p className="font-bold text-lg">{selectedGift.name}</p>
                      {selectedGift.link && <a href={selectedGift.link} target="_blank" rel="noopener noreferrer" className="link"><ExternalLink size={16} style={{marginRight: '0.25rem'}} /> Ver sugestão</a>}
                    </div>
                    <button onClick={handleRemoveGiftSelection} className="btn-text btn-text-red" style={{fontSize: '0.8rem'}}>Remover</button>
                  </div>
                )}
                {selectedPix && (
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">💰 Contribuição PIX:</p>
                      <p className="font-bold text-2xl text-green-600">R$ {selectedPix.amount.toFixed(2)}</p>
                    </div>
                    <button onClick={handleRemovePixSelection} className="btn-text btn-text-red" style={{fontSize: '0.8rem'}}>Remover</button>
                  </div>
                )}
              </div>
              <button onClick={handleFinalConfirmation} disabled={loading} className="btn btn-success" style={{fontSize: '1.125rem', padding: '1rem'}}>
                <Send size={24} /> {loading ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          )}

          <div className="card mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <DollarSign className="text-green-600" size={28} style={{marginRight: '0.5rem'}} />
              Opção 1: PIX
            </h3>
            <div className="pix-box">
              <p className="text-sm text-gray-600">Chave PIX</p>
              <p className="pix-key">90299bd3-53b1-4a2b-b8b6-dd12e2b1a85a</p>
            </div>

            {!selectedPix ? (
              <>
                <input type="text" value={pixAmount} onChange={handlePixChange} placeholder="Valor (R$)" className="input mb-4" inputMode="numeric" />
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                  {[50, 100, 150, 200].map(val => (
                    <button key={val} onClick={() => handlePixPreset(val)} className="btn" style={{width: 'auto', padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', fontSize: '0.9rem'}}>
                      R$ {val}
                    </button>
                  ))}
                </div>
                <button onClick={handleSelectPix} disabled={loading} className="btn btn-success">
                  <DollarSign size={20} /> Adicionar Valor
                </button>
              </>
            ) : (
              <div className="text-center p-4 bg-green-50 rounded text-green-800">
                <CheckCircle className="icon-center mb-2" /> Valor de R$ {selectedPix.amount.toFixed(2)} adicionado!
              </div>
            )}
          </div>

          <div className="card mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Gift className="text-pink-500" size={28} style={{marginRight: '0.5rem'}} />
              Opção 2: Presentes
            </h3>
            
            <div className="category-filters">
              {CATEGORIES.map(cat => {
                 const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES['Outros'];
                 const isSelected = categoryFilter === cat;
                 return (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className="badge" 
                    style={{
                      cursor: 'pointer', border: isSelected ? 'none' : `1px solid ${style.bg}`,
                      backgroundColor: isSelected ? style.activeBg : style.bg,
                      color: isSelected ? '#ffffff' : style.text,
                      padding: '0.6rem 1.2rem', fontSize: '0.9rem', whiteSpace: 'nowrap'
                    }}>
                    {cat}
                  </button>
                 );
              })}
            </div>

            <p className="text-gray-600 mb-6 text-sm bg-gray-50 p-3 rounded border border-gray-200">
              ℹ️ <strong>Nota:</strong> Os links são sugestões de modelo.
            </p>
            
            {filteredGifts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Nenhum item nesta categoria.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredGifts.map(gift => {
                  const count = gift.purchaseCount || 0;
                  const max = gift.maxQuantity || 1;
                  const isSoldOut = gift.reserved;
                  const catStyle = CATEGORY_STYLES[gift.category] || CATEGORY_STYLES['Outros'];

                  return (
                    <div key={gift.id} className={`gift-card ${isSoldOut ? 'reserved' : ''} ${selectedGift?.id === gift.id ? 'selected-card' : ''}`} style={selectedGift?.id === gift.id ? {borderColor: '#10b981', borderWidth: '2px'} : {}}>
                      {gift.image && <img src={gift.image} alt={gift.name} />}
                      <span className="badge mb-2" style={{backgroundColor: catStyle.bg, color: catStyle.text, fontSize: '0.7rem'}}>{gift.category || 'Outros'}</span>
                      <h4 className="font-bold text-md mb-1 leading-tight">{gift.name}</h4>
                      <p className="text-xs text-gray-600 mb-3">{gift.description}</p>
                      {gift.allowMultiple && <p className="text-xs text-blue-600 font-semibold mb-2 bg-blue-50 p-1 rounded">{count} de {max} comprados</p>}
                      <div className="mt-auto space-y-2 w-full">
                        {isSoldOut ? (
                          <div className="badge badge-gray w-full"><Lock size={14} /> Esgotado</div>
                        ) : selectedGift?.id === gift.id ? (
                          <div className="badge badge-green w-full"><CheckCircle size={14} /> Selecionado</div>
                        ) : (
                          <button onClick={() => handleSelectGift(gift)} disabled={loading} className="btn btn-primary" style={{padding: '0.5rem', fontSize: '0.9rem'}}>
                            <Gift size={16} /> Selecionar
                          </button>
                        )}
                        {gift.link && <a href={gift.link} target="_blank" rel="noopener noreferrer" className="link block text-center text-xs"><ExternalLink size={12} /> Ver modelo</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Botão Voltar ao Topo */}
        <button className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
          <ChevronUp size={24} />
        </button>
      </div>
    );
  }

  if (currentPage === 'adminLogin') {
    return (
      <div className="min-h-screen bg-gradient-gray flex items-center justify-center px-4">
        <ToastNotification />
        {/* CENTRALIZAÇÃO DO CADEADO */}
        <div className="card flex flex-col items-center" style={{maxWidth: '24rem'}}>
          <Lock className="icon-center text-gray-700 mb-6" size={48} />
          <h2 className="text-xl font-bold text-center mb-6">Área Admin</h2>
          <div className="space-y-4 w-full">
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="input" placeholder="Senha" />
            <button onClick={handleAdminLogin} className="btn btn-secondary w-full">{loading ? '...' : 'Entrar'}</button>
          </div>
          <button onClick={() => setCurrentPage('home')} className="btn-text btn-text-gray w-full mt-4">Voltar</button>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4" style={{backgroundColor: '#f3f4f6'}}>
        <ToastNotification />
        <div className="container mx-auto" style={{maxWidth: '800px'}}>
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Painel</h2>
              <button onClick={() => { setIsAdmin(false); setCurrentPage('home'); }} className="btn-text btn-text-red">Sair</button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="stat-card badge-blue"><p>Pessoas</p><h3>{guests.length}</h3></div>
              <div className="stat-card badge-green"><p>Esgotados</p><h3>{gifts.filter(g => g.reserved).length}</h3></div>
              
              {/* CARD PIX INTERATIVO */}
              <div className="stat-card badge-purple" style={{cursor: 'pointer'}} onClick={() => setShowPixDetails(!showPixDetails)}>
                <p>PIX</p>
                <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem'}}>
                  <h3>{pixContributions.length}</h3>
                  <span style={{fontSize: '0.9rem', opacity: 0.8}}>({formatCurrency(totalPixValue)})</span>
                </div>
              </div>
            </div>

            {/* EXTRATO PIX */}
            {showPixDetails && (
              <div className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h3 className="text-lg font-bold text-purple-800 mb-4">Extrato</h3>
                <div className="overflow-x-auto">
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{textAlign: 'left', borderBottom: '1px solid #d8b4fe'}}>
                        <th className="p-2">Nome</th>
                        <th className="p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pixContributions.map(pix => (
                        <tr key={pix.id} style={{borderBottom: '1px solid #f3e8ff'}}>
                          <td className="p-2">
                            {pix.guestName}<br/>
                            <span className="text-xs text-gray-500">{pix.guestPhone}</span>
                          </td>
                          <td className="p-2 font-bold text-green-700">{formatCurrency(pix.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-8 p-4 bg-pink-50 rounded-lg border border-pink-100">
              <h3 className="text-lg font-bold text-pink-700 mb-4 flex items-center">
                <MessageCircle size={20} className="mr-2" /> Recados ({guests.filter(g => g.message).length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {guests.filter(g => g.message).length === 0 ? <p className="text-sm text-gray-500 italic">Nenhuma mensagem.</p> : 
                  guests.filter(g => g.message).map(g => (
                    <div key={g.id} className="bg-white p-3 rounded shadow-sm">
                      <p className="text-sm font-bold text-gray-800">{g.name}</p>
                      <p className="text-gray-600 mt-1 italic">"{g.message}"</p>
                    </div>
                  ))
                }
              </div>
            </div>
            
            <h3 className="text-lg font-bold mb-4">{editingId ? `✏️ Editando` : '➕ Novo Item'}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <input type="text" placeholder="Nome *" value={newGift.name} onChange={(e) => setNewGift({...newGift, name: e.target.value})} className="input" />
              <input type="text" placeholder="Descrição *" value={newGift.description} onChange={(e) => setNewGift({...newGift, description: e.target.value})} className="input" />
              <input type="url" placeholder="Img URL" value={newGift.image} onChange={(e) => setNewGift({...newGift, image: e.target.value})} className="input" />
              <input type="url" placeholder="Link" value={newGift.link} onChange={(e) => setNewGift({...newGift, link: e.target.value})} className="input" />
              
              <div style={{gridColumn: '1 / -1'}}>
                <label className="text-sm font-bold text-gray-700 block mb-1">Categoria</label>
                <select className="input" value={newGift.category} onChange={(e) => setNewGift({...newGift, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <label className="label-checkbox">
                  <input type="checkbox" checked={newGift.allowMultiple} onChange={(e) => setNewGift({...newGift, allowMultiple: e.target.checked})} className="checkbox" />
                  <span>Múltiplo?</span>
                </label>
                {newGift.allowMultiple && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <label className="text-sm font-bold text-gray-700">Max:</label>
                    <input type="number" min="1" value={newGift.maxQuantity} onChange={(e) => setNewGift({...newGift, maxQuantity: e.target.value})} className="input" style={{width: '70px', padding: '0.4rem'}} />
                  </div>
                )}
              </div>
              
              <div style={{gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                <button onClick={handleSaveGift} disabled={loading} className={`btn ${editingId ? 'btn-primary' : 'btn-success'}`} style={{flex: 1}}>
                  {editingId ? <><Edit size={20} /> Salvar</> : <><Plus size={20} /> Adicionar</>}
                </button>
                {editingId && (
                  <button onClick={handleCancelEdit} disabled={loading} className="btn btn-secondary" style={{width: 'auto'}}><X size={20} /> Cancelar</button>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">📦 Itens ({gifts.length})</h3>
            <div className="grid grid-cols-3 gap-4">
              {gifts.map(gift => (
                <div key={gift.id} className="relative p-4 border rounded bg-white" style={editingId === gift.id ? {borderColor: '#ec4899', borderWidth: '2px'} : {}}>
                  {gift.image && <img src={gift.image} alt={gift.name} style={{width:'100%', height:'5rem', objectFit:'contain'}} />}
                  <h4 className="font-bold text-sm">{gift.name}</h4>
                  <div className="text-xs bg-gray-100 p-1 rounded mb-2">{gift.purchaseCount || 0}/{gift.maxQuantity || 1}</div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => handleStartEdit(gift)} disabled={loading} className="icon-btn" style={{backgroundColor: '#3b82f6', width:'1.5rem', height:'1.5rem'}} title="Editar"><Edit size={12} /></button>
                    <button onClick={() => handleDeleteGift(gift.id)} disabled={loading} className="icon-btn" style={{width:'1.5rem', height:'1.5rem'}} title="Deletar"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'thanks') {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center px-4 overflow-hidden">
        <div className="confetti-container">
          <div className="confetti"></div><div className="confetti"></div><div className="confetti"></div><div className="confetti"></div><div className="confetti"></div>
          <div className="confetti"></div><div className="confetti"></div><div className="confetti"></div><div className="confetti"></div><div className="confetti"></div>
        </div>

        <div className="text-center card z-10 relative">
          <CheckCircle className="icon-center text-green-500 mb-6" size={96} />
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Obrigado!</h2>
          <p className="text-gray-600 mb-8">Sua confirmação foi registrada.</p>

          {!messageSent ? (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <p className="text-sm text-gray-700 mb-2 font-semibold">Deixe um recado! 💌</p>
              <textarea className="input mb-2" rows="3" placeholder="Escreva aqui..." value={guestMessage} onChange={(e) => setGuestMessage(e.target.value)}></textarea>
              <button onClick={handleSendMessage} disabled={loading || !guestMessage.trim()} className="btn btn-primary" style={{fontSize: '0.9rem'}}>Enviar</button>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg mb-6 text-green-700 border border-green-100">
              <p className="font-bold">Mensagem enviada!</p>
            </div>
          )}

          <button onClick={() => setCurrentPage('home')} className="btn btn-primary w-auto mx-auto px-8">Início</button>
        </div>
      </div>
    );
  }

  return null;
}