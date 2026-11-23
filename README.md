# Portfólio de Jonhnes Monteiro
Portfólio em português sobre infraestrutura, redes e o homelab. Inclui quatro imagens de certificados, quatro posições para imagens dos projetos, galeria de imagens com três posições adicionais para o editor e currículo em PDF.

## Executar no computador
1. Extraia todo o ZIP. Instale o Node.js 22 ou superior.
2. Abra o terminal na pasta do projeto e execute `node local.mjs`.
3. Abra `http://127.0.0.1:3000`. O pacote contém a versão compilada e dispensa instalação de dependências.

## Editar arquivos pelo site
No primeiro início, a versão local cria o arquivo privado `.local-data/editor.key`. Copie o conteúdo e abra o endereço local seguido de `/#editar=` e da chave. Na versão hospedada, use o link privado de edição que recebeu no chat.

Em **Sobre mim**, use **Adicionar foto** ao lado do nome para enviar seu retrato. Na seção de projetos, use **Adicionar imagem** ou **Trocar imagem** e preencha a legenda. Na seção Certificações, use **Adicionar certificado** para enviar uma imagem. Cada espaço aceita substituição. Fotos e imagens de certificados aceitam JPEG, PNG ou WebP, até 8 MB por arquivo. Em **Editar portfólio**, no rodapé, você pode configurar os perfis, enviar o currículo (PDF até 5 MB).

Os uploads locais ficam em `.local-data/`. Guarde essa pasta para preservar dados e chave local. A instalação hospedada guarda os uploads separadamente no armazenamento de objetos. O ZIP contém os quatro certificados enviados nesta conversa. Fotos, currículo e outros uploads feitos depois são específicos de cada instalação.

## Alterar o código
O conteúdo está em `src/index.html`, o visual em `src/assets/site.css`, a interface em `src/assets/site.js` e as rotas em `src/server.js`. A interface também usa Bootstrap 5.3.8, servido localmente de `src/assets/bootstrap.min.css` antes do CSS próprio, sem depender de CDN. As imagens da linha do tempo, dos projetos, dos certificados, do SGB-LAB e a ilustração do rack ficam em `src/assets/`. Depois de alterar os fontes, rode `python3 build.py` (no Windows, `py -3 build.py`) e reinicie o servidor. O build gera `dist/server/index.js`.

Se existir `.openai/hosting.json`, o build copia esse metadado para `dist/.openai/`. Esses arquivos locais ficam fora do repositório.

## Hospedagem
O projeto hospedado usa um Worker ES module e um bucket R2 com o binding BUCKET. A chave de edição em texto aberto da versão hospedada não faz parte do pacote. Para uma hospedagem independente, configure EDITOR_HASH com o SHA-256 de uma nova chave aleatória privada. O servidor local escuta apenas no loopback por padrão.
