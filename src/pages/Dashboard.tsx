import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../lib/sso'
import {
  Transacao,
  getTransacoes,
  salvarTransacao,
  deletarTransacao,
  atualizarTransacao,
  calcularSaldos,
} from '../lib/financeiro'
import '../styles/dashboard.css'

export function Dashboard() {
  const navigate = useNavigate()
  const session = getSession()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoria: 'Outros',
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    setTransacoes(getTransacoes())
  }, [])

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.descricao || !formData.valor) return

    const novaTransacao = {
      tipo: formData.tipo,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data: formData.data,
      categoria: formData.categoria,
    }

    if (editingId) {
      atualizarTransacao(editingId, novaTransacao)
      setEditingId(null)
    } else {
      salvarTransacao(novaTransacao)
    }

    setTransacoes(getTransacoes())
    setFormData({
      tipo: 'entrada',
      descricao: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      categoria: 'Outros',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta transação?')) {
      deletarTransacao(id)
      setTransacoes(getTransacoes())
    }
  }

  const handleEdit = (transacao: Transacao) => {
    setEditingId(transacao.id)
    setFormData({
      tipo: transacao.tipo,
      descricao: transacao.descricao,
      valor: transacao.valor.toString(),
      data: transacao.data,
      categoria: transacao.categoria,
    })
  }

  const saldos = calcularSaldos(transacoes)

  return (
    <div className="dashboard">
      <header className="header">
        <h1>💰 Controle Financeiro</h1>
        <div className="user-info">
          <span>Bem-vindo, {session?.name}!</span>
          <button onClick={handleLogout} className="btn-logout">
            Sair
          </button>
        </div>
      </header>

      <main className="container">
        <section className="cards-saldo">
          <div className="card">
            <h3>Entradas</h3>
            <p className="value entrada">+ R$ {saldos.entradas.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Saídas</h3>
            <p className="value saida">- R$ {saldos.saidas.toFixed(2)}</p>
          </div>
          <div className="card total">
            <h3>Saldo</h3>
            <p className={`value ${saldos.saldo >= 0 ? 'positivo' : 'negativo'}`}>
              R$ {saldos.saldo.toFixed(2)}
            </p>
          </div>
        </section>

        <section className="form-section">
          <h2>{editingId ? 'Editar Transação' : 'Nova Transação'}</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Tipo:</label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' })
                }
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div className="form-group">
              <label>Descrição:</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Salário, Supermercado..."
              />
            </div>

            <div className="form-group">
              <label>Valor:</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Data:</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Categoria:</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                <option value="Outros">Outros</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Saúde">Saúde</option>
                <option value="Educação">Educação</option>
                <option value="Lazer">Lazer</option>
                <option value="Salário">Salário</option>
              </select>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-submit">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      tipo: 'entrada',
                      descricao: '',
                      valor: '',
                      data: new Date().toISOString().split('T')[0],
                      categoria: 'Outros',
                    })
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="transacoes-section">
          <h2>Histórico de Transações</h2>
          {transacoes.length === 0 ? (
            <p className="empty-state">Nenhuma transação registrada ainda.</p>
          ) : (
            <div className="transacoes-list">
              {transacoes.map((transacao) => (
                <div key={transacao.id} className={`transacao-item ${transacao.tipo}`}>
                  <div className="transacao-info">
                    <h4>{transacao.descricao}</h4>
                    <p className="categoria">{transacao.categoria}</p>
                    <p className="data">
                      {new Date(transacao.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="transacao-valor">
                    <p className="valor">
                      {transacao.tipo === 'entrada' ? '+' : '-'} R$ {transacao.valor.toFixed(2)}
                    </p>
                  </div>
                  <div className="transacao-actions">
                    <button
                      onClick={() => handleEdit(transacao)}
                      className="btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(transacao.id)}
                      className="btn-delete"
                      title="Deletar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
