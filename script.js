// ============================================
// КОНСТАНТЫ И ТАБЛИЦЫ КОРРЕКЦИИ РАДИУСА
// ============================================

const DELTA_X_TABLE = [
    { angle: 15,  value: -0.465  },
    { angle: 30,  value: -1.465  },
    { angle: 45,  value: -1.1725 },
    { angle: 55,  value: -0.96   },
    { angle: 60,  value: -0.845  },
    { angle: 75,  value: -1.7375 }
];

const DELTA_Z_TABLE = [
    { angle: 15,  value: 0.8675 },
    { angle: 30,  value: 0.4225 },
    { angle: 45,  value: 0.585  },
    { angle: 55,  value: 0.685  },
    { angle: 60,  value: 0.7325 },
    { angle: 75,  value: 0.2325 }
];

// Сортировка таблиц
DELTA_X_TABLE.sort((a, b) => a.angle - b.angle);
DELTA_Z_TABLE.sort((a, b) => a.angle - b.angle);

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function formatNumber(num, decimals = 3) {
    if (num === null || isNaN(num)) return '-';
    return num.toFixed(decimals);
}

function parseNumber(value) {
    if (!value || value.trim() === '') return null;
    
    let str = value.toString().trim();
    str = str.replace(/мм/g, '');
    str = str.replace(',', '.');
    str = str.trim();
    
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function getBetaAngle(inputAngle, angleType) {
    if (angleType === 'face') {
        return inputAngle;
    } else {
        return 90 - inputAngle;
    }
}

function getAngleType() {
    const select = document.getElementById('angleType');
    return select ? select.value : 'face';
}

function interpolate(angle, table) {
    if (angle <= table[0].angle) return table[0].value;
    if (angle >= table[table.length - 1].angle) return table[table.length - 1].value;
    
    for (let i = 0; i < table.length - 1; i++) {
        if (angle >= table[i].angle && angle <= table[i + 1].angle) {
            const t = (angle - table[i].angle) / (table[i + 1].angle - table[i].angle);
            return table[i].value + t * (table[i + 1].value - table[i].value);
        }
    }
    
    return 0;
}

// ============================================
// ФУНКЦИЯ РАСЧЕТА ОТДЕЛЬНОГО ПОЛЯ (кнопка с калькулятором)
// ============================================

function calculateSingleField(fieldId) {
    // Получаем все значения
    const D = parseNumber(document.getElementById('diameterD').value);
    const D1 = parseNumber(document.getElementById('diameterD1').value);
    const angle = parseNumber(document.getElementById('angle').value);
    const L1 = parseNumber(document.getElementById('lengthL1').value);
    
    // Считаем сколько полей заполнено
    const values = [D, D1, angle, L1];
    const filledCount = values.filter(v => v !== null).length;
    
    if (filledCount !== 3) {
        alert('Для расчета одного поля нужно заполнить остальные 3 поля');
        return;
    }
    
    let result;
    let calculatedValue;
    
    // Рассчитываем значение для запрошенного поля
    switch(fieldId) {
        case 'diameterD':
            result = calculateMissingD(D1, angle, L1);
            calculatedValue = result.D;
            document.getElementById('diameterD').value = formatNumber(calculatedValue, 3);
            break;
        case 'diameterD1':
            result = calculateMissingD1(D, angle, L1);
            calculatedValue = result.D1;
            document.getElementById('diameterD1').value = formatNumber(calculatedValue, 3);
            break;
        case 'angle':
            result = calculateMissingAngle(D, D1, L1);
            calculatedValue = result.angle;
            document.getElementById('angle').value = formatNumber(calculatedValue, 1);
            break;
        case 'lengthL1':
            result = calculateMissingL1(D, D1, angle);
            calculatedValue = result.L1;
            document.getElementById('lengthL1').value = formatNumber(calculatedValue, 3);
            break;
    }
    
    // Показываем, что поле было рассчитано
    const input = document.getElementById(fieldId);
    input.style.backgroundColor = '#e8f4fc';
    input.style.borderColor = '#3498db';
    
    setTimeout(() => {
        input.style.backgroundColor = '';
        input.style.borderColor = '';
    }, 1000);
}

// ============================================
// МАТЕМАТИЧЕСКИЕ ФУНКЦИИ
// ============================================

function calculateMissingD(D1, angle, L1) {
    const angleType = getAngleType();
    const beta = getBetaAngle(angle, angleType);
    const angleRad = toRadians(beta);
    const deltaR = L1 * Math.tan(angleRad);
    const D = D1 + 2 * deltaR;
    
    return { D, D1, angle, L1, deltaR };
}

function calculateMissingD1(D, angle, L1) {
    const angleType = getAngleType();
    const beta = getBetaAngle(angle, angleType);
    const angleRad = toRadians(beta);
    const deltaR = L1 * Math.tan(angleRad);
    const D1 = D - 2 * deltaR;
    
    return { D, D1, angle, L1, deltaR };
}

function calculateMissingAngle(D, D1, L1) {
    const deltaR = (D - D1) / 2;
    const angleRad = Math.atan(deltaR / L1);
    const beta = (angleRad * 180) / Math.PI;
    const angleType = getAngleType();
    const angle = angleType === 'face' ? beta : 90 - beta;
    
    return { D, D1, angle, L1, deltaR };
}

function calculateMissingL1(D, D1, angle) {
    const angleType = getAngleType();
    const beta = getBetaAngle(angle, angleType);
    const angleRad = toRadians(beta);
    const deltaR = (D - D1) / 2;
    const L1 = deltaR / Math.tan(angleRad);
    
    return { D, D1, angle, L1, deltaR };
}

function calculateRadiusCorrection(D1, L1, beta, toolRadius, useRadius) {
    if (toolRadius <= 0 || !useRadius) {
        return {
            correctedD1: D1,
            correctedL1: L1,
            deltaX: 0,
            deltaZ: 0
        };
    }
    
    // ИСПРАВЛЕННАЯ ФОРМУЛА (как в телефонном калькуляторе)
    // k(α) = 1 / (1 + sin(α))
    const sinBeta = Math.sin(toRadians(beta));
    const k = 1 / (1 + sinBeta);
    
    const angleRad = toRadians(beta);
    const tanAlpha = Math.tan(angleRad);
    
    // ΔZ = R * k
    const deltaZ = toolRadius * k;
    
    // ΔX = -2 * tg(α) * R * k
    const deltaX = -2 * tanAlpha * toolRadius * k;
    
    return {
        correctedD1: D1 + deltaX,
        correctedL1: L1 + deltaZ,
        deltaX: deltaX,
        deltaZ: deltaZ
    };
}

// ============================================
// ПОЛНЫЙ РАСЧЕТ (при нажатии кнопки "Рассчитать")
// ============================================

function performFullCalculation() {
    // Получаем значения
    const D = parseNumber(document.getElementById('diameterD').value);
    const D1 = parseNumber(document.getElementById('diameterD1').value);
    const angle = parseNumber(document.getElementById('angle').value);
    const L1 = parseNumber(document.getElementById('lengthL1').value);
    const useRadius = document.getElementById('useRadius').checked;
    const toolRadius = useRadius ? parseNumber(document.getElementById('toolRadius').value) || 0 : 0;
    
    // Проверяем количество введенных параметров
    const values = [D, D1, angle, L1];
    const valuesCount = values.filter(v => v !== null).length;
    
    if (valuesCount < 3) {
        showMessage('Заполните 3 параметра из 4 для расчета');
        return;
    }
    
    // Проверяем допустимость значений
    if (angle !== null && (angle <= 0 || angle >= 90)) {
        showMessage('Угол должен быть в диапазоне 0° < α < 90°');
        return;
    }
    
    if (D !== null && D1 !== null && D === D1) {
        showMessage('Диаметры D и D1 не должны быть равны');
        return;
    }
    
    if (L1 !== null && L1 <= 0) {
        showMessage('Длина фаски L1 должна быть положительной');
        return;
    }
    
    // Определяем, какой параметр нужно найти
    let result;
    
    if (D === null) result = calculateMissingD(D1, angle, L1);
    else if (D1 === null) result = calculateMissingD1(D, angle, L1);
    else if (angle === null) result = calculateMissingAngle(D, D1, L1);
    else if (L1 === null) result = calculateMissingL1(D, D1, angle);
    else {
        // Все заполнено, пересчитываем D1
        result = calculateMissingD1(D, angle, L1);
    }
    
    // Применяем коррекцию радиуса если нужно
    let correction = null;
    if (useRadius && toolRadius > 0) {
        const angleType = getAngleType();
        const beta = getBetaAngle(result.angle, angleType);
        correction = calculateRadiusCorrection(result.D1, result.L1, beta, toolRadius, useRadius);
    }
    
    // Обновляем результаты
    updateResults(result, useRadius, correction);
    
    // Генерируем G-код
    generateGCode(result, useRadius, toolRadius, correction);
    
    // Обновляем визуализацию
    drawChamfer(result, useRadius, toolRadius, correction);

     // Автоматически переключаем на вкладку G-кода после расчета
     document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
     document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
     document.querySelector('.tab-btn[data-tab="gcode"]').classList.add('active');
     document.getElementById('gcode-tab').classList.add('active');
}

// ============================================
// ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ И G-КОДА
// ============================================

function updateResults(result, useRadius, correction) {
    // Обновляем результаты
    if (useRadius && correction) {
        document.getElementById('resultD1').textContent = formatNumber(correction.correctedD1, 3);
        document.getElementById('resultL1').textContent = formatNumber(Math.abs(correction.correctedL1), 3);
    } else {
        document.getElementById('resultD1').textContent = formatNumber(result.D1, 3);
        document.getElementById('resultL1').textContent = formatNumber(result.L1, 3);
    }
}

function generateGCode(result, useRadius, toolRadius, correction) {
    // Определяем фактические значения для G-кода
    const actualD1 = useRadius && correction ? correction.correctedD1 : result.D1;
    const actualL1 = useRadius && correction ? Math.abs(correction.correctedL1) : result.L1;
    
    // Безопасные координаты - D + 0.5 мм
    const safeX = (result.D + 0.5).toFixed(3);
    const safeZ = -1.0;
    
    let gcode = `// ФАСКА ${useRadius ? 'С УЧЕТОМ' : 'БЕЗ УЧЕТА'} РАДИУСА\n`;
    if (useRadius) {
        gcode += `// Радиус инструмента R = ${toolRadius} мм\n`;
    }
    gcode += `// D=${formatNumber(result.D, 3)} | D1=${formatNumber(actualD1, 3)}\n`;
    gcode += `// α=${formatNumber(result.angle, 1)}° | L1=${formatNumber(actualL1, 3)}\n\n`;
    
    gcode += `// БЕЗОПАСНЫЙ ПОДХОД\n`;
    gcode += `G00 X${safeX} Z${safeZ};\n`;
    gcode += `G01 Z0.0 F0.1;\n\n`;
    
    gcode += `// ОБРАБОТКА ФАСКИ\n`;
    if (actualD1 < result.D) {
        // D1 < D: от меньшего к большему
        gcode += `G01 X${formatNumber(actualD1, 3)} F0.5;\n`;
        gcode += `X${formatNumber(result.D, 3)} Z-${formatNumber(actualL1, 3)};`;
    } else {
        // D1 > D: от меньшего к большему (обратный случай)
        gcode += `G01 X${formatNumber(result.D, 3)} F0.5;\n`;
        gcode += `X${formatNumber(actualD1, 3)} Z-${formatNumber(actualL1, 3)};`;
    }
    
    document.getElementById('gCodePreview').textContent = gcode;
}

function showMessage(message) {
    document.getElementById('gCodePreview').textContent = `// ${message}\n\n// Заполните 3 параметра:\n// - Начальный диаметр D\n// - Конечный диаметр D1\n// - Угол фаски α\n// - Длину фаски L1`;
    
    document.getElementById('resultD1').textContent = '-';
    document.getElementById('resultL1').textContent = '-';
    
    // Очищаем canvas
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#95a5a6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width/2, canvas.height/2);

     // Переключаем на вкладку G-кода
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="gcode"]').classList.add('active');
    document.getElementById('gcode-tab').classList.add('active');
}


