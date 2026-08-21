# Agregador de Notícias Jurídicas 📰⚖️

Aplicação em Python que **automatiza a busca diária por notícias jurídicas**.
Todas as manhãs ela visita os sites de tribunais (STF, STJ, TJRJ) e portais
especializados (Migalhas, Conjur, etc.), procura por termos de interesse
(como *direito imobiliário*, *usucapião* e *desapropriação*), consolida as
manchetes em um único relatório e **envia o resumo por e-mail**.

---

## 📁 Estrutura do projeto

```
.
├── main.py                 # Ponto de entrada: orquestra todo o fluxo
├── config.example.yaml     # Modelo de configuração (copie para config.yaml)
├── requirements.txt        # Dependências do projeto
├── aggregator/             # Código-fonte organizado em módulos
│   ├── config.py           # Lê e valida o config.yaml
│   ├── coletor.py          # Visita os sites e coleta as manchetes (scraping)
│   ├── relatorio.py        # Consolida as manchetes em HTML e texto
│   └── enviador_email.py   # Envia o relatório por e-mail (SMTP)
└── relatorios/             # Cópias locais dos relatórios (geradas ao rodar)
```

Cada arquivo é comentado explicando **cada etapa do processo**, da coleta de
dados ao envio do e-mail.

---

## 🚀 Como usar

### 1. Instale as dependências

```bash
pip install -r requirements.txt
```

### 2. Crie o seu arquivo de configuração

Copie o modelo e edite os seus dados:

```bash
cp config.example.yaml config.yaml
```

No `config.yaml` você ajusta, **sem mexer no código**:

- **`termos_de_busca`** — as palavras que deseja monitorar;
- **`fontes`** — os sites a visitar (nome, URL e um seletor CSS opcional);
- **`email`** — servidor SMTP, remetente, senha e destinatário;
- **`opcoes`** — timeout, número máximo de manchetes por fonte, etc.

### 3. (Recomendado) Senha por variável de ambiente

Em vez de escrever a senha no arquivo, deixe `email.senha` em branco e defina:

```bash
export NOTICIAS_EMAIL_SENHA="sua_senha_de_app"
```

> **Gmail:** use uma **Senha de app** (não a senha normal da conta).
> Guia oficial: https://support.google.com/accounts/answer/185833

### 4. Rode o programa

```bash
python main.py               # coleta as notícias e envia o e-mail
python main.py --sem-email   # apenas testa a coleta, sem enviar e-mail
```

---

## ⏰ Agendamento (rodar todas as manhãs)

### Linux / macOS (cron)

Edite o cron com `crontab -e` e adicione a linha abaixo para rodar todo dia
às **7h da manhã** (ajuste o caminho do projeto):

```cron
0 7 * * * cd /caminho/para/o/projeto && /usr/bin/python3 main.py >> cron.log 2>&1
```

### Windows (Agendador de Tarefas)

1. Abra o **Agendador de Tarefas** → *Criar Tarefa Básica*;
2. Gatilho: **Diariamente**, às 07:00;
3. Ação: **Iniciar um programa** → `python` com argumento `main.py`;
4. Em "Iniciar em", informe a pasta do projeto.

---

## 🔧 Personalização das fontes

Cada fonte no `config.yaml` aceita um **seletor CSS** opcional. Se ele ficar
em branco, o programa varre **todos os links** da página e filtra pelos termos
de busca — funciona para a maioria dos sites. Se quiser resultados mais
precisos em um site específico, informe o seletor CSS que aponta para os
títulos das notícias (por exemplo, `.lista-noticias h2 a`).

> **Observação:** sites mudam sua estrutura com o tempo e alguns carregam o
> conteúdo via JavaScript. Se uma fonte parar de retornar resultados, revise
> a URL e o seletor no `config.yaml`.

---

## 📝 Licença

Projeto de uso pessoal/educacional.
