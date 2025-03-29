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
let currentMode = null; // Modo actual (inicia nulo hasta que se elige uno)
let verbsToDisplay = []; // Qué verbos se están mostrando actualmente
let originalVerbDataMap = new Map(); // Para buscar rápido los datos originales

// --- Funciones ---

/**
 * Baraja un array (algoritmo Fisher-Yates)
 * @param {Array} array El array a barajar
 * @returns {Array} El array barajado
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Intercambio de elementos
    }
    return array;
}


/**
 * Prepara e inicia el juego según el modo seleccionado
 * @param {string} mode - 'random', 'infinitive', 'past_simple', 'past_participle', 'translation'
 */
function startGame(mode) {
    currentMode = mode;
    feedbackDiv.innerHTML = ''; // Limpia feedback anterior
    tableBody.innerHTML = ''; // Limpia la tabla anterior
    originalVerbDataMap.clear(); // Limpia el mapa de datos originales

    // 1. Seleccionar y barajar verbos (usamos todos)
    // const numVerbs = parseInt(numVerbsInput.value) || 10; // Si usas selector
    // verbsToDisplay = shuffleArray([...verbList]).slice(0, numVerbs);
    verbsToDisplay = shuffleArray([...verbList]); // Copia y baraja la lista completa

    // 2. Crear mapa para búsqueda rápida de datos originales y generar filas
    verbsToDisplay.forEach((verbData, displayIndex) => {
        // Guardamos los datos originales asociados a un ID único (usaremos el infinitivo como clave simple)
        // Nota: Si tienes infinitivos duplicados, necesitarías un ID más robusto.
        const originalKey = verbData[0] + '-' + displayIndex; // Clave única simple
        originalVerbDataMap.set(originalKey, verbData);

        const row = tableBody.insertRow();
        row.dataset.verbKey = originalKey; // Referencia a los datos originales

        verbData.forEach((text, colIndex) => {
            const cell = row.insertCell();

            // Índices de las columnas: 0:inf, 1:past_s, 2:past_p, 3:trans, 4:type
            let makeInput = false;

            if (colIndex === 4) { // La columna 'Tipo' nunca es un input
                cell.textContent = text;
            } else {
                switch (mode) {
                    case 'random':
                        // Probabilidad de 40% de ser input (ajustable)
                        makeInput = Math.random() < 0.4;
                        break;
                    case 'infinitive':
                        makeInput = (colIndex === 0);
                        break;
                    case 'past_simple':
                        makeInput = (colIndex === 1);
                        break;
                    case 'past_participle':
                        makeInput = (colIndex === 2);
                        break;
                    case 'translation':
                        makeInput = (colIndex === 3);
                        break;
                }

                if (makeInput) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    // No guardamos la respuesta correcta en el input directamente por si se inspecciona
                    // La buscaremos al comprobar usando row.dataset.verbKey y colIndex
                    input.dataset.colIndex = colIndex;
                    input.setAttribute('aria-label', `Respuesta para ${getHeaderName(colIndex)} del verbo ${verbData[0]}`);
                    cell.appendChild(input);
                } else {
                    cell.textContent = text;
                }
            }
        });
    });

    // Opcional: Asegurar que en modo 'random' haya al menos un input por fila
    if (mode === 'random') {
        ensureOneInputPerRow();
    }

    console.log(`Juego iniciado en modo: ${mode}. Verbos mostrados: ${verbsToDisplay.length}`);
}

/**
 * Opcional: Asegura que cada fila tenga al menos un campo de entrada en modo aleatorio.
 * Si una fila no tiene inputs, convierte una celda (no 'Tipo') aleatoria en input.
 */
function ensureOneInputPerRow() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputsInRow = row.querySelectorAll('input');
        if (inputsInRow.length === 0) {
            const cells = row.querySelectorAll('td');
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * 4); // 0 a 3 (Inf, PS, PP, Trans)
            } while (randomIndex === 4); // Evita la columna 'Tipo'

            const cellToChange = cells[randomIndex];
            const verbKey = row.dataset.verbKey;
            const originalData = originalVerbDataMap.get(verbKey); // Obtener datos originales

            if (!originalData) {
                console.error("No se encontraron datos originales para la clave:", verbKey);
                return; // Evitar error si algo falló
            }

            const textContent = originalData[randomIndex]; // Texto que estaba en la celda

            cellToChange.innerHTML = ''; // Limpia el contenido actual (texto)
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.colIndex = randomIndex;
             input.setAttribute('aria-label', `Respuesta para ${getHeaderName(randomIndex)} del verbo ${originalData[0]}`);
            cellToChange.appendChild(input);
            console.log(`Input asegurado en fila con clave ${verbKey}, columna ${randomIndex}`);
        }
    });
}

