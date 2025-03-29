// --- Referencias a Elementos del DOM ---
const tableBody = document.getElementById('verb-table-body');
const btnRandom = document.getElementById('btn-random');
const btnInfinitive = document.getElementById('btn-infinitive');
const btnPastSimple = document.getElementById('btn-past-simple');
const btnPastParticiple = document.getElementById('btn-past-participle');
const btnTranslation = document.getElementById('btn-translation');
const btnCheck = document.getElementById('btn-check');
const feedbackDiv = document.getElementById('feedback');
// const numVerbsInput = document.getElementById('num-verbs'); // Descomentar si añades el selector de número

// --- Variables Globales ---
let currentMode = null;
let verbsToDisplay = [];
let originalVerbDataMap = new Map();

// --- Funciones ---

/**
 * Baraja un array (algoritmo Fisher-Yates)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Prepara e inicia el juego según el modo seleccionado
 */
function startGame(mode) {
    currentMode = mode;
    feedbackDiv.innerHTML = ''; // Limpia feedback al iniciar nuevo juego
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

            if (colIndex === 4) {
                cell.textContent = text;
            } else {
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
                    // Añadimos el listener para el evento blur directamente aquí
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

    feedbackDiv.textContent = 'Rellena las casillas vacías. La corrección es automática al salir de cada casilla.';
    console.log(`Juego iniciado en modo: ${mode}. Verbos mostrados: ${verbsToDisplay.length}`);
}

/**
 * Asegura que cada fila tenga al menos un campo de entrada en modo aleatorio.
 */
function ensureOneInputPerRow() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputsInRow = row.querySelectorAll('input');
        if (inputsInRow.length === 0) {
            const cells = row.querySelectorAll('td');
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * 4);
            } while (randomIndex === 4);

            const cellToChange = cells[randomIndex];
            const verbKey = row.dataset.verbKey;
            const originalData = originalVerbDataMap.get(verbKey);

            if (!originalData) {
                console.error("No se encontraron datos originales para la clave:", verbKey);
                return;
            }

            cellToChange.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.colIndex = randomIndex;
            input.setAttribute('aria-label', `Respuesta para ${getHeaderName(randomIndex)} del verbo ${originalData[0]}`);
            // Importante: Añadir también el listener a los inputs creados aquí
            input.addEventListener('blur', handleInputBlur);
            cellToChange.appendChild(input);
            console.log(`Input asegurado en fila con clave ${verbKey}, columna ${randomIndex}`);
        }
    });
}

/**
 * Devuelve el nombre de la cabecera para accesibilidad.
 */
function getHeaderName(colIndex) {
    const headers = ["Infinitivo", "Pasado Simple", "Pasado Participio", "Traducción"];
    return headers[colIndex] || "Desconocido";
}

/**
 * Manejador para el evento 'blur' en un input. Comprueba la respuesta.
 * @param {Event} event - El objeto del evento blur.
 */
function handleInputBlur(event) {
    const input = event.target; // El input que perdió el foco
    checkSingleInput(input);
    // Opcional: Actualizar el contador general si se quiere mostrar en tiempo real
    // updateGeneralFeedback();
}

/**
 * Comprueba un único input y aplica el estilo correspondiente.
 * @param {HTMLInputElement} input - El elemento input a comprobar.
 * @returns {boolean} - true si la respuesta es correcta, false en caso contrario.
 */
