import React, { useState, useEffect } from 'react';
import { Heart, Gift, DollarSign, Lock, Trash2, Plus, ExternalLink, AlertCircle, CheckCircle, Send, Info } from 'lucide-react';
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
  // Alteração 3: Nova página 'intro' adicionada ao fluxo
  const [currentPage, setCurrentPage] = useState('home'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentGuest, setCurrentGuest] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Alteração 2: Removidos estados de Email e Companions
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  
  const [gifts, setGifts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [pixContributions, setPixContributions] = useState([]);
  
  const [pixAmount, setPixAmount] = useState('');
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedPix, setSelectedPix] = useState(null);
  
  // Alteração 5: Removido estado noContribution
  
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
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
      const giftsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGifts(giftsData);
    } catch (error) {
      console.error('Erro ao carregar presentes:', error);
    }
  };

  const loadGuests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'guests'));
      const guestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGuests(guestsData);
    } catch (error) {
      console.error('Erro ao carregar convidados:', error);
    }
  };

  const loadPixContributions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'pixContributions'));
      const pixData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPixContributions(pixData);
    } catch (error) {
      console.error('Erro ao carregar contribuições:', error);
    }
  };

  const handleGuestIdentification = async () => {
    // Alteração 2: Validação simplificada (apenas nome e telefone)
    if (!guestName || !guestPhone) {
      alert('Por favor, preencha seu nome e telefone.');
      return;
    }
    
    setLoading(true);
    
    try {
      const guest = {
        name: guestName,
        phone: guestPhone,
        // email e companions removidos
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'guests'), guest);
      
      setCurrentGuest({ id: docRef.id, ...guest });
      
      // Alteração 3: Redireciona para a tela de Introdução em vez de presentes direto
      setCurrentPage('intro'); 
      
      await loadGuests();
    } catch (error) {
      console.error('Erro ao salvar convidado:', error);
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
    setSelectedPix(null);
    setPixAmount('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPix = () => {
    if (!pixAmount || parseFloat(pixAmount) <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }
    
    setSelectedPix({ amount: parseFloat(pixAmount) });
    setSelectedGift(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Alteração 5: Removida função handleSelectNoContribution

  const handleFinalConfirmation = async () => {
    // Alteração 5: Validação obriga escolher algo
    if (!selectedGift && !selectedPix) {
      alert('⚠️ Para confirmar sua presença, por favor selecione um presente ou uma contribuição PIX.');
      return;
    }

    if (!window.confirm('Deseja confirmar sua presença com essas informações?')) {
      return;
    }

    setLoading(true);
    
    try {
      const updateData = {
        confirmedAt: serverTimestamp()
      };

      if (selectedGift) {
        try {
          const giftRef = doc(db, 'gifts', selectedGift.id);
          await updateDoc(giftRef, {
            reserved: true,
            reservedBy: currentGuest.name,
            reservedById: currentGuest.id,
            reservedAt: serverTimestamp()
          });
          
          updateData.giftId = selectedGift.id;
          updateData.giftName = selectedGift.name;
        } catch (giftError) {
          console.error('Erro ao reservar presente:', giftError);
          throw new Error('Erro ao reservar o presente');
        }
      }
      
      if (selectedPix) {
        try {
          const pixDoc = await addDoc(collection(db, 'pixContributions'), {
            guestName: currentGuest.name,
            guestId: currentGuest.id,
            guestPhone: currentGuest.phone,
            amount: selectedPix.amount,
            timestamp: serverTimestamp()
          });
          
          updateData.pixAmount = selectedPix.amount;
          updateData.pixContributionId = pixDoc.id;
        } catch (pixError) {
          console.error('Erro ao salvar PIX:', pixError);
          throw new Error('Erro ao salvar contribuição PIX');
        }
      }

      try {
        const guestRef = doc(db, 'guests', currentGuest.id);
        await updateDoc(guestRef, updateData);
      } catch (guestError) {
        console.error('Erro ao atualizar convidado:', guestError);
        throw new Error('Erro ao atualizar dados do convidado');
      }
      
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
      console.error('Erro detalhado:', error);
      alert('❌ Erro ao confirmar presença: ' + error.message + '\n\nTente novamente ou entre em contato com os noivos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setAdminError('');
    setLoading(true);
    
    try {
      const adminDoc = await getDoc(doc(db, 'config', 'admin'));
      
      if (!adminDoc.exists()) {
        setAdminError('Configuração admin não encontrada.');
        setLoading(false);
        return;
      }
      
      const correctPassword = adminDoc.data().password;
      
      if (adminPassword === correctPassword) {
        setIsAdmin(true);
        setCurrentPage('admin');
        setAdminPassword('');
      } else {
        setAdminError('Senha incorreta! Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      setAdminError('Erro ao verificar senha. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGift = async () => {
    if (!newGift.name || !newGift.description) {
      alert('Preencha pelo menos nome e descrição');
      return;
    }
    setLoading(true);
    try {
      const gift = {
        ...newGift,
        reserved: false,
        reservedBy: null,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'gifts'), gift);
      await loadGifts();
      setNewGift({ name: '', description: '', image: '', link: '', allowMultiple: false });
      alert('✅ Presente adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar presente:', error);
      alert('❌ Erro ao adicionar presente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGift = async (giftId) => {
    if (!window.confirm('Tem certeza que deseja remover este presente?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'gifts', giftId));
      await loadGifts();
      alert('✅ Presente removido com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar presente:', error);
      alert('❌ Erro ao deletar.');
    } finally {
      setLoading(false);
    }
  };

  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient">
        <div className="container py-12">
          <div className="max-w-2xl text-center mb-12">
            <Heart className="icon-center text-pink-500" size={64} />
            <h1 className="text-5xl font-bold text-gray-800 mb-2">Caio & Evelyn</h1>
            <p className="text-xl text-gray-600 mb-8">14 de Dezembro de 2025</p>
            <div className="divider mb-8"></div>
          </div>

          <div className="max-w-md card">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Confirme sua Presença
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Nome Completo *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="input"
                  placeholder="Seu nome"
                  disabled={loading}
                />
              </div>

              {/* Alteração 2: Campo Email e Acompanhantes removidos */}

              <div>
                <label className="text-gray-700 font-medium mb-2" style={{display: 'block'}}>Telefone *</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="input"
                  placeholder="(00) 00000-0000"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleGuestIdentification}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Aguarde...' : 'Continuar'}
              </button>
            </div>

            <button
              onClick={() => setCurrentPage('adminLogin')}
              className="w-full mt-4 text-gray-600 text-sm"
              style={{background: 'none', border: 'none', cursor: 'pointer'}}
            >
              <Lock style={{display: 'inline'}} size={16} /> Área do Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Alteração 3: Nova Tela de Introdução
  if (currentPage === 'intro' && currentGuest) {
    return (
      <div className="min-h-screen bg-gradient py-12 px-4">
        <div className="max-w-2xl mx-auto card text-center">
          <Info className="icon-center text-blue-600 mb-4" size={48} />
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Como funciona?</h2>
          
          <div className="text-left space-y-4 mb-8 text-gray-600">
            <p className="text-lg">
              Olá <strong>{currentGuest.name}</strong>! Ficamos muito felizes com seu interesse em comparecer.
            </p>
            <p>
              Para confirmar sua presença no nosso casamento, preparamos uma lista de presentes virtual. Funciona assim:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Você pode escolher um <strong>valor via PIX</strong> (você define quanto quer dar).</li>
              <li>Ou escolher um <strong>item da nossa lista</strong> de sugestões.</li>
              <li>A confirmação da presença é feita automaticamente após a escolha do presente.</li>
            </ol>
            <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Os links dos produtos são apenas sugestões para facilitar. 
                Você pode comprar o mesmo item em outra loja de sua preferência ou usar o valor como referência.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentPage('gifts');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn btn-primary"
          >
            Entendi, ver opções de presentes
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'adminLogin') {
    return (
      <div className="min-h-screen bg-gradient-gray flex items-center justify-center px-4">
        <div className="card" style={{maxWidth: '28rem', width: '100%'}}>
          <Lock className="icon-center text-gray-700 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-center mb-6">Área do Administrador</h2>
          {adminError && (
            <div style={{
              backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem',
              padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={20} style={{color: '#dc2626'}} />
              <span style={{color: '#991b1b', fontSize: '0.875rem'}}>{adminError}</span>
            </div>
          )}
          <div className="space-y-4">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Senha do administrador"
              className="input"
              disabled={loading}
            />
            <button onClick={handleAdminLogin} className="btn btn-secondary" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
          <button
            onClick={() => { setCurrentPage('home'); setAdminPassword(''); setAdminError(''); }}
            className="w-full mt-4 text-gray-600"
            style={{background: 'none', border: 'none', cursor: 'pointer'}}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4" style={{backgroundColor: '#f3f4f6'}}>
        <div className="max-w-6xl mx-auto">
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Painel Administrativo</h2>
              <button
                onClick={() => { setIsAdmin(false); setCurrentPage('home'); }}
                className="text-red-600"
                style={{background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600'}}
              >
                Sair
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="stat-card badge-blue">
                <p>Convidados Confirmados</p>
                <h3 style={{color: '#1e40af'}}>{guests.length}</h3>
              </div>
              <div className="stat-card badge-green">
                <p>Presentes Reservados</p>
                <h3 style={{color: '#065f46'}}>{gifts.filter(g => g.reserved).length}</h3>
              </div>
              <div className="stat-card badge-purple">
                <p>Contribuições PIX</p>
                <h3 style={{color: '#6b21a8'}}>{pixContributions.length}</h3>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4">➕ Adicionar Novo Presente</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <input
                type="text" placeholder="Nome do presente *" value={newGift.name}
                onChange={(e) => setNewGift({...newGift, name: e.target.value})} className="input" disabled={loading}
              />
              <input
                type="text" placeholder="Descrição *" value={newGift.description}
                onChange={(e) => setNewGift({...newGift, description: e.target.value})} className="input" disabled={loading}
              />
              <input
                type="url" placeholder="URL da imagem (opcional)" value={newGift.image}
                onChange={(e) => setNewGift({...newGift, image: e.target.value})} className="input" disabled={loading}
              />
              <input
                type="url" placeholder="Link do produto (opcional)" value={newGift.link}
                onChange={(e) => setNewGift({...newGift, link: e.target.value})} className="input" disabled={loading}
              />
              <label className="label-checkbox" style={{gridColumn: '1 / -1'}}>
                <input
                  type="checkbox" checked={newGift.allowMultiple}
                  onChange={(e) => setNewGift({...newGift, allowMultiple: e.target.checked})} className="checkbox" disabled={loading}
                />
                <span>✅ Permitir múltiplas pessoas comprarem este item</span>
              </label>
              <button
                onClick={handleAddGift} disabled={loading} className="btn btn-success" style={{gridColumn: '1 / -1'}}
              >
                <Plus size={20} /> {loading ? 'Adicionando...' : 'Adicionar Presente'}
              </button>
            </div>

            <h3 className="text-xl font-bold mb-4">📦 Presentes Cadastrados ({gifts.length})</h3>
            <div className="grid grid-cols-3 gap-4">
              {gifts.map(gift => (
                <div key={gift.id} className="relative" style={{border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: 'white'}}>
                  {gift.image && (
                    <img src={gift.image} alt={gift.name} style={{width: '100%', height: '8rem', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '0.5rem'}} />
                  )}
                  <h4 className="font-bold">{gift.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{gift.description}</p>
                  {gift.reserved && (
                    <p className="text-xs text-green-600 font-semibold">✅ Reservado por: {gift.reservedBy}</p>
                  )}
                  <button
                    onClick={() => handleDeleteGift(gift.id)} disabled={loading}
                    className="icon-btn absolute top-2 right-2" title="Deletar presente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'gifts' && currentGuest) {
    const hasSelection = selectedGift || selectedPix;
    
    return (
      <div className="min-h-screen bg-gradient py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Olá, {currentGuest.name}! 👋
            </h2>
            <p className="text-gray-600">Escolha uma forma de presentear para confirmar sua presença</p>
          </div>

          {hasSelection && (
            <div className="card mb-8" style={{backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981'}}>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <CheckCircle size={24} style={{color: '#10b981', marginRight: '0.5rem'}} />
                Resumo da sua Escolha
              </h3>
              
              <div style={{backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>
                {selectedGift && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">🎁 Presente Selecionado:</p>
                    <p className="font-bold text-lg">{selectedGift.name}</p>
                    <p className="text-gray-600">{selectedGift.description}</p>
                    {selectedGift.link && (
                      <a href={selectedGift.link} target="_blank" rel="noopener noreferrer" className="link" style={{marginTop: '0.5rem', display: 'inline-flex'}}>
                        <ExternalLink size={16} style={{marginRight: '0.25rem'}} /> Ver produto (Sugestão)
                      </a>
                    )}
                  </div>
                )}
                
                {selectedPix && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">💰 Contribuição PIX:</p>
                    <p className="font-bold text-2xl text-green-600">R$ {selectedPix.amount.toFixed(2)}</p>
                    <div style={{marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem'}}>
                      <p className="text-xs text-gray-600">Chave PIX:</p>
                      <p className="pix-key" style={{fontSize: '0.875rem'}}>90299bd3-53b1-4a2b-b8b6-dd12e2b1a85a</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleFinalConfirmation}
                disabled={loading}
                className="btn btn-success"
                style={{fontSize: '1.125rem', padding: '1rem'}}
              >
                <Send size={24} />
                {loading ? 'Enviando...' : 'Confirmar Presença e Enviar'}
              </button>
            </div>
          )}

          {!hasSelection && (
            <div className="card mb-4" style={{backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '1rem'}}>
              <p className="text-gray-800" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
                <AlertCircle size={20} style={{color: '#f59e0b', flexShrink: 0}} />
                <span><strong>Escolha uma das opções abaixo</strong> para confirmar sua presença</span>
              </p>
            </div>
          )}

          {/* Alteração 4: PIX primeiro */}
          <div className="card mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <DollarSign className="text-green-600" size={32} style={{marginRight: '0.75rem'}} />
              Opção 1: Contribuir via PIX
            </h3>
            
            <div className="max-w-md mx-auto">
              <p className="text-gray-600 mb-4 text-center">
                Escolha qualquer valor que desejar para nos presentear.
              </p>
              <div className="pix-box">
                <p className="text-sm text-gray-600">Chave PIX</p>
                <p className="pix-key">90299bd3-53b1-4a2b-b8b6-dd12e2b1a85a</p>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={pixAmount}
                onChange={(e) => setPixAmount(e.target.value)}
                placeholder="Valor (R$)"
                className="input mb-4"
                disabled={loading || selectedPix}
              />
              {selectedPix ? (
                <div className="badge badge-green w-full" style={{padding: '1rem', fontSize: '1rem'}}>
                  <CheckCircle size={20} /> Valor de R$ {selectedPix.amount.toFixed(2)} selecionado
                </div>
              ) : (
                <button
                  onClick={handleSelectPix}
                  disabled={loading}
                  className="btn btn-success"
                >
                  <DollarSign size={20} />
                  Selecionar Contribuição PIX
                </button>
              )}
            </div>
          </div>

          {/* Alteração 4: Presentes depois */}
          <div className="card mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <Gift className="text-pink-500" size={32} style={{marginRight: '0.75rem'}} />
              Opção 2: Lista de Presentes
            </h3>
            {/* Alteração 6: Disclaimer explícito */}
            <p className="text-gray-600 mb-6 text-sm bg-gray-50 p-2 rounded border border-gray-200">
              ℹ️ <strong>Nota:</strong> Os links nos botões "Ver produto" são apenas sugestões de modelo/marca. 
              Você pode comprar em qualquer loja física ou online de sua preferência.
            </p>
            
            {gifts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Nenhum presente disponível no momento</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {gifts.map(gift => (
                  <div 
                    key={gift.id} 
                    className={`gift-card ${gift.reserved && !gift.allowMultiple ? 'reserved' : ''} ${selectedGift?.id === gift.id ? 'selected-card' : ''}`}
                    style={selectedGift?.id === gift.id ? {borderColor: '#10b981', borderWidth: '3px'} : {}}
                  >
                    {gift.image && <img src={gift.image} alt={gift.name} />}
                    <h4 className="font-bold text-lg mb-2">{gift.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{gift.description}</p>
                    
                    {gift.reserved && !gift.allowMultiple ? (
                      <div className="badge badge-gray w-full">
                        <Lock size={16} /> Já foi escolhido
                      </div>
                    ) : selectedGift?.id === gift.id ? (
                      <div className="badge badge-green w-full">
                        <CheckCircle size={16} /> Selecionado
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectGift(gift)}
                        disabled={loading}
                        className="btn btn-primary"
                      >
                        <Gift size={16} />
                        Vou dar este presente
                      </button>
                    )}
                    
                    {gift.link && (
                      <a href={gift.link} target="_blank" rel="noopener noreferrer" className="link" style={{display: 'block', textAlign: 'center', marginTop: '0.5rem'}}>
                        <ExternalLink size={16} /> Ver produto (Exemplo)
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alteração 5: Removido botão de "Não dar nada" */}
        </div>
      </div>
    );
  }

  if (currentPage === 'thanks') {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center px-4">
        <div className="text-center card max-w-md">
          <CheckCircle className="icon-center text-green-500 mb-6" size={96} />
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Presença Confirmada!</h2>
          <p className="text-xl text-gray-600 mb-4">Muito obrigado por confirmar!</p>
          <p className="text-gray-600 mb-8">
            Seus dados e sua escolha de presente foram salvos com sucesso.<br />
            Aguardamos você no nosso dia especial! 
          </p>
          <button
            onClick={() => { setCurrentPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="btn btn-primary"
            style={{width: 'auto', paddingLeft: '2rem', paddingRight: '2rem', margin: '0 auto'}}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return null;
}