/**
 * Devuelve el nombre de la cabecera para accesibilidad.
 * @param {number} colIndex Índice de la columna
 * @returns {string} Nombre de la cabecera
 */
function getHeaderName(colIndex) {
    const headers = ["Infinitivo", "Pasado Simple", "Pasado Participio", "Traducción"];
    return headers[colIndex] || "Desconocido";
}


/**
 * Comprueba las respuestas introducidas por el usuario
 */
function checkAnswers() {
    if (!currentMode) {
        feedbackDiv.textContent = 'Selecciona un modo de juego para empezar.';
        return;
    }

    const inputs = tableBody.querySelectorAll('input[type="text"]');
    let correctCount = 0;
    let totalInputs = inputs.length;

    if (totalInputs === 0) {
        feedbackDiv.textContent = 'No hay nada que comprobar. ¿Has iniciado un juego con campos a rellenar?';
        return;
    }

    inputs.forEach(input => {
        const userAnswer = input.value.trim().toLowerCase();
        const cell = input.parentElement; // La celda <td> que contiene el input
        const row = cell.parentElement; // La fila <tr>
        const verbKey = row.dataset.verbKey;
        const colIndex = parseInt(input.dataset.colIndex);

        const originalData = originalVerbDataMap.get(verbKey);

        if (!originalData) {
            console.error("Error al comprobar: No se encontraron datos originales para la clave:", verbKey);
            input.classList.add('incorrect'); // Marcar como incorrecto si hay error
            return; // Saltar a la siguiente iteración
        }

        const correctAnswer = originalData[colIndex].toLowerCase();
        const possibleAnswers = correctAnswer.split('/').map(ans => ans.trim()); // Manejar "was/were", "got/gotten"

        // Limpia clases anteriores
        input.classList.remove('correct', 'incorrect');

        if (userAnswer === '') {
             input.classList.add('incorrect'); // Marcar vacío como incorrecto
             input.placeholder = `Respuesta: ${originalData[colIndex]}`; // Mostrar respuesta en placeholder
        } else if (possibleAnswers.includes(userAnswer)) {
            input.classList.add('correct');
            correctCount++;
            // Opcional: Deshabilitar input correcto para no cambiarlo
            // input.disabled = true;
        } else {
            input.classList.add('incorrect');
             // Mostrar la respuesta correcta en el placeholder del input incorrecto
             input.placeholder = `Correcto: ${originalData[colIndex]}`;
             // Opcional: Limpiar el valor incorrecto para que se vea el placeholder
             // input.value = '';
        }
    });

    feedbackDiv.textContent = `Resultados: ${correctCount} de ${totalInputs} respuestas correctas.`;
    // Scroll suave para ver el feedback, especialmente en móvil
    feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// --- Event Listeners ---
btnRandom.addEventListener('click', () => startGame('random'));
btnInfinitive.addEventListener('click', () => startGame('infinitive'));
btnPastSimple.addEventListener('click', () => startGame('past_simple'));
btnPastParticiple.addEventListener('click', () => startGame('past_participle'));
btnTranslation.addEventListener('click', () => startGame('translation'));
btnCheck.addEventListener('click', checkAnswers);

// --- Inicio ---
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";

// --- Mejoras de Accesibilidad y UX ---
// Permitir presionar Enter en un input para comprobar (o ir al siguiente)
tableBody.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        event.preventDefault(); // Evita el comportamiento por defecto (submit de formulario si lo hubiera)

        // Podrías implementar ir al siguiente input o directamente comprobar todo
         checkAnswers(); // Comprueba todo al presionar Enter en cualquier input

        // Opcional: Mover foco al siguiente input (más complejo)
        /*
        const inputs = Array.from(tableBody.querySelectorAll('input:not([disabled])'));
        const currentIndex = inputs.indexOf(event.target);
        const nextInput = inputs[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        } else {
            // Si es el último input, quizás mover foco al botón de comprobar
            btnCheck.focus();
        }
        */
    }
});
