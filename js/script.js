// --- Referencias a Elementos del DOM ---
const tableBody = document.getElementById('verb-table-body');
const btnRandom = document.getElementById('btn-random');
const btnInfinitive = document.getElementById('btn-infinitive');
const btnPastSimple = document.getElementById('btn-past-simple');
const btnPastParticiple = document.getElementById('btn-past-participle');
const btnTranslation = document.getElementById('btn-translation');
const btnCheck = document.getElementById('btn-check'); // Sigue siendo útil para un resumen final
const feedbackDiv = document.getElementById('feedback');
// const numVerbsInput = document.getElementById('num-verbs'); // Descomentar si añades el selector de número

// --- Variables Globales ---
let currentMode = null; // Modo de juego actual
let verbsToDisplay = []; // Verbos mostrados en la tabla actual
let originalVerbDataMap = new Map(); // Mapa para acceder rápido a los datos originales de los verbos

// --- Funciones ---

/**
 * Baraja un array in-place usando el algoritmo Fisher-Yates.
 * @param {Array} array El array a barajar.
 * @returns {Array} El mismo array, pero barajado.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Intercambio de elementos
    }
    return array;
}

/**
 * Prepara e inicia el juego según el modo seleccionado.
 * Limpia la tabla, selecciona verbos, los baraja y crea las filas con inputs/texto.
 * @param {string} mode - El modo de juego ('random', 'infinitive', etc.).
 */
function startGame(mode) {
    currentMode = mode;
    feedbackDiv.innerHTML = ''; // Limpia feedback anterior al iniciar nuevo juego
    tableBody.innerHTML = ''; // Limpia la tabla anterior
    originalVerbDataMap.clear(); // Limpia el mapa de datos

    // 1. Seleccionar y barajar verbos (usamos todos)
    // Si tuvieras muchos verbos, aquí podrías seleccionar un subconjunto
    verbsToDisplay = shuffleArray([...verbList]); // Copia y baraja la lista completa

    // 2. Crear mapa para búsqueda rápida y generar filas de la tabla
    verbsToDisplay.forEach((verbData, displayIndex) => {
        // Clave única para el mapa (infinitivo + índice por si hay infinitivos repetidos en la lista original)
        const originalKey = verbData[0] + '-' + displayIndex;
        originalVerbDataMap.set(originalKey, verbData); // Guarda los datos originales asociados a esta clave

        const row = tableBody.insertRow();
        row.dataset.verbKey = originalKey; // Guarda la clave en la fila para referencia futura

        // 3. Crear celdas para cada columna del verbo
        verbData.forEach((text, colIndex) => {
            const cell = row.insertCell();
            let makeInput = false; // Determina si esta celda será un input o texto

            // Columna 4 (Tipo) siempre es texto
            if (colIndex === 4) {
                cell.textContent = text;
            } else {
                // Determinar si hacer input basado en el modo de juego
                switch (mode) {
                    case 'random': makeInput = Math.random() < 0.4; break; // 40% probabilidad
                    case 'infinitive': makeInput = (colIndex === 0); break;
                    case 'past_simple': makeInput = (colIndex === 1); break;
                    case 'past_participle': makeInput = (colIndex === 2); break;
                    case 'translation': makeInput = (colIndex === 3); break;
                }

                // Crear input o texto
                if (makeInput) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.dataset.colIndex = colIndex; // Guarda el índice de la columna
                    input.setAttribute('aria-label', `Respuesta para ${getHeaderName(colIndex)} del verbo ${verbData[0]}`);
                    // *** AÑADIR LISTENER PARA VALIDACIÓN INSTANTÁNEA ***
                    input.addEventListener('blur', handleInputBlur);
                    cell.appendChild(input);
                } else {
                    cell.textContent = text; // Mostrar el texto correcto si no es input
                }
            }
        });
    });

    // 4. Asegurar al menos un input por fila en modo aleatorio (opcional pero recomendado)
    if (mode === 'random') {
        ensureOneInputPerRow();
    }

    // 5. Mensaje inicial y log
    feedbackDiv.textContent = 'Rellena las casillas vacías. La corrección es automática al salir de cada casilla.';
    console.log(`Juego iniciado en modo: ${mode}. Verbos mostrados: ${verbsToDisplay.length}`);
}

