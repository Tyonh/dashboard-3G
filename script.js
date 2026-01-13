document.addEventListener("DOMContentLoaded", () => {
  const dashboardContainer = document.getElementById("dashboard-container");
  const progressBar = document.getElementById("progress-bar");

  let slidesData = [];
  let config = {};
  let currentSlideIndex = 0;
  let rotationInterval;
  let progressAnimation;

  // --- 1. Carregar Dados ---
  async function fetchDashboardData() {
    try {
      const response = await fetch("data.json");
      if (!response.ok) throw new Error("Erro ao carregar data.json");
      const data = await response.json();
      config = data.config;
      slidesData = data.slides;
      initDashboard();
    } catch (error) {
      dashboardContainer.innerHTML = `<div class="loading-state" style="color:red">Erro: ${error.message}. Verifique se está rodando em um servidor local.</div>`;
      console.error(error);
    }
  }

  // --- 2. Inicializar Dashboard ---
  function initDashboard() {
    dashboardContainer.innerHTML = ""; // Limpa loading

    // Gera o HTML de todos os slides
    slidesData.forEach((slide, index) => {
      const slideElement = buildSlideElement(slide, index);
      dashboardContainer.appendChild(slideElement);
    });

    // Começa a rotação
    showSlide(currentSlideIndex);
    startRotationTimer();
  }

  // --- 3. Construtor de Slides (O coração do sistema) ---
  function buildSlideElement(slideData, index) {
    const slideDiv = document.createElement("div");
    slideDiv.className = "slide";
    slideDiv.id = `slide-${index}`;

    // Cabeçalho Padrão (se aplicável)
    let headerHTML = "";
    if (slideData.type !== "intro" && slideData.type !== "winner") {
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
                </header>
            `;
    }

    let contentHTML = "";

    // Switch para gerar o conteúdo baseado no TIPO do slide
    switch (slideData.type) {
      case "intro":
        contentHTML = `
                    <div class="slide-intro-content">
                        <h1 class="intro-title">${slideData.title}</h1>
                        <h2 class="intro-subtitle">
                            <i class="fas ${slideData.icon}"></i> ${slideData.subtitle}
                        </h2>
                    </div>`;
        break;

      case "ranking":
        contentHTML = `
                <div class="ranking-wrapper">
                    <div class="ranking-grid">`;

        slideData.data.forEach((item) => {
          // 1. Limpar a string para pegar apenas o número (remove % e espaços)
          let rawValue = parseInt(item.value.replace(/\D/g, ""));

          // 2. Lógica de Limite Visual (Teto de 100%)
          // Se o valor for 270, visualWidth será 100. Se for 19, será 19.
          let visualWidth = rawValue > 100 ? 100 : rawValue;

          // 3. Lógica de Cor do Texto
          // Se a barra preencher mais que 50% da pílula, mudamos o texto para branco para dar leitura
          // Se preencher pouco (ex: 19%), o texto continua escuro no fundo cinza.
          let textColorClass = visualWidth > 50 ? "text-white" : "";

          contentHTML += `
                        <div class="ranking-pill">
                            <div class="progress-fill" style="width: ${visualWidth}%"></div>

                            <img src="${item.photoUrl}" alt="${item.name}" class="rank-avatar">
                            <span class="rank-name ${textColorClass}">${item.name}</span>
                            <span class="rank-value ${textColorClass}">${item.value}</span>
                        </div>`;
        });

        contentHTML += `
                    </div>
                </div>`;
        break;

      case "chart":
        // 1. Lógica Matemática para definir o topo do gráfico (Escala Inteligente)
        // Encontrar o maior "Total" entre todos os usuários
        const maxDataValue = Math.max(...slideData.data.map((d) => d.total));

        // Arredonda para o próximo múltiplo de 5 para criar uma margem superior bonita
        // Ex: Se o max é 26, o teto vira 30. Se é 12, vira 15.
        let chartCeiling = Math.ceil(maxDataValue / 5) * 5;

        // Se o teto ficou igual ao máximo (ex: max 30 -> teto 30), soma +5 para o rótulo não cortar
        if (chartCeiling === maxDataValue) chartCeiling += 5;

        // Definimos quantas linhas de grade queremos (Ex: 5 ou 6 linhas)
        const gridSteps = 6;

        contentHTML = `
                <div class="chart-slide-container">
                    <div class="chart-legend">
                        <div class="legend-item"><div class="dot dot-red"></div> Feito</div>
                        <div class="legend-item"><div class="dot dot-grey"></div> Falta</div>
                    </div>

                    <div class="chart-body">
                        <div class="chart-grid-layer">`;

        // Gerar linhas de grade baseadas no Teto calculado
        for (let i = 0; i <= gridSteps; i++) {
          // Valor da linha atual
          const lineValue = (chartCeiling / gridSteps) * i;
          // Posição em porcentagem (0% é base, 100% é topo)
          const linePos = (lineValue / chartCeiling) * 100;

          contentHTML += `
                        <div class="grid-line-wrapper" style="bottom: ${linePos}%">
                            <div class="grid-line"></div>
                            <span class="grid-label-y">${Math.round(
                              lineValue
                            )}</span>
                        </div>`;
        }

        contentHTML += `</div> <div class="chart-bars-layer">`;

        // Loop dos dados
        slideData.data.forEach((item) => {
          // Matematica das alturas:
          const falta = item.total - item.done;

          // Altura Total da Barra em relação ao TETO do gráfico
          // Ex: Se Teto é 30 e Total é 15, a barra ocupa 50% da altura do gráfico
          const barTotalHeightPercent = (item.total / chartCeiling) * 100;

          // Altura interna das partes (Proporção dentro da barra)
          // Aqui usamos regra de três simples para dividir o espaço da barra
          const heightDonePercent = (item.done / item.total) * 100;
          const heightFaltaPercent = (falta / item.total) * 100;

          contentHTML += `
                        <div class="single-column-wrapper">
                            <span class="col-label-top">${item.total}</span>
                            
                            <div class="stacked-bar-visual" style="height: ${barTotalHeightPercent}%">
                                
                                <div class="bar-segment segment-top-falta" style="height: ${heightFaltaPercent}%">
                                    ${falta > 0 ? falta : ""}
                                </div>
                                
                                <div class="bar-segment segment-bottom-feito" style="height: ${heightDonePercent}%">
                                     ${item.done > 0 ? item.done : ""}
                                </div>
                            </div>

                            <span class="col-label-bottom">${item.name}</span>
                        </div>`;
        });

        contentHTML += `</div></div></div>`;
        break;

      case "table":
        contentHTML = '<div class="table-container"><div class="table-grid">';
        // Header Rows
        contentHTML += `<div class="grid-header" style="text-align:left; padding-left:30px;">COLABORADOR</div>`;
        slideData.columns.forEach(
          (col) => (contentHTML += `<div class="grid-header">${col}</div>`)
        );

        // Data Rows
        slideData.rows.forEach((row) => {
          contentHTML += `<div class="grid-row-name"><i class="fas fa-user"></i> ${row.name}</div>`;
          row.status.forEach((status) => {
            let icon = "";
            if (status === "ok")
              icon = '<i class="fas fa-check status-ok"></i>';
            if (status === "x") icon = '<i class="fas fa-times status-x"></i>';
            if (status === "vacation")
              icon = '<i class="fas fa-suitcase status-vacation"></i>';
            contentHTML += `<div class="grid-cell">${icon}</div>`;
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
    }

    slideDiv.innerHTML = headerHTML + contentHTML;
    return slideDiv;
  }

  // --- 4. Controle de Rotação e Animação ---
  function showSlide(index) {
    // Remove classe ativa de todos
    document
      .querySelectorAll(".slide")
      .forEach((s) => s.classList.remove("active"));
    // Adiciona no atual
    const currentSlide = document.getElementById(`slide-${index}`);
    if (currentSlide) currentSlide.classList.add("active");
  }

  function startRotationTimer() {
    const speed = config.rotationSpeedMs || 5000;
    let startTime = Date.now();

    // Função de animação da barra de progresso
    function animateProgress() {
      let elapsed = Date.now() - startTime;
      let progress = (elapsed / speed) * 100;
      if (progress > 100) progress = 100;
      progressBar.style.width = `${progress}%`;

      if (elapsed < speed) {
        progressAnimation = requestAnimationFrame(animateProgress);
      } else {
        // Tempo acabou, próximo slide
        nextSlide();
      }
    }

    // Inicia a animação
    cancelAnimationFrame(progressAnimation); // Para anterior se houver
    animateProgress();
  }

  function nextSlide() {
    currentSlideIndex = (currentSlideIndex + 1) % slidesData.length;
    showSlide(currentSlideIndex);
    startRotationTimer(); // Reinicia o timer
  }

  // Inicializar
  fetchDashboardData();
});
