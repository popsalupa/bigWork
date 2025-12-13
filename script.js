// ============================================
// КОНСТАНТЫ И ТАБЛИЦЫ
// ============================================

// Точные таблицы на основе ваших примеров
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

function toDegrees(radians) {
    return radians * 180 / Math.PI;
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

function getBetaAngle(inputAngle, angleType) {
    if (angleType === 'face') {
        return inputAngle;
    } else {
        return 90 - inputAngle;
    }
}

function getAngleType() {
    const activeBtn = document.querySelector('.angle-btn.active');
    return activeBtn ? activeBtn.dataset.type : 'face';
}

// ============================================
// РАСЧЕТНЫЕ ФУНКЦИИ
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
    const beta = toDegrees(angleRad);
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

function calculateRadiusCorrection(D1, L1, beta, toolRadius) {
    if (toolRadius <= 0) {
        return {
            correctedD1: D1,
            correctedL1: L1,
            deltaX: 0,
            deltaZ: 0
        };
    }
    
    const deltaXRatio = interpolate(beta, DELTA_X_TABLE);
    const deltaZRatio = interpolate(beta, DELTA_Z_TABLE);
    
    const deltaX = deltaXRatio * toolRadius;
    const deltaZ = deltaZRatio * toolRadius;
    
    return {
        correctedD1: D1 + deltaX,
        correctedL1: L1 + deltaZ,
        deltaX: deltaX,
        deltaZ: deltaZ
    };
}

// ============================================
// ВИЗУАЛИЗАЦИЯ
// ============================================

function drawChamfer(result, toolRadius, correction) {
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Увеличиваем область визуализации
    const effectiveWidth = width * 0.85;
    const effectiveHeight = height * 0.75;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const D = result.D;
    const D1 = correction ? correction.correctedD1 : result.D1;
    const L1 = correction ? Math.abs(correction.correctedL1) : result.L1;
    const angleType = getAngleType();
    const beta = getBetaAngle(result.angle, angleType);
    
    // Увеличиваем масштаб
    const maxDiameter = Math.max(D, D1);
    const scale = Math.min(
        effectiveWidth / (maxDiameter + 30),
        effectiveHeight / 100
    ) * 1.8;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Фон
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Рассчитываем координаты
    const startX = centerX - 180;
    const mainRadius = D / 2 * scale;
    const endRadius = D1 / 2 * scale;
    const chamferLength = L1 * 35 * scale;
    
    // Основной цилиндр
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(startX, centerY - mainRadius, 140, mainRadius * 2);
    
    // Цилиндр после фаски
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(startX + 140, centerY - endRadius, 100, endRadius * 2);
    
    // Фаска
    ctx.beginPath();
    ctx.moveTo(startX + 140, centerY - mainRadius);
    ctx.lineTo(startX + 140 + chamferLength, centerY - endRadius);
    ctx.lineTo(startX + 140 + chamferLength, centerY + endRadius);
    ctx.lineTo(startX + 140, centerY + mainRadius);
    ctx.closePath();
    ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Осевая линия
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.moveTo(startX - 40, centerY);
    ctx.lineTo(startX + 140 + chamferLength + 60, centerY);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Размерные линии с увеличенными отступами
    drawDimensionWithOffset(ctx, startX + 140, centerY - mainRadius - 25,
                          startX + 140 + chamferLength, centerY - mainRadius - 25,
                          `L1 = ${formatNumber(L1, 3)} мм`);
    
    drawDimensionWithOffset(ctx, startX - 50, centerY - mainRadius,
                          startX - 50, centerY + mainRadius,
                          `D = ${formatNumber(D, 3)} мм`);
    
    drawDimensionWithOffset(ctx, startX + 140 + chamferLength + 50, centerY - endRadius,
                          startX + 140 + chamferLength + 50, centerY + endRadius,
                          `D1 = ${formatNumber(D1, 3)} мм`);
    
    // Угол
    drawAngleWithLabel(ctx, startX + 140, centerY - mainRadius, 
                      chamferLength * 0.6, toRadians(beta),
                      `${formatNumber(result.angle, 1)}°`);
}

function drawDimensionWithOffset(ctx, x1, y1, x2, y2, text) {
    // Основная линия
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Стрелки
    drawArrow(ctx, x1, y1, x2, y2);
    drawArrow(ctx, x2, y2, x1, y1);
    
    // Текст
    ctx.fillStyle = '#2c3e50';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, (x1 + x2) / 2, y1 - 8);
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 8;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI/6), 
               toY - headlen * Math.sin(angle - Math.PI/6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI/6), 
               toY - headlen * Math.sin(angle + Math.PI/6));
    ctx.stroke();
}

