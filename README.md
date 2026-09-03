# AzirLog — Sistema de Gestão

Sistema web para operação logística: extrai dados de notas fiscais eletrônicas (XML) e monta rotas de entrega otimizadas a partir de uma planilha do Google Sheets.

**Demo:** https://paolalemes.github.io/azirlog/

Roda inteiramente no navegador. Não há servidor, banco de dados nem build — os XMLs são lidos localmente pelo `FileReader` e nenhum arquivo é enviado para fora da máquina de quem usa.

## Módulos

**Extração de entregas**
Recebe múltiplos XMLs de NF-e e devolve uma tabela com data, número da nota, valor, destinatário, endereço, cidade e a quantidade por categoria de produto. O resultado pode ser copiado como TSV (cola direto no Google Sheets) ou exportado em `.xlsx`.

**Remessa / retorno**
Mesma leitura de XML, com agrupamento por nota e detalhamento item a item — quantidade, unidade, valor unitário e total — para controle de saldo.

**Roteirização**
Importa a planilha de entregas do mês via Google Sheets, geocodifica os endereços, divide as paradas entre os carros disponíveis e ordena cada rota. Permite filtrar por cidade e por status de entrega, escolher o critério de balanceamento e definir o endereço de saída. A saída sai em Excel ou em PDF pronto para o motorista.

## Como as rotas são calculadas

O ponto central do projeto. A divisão entre carros usa **k-means++** com múltiplos restarts, seguida de uma etapa de rebalanceamento que pode equilibrar por número de notas, por total de itens ou apenas por proximidade geográfica.

Cada rota é então ordenada por vizinho mais próximo com múltiplos pontos de partida e refinada por **2-opt** (elimina cruzamentos) e **or-opt** (realoca paradas isoladas). Por fim, uma passada entre rotas move paradas de um carro para outro quando a geometria justifica.

As distâncias reais vêm do Google Maps em duas estratégias, escolhidas pelo tamanho da rota:

- até 25 paradas — Directions API com `optimizeWaypoints`, que resolve o caixeiro-viajante do lado do Google;
- acima de 25 — Distance Matrix em blocos de 25×25 para montar a matriz de distâncias, e 2-opt sobre os valores reais. Trechos não cobertos pela matriz caem em distância de Haversine como aproximação.

## Stack

HTML, CSS e JavaScript sem framework. Bibliotecas via CDN: [SheetJS](https://sheetjs.com/) para Excel, [PapaParse](https://www.papaparse.com/) para CSV. Google Maps JavaScript API (Geocoding, Directions e Distance Matrix) para geocodificação e rotas.

## Estrutura

```
index.html                    marcação e navegação entre as páginas
assets/css/styles.css         estilos globais
assets/js/core.js             estado, navegação, upload de XML e utilitários
assets/js/xml-entregas.js     módulo de extração de entregas
assets/js/xml-remessa.js      módulo de remessa/retorno
assets/js/roteirizacao.js     importação da planilha e geocodificação
assets/js/otimizacao.js       k-means++, 2-opt, or-opt e inter-rotas
assets/js/rotas-render.js     tabela, impressão e exportação das rotas
assets/js/settings.js         chave da API e carregamento do SDK do Maps
```

## Configuração

A roteirização exige uma chave da Google Maps JavaScript API, informada em **Configurações** e guardada no `localStorage` do navegador — ela não fica no código nem no repositório.

Restrinja a chave por referenciador HTTP no Google Cloud Console (`paolalemes.github.io/*` e `localhost`) e habilite apenas Maps JavaScript, Geocoding, Directions e Distance Matrix. Sem restrição, qualquer pessoa que obtenha a chave consome a cota da conta.

## Rodando localmente

Como o projeto é estático, basta servir a pasta:

```bash
python3 -m http.server 8000
```

E abrir `http://localhost:8000`. Abrir o `index.html` direto pelo `file://` não funciona: a chamada ao Google Sheets é bloqueada por CORS.

## Limitações conhecidas

- A geocodificação é sequencial e fica lenta em volumes grandes de entregas.
- A planilha precisa ter cabeçalho com as colunas de nota, destinatário, endereço e cidade; a detecção é tolerante a acentos e maiúsculas, mas não a colunas ausentes.
- Endereços que o Google não consegue geocodificar são listados à parte e ficam fora da rota.
