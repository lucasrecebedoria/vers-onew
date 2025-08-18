# Relatório de Diferenças — MoveBuss (UI Restaurada)

- Layout fibra de carbono + verde bandeira (campos compactos).
- Login/cadastro por matrícula (email gerado como `matricula@movebuss.local`).
- Admins (6266, 4144, 70029): criar/editar/excluir relatórios, filtro por matrícula, resumo.
- Usuários: visualizam apenas seus próprios relatórios; últimos 15 expandidos.

## Firebase
Cole as regras em **Firestore** e **Storage** conforme arquivos `firestore.rules` e `storage.rules` deste pacote.

## Observações
- Autocálculo de Sobra/Falta = Dinheiro - Folha.
- Pós conferência: somente admins podem editar/salvar/anexar/excluir imagens.