/**
 * Función auxiliar (para modo 'random'): Asegura que cada fila tenga al menos un input.
 * Si una fila no tiene inputs, convierte una celda aleatoria (no 'Tipo') en input.
 */
function ensureOneInputPerRow() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputsInRow = row.querySelectorAll('input');
        if (inputsInRow.length === 0 && originalVerbDataMap.has(row.dataset.verbKey)) { // Solo si no hay inputs
            const cells = row.querySelectorAll('td');
            let randomIndex;
            // Elegir una columna aleatoria entre 0 y 3 (Inf, PS, PP, Trans)
            do {
                randomIndex = Math.floor(Math.random() * 4);
            } while (randomIndex === 4); // Asegura no elegir la columna 'Tipo'

            const cellToChange = cells[randomIndex];
            const verbKey = row.dataset.verbKey;
            const originalData = originalVerbDataMap.get(verbKey);

            if (!originalData) { // Salvaguarda
                console.error("Asegurando input: No se encontraron datos originales para la clave:", verbKey);
                return;
            }

            // Limpiar la celda y añadir el input
            cellToChange.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.colIndex = randomIndex;
            input.setAttribute('aria-label', `Respuesta para ${getHeaderName(randomIndex)} del verbo ${originalData[0]}`);
            // *** IMPORTANTE: Añadir también el listener aquí ***
            input.addEventListener('blur', handleInputBlur);
            cellToChange.appendChild(input);
            console.log(`Input asegurado en fila con clave ${verbKey}, columna ${randomIndex}`);
        }
    });
}

/**
 * Devuelve el nombre de la cabecera de columna para usar en aria-label.
 * @param {number} colIndex Índice de la columna (0-3).
 * @returns {string} Nombre de la cabecera.
 */
function getHeaderName(colIndex) {
    const headers = ["Infinitivo", "Pasado Simple", "Pasado Participio", "Traducción"];
    return headers[colIndex] || "Desconocido";
}

/**
 * Manejador del evento 'blur' para un input. Se llama cuando el input pierde el foco.
 * @param {Event} event El objeto del evento 'blur'.
 */
function handleInputBlur(event) {
    const input = event.target; // El input que perdió el foco
    checkSingleInput(input); // Comprueba la respuesta de este input
    // Opcional: podrías añadir aquí una lógica para actualizar un contador global si quisieras
    // updateGeneralFeedback();
}

/**
 * Comprueba la respuesta de UN SOLO input y aplica el estilo visual (verde/rojo).
 * @param {HTMLInputElement} input El elemento input a comprobar.
 * @returns {boolean} `true` si la respuesta es correcta, `false` si es incorrecta o hay error.
 */
