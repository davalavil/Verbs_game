// js/script.js (Versión final con validación corregida para múltiples opciones, feedback parcial y botón revelar)

// --- Referencias a Elementos del DOM ---
const tableBody = document.getElementById('verb-table-body');
const btnRandom = document.getElementById('btn-random');
const btnInfinitive = document.getElementById('btn-infinitive');
const btnPastSimple = document.getElementById('btn-past-simple');
const btnPastParticiple = document.getElementById('btn-past-participle');
const btnTranslation = document.getElementById('btn-translation');
const btnCheck = document.getElementById('btn-check');
const feedbackDiv = document.getElementById('feedback');
// const numVerbsInput = document.getElementById('num-verbs');

// --- Variables Globales ---
let currentMode = null;
let verbsToDisplay = [];
let originalVerbDataMap = new Map();

// --- Funciones ---

/**
 * Baraja un array in-place usando el algoritmo Fisher-Yates.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Prepara e inicia el juego según el modo seleccionado.
 * Añade el botón de revelar en la última celda.
 */
function startGame(mode) {
    currentMode = mode;
    feedbackDiv.innerHTML = '';
    tableBody.innerHTML = '';
    originalVerbDataMap.clear();

    verbsToDisplay = shuffleArray([...verbList]);

    verbsToDisplay.forEach((verbData, displayIndex) => {
        const originalKey = verbData[0] + '-' + displayIndex;
        originalVerbDataMap.set(originalKey, verbData);

        const row = tableBody.insertRow();
        row.dataset.verbKey = originalKey;

        verbData.forEach((text, colIndex) => {
            const cell = row.insertCell();
            let makeInput = false;

            // --- Creación de celda para la última columna (Tipo + Botón) ---
            if (colIndex === 4) {
                const typeText = document.createElement('span');
                typeText.textContent = text;
                cell.appendChild(typeText);

                const revealBtn = document.createElement('button');
                revealBtn.innerHTML = '👁️';
                revealBtn.classList.add('reveal-button');
                revealBtn.title = 'Mostrar respuestas de esta fila';
                revealBtn.setAttribute('aria-label', `Mostrar respuestas para ${verbData[0]}`);
                revealBtn.addEventListener('click', handleRevealClick);
                cell.appendChild(revealBtn);

            } else { // Columnas de verbos y traducción
                // Determinar si hacer input basado en el modo
                switch (mode) {
                    case 'random': makeInput = Math.random() < 0.4; break;
                    case 'infinitive': makeInput = (colIndex === 0); break;
                    case 'past_simple': makeInput = (colIndex === 1); break;
                    case 'past_participle': makeInput = (colIndex === 2); break;
                    case 'translation': makeInput = (colIndex === 3); break;
                }

                if (makeInput) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.dataset.colIndex = colIndex;
                    input.setAttribute('aria-label', `Respuesta para ${getHeaderName(colIndex)} del verbo ${verbData[0]}`);
                    input.addEventListener('blur', handleInputBlur);
                    cell.appendChild(input);
                } else {
                    cell.textContent = text;
                }
            }
        });
    });

    if (mode === 'random') {
        ensureOneInputPerRow();
    }

    feedbackDiv.textContent = 'Rellena las casillas vacías. La corrección es automática. Usa 👁️ para ver las respuestas de una fila.';
    console.log(`Juego iniciado en modo: ${mode}. Verbos mostrados: ${verbsToDisplay.length}`);
}

/**
 * Auxiliar para modo 'random': asegura al menos un input por fila.
 */
function ensureOneInputPerRow() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputsInRow = row.querySelectorAll('input');
        if (inputsInRow.length === 0 && originalVerbDataMap.has(row.dataset.verbKey)) {
            const cells = row.querySelectorAll('td');
            let randomIndex;
            do { randomIndex = Math.floor(Math.random() * 4); } while (randomIndex === 4);

            const cellToChange = cells[randomIndex];
            const verbKey = row.dataset.verbKey;
            const originalData = originalVerbDataMap.get(verbKey);

            if (!originalData) { console.error("Asegurando input: Datos no encontrados:", verbKey); return; }

            cellToChange.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.colIndex = randomIndex;
            input.setAttribute('aria-label', `Respuesta para ${getHeaderName(randomIndex)} del verbo ${originalData[0]}`);
            input.addEventListener('blur', handleInputBlur);
            cellToChange.appendChild(input);
            console.log(`Input asegurado en fila con clave ${verbKey}, columna ${randomIndex}`);
        }
    });
}