function checkSingleInput(input) {
    const userAnswer = input.value.trim().toLowerCase();
    const cell = input.closest('td'); // Encuentra la celda contenedora
    const row = input.closest('tr'); // Encuentra la fila contenedora
    if (!row || !cell || !row.dataset.verbKey || typeof input.dataset.colIndex === 'undefined') {
         console.error("No se pudo encontrar la información necesaria para comprobar el input:", input);
         input.classList.remove('correct');
         input.classList.add('incorrect'); // Marcar como incorrecto si hay error
         return false;
    }

    const verbKey = row.dataset.verbKey;
    const colIndex = parseInt(input.dataset.colIndex);
    const originalData = originalVerbDataMap.get(verbKey);

    if (!originalData) {
        console.error("Error al comprobar: No se encontraron datos originales para la clave:", verbKey);
        input.classList.remove('correct');
        input.classList.add('incorrect');
        return false;
    }

    const correctAnswer = originalData[colIndex].toLowerCase();
    const possibleAnswers = correctAnswer.split('/').map(ans => ans.trim()); // Manejar "was/were", "got/gotten"

    // Limpia clases y placeholder anteriores
    input.classList.remove('correct', 'incorrect');
    input.placeholder = ''; // Limpia placeholder por si tenía la respuesta anterior

    let isCorrect = false;
    if (userAnswer === '') {
        // Si está vacío, no lo marcamos ni como correcto ni incorrecto aún,
        // o podrías decidir marcarlo como incorrecto si prefieres.
        // Por ahora, lo dejamos neutro hasta que se intente comprobar todo.
        // input.classList.add('incorrect'); // Descomenta si quieres marcar vacío como error inmediato
    } else if (possibleAnswers.includes(userAnswer)) {
        input.classList.add('correct');
        isCorrect = true;
        // Opcional: Deshabilitar si está correcto
        // input.disabled = true;
    } else {
        input.classList.add('incorrect');
        // Mostrar la respuesta correcta en el placeholder
        input.placeholder = `Correcto: ${originalData[colIndex]}`;
    }
    return isCorrect;
}


/**
 * Comprueba TODAS las respuestas (llamado por el botón).
 * Útil para obtener un resumen final o comprobar campos que quedaron vacíos.
 */
function checkAllAnswers() {
    if (!currentMode) {
        feedbackDiv.textContent = 'Selecciona un modo de juego para empezar.';
        return;
    }

    const inputs = tableBody.querySelectorAll('input[type="text"]');
    let correctCount = 0;
    let totalInputs = inputs.length;
    let answeredInputs = 0; // Contamos cuántos tienen algún valor

    if (totalInputs === 0) {
        feedbackDiv.textContent = 'No hay nada que comprobar. ¿Has iniciado un juego con campos a rellenar?';
        return;
    }

    inputs.forEach(input => {
        // Re-evaluamos cada input, especialmente los vacíos
        const isCorrect = checkSingleInput(input);
        if (isCorrect) {
            correctCount++;
        }
        // Marcamos los vacíos como incorrectos al hacer la comprobación final
        if (input.value.trim() === '' && !input.classList.contains('correct')) {
             input.classList.add('incorrect');
             // Mostramos la respuesta si está vacío y es incorrecto
              const row = input.closest('tr');
              const colIndex = parseInt(input.dataset.colIndex);
              const originalData = originalVerbDataMap.get(row.dataset.verbKey);
              if(originalData) {
                  input.placeholder = `Respuesta: ${originalData[colIndex]}`;
              }
        }
        if (input.value.trim() !== '') {
            answeredInputs++;
        }
    });

    feedbackDiv.textContent = `Comprobación final: ${correctCount} de ${totalInputs} respuestas correctas. (${answeredInputs} respondidas).`;
    feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// --- Event Listeners ---
btnRandom.addEventListener('click', () => startGame('random'));
btnInfinitive.addEventListener('click', () => startGame('infinitive'));
btnPastSimple.addEventListener('click', () => startGame('past_simple'));
btnPastParticiple.addEventListener('click', () => startGame('past_participle'));
btnTranslation.addEventListener('click', () => startGame('translation'));

// El botón 'Comprobar Respuestas' ahora llama a checkAllAnswers
btnCheck.addEventListener('click', checkAllAnswers);
// Cambiamos el texto del botón para reflejar su nuevo propósito (opcional)
btnCheck.textContent = 'Comprobar Todo / Ver Respuestas';

// Ya no necesitamos el listener global en tableBody para blur, ya que lo añadimos a cada input.
// Tampoco necesitamos el listener de 'Enter' que llamaba a checkAnswers globalmente.

// --- Inicio ---
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";
