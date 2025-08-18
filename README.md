# Relatório de Diferenças — versão admin UI
- Apenas **admins (6266, 4144, 70029)** criam/editar/excluem relatórios.
- Usuários comuns: apenas leitura dos **próprios** relatórios.

## Deploy
npm i -g firebase-tools
firebase login
firebase init     # Hosting + Firestore + Storage (pasta 'public')
firebase deploy

## Firebase Console
- Authentication: habilite e-mail/senha e adicione domínio `movebuss.local`.
- Firestore Rules: publique o arquivo `firestore.rules`.
- Storage Rules: publique o arquivo `storage.rules`.