// ============================================
// ВИЗУАЛИЗАЦИЯ (упрощенная для мобильных)
// ============================================

function drawChamfer(result, useRadius, toolRadius, correction) {
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Фон
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Определяем фактические значения
    const D = result.D;
    const D1 = useRadius && correction ? correction.correctedD1 : result.D1;
    const L1 = useRadius && correction ? Math.abs(correction.correctedL1) : result.L1;
    
    // Масштабирование для визуализации
    const maxDiameter = Math.max(D, D1);
    const scale = Math.min(width * 0.7 / maxDiameter, height * 0.7 / (L1 * 2));
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Рисуем фаску
    ctx.beginPath();
    
    // Верхняя линия (D → D1)
    const x1 = centerX - D/2 * scale;
    const y1 = centerY - L1 * scale;
    const x2 = centerX - D1/2 * scale;
    const y2 = centerY;
    
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    // Нижняя линия (симметрично)
    ctx.moveTo(x1, centerY + L1 * scale);
    ctx.lineTo(x2, centerY);
    
    // Замыкаем контур
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, centerY + L1 * scale);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Подписи размеров
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    // D
    ctx.fillText(`D = ${formatNumber(D, 1)}`, centerX, y1 - 15);
    
    // D1
    ctx.fillText(`D1 = ${formatNumber(D1, 1)}`, centerX, y2 + 25);
    
    // L1
    ctx.fillText(`L1 = ${formatNumber(L1, 2)}`, x1 - 40, centerY);
    
    // Угол
    ctx.fillText(`α = ${formatNumber(result.angle, 1)}°`, x2 + 50, centerY - 15);
    
    // Радиус инструмента (если учитывается)
    if (useRadius && toolRadius > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`R = ${toolRadius} мм`, centerX, height - 15);
    }
}