function drawAngleWithLabel(ctx, x, y, length, angleRad, text) {
    const endX = x + length * Math.cos(angleRad);
    const endY = y - length * Math.sin(angleRad);
    
    // Линия угла
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Дуга
    const arcRadius = 40;
    ctx.beginPath();
    ctx.arc(x, y, arcRadius, -Math.PI/2, -Math.PI/2 + angleRad, false);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Текст угла
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + 35, y - 45);
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА
// ============================================

function calculate() {
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
        showMessage('Введите любые 3 параметра из 4 для расчета');
        return;
    }
    
    // Проверяем допустимость значений
    if (angle !== null && (angle <= 0 || angle >= 90)) {
        showMessage('Угол должен быть в диапазоне 0° < α < 90°');
        return;
    }
    
    if (D !== null && D1 !== null && D <= D1) {
        showMessage('Начальный диаметр D должен быть больше конечного D1');
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
    else result = calculateMissingD1(D, angle, L1);
    
    // Применяем коррекцию радиуса если нужно
    let correction = null;
    if (useRadius && toolRadius > 0) {
        const angleType = getAngleType();
        const beta = getBetaAngle(result.angle, angleType);
        correction = calculateRadiusCorrection(result.D1, result.L1, beta, toolRadius);
    }
    
    // Обновляем интерфейс
    updateResults(result, useRadius, toolRadius, correction);
    
    // Генерируем G-код
    generateGCode(result, useRadius, toolRadius, correction);
    
    // Обновляем визуализацию
    drawChamfer(result, toolRadius, correction);
}

function updateResults(result, useRadius, toolRadius, correction) {
    if (useRadius && toolRadius > 0 && correction) {
        document.getElementById('resultD1').textContent = formatNumber(correction.correctedD1, 3);
        document.getElementById('resultL1').textContent = formatNumber(Math.abs(correction.correctedL1), 3);
        document.getElementById('resultX').textContent = formatNumber(correction.correctedD1, 3);
        document.getElementById('resultZ').textContent = `-${formatNumber(Math.abs(correction.correctedL1), 3)}`;
        
        // Показываем информацию о коррекции
        document.getElementById('correctionInfo').style.display = 'block';
        document.getElementById('corrDeltaX').textContent = `${formatNumber(correction.deltaX, 4)} мм`;
        document.getElementById('corrDeltaZ').textContent = `${formatNumber(correction.deltaZ, 4)} мм`;
    } else {
        document.getElementById('resultD1').textContent = formatNumber(result.D1, 3);
        document.getElementById('resultL1').textContent = formatNumber(result.L1, 3);
        document.getElementById('resultX').textContent = formatNumber(result.D1, 3);
        document.getElementById('resultZ').textContent = `-${formatNumber(result.L1, 3)}`;
        
        // Скрываем информацию о коррекции
        document.getElementById('correctionInfo').style.display = 'none';
    }
}

function generateGCode(result, useRadius, toolRadius, correction) {
    let gcode = '';
    
    if (useRadius && toolRadius > 0 && correction) {
        const safeX = (correction.correctedD1 + 5).toFixed(3);
        const approachZ = Math.max(0, -correction.deltaZ).toFixed(3);
        
        gcode += `// ФАСКА С УЧЕТОМ РАДИУСА ИНСТРУМЕНТА R=${toolRadius} мм\n`;
        gcode += `G00 X${safeX} Z2.0;\n`;
        gcode += `G01 Z${approachZ} F0.1;\n`;
        gcode += `X${formatNumber(result.D, 3)} Z${approachZ};\n`;
        gcode += `X${formatNumber(correction.correctedD1, 3)} Z-${formatNumber(Math.abs(correction.correctedL1), 3)};`;
    } else {
        const safeX = (result.D + 5).toFixed(3);
        
        gcode += `// ФАСКА БЕЗ УЧЕТА РАДИУСА ИНСТРУМЕНТА\n`;
        gcode += `G00 X${safeX} Z2.0;\n`;
        gcode += `G01 Z0.0 F0.1;\n`;
        gcode += `X${formatNumber(result.D, 3)} Z0.0;\n`;
        gcode += `X${formatNumber(result.D1, 3)} Z-${formatNumber(result.L1, 3)};`;
    }
    
    document.getElementById('gCodePreview').textContent = gcode;
}

function showMessage(message) {
    document.getElementById('gCodePreview').textContent = `// ${message}\n\n// Введите любые 3 параметра:\n// - Начальный диаметр D\n// - Конечный диаметр D1\n// - Угол фаски α\n// - Длину фаски L1`;
    
    document.getElementById('resultD1').textContent = '-';
    document.getElementById('resultL1').textContent = '-';
    document.getElementById('resultX').textContent = '-';
    document.getElementById('resultZ').textContent = '-';
    
    // Очищаем canvas
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#a0aec0';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width/2, canvas.height/2);
}