/**
 * Devuelve el nombre de la cabecera para aria-label.
 */
function getHeaderName(colIndex) {
    const headers = ["Infinitivo", "Pasado Simple", "Pasado Participio", "Traducción"];
    return headers[colIndex] || "Desconocido";
}

/**
 * Manejador del evento 'blur' para un input (cuando pierde el foco).
 */
function handleInputBlur(event) {
    const input = event.target;
    checkSingleInput(input);
}

/**
 * Comprueba la respuesta de UN SOLO input y aplica el estilo visual (verde/amarillo/rojo).
 * Verde: Respuesta única correcta O todas las respuestas múltiples correctas (ej: "ser/estar").
 * Amarillo: Una de las respuestas múltiples correcta, pero no todas (ej: solo "ser").
 * Rojo: Respuesta incorrecta.
 * @param {HTMLInputElement} input El elemento input a comprobar.
 * @returns {boolean} `true` si la respuesta es correcta (verde) o parcial (amarillo), `false` si es incorrecta o hay error.
 */
function checkSingleInput(input) {
    const userAnswer = input.value.trim(); // Respuesta usuario original (limpia de espacios externos)
    const cell = input.closest('td');
    const row = input.closest('tr');

    // --- Validación de datos necesarios ---
    if (!row || !cell || !row.dataset.verbKey || typeof input.dataset.colIndex === 'undefined') {
         console.error("CheckSingleInput: Info incompleta:", input);
         input.classList.remove('correct', 'incorrect', 'partial');
         input.classList.add('incorrect');
         return false;
    }

    const verbKey = row.dataset.verbKey;
    const colIndex = parseInt(input.dataset.colIndex);
    const originalData = originalVerbDataMap.get(verbKey);

    if (!originalData) {
        console.error("CheckSingleInput: Datos no encontrados:", verbKey);
        input.classList.remove('correct', 'incorrect', 'partial');
        input.classList.add('incorrect');
        return false;
    }
    // --- Fin Validación ---

    const correctAnswerString = originalData[colIndex]; // Ej: "ser/estar", "play", "was / were"

    // --- Normalización ---
    // Función para limpiar y estandarizar strings con posibles barras
    const normalizeString = (str) => str.toLowerCase()        // a minúsculas
                                     .split('/')             // dividir por barra
                                     .map(s => s.trim())     // quitar espacios de cada parte
                                     .filter(s => s !== '')  // quitar partes vacías
                                     .join('/');            // volver a unir con UNA barra sin espacios

    const normalizedUserAnswer = normalizeString(userAnswer); // Ej: "ser/estar", "play", "was/were"
    const normalizedCorrectAnswer = normalizeString(correctAnswerString); // Ej: "ser/estar", "play", "was/were"

    // Obtener las opciones individuales correctas (ya normalizadas)
    const possibleAnswers = normalizedCorrectAnswer.split('/'); // Ej: ["ser", "estar"], ["play"], ["was", "were"]
    const hasMultipleOptions = possibleAnswers.length > 1;

    // --- Limpiar estado previo ---
    input.classList.remove('correct', 'incorrect', 'partial');
    input.placeholder = '';
    input.title = '';

    let isConsideredCorrectOrPartial = false; // Para el recuento final

    // --- Lógica de Comprobación CORREGIDA ---
    if (normalizedUserAnswer === '') {
        // Vacío: No hacer nada en blur.
    } else if (normalizedUserAnswer === normalizedCorrectAnswer) {
        // **CASO 1: Coincidencia Exacta (VERDE)**
        // El usuario escribió exactamente lo mismo que la respuesta correcta (normalizada).
        // Cubre respuestas únicas ("play" == "play") y múltiples escritas completas ("ser/estar" == "ser/estar").
        input.classList.add('correct');
        isConsideredCorrectOrPartial = true;

    } else if (hasMultipleOptions && possibleAnswers.includes(normalizedUserAnswer)) {
        // **CASO 2: Coincidencia Parcial (AMARILLO)**
        // No hubo coincidencia exacta, PERO:
        // 1) La respuesta correcta SÍ tenía múltiples opciones.
        // 2) La respuesta (normalizada) del usuario es UNA de esas opciones individuales.
        //    (Nota: normalizedUserAnswer aquí NO puede contener '/' porque si no, habría caído en el CASO 1).
        input.classList.add('partial');
        const otherOptions = possibleAnswers.filter(ans => ans !== normalizedUserAnswer).join(' / ');
        if (otherOptions) { input.title = `También válido: ${otherOptions}`; }
        isConsideredCorrectOrPartial = true;

    } else {
        // **CASO 3: Incorrecto (ROJO)**
        // No coincide exactamente y tampoco es una de las opciones parciales válidas.
        input.classList.add('incorrect');
        input.placeholder = `Correcto: ${correctAnswerString}`; // Mostrar respuesta original
        isConsideredCorrectOrPartial = false;
    }
    // --- Fin Lógica ---

    // Devuelve true si fue verde o amarillo
    return isConsideredCorrectOrPartial;
}