// ============================================
// ОЧИСТКА ВСЕХ ПОЛЕЙ ВВОДА
// ============================================

function clearAllFields() {
    // Очищаем основные поля ввода
    document.getElementById('diameterD').value = '';
    document.getElementById('diameterD1').value = '';
    document.getElementById('angle').value = '';
    document.getElementById('lengthL1').value = '';
    
    // Сбрасываем радиус к значению по умолчанию
    document.getElementById('toolRadius').value = '0.4';
    
    // Включаем учет радиуса
    document.getElementById('useRadius').checked = true;
    updateRadiusVisibility();
    
    // Сбрасываем результаты
    document.getElementById('resultD1').textContent = '-';
    document.getElementById('resultL1').textContent = '-';
    
    // Сбрасываем G-код
    document.getElementById('gCodePreview').textContent = '// Введите параметры и нажмите "Рассчитать"';
    
    // Сбрасываем визуализацию
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#95a5a6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Введите параметры для расчета', canvas.width/2, canvas.height/2);
    
    // Фокус на первое поле
    document.getElementById('diameterD').focus();
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 1. Кнопки расчета отдельных полей
    document.querySelectorAll('.calc-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            calculateSingleField(targetId);
        });
    });
    
    // 2. Главная кнопка "Рассчитать"
    document.getElementById('calculateBtn').addEventListener('click', performFullCalculation);
    
    // 3. Кнопка очистки всех полей
    document.getElementById('clearAllBtn').addEventListener('click', clearAllFields);
    
    // 4. Кнопка копирования G-кода
    document.getElementById('copyGCode').addEventListener('click', function() {
        const gcode = document.getElementById('gCodePreview').textContent;
        navigator.clipboard.writeText(gcode).then(() => {
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i>';
            this.title = 'Скопировано!';
            
            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.title = 'Копировать';
            }, 2000);
        });
    });
    
    // 5. Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Убираем активный класс у всех кнопок и контента
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // 6. Управление видимостью поля радиуса
    const useRadiusCheckbox = document.getElementById('useRadius');
    const radiusInput = document.getElementById('toolRadius');

    function updateRadiusVisibility() {
        if (radiusInput) {
            if (useRadiusCheckbox.checked) {
                radiusInput.disabled = false;
                radiusInput.style.opacity = '1';
                radiusInput.style.backgroundColor = 'white';
                radiusInput.style.cursor = 'text';
            } else {
                radiusInput.disabled = true;
                radiusInput.style.opacity = '0.6';
                radiusInput.style.backgroundColor = '#f8f9fa';
                radiusInput.style.cursor = 'not-allowed';
            }
        }
    }

    if (useRadiusCheckbox) {
        useRadiusCheckbox.addEventListener('change', updateRadiusVisibility);
        updateRadiusVisibility(); // Инициализация
    }
    
    // 7. Ограничение ввода только цифрами (для мобильных)
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('keypress', function(e) {
            // Разрешаем: цифры, точка, запятая, Backspace, Delete, Tab
            const allowedKeys = [8, 9, 13, 46, 110, 190, 188]; // Backspace, Tab, Enter, Delete, . (два варианта), ,
            const charCode = e.which ? e.which : e.keyCode;
            
            // Если не цифра и не разрешенная клавиша - блокируем
            if ((charCode < 48 || charCode > 57) && allowedKeys.indexOf(charCode) === -1) {
                e.preventDefault();
            }
        });
        
        // Замена запятой на точку при вводе
        input.addEventListener('input', function() {
            this.value = this.value.replace(',', '.');
        });
    });
    
    // 8. Автозаполнение пустого поля при вводе 3-х параметров
    document.querySelectorAll('#diameterD, #diameterD1, #angle, #lengthL1').forEach(input => {
        input.addEventListener('blur', function() {
            const inputs = [
                document.getElementById('diameterD'),
                document.getElementById('diameterD1'), 
                document.getElementById('angle'),
                document.getElementById('lengthL1')
            ];
            
            // Считаем заполненные поля
            const filledInputs = inputs.filter(inp => inp.value.trim() !== '');
            
            // Если заполнено ровно 3 поля, предлагаем рассчитать 4-е
            if (filledInputs.length === 3) {
                const emptyInput = inputs.find(inp => inp.value.trim() === '');
                if (emptyInput) {
                    // Подсвечиваем пустое поле
                    emptyInput.style.borderColor = '#f39c12';
                    emptyInput.style.backgroundColor = '#fef9e7';
                    
                    // Через секунду убираем подсветку
                    setTimeout(() => {
                        emptyInput.style.borderColor = '';
                        emptyInput.style.backgroundColor = '';
                    }, 1000);
                }
            }
        });
    });
    
    // 9. Первоначальная инициализация
    showMessage('Введите параметры и нажмите "Рассчитать"');
});