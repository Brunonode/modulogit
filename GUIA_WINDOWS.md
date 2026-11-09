# Guia de Instalação no Windows 🪟

Passo a passo para colocar o **Agregador de Notícias Jurídicas** para rodar
todas as manhãs no seu computador com Windows. Não precisa saber programar —
basta seguir na ordem.

> 💡 Dica: faça uma etapa de cada vez. Se algo der errado, pare nessa etapa e
> peça ajuda antes de seguir.

---

## Passo 1 — Instalar o Python

O Python é o "motor" que executa o programa.

1. Acesse: https://www.python.org/downloads/
2. Clique no botão amarelo **"Download Python"** (a versão mais recente serve).
3. Abra o arquivo baixado.
4. **MUITO IMPORTANTE:** na primeira tela, marque a caixinha
   **"Add python.exe to PATH"** (fica embaixo). Sem isso, os próximos passos
   não funcionam.
5. Clique em **"Install Now"** e aguarde terminar.

**Como conferir se deu certo:**
- Abra o menu Iniciar, digite `cmd` e abra o **Prompt de Comando**.
- Digite o comando abaixo e tecle Enter:
  ```
  python --version
  ```
- Deve aparecer algo como `Python 3.12.x`. Se aparecer, está tudo certo.

---

## Passo 2 — Baixar o projeto

1. Acesse a página do projeto no GitHub:
   https://github.com/Brunonode/modulogit
2. Clique no botão verde **"Code"** e depois em **"Download ZIP"**.
3. Encontre o arquivo ZIP baixado (geralmente na pasta **Downloads**).
4. Clique nele com o botão direito → **"Extrair tudo..."** → escolha um lugar
   fácil de achar, por exemplo a **Área de Trabalho**.
5. Você terá uma pasta chamada algo como `modulogit-master`.

---

## Passo 3 — Instalar as dependências

As "dependências" são peças extras que o programa usa (para acessar sites e
enviar e-mail).

1. Abra a pasta do projeto (a que você extraiu).
2. Clique na barra de endereço da janela (onde aparece o caminho da pasta),
   apague o que estiver escrito, digite `cmd` e tecle Enter.
   Isso abre o Prompt de Comando **já dentro da pasta certa**.
3. Digite o comando abaixo e tecle Enter:
   ```
   pip install -r requirements.txt
   ```
4. Aguarde baixar e instalar (pode levar um minuto).

---

## Passo 4 — Criar o seu arquivo de configuração

1. Na pasta do projeto, encontre o arquivo **`config.example.yaml`**.
2. Copie e cole esse arquivo na mesma pasta (Ctrl+C, Ctrl+V).
3. Renomeie a cópia para exatamente **`config.yaml`**.
4. Abra o `config.yaml` com o **Bloco de Notas** (botão direito →
   "Abrir com" → "Bloco de Notas").
5. Ajuste os campos do e-mail. No seu caso:
   ```yaml
   email:
     servidor_smtp: "smtp.gmail.com"
     porta: 587
     usar_tls: true
     remetente: "bacustodio@gmail.com"
     senha: ""          # vamos preencher no Passo 5
     destinatario: "bacustodio@gmail.com"
     assunto: "Resumo Diário — Notícias Jurídicas"
   ```
6. Se quiser, ajuste também a lista de `termos_de_busca` com os assuntos que
   mais te interessam. Salve o arquivo (Ctrl+S).

---

## Passo 5 — Criar a "Senha de app" do Gmail

O Gmail **não** aceita sua senha normal em programas. É preciso gerar uma
"Senha de app", que é um código especial só para isso.

> ⚠️ Pré-requisito: sua conta Google precisa ter a **verificação em duas
> etapas** ativada. Se não tiver, ative primeiro em:
> https://myaccount.google.com/security

1. Acesse: https://myaccount.google.com/apppasswords
2. Dê um nome qualquer para identificar (ex.: `Noticias Juridicas`).
3. Clique em **Criar**. O Google mostrará um código de **16 letras**
   (ex.: `abcd efgh ijkl mnop`).
4. Copie esse código **sem os espaços** e cole no `config.yaml`, no campo
   `senha`:
   ```yaml
     senha: "abcdefghijklmnop"
   ```
5. Salve o arquivo.

> 🔒 Esse arquivo fica só no seu computador e não é enviado para o GitHub
> (ele está protegido pelo `.gitignore`). Ainda assim, não compartilhe o
> `config.yaml` com ninguém, pois ele contém a senha.

---

## Passo 6 — Testar

Vamos primeiro testar **sem enviar e-mail**, só para ver se a coleta funciona:

No Prompt de Comando (ainda dentro da pasta do projeto), digite:
```
python main.py --sem-email
```
Deve aparecer o relatório na tela.

Agora o teste **com envio de e-mail de verdade**:
```
python main.py
```
Em poucos segundos o resumo deve chegar na sua caixa de entrada
(`bacustodio@gmail.com`). Confira também a pasta de Spam na primeira vez.

---

## Passo 7 — Agendar para rodar toda manhã

Vamos usar o **Agendador de Tarefas** do Windows para o programa rodar sozinho
todo dia, por exemplo às **7h**.

1. Abra o menu Iniciar, digite **"Agendador de Tarefas"** e abra o programa.
2. No menu à direita, clique em **"Criar Tarefa Básica..."**.
3. **Nome:** `Notícias Jurídicas Diárias` → Avançar.
4. **Disparador:** escolha **"Diariamente"** → Avançar → defina a hora
   (ex.: 07:00) → Avançar.
5. **Ação:** escolha **"Iniciar um programa"** → Avançar.
6. Preencha:
   - **Programa/script:** `python`
   - **Adicionar argumentos:** `main.py`
   - **Iniciar em:** o caminho completo da pasta do projeto
     (ex.: `C:\Users\SEU_USUARIO\Desktop\modulogit-master`).
     > Para descobrir o caminho: abra a pasta, clique na barra de endereço e
     > copie o texto que aparece.
7. Avançar → **Concluir**.

Pronto! Todo dia, no horário escolhido, o resumo chegará no seu e-mail
automaticamente — desde que o computador esteja **ligado** naquele horário.

> 💡 Se o computador costuma estar desligado de manhã, deixe o horário para
> um momento em que ele esteja ligado, ou considere rodar na nuvem (me
> pergunte sobre isso quando quiser).

---

## Problemas comuns

| Sintoma | Provável causa / solução |
|---|---|
| `'python' não é reconhecido...` | O Python não foi adicionado ao PATH. Reinstale marcando "Add python.exe to PATH" (Passo 1). |
| Erro de login no envio (`Authentication failed`) | A senha no `config.yaml` não é uma Senha de app, ou foi colada com espaços. Refaça o Passo 5. |
| O e-mail não chega | Veja a pasta de Spam; confira se remetente e destinatário estão corretos. |
| Uma fonte aparece com "erro ao acessar" | O site pode estar fora do ar ou mudou de estrutura. As outras fontes continuam funcionando normalmente. |
| Nenhuma manchete encontrada | Normal em dias sem notícias sobre os termos; ou o site mudou de layout (pode precisar ajustar a URL/seletor no `config.yaml`). |

---

Qualquer dúvida em qualquer passo, me chame que eu te ajudo. 🙂
