document.addEventListener("DOMContentLoaded", () => {
  const dashboardContainer = document.getElementById("dashboard-container");
  const progressBar = document.getElementById("progress-bar");

  // =========================================================================
  // CONFIGURAÇÃO: SEUS LINKS ORGANIZADOS
  // =========================================================================
  const SHEET_URLS = {
    // Slide 2: Ranking (Colunas: CONSULTOR, TEND%)
    ranking:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=1600633914&single=true&output=csv",

    // Slide 3: Positivação (Colunas: CONSULTOR, VENDA, META)
    positivacao:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=577000856&single=true&output=csv",

    // Slide 5: Horário (Colunas: VENDEDOR, SEG, TER, QUA, QUI, SEX)
    horario:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=1787962885&single=true&output=csv",

    // Slide 7: Meta Semanal (Colunas: VENDEDOR, 1º, 2º, 3º, 4º, 5º)
    metaSemanal:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=1475891190&single=true&output=csv",

    // Slide 9: Gráfico Pontos (Colunas: NOME, PONTOS)
    podioMes:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=1467795128&single=true&output=csv",

    // Slide 9: Bolinhas (Colunas: SEMANA, NOME, PONTOS, FOTO)
    vencedoresSemana:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3Ov8l0GVetC6ywdnbQnBljOecI21rjuMYrwcjWypC1V1NBUNAWmKIo4Pn698p4Q/pub?gid=825950443&single=true&output=csv",
  };

  let config = {
    rotationSpeedMs: 5000,
    headerMonth: "MÊS: JANEIRO",
    headerWeek: "1ª Semana",
  };

  let slidesData = [];
  let currentSlideIndex = 0;
  let rotationInterval;
  let progressAnimation;

  // --- 1. CARREGAR TODAS AS PLANILHAS ---
  async function fetchDashboardData() {
    try {
      // Baixa os 6 arquivos CSV simultaneamente
      const responses = await Promise.all([
        fetch(SHEET_URLS.ranking),
        fetch(SHEET_URLS.positivacao),
        fetch(SHEET_URLS.horario),
        fetch(SHEET_URLS.metaSemanal),
        fetch(SHEET_URLS.podioMes),
        fetch(SHEET_URLS.vencedoresSemana),
      ]);

      // Verifica se algum falhou
      for (let res of responses) {
        if (!res.ok)
          throw new Error(
            "Erro ao carregar uma das planilhas. Verifique os links."
          );
      }

      // Converte todos para texto e depois JSON
      const [
        txtRanking,
        txtPositivacao,
        txtHorario,
        txtMeta,
        txtPodio,
        txtVencedores,
      ] = await Promise.all(responses.map((r) => r.text()));

      const dataRanking = csvToJson(txtRanking);
      const dataPositivacao = csvToJson(txtPositivacao);
      const dataHorario = csvToJson(txtHorario);
      const dataMeta = csvToJson(txtMeta);
      const dataPodio = csvToJson(txtPodio);
      const dataVencedores = csvToJson(txtVencedores);

      // Gera os slides com os dados frescos
      generateSlides(
        dataRanking,
        dataPositivacao,
        dataHorario,
        dataMeta,
        dataPodio,
        dataVencedores
      );

      initDashboard();
    } catch (error) {
      console.error(error);
      dashboardContainer.innerHTML = `<div class="loading-state" style="color:red; text-align:center; padding:20px;">
                Erro ao carregar dados.<br>${error.message}
            </div>`;
    }
  }

  // --- Auxiliar: CSV para JSON ---
  function csvToJson(csv) {
    const lines = csv.split("\n");
    const result = [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const obj = {};
      // Regex para lidar com vírgulas dentro de aspas (ex: "1.200,00")
      const currentline =
        lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

      headers.forEach((header, j) => {
        let val = currentline[j] ? currentline[j].replace(/"/g, "").trim() : "";
        obj[header] = val;
      });
      result.push(obj);
    }
    return result;
  }

  // --- Auxiliar: Formatar Número BR ---
  function parseBrNumber(str) {
    if (!str) return 0;
    const cleanStr = str
      .replace(/[R$%\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    return parseFloat(cleanStr) || 0;
  }

  // --- 2. GERADOR DE SLIDES ---
  // --- 2. GERADOR DE SLIDES ATUALIZADO ---
  function generateSlides(
    rankingData,
    positivacaoData,
    horarioData,
    metaData,
    podioData,
    vencedoresData
  ) {
    // 1. Processa Ranking (Lê a coluna FOTO agora)
    const rankingProcessed = rankingData
      .filter(
        (row) => row["CONSULTOR"] && row["CONSULTOR"].toUpperCase() !== "TOTAL"
      )
      .map((row) => {
        const valTendencia = parseBrNumber(row["TEND%"]);

        // LÓGICA DA FOTO: Se tiver na planilha, usa. Se não, gera avatar.
        const photoPath =
          row["FOTO"] && row["FOTO"].trim() !== ""
            ? row["FOTO"]
            : `https://ui-avatars.com/api/?name=${row["CONSULTOR"]}&background=b91d24&color=fff&size=128`;

        return {
          name: row["CONSULTOR"],
          value: row["TEND%"].includes("%") ? row["TEND%"] : `${row["TEND%"]}%`,
          photoUrl: photoPath,
          numericValue: valTendencia,
          highlight: valTendencia >= 100,
        };
      })
      .sort((a, b) => b.numericValue - a.numericValue);

    // 2. Processa Positivação
    const chartProcessed = positivacaoData
      .filter((row) => row["CONSULTOR"])
      .map((row) => ({
        name: row["CONSULTOR"],
        done: parseBrNumber(row["VENDA"]),
        total: parseBrNumber(row["META"]),
      }));

    // 3. Processa Horário (Também tenta ler FOTO se você adicionar a coluna lá)
    const horarioProcessed = horarioData.map((row) => {
      const photoPath =
        row["FOTO"] && row["FOTO"].trim() !== ""
          ? row["FOTO"]
          : `https://ui-avatars.com/api/?name=${row["VENDEDOR"]}&background=b91d24&color=fff&rounded=true&size=32`;

      return {
        name: row["VENDEDOR"],
        photo: photoPath,
        data: [row["SEG"], row["TER"], row["QUA"], row["QUI"], row["SEX"]],
      };
    });

    // 4. Processa Meta Semanal
    const metaProcessed = metaData.map((row) => ({
      name: row["VENDEDOR"],
      data: [row["1º"], row["2º"], row["3º"], row["4º"], row["5º"]],
    }));

    // 5. Processa Gráfico do Slide 9
    const podioProcessed = podioData
      .map((row) => ({
        label: row["NOME"],
        value: parseBrNumber(row["PONTOS"]),
        highlight: false,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 6. Processa Bolinhas do Slide 9 (Lê FOTO)
    const vencedoresProcessed = vencedoresData.map((row) => ({
      week: row["SEMANA"],
      name: row["NOME"],
      points: row["PONTOS"],
      photo:
        row["FOTO"] && row["FOTO"].trim() !== ""
          ? row["FOTO"]
          : `https://ui-avatars.com/api/?name=${row["NOME"]}`,
      active: row["NOME"] && row["NOME"].toUpperCase() !== "CONSULTOR",
    }));

    // Campeão Geral (Top 1 do Ranking)
    const top1 =
      rankingProcessed.length > 0
        ? rankingProcessed[0]
        : { name: "Ninguém", value: "0%", photoUrl: "" };

    // --- LISTA DE SLIDES FINAL ---
    slidesData = [
      {
        id: "1",
        type: "intro",
        title: "RELATÓRIO DE RESULTADOS",
        subtitle: "Acompanhamento Semanal",
        icon: "fa-chart-line",
      },
      {
        id: "2",
        type: "ranking",
        title: "RANKING",
        subtitle: "META INDIVIDUAL",
        data: rankingProcessed,
      },
      {
        id: "3",
        type: "chart",
        title: "POSITIVAÇÃO",
        subtitle: "VENDA vs META",
        data: chartProcessed,
      },
      {
        id: "4",
        type: "intro",
        title: "PRIMÍCIA DA PREMIAÇÃO",
        subtitle: "DA META PRÊMIO",
        icon: "fa-trophy",
      },
      {
        id: "5",
        type: "table",
        title: "HORÁRIO DE ENTRADA",
        columns: ["SEG", "TER", "QUA", "QUI", "SEX"],
        rows: horarioProcessed,
      },
      {
        id: "6",
        type: "intro",
        title: "PREMIAÇÕES DA SEMANA",
        subtitle: "",
        icon: "fa-medal",
      },
      {
        id: "7",
        type: "meta-table",
        title: "META SEMANAL",
        columns: ["1º", "2º", "3º", "4º", "5º"],
        rows: metaProcessed,
      },

      // Slide 8 agora usa a foto local do Top 1 automaticamente
      {
        id: "8",
        type: "winner",
        title: "CAMPEÃO DE VENDAS",
        winnerName: top1.name,
        winnerPoints: top1.value + " REALIZADO",
        photoUrl: top1.photoUrl,
      },

      {
        id: "9",
        type: "champion-panel",
        theme: "red",
        title: "PAINEL DO CAMPEÃO DE VENDAS",
        chartData: podioProcessed,
        weeksData: vencedoresProcessed,
      },
      { id: "10", type: "outro", title: "OBRIGADO!" },
    ];
  }

  // --- 3. INICIALIZAÇÃO ---
  function initDashboard() {
    dashboardContainer.innerHTML = "";
    slidesData.forEach((slide, index) => {
      const slideElement = buildSlideElement(slide, index);
      dashboardContainer.appendChild(slideElement);
    });
    showSlide(currentSlideIndex);
    startRotationTimer();
  }

  // --- 4. RENDERIZADOR HTML ---
  function buildSlideElement(slideData, index) {
    const slideDiv = document.createElement("div");
    slideDiv.className = "slide";
    slideDiv.id = `slide-${index}`;

    // Header Padrão
    let headerHTML = "";
    if (
      !["intro", "winner", "outro", "champion-panel"].includes(slideData.type)
    ) {
      headerHTML = `
                <header class="slide-header">
                    <div class="header-titles">
                        <h1>${slideData.title}</h1>
                        ${
                          slideData.subtitle
                            ? `<h2>${slideData.subtitle}</h2>`
                            : ""
                        }
                    </div>
                    <div class="header-date-info">
                        <div class="month">${config.headerMonth}</div>
                        <div class="week">${config.headerWeek}</div>
                    </div>
                </header>`;
    }

    let contentHTML = "";

    switch (slideData.type) {
      case "intro":
        contentHTML = `
                    <div class="slide-intro-content">
                        ${
                          slideData.icon
                            ? `<i class="fas ${slideData.icon} intro-icon-large"></i>`
                            : ""
                        }
                        <h1 class="intro-title">${slideData.title}</h1>
                        ${
                          slideData.subtitle
                            ? `<h2 class="intro-subtitle">${slideData.subtitle}</h2>`
                            : ""
                        }
                    </div>`;
        break;

      case "ranking":
        contentHTML = `<div class="ranking-wrapper"><div class="ranking-grid">`;
        slideData.data.forEach((item) => {
          let rawValue =
            typeof item.value === "string"
              ? parseInt(item.value.replace(/\D/g, ""))
              : item.value;
          let visualWidth = rawValue > 100 ? 100 : rawValue;
          let textColorClass = visualWidth > 50 ? "text-white" : "";
          contentHTML += `
                        <div class="ranking-pill">
                            <div class="progress-fill" style="width: ${visualWidth}%"></div>
                            <img src="${item.photoUrl}" alt="${item.name}" class="rank-avatar">
                            <span class="rank-name ${textColorClass}">${item.name}</span>
                            <span class="rank-value ${textColorClass}">${item.value}</span>
                        </div>`;
        });
        contentHTML += `</div></div>`;
        break;

      case "chart":
        const maxDataValue = Math.max(...slideData.data.map((d) => d.total));
        let chartCeiling = Math.ceil(maxDataValue / 5) * 5;
        if (chartCeiling === maxDataValue || chartCeiling === 0)
          chartCeiling += 5;
        const gridSteps = 6;
        contentHTML = `
                <div class="chart-slide-container">
                    <div class="chart-legend">
                        <div class="legend-item"><div class="dot dot-red"></div> Feito</div>
                        <div class="legend-item"><div class="dot dot-grey"></div> Falta</div>
                    </div>
                    <div class="chart-body">
                        <div class="chart-grid-layer">`;
        for (let i = 0; i <= gridSteps; i++) {
          const lineValue = (chartCeiling / gridSteps) * i;
          const linePos = (lineValue / chartCeiling) * 100;
          contentHTML += `
                        <div class="grid-line-wrapper" style="bottom: ${linePos}%">
                            <div class="grid-line"></div>
                            <span class="grid-label-y">${Math.round(
                              lineValue
                            )}</span>
                        </div>`;
        }
        contentHTML += `</div><div class="chart-bars-layer">`;
        slideData.data.forEach((item) => {
          const falta = Math.max(0, item.total - item.done);
          const barTotalHeightPercent = (item.total / chartCeiling) * 100;
          const heightDonePercent = (item.done / item.total) * 100;
          const heightFaltaPercent = (falta / item.total) * 100;
          contentHTML += `
                        <div class="single-column-wrapper">
                            <span class="col-label-top">${Math.round(
                              item.total
                            ).toLocaleString("pt-BR")}</span>
                            <div class="stacked-bar-visual" style="height: ${barTotalHeightPercent}%">
                                <div class="bar-segment segment-top-falta" style="height: ${heightFaltaPercent}%">
                                    ${
                                      falta > 0
                                        ? Math.round(falta).toLocaleString(
                                            "pt-BR"
                                          )
                                        : ""
                                    }
                                </div>
                                <div class="bar-segment segment-bottom-feito" style="height: ${heightDonePercent}%">
                                     ${
                                       item.done > 0
                                         ? Math.round(item.done).toLocaleString(
                                             "pt-BR"
                                           )
                                         : ""
                                     }
                                </div>
                            </div>
                            <span class="col-label-bottom">${item.name}</span>
                        </div>`;
        });
        contentHTML += `</div></div></div>`;
        break;

      case "table":
        contentHTML = '<div class="table-container"><div class="table-grid">';
        contentHTML += `<div class="grid-header left-align">VENDEDOR</div>`;
        slideData.columns.forEach(
          (col) => (contentHTML += `<div class="grid-header">${col}</div>`)
        );
        slideData.rows.forEach((row) => {
          contentHTML += `<div class="grid-row-name"><img src="https://ui-avatars.com/api/?name=${row.name}&background=b91d24&color=fff&rounded=true&size=32" style="margin-right:10px"> ${row.name}</div>`;
          row.data.forEach((status) => {
            let icon = status;
            // Mapeia texto da planilha para ícones
            if (status.toLowerCase() === "ok")
              icon = '<i class="fas fa-check-circle status-ok"></i>';
            else if (status.toLowerCase() === "x")
              icon = '<i class="fas fa-times-circle status-x"></i>';
            else if (
              status.toLowerCase() === "ferias" ||
              status.toLowerCase() === "vacation"
            )
              icon = '<i class="fas fa-suitcase-rolling status-vacation"></i>';
            contentHTML += `<div class="grid-cell">${icon}</div>`;
          });
        });
        contentHTML += "</div></div>";
        break;

      case "meta-table":
        contentHTML = '<div class="table-container"><div class="table-grid">';
        contentHTML += `<div class="grid-header left-align" style="background:#666; color:white">Vendedor</div>`;
        slideData.columns.forEach(
          (col) =>
            (contentHTML += `<div class="grid-header" style="background:#666; color:white">${col}</div>`)
        );
        slideData.rows.forEach((row) => {
          contentHTML += `<div class="grid-row-name plain">${row.name}</div>`;
          row.data.forEach((val) => {
            let className = "grid-cell";
            if (val && val.toUpperCase() === "BATEU")
              className += " cell-success";
            contentHTML += `<div class="${className}">${val}</div>`;
          });
        });
        contentHTML += "</div></div>";
        break;

      case "winner":
        contentHTML = `
                    <div class="winner-content">
                        <i class="fas fa-crown crown-icon"></i>
                        <div class="winner-photo-container">
                            <img src="${slideData.photoUrl}" class="winner-photo">
                            <div class="winner-badge">1º</div>
                        </div>
                        <h1 class="winner-name">${slideData.winnerName}</h1>
                        <h2 class="winner-points">${slideData.winnerPoints}</h2>
                    </div>`;
        break;

      case "champion-panel":
        slideDiv.classList.add("slide-theme-red");
        headerHTML = `
                     <header class="slide-header">
                        <div class="header-titles">
                            <h1 style="color:#ffcc00">${slideData.title}</h1>
                        </div>
                    </header>`;

        contentHTML = `
                <div class="champion-panel-container">
                    <div class="cp-left-box">
                        <h2 class="cp-box-title">SOMA DE PONTOS <br><span style="font-size:0.6em; font-weight:400">MENSAL</span></h2>
                        <div class="cp-chart-area">`;

        const maxValCp =
          Math.max(...slideData.chartData.map((d) => d.value)) || 10;
        slideData.chartData.forEach((d) => {
          const widthPerc = (d.value / maxValCp) * 100;
          // Destaque condicional se quiser (aqui botei azul para todos ou lógica específica)
          const barColor = d.highlight ? "#4fc3f7" : "#9575cd";
          contentHTML += `
                        <div class="cp-bar-row">
                            <div class="cp-bar-label">${d.label}</div>
                            <div class="cp-bar-track">
                                <div class="cp-bar-fill" style="width: ${widthPerc}%; background-color: ${barColor}"></div>
                            </div>
                        </div>`;
        });

        contentHTML += `</div></div>
                    <div class="cp-right-box">`;

        slideData.weeksData.forEach((week, i) => {
          const isMystery = !week.active;
          const imgHTML = isMystery
            ? `<div class="cp-avatar mystery"><i class="fas fa-question"></i></div>`
            : `<img src="${week.photo}" class="cp-avatar">`;

          contentHTML += `
                        <div class="cp-week-item item-${i + 1}">
                            <div class="cp-week-label">${week.week}</div>
                            ${imgHTML}
                            <div class="cp-week-name">${week.name}</div>
                            <div class="cp-week-points">${week.points}</div>
                        </div>`;
        });
        contentHTML += `</div></div>`;
        break;

      case "outro":
        contentHTML = `
                    <div class="outro-content">
                        <h1>${slideData.title}</h1>
                        <div class="outro-footer"><i class="fas fa-star" style="color:#ccc; font-size:1.5rem"></i></div>
                    </div>`;
        break;
    }

    slideDiv.innerHTML = headerHTML + contentHTML;
    return slideDiv;
  }

  // --- 5. ROTAÇÃO ---
  function showSlide(index) {
    document
      .querySelectorAll(".slide")
      .forEach((s) => s.classList.remove("active"));
    const currentSlide = document.getElementById(`slide-${index}`);
    if (currentSlide) currentSlide.classList.add("active");
  }

  function startRotationTimer() {
    const speed = config.rotationSpeedMs || 5000;
    let startTime = Date.now();
    function animateProgress() {
      let elapsed = Date.now() - startTime;
      let progress = (elapsed / speed) * 100;
      if (progress > 100) progress = 100;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (elapsed < speed) {
        progressAnimation = requestAnimationFrame(animateProgress);
      } else {
        nextSlide();
      }
    }
    cancelAnimationFrame(progressAnimation);
    animateProgress();
  }

  function nextSlide() {
    currentSlideIndex = (currentSlideIndex + 1) % slidesData.length;
    showSlide(currentSlideIndex);
    startRotationTimer();
  }

  // Start
  fetchDashboardData();
});
