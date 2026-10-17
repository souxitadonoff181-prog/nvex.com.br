# Colocar no ar (ordem certa)

## 1. Publicar o site (Railway)
1. Crie conta no github.com e suba esta pasta num repositorio novo (o .env nao vai, o .gitignore cuida)
2. railway.app > New Project > Deploy from GitHub repo
3. Settings > Networking > Generate Domain  -> anote a URL (https://xxxx.up.railway.app)
4. Aba Volumes > New Volume, mount path `/data`
5. Aba Variables:
   NODE_ENV=production
   DATA_DIR=/data
   SESSION_SECRET=(frase longa aleatoria)
   BASE_URL=(a URL do passo 3)

## 2. Discord (login real)
1. discord.com/developers/applications > New Application
2. OAuth2 > Redirects > Add: `SUA_URL/callback`  (ex: https://xxxx.up.railway.app/callback) > Save
3. Copie Client ID e Client Secret para as Variables: DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET

## 3. E-mail real (codigo do Google)
1. Conta Gmail com verificacao em 2 etapas ligada
2. myaccount.google.com/apppasswords > crie uma senha de app (16 letras)
3. Variables: SMTP_USER=seuemail@gmail.com  SMTP_PASS=(a senha de app, sem espacos)

## 4. Bot do Discord (opcional)
No mesmo app do Discord: aba Bot > Reset Token (copie). Convide o bot:
https://discord.com/oauth2/authorize?client_id=SEU_APP_ID&scope=bot+applications.commands
Depois siga os passos da pagina "Add Bot Key" do painel.

Backup: copie o arquivo data.db de vez em quando.
