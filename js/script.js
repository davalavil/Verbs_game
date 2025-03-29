// js/script.js (Versión con validación instantánea, feedback parcial y botón revelar fila)

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

            // --- MODIFICACIÓN AQUÍ para la última columna ---
            if (colIndex === 4) { // Columna 'Tipo'
                // Crear un span para el texto "regular/irregular"
                const typeText = document.createElement('span');
                typeText.textContent = text;
                cell.appendChild(typeText);

                // Crear el botón de revelar (ojo)
                const revealBtn = document.createElement('button');
                revealBtn.innerHTML = '👁️'; // Emoji de ojo (o usa )
                revealBtn.classList.add('reveal-button');
                revealBtn.title = 'Mostrar respuestas de esta fila'; // Tooltip
                revealBtn.setAttribute('aria-label', `Mostrar respuestas para ${verbData[0]}`);
                revealBtn.addEventListener('click', handleRevealClick); // Añadir listener
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
                    input.addEventListener('blur', handleInputBlur); // Listener para validación al salir
                    cell.appendChild(input);
                } else {
                    cell.textContent = text; // Mostrar texto si no es input
                }
            }
        });
    });

    if (mode === 'random') {
        ensureOneInputPerRow(); // Asegurar inputs en modo aleatorio
    }

    feedbackDiv.textContent = 'Rellena las casillas vacías. La corrección es automática. Usa 👁️ para ver las respuestas de una fila.';
    console.log(`Juego iniciado en modo: ${mode}. Verbos mostrados: ${verbsToDisplay.length}`);
}

/**
 * Auxiliar para modo 'random': asegura al menos un input por fila.
 * No necesita cambios para el botón revelar, ya que este se añade en startGame.
 */
function ensureOneInputPerRow() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputsInRow = row.querySelectorAll('input');
        if (inputsInRow.length === 0 && originalVerbDataMap.has(row.dataset.verbKey)) {
            const cells = row.querySelectorAll('td');
            let randomIndex;
            do { randomIndex = Math.floor(Math.random() * 4); } while (randomIndex === 4); // 0 a 3

            const cellToChange = cells[randomIndex];
            const verbKey = row.dataset.verbKey;
            const originalData = originalVerbDataMap.get(verbKey);

            if (!originalData) {
                console.error("Asegurando input: Datos no encontrados para:", verbKey); return;
            }

            cellToChange.innerHTML = ''; // Limpiar celda
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.colIndex = randomIndex;
            input.setAttribute('aria-label', `Respuesta para ${getHeaderName(randomIndex)} del verbo ${originalData[0]}`);
            input.addEventListener('blur', handleInputBlur); // Añadir listener aquí también
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
    checkSingleInput(input); // Comprueba la respuesta de este input
}

/**
 * Comprueba la respuesta de UN SOLO input y aplica el estilo visual (verde/amarillo/rojo).
 */
function checkSingleInput(input) {
    const userAnswer = input.value.trim();
    const lowerUserAnswer = userAnswer.toLowerCase();
    const cell = input.closest('td');
    const row = input.closest('tr');

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

    const correctAnswerString = originalData[colIndex];
    const lowerCorrectAnswerString = correctAnswerString.toLowerCase();
    const possibleAnswers = lowerCorrectAnswerString.split('/').map(ans => ans.trim()).filter(ans => ans !== '');
    const hasMultipleOptions = possibleAnswers.length > 1;

    input.classList.remove('correct', 'incorrect', 'partial');
    input.placeholder = '';
    input.title = ''; // Limpiar tooltip al comprobar/revalidar

    let isConsideredCorrect = false;

    if (lowerUserAnswer === '') {
        // No marcar vacío en blur, solo en 'Comprobar Todo'
    } else if (possibleAnswers.includes(lowerUserAnswer)) {
        isConsideredCorrect = true;
        if (hasMultipleOptions) {
            input.classList.add('partial'); // Amarillo
            const otherOptions = possibleAnswers.filter(ans => ans !== lowerUserAnswer).join(' / ');
            if(otherOptions) { input.title = `También válido: ${otherOptions}`; } // Mostrar otras opciones en tooltip
        } else {
            input.classList.add('correct'); // Verde
        }
    } else {
        input.classList.add('incorrect'); // Rojo
        input.placeholder = `Correcto: ${correctAnswerString}`; // Mostrar respuesta(s) correcta(s)
        isConsideredCorrect = false;
    }
    return isConsideredCorrect; // Devuelve true si fue verde o amarillo
}


/**
 * Manejador para el clic en el botón de revelar (ojo).
 * Rellena todos los inputs de la fila correspondiente con las respuestas correctas.
 */
function handleRevealClick(event) {
    const button = event.target.closest('button'); // Asegura que es el botón
    if (!button) return; // Salir si no se hizo clic en el botón

    const row = button.closest('tr');
    if (!row || !row.dataset.verbKey) return; // Salir si no encontramos la fila o la clave

    const verbKey = row.dataset.verbKey;
    const originalData = originalVerbDataMap.get(verbKey);

    if (!originalData) {
        console.error("RevealClick: No se encontraron datos para la clave:", verbKey);
        return;
    }

    console.log(`Revelando respuestas para: ${originalData[0]}`);

    // Encontrar todos los inputs DENTRO de esta fila específica
    const inputsInRow = row.querySelectorAll('input[type="text"]');

    inputsInRow.forEach(input => {
        if (typeof input.dataset.colIndex !== 'undefined') {
            const colIndex = parseInt(input.dataset.colIndex);
            // Obtener la respuesta correcta (o la primera si hay varias)
            const correctAnswer = originalData[colIndex].split('/')[0].trim();
            // Alternativa: Mostrar todas las opciones separadas por /
            // const correctAnswer = originalData[colIndex];

            input.value = correctAnswer; // Poner la respuesta en el input
            checkSingleInput(input); // Validar para que se ponga verde/amarillo y actualice tooltip/placeholder si es necesario
            // input.disabled = true; // Opcional: deshabilitar input después de revelar
        }
    });

    // Opcional: deshabilitar el botón de revelar una vez usado
    button.disabled = true;
}


/**
 * Comprueba TODAS las respuestas. Llamado por el botón "Comprobar Todo / Ver Respuestas".
 * Itera por todos los inputs, valida cada uno (marcando los vacíos como incorrectos)
 * y muestra un resumen final en el div de feedback.
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
        // Si el input está vacío Y no es correcto/parcial después de la validación, marcar como incorrecto
        if (input.value.trim() === '' && !input.classList.contains('correct') && !input.classList.contains('partial')) {
             input.classList.add('incorrect');
             // Mostrar la respuesta en el placeholder para los vacíos
             const row = input.closest('tr');
             const colIndex = parseInt(input.dataset.colIndex);
             const originalData = originalVerbDataMap.get(row?.dataset.verbKey);
             if (originalData && typeof originalData[colIndex] !== 'undefined') {
                 input.placeholder = `Respuesta: ${originalData[colIndex]}`;
             }
        }
        // Contar si el input tiene algún valor
        if (input.value.trim() !== '') {
            answeredInputs++;
        }
    });

    // Mostrar el resumen final
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
// Mensaje inicial al cargar la página
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";