function checkSingleInput(input) {
    const userAnswer = input.value.trim().toLowerCase(); // Respuesta del usuario (limpia y en minúsculas)
    const cell = input.closest('td'); // Celda que contiene el input
    const row = input.closest('tr'); // Fila que contiene el input

    // Validar que tenemos toda la info necesaria
    if (!row || !cell || !row.dataset.verbKey || typeof input.dataset.colIndex === 'undefined') {
         console.error("CheckSingleInput: No se pudo encontrar la información necesaria (row, cell, key, colIndex) para comprobar:", input);
         input.classList.remove('correct');
         input.classList.add('incorrect'); // Marcar como incorrecto por defecto en caso de error
         return false;
    }

    const verbKey = row.dataset.verbKey; // Clave para buscar en el mapa
    const colIndex = parseInt(input.dataset.colIndex); // Índice de la columna
    const originalData = originalVerbDataMap.get(verbKey); // Obtener los datos originales del verbo

    // Validar que encontramos los datos originales
    if (!originalData) {
        console.error("CheckSingleInput: No se encontraron datos originales en el mapa para la clave:", verbKey);
        input.classList.remove('correct');
        input.classList.add('incorrect');
        return false;
    }

    const correctAnswer = originalData[colIndex].toLowerCase(); // Respuesta correcta (en minúsculas)
    // Manejar respuestas múltiples separadas por '/' (ej: "was/were", "got/gotten")
    const possibleAnswers = correctAnswer.split('/').map(ans => ans.trim());

    // Limpiar estilos y placeholder anteriores
    input.classList.remove('correct', 'incorrect');
    input.placeholder = ''; // Quitar cualquier placeholder (como la respuesta correcta de un intento anterior)

    let isCorrect = false;
    // Comprobar la respuesta
    if (userAnswer === '') {
        // Si el usuario deja la casilla vacía, no hacemos nada inmediatamente.
        // Se marcará como incorrecta si pulsa el botón "Comprobar Todo".
        // Podrías cambiar esto y marcarlo como incorrecto inmediatamente si lo prefieres:
        // input.classList.add('incorrect');
        // input.placeholder = `Respuesta: ${originalData[colIndex]}`;
    } else if (possibleAnswers.includes(userAnswer)) {
        // ¡Respuesta correcta!
        input.classList.add('correct');
        isCorrect = true;
        // Opcional: Deshabilitar el input si es correcto para evitar cambios
        // input.disabled = true;
    } else {
        // Respuesta incorrecta
        input.classList.add('incorrect');
        // Mostrar la respuesta correcta en el placeholder como ayuda
        input.placeholder = `Correcto: ${originalData[colIndex]}`;
    }

    return isCorrect; // Devuelve si fue correcta o no
}


/**
 * Comprueba TODAS las respuestas. Llamado por el botón "Comprobar Todo".
 * Itera por todos los inputs, valida cada uno (marcando los vacíos como incorrectos)
 * y muestra un resumen final en el div de feedback.
 */
function checkAllAnswers() {
    if (!currentMode) {
        feedbackDiv.textContent = 'Selecciona un modo de juego para empezar.';
        return;
    }

    const inputs = tableBody.querySelectorAll('input[type="text"]');
    let correctCount = 0;
    let totalInputs = inputs.length;
    let answeredInputs = 0; // Contador de inputs que tienen algún valor

    if (totalInputs === 0) {
        feedbackDiv.textContent = 'No hay nada que comprobar en este modo.';
        return;
    }

    // Iterar por cada input para comprobarlo y contar
    inputs.forEach(input => {
        const isCorrect = checkSingleInput(input); // Revalida (o valida por primera vez si no se tocó)
        if (isCorrect) {
            correctCount++;
        }

        // Si el input está vacío DESPUÉS de la validación (checkSingleInput no lo marcó como correcto),
        // ahora lo marcamos explícitamente como incorrecto y mostramos la respuesta.
        if (input.value.trim() === '' && !input.classList.contains('correct')) {
             input.classList.add('incorrect');
             // Mostrar la respuesta en el placeholder para los vacíos
             const row = input.closest('tr');
             const colIndex = parseInt(input.dataset.colIndex);
             const originalData = originalVerbDataMap.get(row?.dataset.verbKey); // Usar optional chaining por si acaso
             if (originalData && originalData[colIndex]) {
                 input.placeholder = `Respuesta: ${originalData[colIndex]}`;
             }
        }

        // Contar si el input fue respondido (tiene algún valor)
        if (input.value.trim() !== '') {
            answeredInputs++;
        }
    });

    // Mostrar el resumen final
    feedbackDiv.textContent = `Comprobación final: ${correctCount} de ${totalInputs} respuestas correctas. (${answeredInputs} respondidas).`;
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
// Cambiar texto del botón para reflejar esto (opcional)
btnCheck.textContent = 'Comprobar Todo / Ver Respuestas';

// --- Inicio ---
// Mensaje inicial al cargar la página
feedbackDiv.textContent = "Selecciona un modo de juego para empezar.";