/**
 * Manejador para el clic en el botón de revelar (ojo).
 */
function handleRevealClick(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const row = button.closest('tr');
    if (!row || !row.dataset.verbKey) return;

    const verbKey = row.dataset.verbKey;
    const originalData = originalVerbDataMap.get(verbKey);

    if (!originalData) { console.error("RevealClick: Datos no encontrados:", verbKey); return; }

    console.log(`Revelando respuestas para: ${originalData[0]}`);

    const inputsInRow = row.querySelectorAll('input[type="text"]');

    inputsInRow.forEach(input => {
        if (typeof input.dataset.colIndex !== 'undefined') {
            const colIndex = parseInt(input.dataset.colIndex);
            // Rellenamos con la respuesta completa (incluyendo '/' si hay varias)
            const correctAnswer = originalData[colIndex];
            input.value = correctAnswer;
            checkSingleInput(input); // Validar para aplicar estilo verde/amarillo
            // input.disabled = true; // Opcional: deshabilitar
        }
    });
    button.disabled = true; // Deshabilitar botón revelar
}


/**
 * Comprueba TODAS las respuestas (llamado por el botón).
 */
function checkAllAnswers() {
     if (!currentMode) {
        feedbackDiv.textContent = 'Selecciona un modo de juego para empezar.';
        return;
    }
    const inputs = tableBody.querySelectorAll('input[type="text"]');
    let correctOrPartialCount = 0;
    let totalInputs = inputs.length;
    let answeredInputs = 0;

    if (totalInputs === 0) {
        feedbackDiv.textContent = 'No hay nada que comprobar en este modo.';
        return;
    }

    inputs.forEach(input => {
        const isCorrectOrPartial = checkSingleInput(input); // Revalida cada input
        if (isCorrectOrPartial) {
            correctOrPartialCount++;
        }
        // Marcar vacíos como incorrectos al comprobar todo
        if (input.value.trim() === '' && !input.classList.contains('correct') && !input.classList.contains('partial')) {
             input.classList.add('incorrect');
             const row = input.closest('tr');
             const colIndex = parseInt(input.dataset.colIndex);
             const originalData = originalVerbDataMap.get(row?.dataset.verbKey);
             if (originalData && typeof originalData[colIndex] !== 'undefined') {
                 input.placeholder = `Respuesta: ${originalData[colIndex]}`;
             }
        }
        if (input.value.trim() !== '') {
            answeredInputs++;
        }
    });

    feedbackDiv.textContent = `Comprobación final: ${correctOrPartialCount} de ${totalInputs} respuestas correctas (verdes o amarillas). (${answeredInputs} respondidas).`;
    feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// --- Event Listeners (Configuración inicial) ---
btnRandom.addEventListener('click', () => startGame('random'));
btnInfinitive.addEventListener('click', () => startGame('infinitive'));
btnPastSimple.addEventListener('click', () => startGame('past_simple'));
btnPastParticiple.addEventListener('click', () => startGame('past_participle'));
btnTranslation.addEventListener('click', () => startGame('translation'));
btnCheck.addEventListener('click', checkAllAnswers);
btnCheck.textContent = 'Comprobar Todo / Ver Respuestas';

// --- Inicio ---
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";
