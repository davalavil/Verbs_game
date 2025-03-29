// js/script.js (Versión con validación instantánea y feedback parcial amarillo)

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

            if (colIndex === 4) { // Columna 'Tipo'
                cell.textContent = text;
            } else {
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

    feedbackDiv.textContent = 'Rellena las casillas vacías. La corrección es automática al salir de cada casilla.';
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
 * Manejador del evento 'blur' para un input. Se llama cuando el input pierde el foco.
 */
function handleInputBlur(event) {
    const input = event.target;
    checkSingleInput(input); // Comprueba la respuesta de este input
    // updateGeneralFeedback(); // Podrías llamar a una función que actualice el contador general aquí si quieres
}

/**
 * Comprueba la respuesta de UN SOLO input y aplica el estilo visual (verde/amarillo/rojo).
 * @param {HTMLInputElement} input El elemento input a comprobar.
 * @returns {boolean} `true` si la respuesta es correcta o parcialmente correcta, `false` si es incorrecta o hay error.
 */
function checkSingleInput(input) {
    const userAnswer = input.value.trim(); // Guardamos la respuesta con mayúsculas/minúsculas originales
    const lowerUserAnswer = userAnswer.toLowerCase(); // Versión en minúsculas para comparación
    const cell = input.closest('td');
    const row = input.closest('tr');

    // Validar que tenemos toda la info necesaria
    if (!row || !cell || !row.dataset.verbKey || typeof input.dataset.colIndex === 'undefined') {
         console.error("CheckSingleInput: Info incompleta para comprobar:", input);
         input.classList.remove('correct', 'incorrect', 'partial'); // Limpia clases
         input.classList.add('incorrect');
         return false;
    }

    const verbKey = row.dataset.verbKey;
    const colIndex = parseInt(input.dataset.colIndex);
    const originalData = originalVerbDataMap.get(verbKey);

    // Validar que encontramos los datos originales
    if (!originalData) {
        console.error("CheckSingleInput: Datos originales no encontrados para:", verbKey);
        input.classList.remove('correct', 'incorrect', 'partial');
        input.classList.add('incorrect');
        return false;
    }

    const correctAnswerString = originalData[colIndex]; // Respuesta(s) correcta(s) como string original
    const lowerCorrectAnswerString = correctAnswerString.toLowerCase(); // Versión en minúsculas para comparar

    // Dividir las posibles respuestas correctas (siempre, incluso si solo hay una)
    const possibleAnswers = lowerCorrectAnswerString.split('/').map(ans => ans.trim()).filter(ans => ans !== ''); // Divide y quita vacíos
    const hasMultipleOptions = possibleAnswers.length > 1; // ¿Hay más de una opción válida?

    // Limpiar estilos y placeholder anteriores
    input.classList.remove('correct', 'incorrect', 'partial'); // Asegura limpiar todos los estados
    input.placeholder = ''; // Quitar cualquier placeholder previo

    let isConsideredCorrect = false; // Para el contador final

    // Comprobar la respuesta
    if (lowerUserAnswer === '') {
        // Vacío: no hacer nada ahora, se marcará en "Comprobar Todo" si sigue vacío.
    } else if (possibleAnswers.includes(lowerUserAnswer)) {
        // La respuesta del usuario está en la lista de posibles respuestas correctas
        isConsideredCorrect = true; // Cuenta como acierto

        if (hasMultipleOptions) {
            // Había múltiples opciones Y el usuario puso una de ellas -> Amarillo (Parcial)
            input.classList.add('partial');
             // Opcional: Mostrar las otras opciones en el title (tooltip)
             const otherOptions = possibleAnswers.filter(ans => ans !== lowerUserAnswer).join(' / ');
             if(otherOptions) {
                 input.title = `También válido: ${otherOptions}`;
             } else {
                 input.title = ''; // Limpiar tooltip si no hay otras
             }
        } else {
            // Solo había una opción posible Y el usuario la puso -> Verde (Correcto)
            input.classList.add('correct');
            input.title = ''; // Limpiar tooltip
        }
    } else {
        // La respuesta del usuario NO está en la lista de posibles respuestas
        input.classList.add('incorrect');
        // Mostrar TODAS las opciones correctas (formato original) en el placeholder
        input.placeholder = `Correcto: ${correctAnswerString}`;
        input.title = ''; // Limpiar tooltip
        isConsideredCorrect = false;
    }

    // Devolvemos true si fue 'correct' o 'partial' para que cuente en el resumen final
    return isConsideredCorrect;
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
    let correctOrPartialCount = 0; // Contará tanto verdes como amarillos
    let totalInputs = inputs.length;
    let answeredInputs = 0;

    if (totalInputs === 0) {
        feedbackDiv.textContent = 'No hay nada que comprobar en este modo.';
        return;
    }

    // Iterar por cada input para comprobarlo y contar
    inputs.forEach(input => {
        const isCorrectOrPartial = checkSingleInput(input); // Revalida (o valida por primera vez)
        if (isCorrectOrPartial) {
            correctOrPartialCount++;
        }

        // Si el input está vacío DESPUÉS de la validación y no es correcto/parcial,
        // lo marcamos explícitamente como incorrecto y mostramos la respuesta.
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

        // Contar si el input fue respondido (tiene algún valor)
        if (input.value.trim() !== '') {
            answeredInputs++;
        }
    });

    // Mostrar el resumen final
    feedbackDiv.textContent = `Comprobación final: ${correctOrPartialCount} de ${totalInputs} respuestas correctas (verdes o amarillas). (${answeredInputs} respondidas).`;
    // Hacer scroll para que el feedback sea visible
    feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// --- Event Listeners (Configuración inicial) ---
btnRandom.addEventListener('click', () => startGame('random'));
btnInfinitive.addEventListener('click', () => startGame('infinitive'));
btnPastSimple.addEventListener('click', () => startGame('past_simple'));
btnPastParticiple.addEventListener('click', () => startGame('past_participle'));
btnTranslation.addEventListener('click', () => startGame('translation'));

// El botón 'Comprobar' ahora sirve para una revisión final y ver respuestas de los no contestados/incorrectos
btnCheck.addEventListener('click', checkAllAnswers);
btnCheck.textContent = 'Comprobar Todo / Ver Respuestas'; // Texto actualizado del botón

// --- Inicio ---
// Mensaje inicial al cargar la página
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";
