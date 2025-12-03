import React, { useState, useEffect } from 'react';
import { Heart, Gift, DollarSign, Lock, Trash2, Plus, ExternalLink, AlertCircle, CheckCircle, Send, Info, Edit, X } from 'lucide-react';
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
  
  const [pixAmount, setPixAmount] = useState('');
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedPix, setSelectedPix] = useState(null);
  
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [newGift, setNewGift] = useState({
    name: '',
    description: '',
    image: '',
    link: '',
    allowMultiple: false
  });

  useEffect(() => {
    loadGifts();
    loadGuests();
    loadPixContributions();
  }, []);

  const loadGifts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gifts'));
      const giftsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGifts(giftsData);
    } catch (error) { console.error('Erro ao carregar presentes:', error); }
  };

  const loadGuests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'guests'));
      const guestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuests(guestsData);
    } catch (error) { console.error('Erro ao carregar convidados:', error); }
  };

  const loadPixContributions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'pixContributions'));
      const pixData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPixContributions(pixData);
    } catch (error) { console.error('Erro ao carregar contribuições:', error); }
  };

  // --- AÇÕES DO USUÁRIO ---

  const handleGuestIdentification = async () => {
    if (!guestName || !guestPhone) {
      alert('Por favor, preencha seu nome e telefone.');
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
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGift = async (gift) => {
    if (gift.reserved && !gift.allowMultiple) {
      alert('Este presente já foi escolhido por outro convidado');
      return;
    }
    setSelectedGift(gift);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPix = () => {
    if (!pixAmount || parseFloat(pixAmount) <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }
    setSelectedPix({ amount: parseFloat(pixAmount) });
    setPixAmount(''); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePixPreset = (value) => {
    setPixAmount(value.toString());
  };

  const handleRemoveGiftSelection = () => {
    setSelectedGift(null);
  };

  const handleRemovePixSelection = () => {
    setSelectedPix(null);
  };

  const handleFinalConfirmation = async () => {
    if (!selectedGift && !selectedPix) {
      alert('⚠️ Por favor selecione um presente ou uma contribuição PIX.');
      return;
    }

    let confirmMsg = 'Deseja confirmar sua participação?\n\nItens selecionados:';
    if (selectedGift) confirmMsg += `\n🎁 Presente: ${selectedGift.name}`;
    if (selectedPix) confirmMsg += `\n💰 PIX: R$ ${selectedPix.amount.toFixed(2)}`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const updateData = { confirmedAt: serverTimestamp() };

      if (selectedGift) {
        const giftRef = doc(db, 'gifts', selectedGift.id);
        await updateDoc(giftRef, {
          reserved: true,
          reservedBy: currentGuest.name,
          reservedById: currentGuest.id,
          reservedAt: serverTimestamp()
        });
        updateData.giftId = selectedGift.id;
        updateData.giftName = selectedGift.name;
      }
      
      if (selectedPix) {
        const pixDoc = await addDoc(collection(db, 'pixContributions'), {
          guestName: currentGuest.name,
          guestId: currentGuest.id,
          guestPhone: currentGuest.phone,
          amount: selectedPix.amount,
          timestamp: serverTimestamp()
        });
        updateData.pixAmount = selectedPix.amount;
        updateData.pixContributionId = pixDoc.id;
      }

      const guestRef = doc(db, 'guests', currentGuest.id);
      await updateDoc(guestRef, updateData);
      
      await loadGifts();
      await loadGuests();
      await loadPixContributions();
      
      setCurrentPage('thanks');
      
      setTimeout(() => {
        setCurrentGuest(null);
        setSelectedGift(null);
        setSelectedPix(null);
        setGuestName('');
        setGuestPhone('');
        setPixAmount('');
      }, 100);
      
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao confirmar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES DO ADMIN ---

  const handleAdminLogin = async () => {
    setAdminError('');
    setLoading(true);
    try {
      const adminDoc = await getDoc(doc(db, 'config', 'admin'));
      if (!adminDoc.exists() || adminPassword !== adminDoc.data().password) {
        setAdminError('Senha incorreta.');
      } else {
        setIsAdmin(true);
        setCurrentPage('admin');
        setAdminPassword('');
      }
    } catch (error) { setAdminError('Erro de conexão.'); } finally { setLoading(false); }
  };

  const handleStartEdit = (gift) => {
    setNewGift({
      name: gift.name,
      description: gift.description,
      image: gift.image || '',
      link: gift.link || '',
      allowMultiple: gift.allowMultiple || false
    });
    setEditingId(gift.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewGift({ name: '', description: '', image: '', link: '', allowMultiple: false });
  };

  const handleSaveGift = async () => {
    if (!newGift.name || !newGift.description) { alert('Preencha nome e descrição'); return; }
    
    setLoading(true);
    try {
      if (editingId) {
        const giftRef = doc(db, 'gifts', editingId);
        await updateDoc(giftRef, { ...newGift, updatedAt: serverTimestamp() });
        alert('✅ Item atualizado!');
      } else {
        await addDoc(collection(db, 'gifts'), { ...newGift, reserved: false, reservedBy: null, createdAt: serverTimestamp() });
        alert('✅ Item adicionado!');
      }
      await loadGifts();
      handleCancelEdit();
    } catch (error) { console.error(error); alert('Erro ao salvar item.'); } finally { setLoading(false); }
  };

  const handleDeleteGift = async (giftId) => {
    if (!window.confirm('Tem certeza que deseja remover este item?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'gifts', giftId));
      await loadGifts();
      if (editingId === giftId) handleCancelEdit();
      alert('✅ Removido!');
    } catch (error) { alert('Erro ao remover.'); } finally { setLoading(false); }
  };

  // --- RENDERIZAÇÃO ---

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient">
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <Heart className="icon-center text-pink-500 mb-4 animate-pulse" size={64} />
            <h1 className="text-5xl font-bold text-gray-800 mb-2">Caio & Evelyn</h1>
            <p className="text-xl text-gray-600 mb-6">Chá de Casa Nova / Enxoval</p>
            <div className="divider mb-8"></div>
            <p className="welcome-text">
              "Estamos muito felizes em compartilhar esse momento especial de montar nosso lar com você! 
              Sua presença e carinho são os melhores presentes."
            </p>
          </div>

          <div className="max-w-md card mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Identifique-se</h2>
            <div className="space-y-5">
              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Nome Completo *</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input" placeholder="Seu nome" disabled={loading} />
              </div>
              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Telefone *</label>
                <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="input" placeholder="(00) 00000-0000" disabled={loading} />
              </div>
              <button onClick={handleGuestIdentification} disabled={loading} className="btn btn-primary">{loading ? 'Aguarde...' : 'Entrar'}</button>
            </div>
            {/* BOTÃO ESTILIZADO: Admin */}
            <button onClick={() => setCurrentPage('adminLogin')} className="btn-text btn-text-gray w-full mt-4">
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
        <div className="max-w-md mx-auto card text-center">
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
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Você pode selecionar as duas opções se desejar! ❤️
              </p>
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
    
    return (
      <div className="min-h-screen bg-gradient py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Olá, {currentGuest.name}! 👋</h2>
            <p className="text-gray-600">Escolha como prefere nos presentear</p>
          </div>

          {hasSelection && (
            <div className="card mb-8" style={{backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981'}}>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <CheckCircle size={24} style={{color: '#10b981', marginRight: '0.5rem'}} />
                Resumo da Escolha
              </h3>
              
              <div style={{backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>
                {selectedGift && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">🎁 Presente:</p>
                        <p className="font-bold text-lg">{selectedGift.name}</p>
                        {selectedGift.link && (
                          <a href={selectedGift.link} target="_blank" rel="noopener noreferrer" className="link">
                            <ExternalLink size={16} style={{marginRight: '0.25rem'}} /> Ver sugestão
                          </a>
                        )}
                      </div>
                      <button onClick={handleRemoveGiftSelection} className="btn-text btn-text-red" style={{fontSize: '0.8rem'}}>Remover</button>
                    </div>
                  </div>
                )}
                
                {selectedPix && (
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">💰 Contribuição PIX:</p>
                        <p className="font-bold text-2xl text-green-600">R$ {selectedPix.amount.toFixed(2)}</p>
                      </div>
                      <button onClick={handleRemovePixSelection} className="btn-text btn-text-red" style={{fontSize: '0.8rem'}}>Remover</button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleFinalConfirmation} disabled={loading} className="btn btn-success" style={{fontSize: '1.125rem', padding: '1rem'}}>
                <Send size={24} /> {loading ? 'Enviando...' : 'Confirmar e Enviar'}
              </button>
            </div>
          )}

          <div className="card mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <DollarSign className="text-green-600" size={28} style={{marginRight: '0.5rem'}} />
              Opção 1: Contribuir via PIX
            </h3>
            <div className="max-w-md mx-auto">
              <div className="pix-box">
                <p className="text-sm text-gray-600">Chave PIX</p>
                <p className="pix-key">90299bd3-53b1-4a2b-b8b6-dd12e2b1a85a</p>
              </div>

              {!selectedPix ? (
                <>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={pixAmount}
                    onChange={(e) => setPixAmount(e.target.value)}
                    placeholder="Digite o valor (R$)"
                    className="input mb-4"
                  />
                  
                  {/* Botões de Valor Rápido EMBAIXO do Input */}
                  <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                    {[50, 100, 150, 200].map(val => (
                      <button
                        key={val}
                        onClick={() => handlePixPreset(val)}
                        className="btn"
                        style={{
                          width: 'auto', 
                          padding: '0.5rem 1rem',
                          backgroundColor: pixAmount === val.toString() ? '#ec4899' : '#f3f4f6',
                          color: pixAmount === val.toString() ? 'white' : '#4b5563',
                          border: '1px solid #d1d5db',
                          fontSize: '0.9rem'
                        }}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <button onClick={handleSelectPix} disabled={loading} className="btn btn-success">
                    <DollarSign size={20} /> Adicionar Valor PIX
                  </button>
                </>
              ) : (
                <div className="text-center p-4 bg-green-50 rounded text-green-800">
                  <CheckCircle className="icon-center mb-2" />
                  Valor de R$ {selectedPix.amount.toFixed(2)} adicionado!
                </div>
              )}
            </div>
          </div>

          <div className="card mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Gift className="text-pink-500" size={28} style={{marginRight: '0.5rem'}} />
              Opção 2: Lista de Presentes
            </h3>
            <p className="text-gray-600 mb-6 text-sm bg-gray-50 p-3 rounded border border-gray-200">
              ℹ️ <strong>Nota:</strong> Os links são sugestões de modelo. Compre onde preferir!
            </p>
            
            {gifts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Nenhum presente disponível no momento</p>
            ) : (
              // Usando grid-cols-2 em mobile/tablet e 3 apenas em telas bem grandes se couber
              <div className="grid grid-cols-2 gap-4">
                {gifts.map(gift => (
                  <div key={gift.id} className={`gift-card ${gift.reserved && !gift.allowMultiple ? 'reserved' : ''} ${selectedGift?.id === gift.id ? 'selected-card' : ''}`} style={selectedGift?.id === gift.id ? {borderColor: '#10b981', borderWidth: '2px'} : {}}>
                    {gift.image && <img src={gift.image} alt={gift.name} />}
                    <h4 className="font-bold text-md mb-1 leading-tight">{gift.name}</h4>
                    <p className="text-xs text-gray-600 mb-3">{gift.description}</p>
                    
                    <div className="mt-auto space-y-2">
                      {gift.reserved && !gift.allowMultiple ? (
                        <div className="badge badge-gray w-full"><Lock size={14} /> Esgotado</div>
                      ) : selectedGift?.id === gift.id ? (
                        <div className="badge badge-green w-full"><CheckCircle size={14} /> Selecionado</div>
                      ) : (
                        <button onClick={() => handleSelectGift(gift)} disabled={loading} className="btn btn-primary" style={{padding: '0.5rem', fontSize: '0.9rem'}}>
                          <Gift size={16} /> Selecionar
                        </button>
                      )}
                      {gift.link && (
                        <a href={gift.link} target="_blank" rel="noopener noreferrer" className="link block text-center text-xs">
                          <ExternalLink size={12} /> Ver modelo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN RENDER ---
  if (currentPage === 'adminLogin') {
    return (
      <div className="min-h-screen bg-gradient-gray flex items-center justify-center px-4">
        <div className="card" style={{maxWidth: '24rem', width: '100%'}}>
          <Lock className="icon-center text-gray-700 mb-4" size={48} />
          <h2 className="text-xl font-bold text-center mb-6">Área do Administrador</h2>
          {adminError && <div className="text-red-600 bg-red-100 p-2 rounded mb-4 text-sm">{adminError}</div>}
          <div className="space-y-4">
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="input" placeholder="Senha" />
            <button onClick={handleAdminLogin} className="btn btn-secondary">{loading ? '...' : 'Entrar'}</button>
          </div>
          {/* BOTÃO ESTILIZADO: Voltar */}
          <button onClick={() => setCurrentPage('home')} className="btn-text btn-text-gray w-full mt-4">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4" style={{backgroundColor: '#f3f4f6'}}>
        <div className="max-w-4xl mx-auto">
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Painel Administrativo</h2>
              {/* BOTÃO ESTILIZADO: Sair */}
              <button onClick={() => { setIsAdmin(false); setCurrentPage('home'); }} className="btn-text btn-text-red">
                Sair
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="stat-card badge-blue"><p>Participantes</p><h3>{guests.length}</h3></div>
              <div className="stat-card badge-green"><p>Itens Escolhidos</p><h3>{gifts.filter(g => g.reserved).length}</h3></div>
              <div className="stat-card badge-purple"><p>Contribuições PIX</p><h3>{pixContributions.length}</h3></div>
            </div>
            
            <h3 className="text-lg font-bold mb-4">
              {editingId ? `✏️ Editando: ${newGift.name}` : '➕ Adicionar Novo Item'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <input type="text" placeholder="Nome *" value={newGift.name} onChange={(e) => setNewGift({...newGift, name: e.target.value})} className="input" />
              <input type="text" placeholder="Descrição *" value={newGift.description} onChange={(e) => setNewGift({...newGift, description: e.target.value})} className="input" />
              <input type="url" placeholder="Imagem URL" value={newGift.image} onChange={(e) => setNewGift({...newGift, image: e.target.value})} className="input" />
              <input type="url" placeholder="Link Produto" value={newGift.link} onChange={(e) => setNewGift({...newGift, link: e.target.value})} className="input" />
              <label className="label-checkbox" style={{gridColumn: '1 / -1'}}>
                <input type="checkbox" checked={newGift.allowMultiple} onChange={(e) => setNewGift({...newGift, allowMultiple: e.target.checked})} className="checkbox" />
                <span>Permitir múltiplas compras</span>
              </label>
              
              {/* Botões do Form (Salvar ou Cancelar) */}
              <div style={{gridColumn: '1 / -1', display: 'flex', gap: '1rem'}}>
                <button onClick={handleSaveGift} disabled={loading} className={`btn ${editingId ? 'btn-primary' : 'btn-success'}`} style={{flex: 1}}>
                  {editingId ? <><Edit size={20} /> Salvar Alterações</> : <><Plus size={20} /> Adicionar Item</>}
                </button>
                {editingId && (
                  <button onClick={handleCancelEdit} disabled={loading} className="btn btn-secondary" style={{width: 'auto'}}>
                    <X size={20} /> Cancelar
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">📦 Lista de Itens ({gifts.length})</h3>
            <div className="grid grid-cols-3 gap-4">
              {gifts.map(gift => (
                <div key={gift.id} className="relative p-4 border rounded bg-white" style={editingId === gift.id ? {borderColor: '#ec4899', borderWidth: '2px'} : {}}>
                  {gift.image && <img src={gift.image} alt={gift.name} style={{width:'100%', height:'6rem', objectFit:'contain'}} />}
                  <h4 className="font-bold text-sm">{gift.name}</h4>
                  <p className="text-xs text-gray-600">{gift.description}</p>
                  {gift.reserved && <p className="text-xs text-green-600 font-bold mt-2">Escolhido por: {gift.reservedBy}</p>}
                  
                  {/* Botões de Ação do Card */}
                  <div className="absolute top-2 right-2 flex gap-4">
                    <button 
                      onClick={() => handleStartEdit(gift)} 
                      disabled={loading}
                      className="icon-btn" 
                      style={{backgroundColor: '#3b82f6'}}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteGift(gift.id)} 
                      disabled={loading} 
                      className="icon-btn"
                      title="Deletar"
                    >
                      <Trash2 size={16} />
                    </button>
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
      <div className="min-h-screen bg-gradient flex items-center justify-center px-4">
        <div className="text-center card max-w-md">
          <CheckCircle className="icon-center text-green-500 mb-6" size={96} />
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Obrigado!</h2>
          <p className="text-gray-600 mb-8">Sua confirmação e presente foram registrados com sucesso. Mal podemos esperar para te ver!</p>
          <button onClick={() => setCurrentPage('home')} className="btn btn-primary w-auto mx-auto px-8">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return null;
}