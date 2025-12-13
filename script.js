// ============================================
// ОСНОВНЫЕ ФУНКЦИИ
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
    const activeBtn = document.querySelector('.compact-btn.active');
    return activeBtn ? activeBtn.dataset.type : 'face';
}

// ============================================
// МАТЕМАТИЧЕСКИЕ РАСЧЕТЫ
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

// ============================================
// ВИЗУАЛИЗАЦИЯ
// ============================================

function drawChamfer(result) {
    const canvas = document.getElementById('chamferCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Фон
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    const D = result.D;
    const D1 = result.D1;
    const L1 = result.L1;
    const angleType = getAngleType();
    const beta = getBetaAngle(result.angle, angleType);
    
    // Масштаб
    const maxDiameter = Math.max(D, D1);
    const scale = Math.min(width / (maxDiameter + 80), height / 120);
    
    const centerY = height / 2;
    const startX = 60;
    
    // Основной цилиндр (D)
    const mainRadius = D / 2 * scale;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(startX, centerY - mainRadius, 100, mainRadius * 2);
    
    // Цилиндр после фаски (D1)
    const endRadius = D1 / 2 * scale;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(startX + 100, centerY - endRadius, 60, endRadius * 2);
    
    // Фаска
    ctx.beginPath();
    ctx.moveTo(startX + 100, centerY - mainRadius);
    ctx.lineTo(startX + 100 + L1 * 20 * scale, centerY - endRadius);
    ctx.lineTo(startX + 100 + L1 * 20 * scale, centerY + endRadius);
    ctx.lineTo(startX + 100, centerY + mainRadius);
    ctx.closePath();
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Осевая линия
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.moveTo(30, centerY);
    ctx.lineTo(width - 30, centerY);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Размерные линии
    drawDimension(ctx, startX + 100, centerY - mainRadius - 15,
                 startX + 100 + L1 * 20 * scale, centerY - mainRadius - 15,
                 `L1 = ${formatNumber(L1, 3)}`);
    
    drawDimension(ctx, startX - 20, centerY - mainRadius,
                 startX - 20, centerY + mainRadius,
                 `D = ${formatNumber(D, 3)}`);
    
    drawDimension(ctx, startX + 100 + L1 * 20 * scale + 20, centerY - endRadius,
                 startX + 100 + L1 * 20 * scale + 20, centerY + endRadius,
                 `D1 = ${formatNumber(D1, 3)}`);
    
    // Угол
    drawAngle(ctx, startX + 100, centerY - mainRadius, 
             L1 * 15 * scale, toRadians(beta),
             `${formatNumber(result.angle, 1)}°`);
}

function drawDimension(ctx, x1, y1, x2, y2, text) {
    // Линия
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
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, (x1 + x2) / 2, y1 - 6);
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 6;
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

function drawAngle(ctx, x, y, length, angleRad, text) {
    const endX = x + length * Math.cos(angleRad);
    const endY = y - length * Math.sin(angleRad);
    
    // Линия угла
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Дуга
    ctx.beginPath();
    ctx.arc(x, y, 20, -Math.PI/2, -Math.PI/2 + angleRad, false);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Текст угла
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + 15, y - 25);
}

// ============================================
// ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ И G-КОДА
// ============================================

function updateResults(result) {
    // Обновляем результаты
    document.getElementById('resultD1').textContent = formatNumber(result.D1, 3);
    document.getElementById('resultL1').textContent = formatNumber(result.L1, 3);
    
    // Обновляем пустое поле ввода
    updateEmptyField(result);
}

function updateEmptyField(result) {
    const inputs = {
        diameterD: result.D,
        diameterD1: result.D1,
        angle: result.angle,
        lengthL1: result.L1
    };
    
    // Находим пустое поле и заполняем его
    for (const [id, value] of Object.entries(inputs)) {
        const input = document.getElementById(id);
        if (input && !input.value.trim()) {
            input.value = formatNumber(value, 3);
        }
    }
}

function generateGCode(result) {
    // Определяем меньший и больший диаметры
    const Dmin = Math.min(result.D, result.D1);
    const Dmax = Math.max(result.D, result.D1);
    const isD1Smaller = result.D1 < result.D;
    
    // Безопасные координаты - ИСПРАВЛЕНО: D + 0.5 вместо D1 + 0.5
    const safeX = (result.D + 0.5).toFixed(3); // D + 0.5 мм
    const safeZ = -1.0;
    
    let gcode = `// ФАСКА БЕЗ УЧЕТА РАДИУСА ИНСТРУМЕНТА\n`;
    gcode += `// Параметры:\n`;
    gcode += `// D = ${formatNumber(result.D, 3)} мм\n`;
    gcode += `// D1 = ${formatNumber(result.D1, 3)} мм\n`;
    gcode += `// α = ${formatNumber(result.angle, 1)}° ${getAngleType() === 'face' ? 'от торца' : 'от оси'}\n`;
    gcode += `// L1 = ${formatNumber(result.L1, 3)} мм\n\n`;
    
    gcode += `// БЕЗОПАСНЫЙ ПОДХОД (D + 0.5 мм)\n`;
    gcode += `G00 X${safeX} Z${safeZ};\n`;
    gcode += `G01 Z0.0 F0.1;\n\n`;
    
    gcode += `// ОБРАБОТКА ФАСКИ\n`;
    if (isD1Smaller) {
        // D1 < D: от меньшего к большему
        gcode += `G01 X${formatNumber(result.D1, 3)} F0.5;\n`;
        gcode += `X${formatNumber(result.D, 3)} Z-${formatNumber(result.L1, 3)};`;
    } else {
        // D1 > D: от меньшего к большему (обратный случай)
        gcode += `G01 X${formatNumber(result.D, 3)} F0.5;\n`;
        gcode += `X${formatNumber(result.D1, 3)} Z-${formatNumber(result.L1, 3)};`;
    }
    
    document.getElementById('gCodePreview').textContent = gcode;
}

function showMessage(message) {
    document.getElementById('gCodePreview').textContent = `// ${message}\n\n// Введите любые 3 параметра:\n// - Начальный диаметр D\n// - Конечный диаметр D1\n// - Угол фаски α\n// - Длину фаски L1`;
    
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
    
    // Обновляем интерфейс
    updateResults(result);
    
    // Генерируем G-код
    generateGCode(result);
    
    // Обновляем визуализацию
    drawChamfer(result);
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Обработчики для кнопок типа угла
    document.querySelectorAll('.compact-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.compact-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculate();
        });
    });
    
    // Обработчики для полей ввода (автоматический расчет)
    const inputIds = ['diameterD', 'diameterD1', 'angle', 'lengthL1', 'toolRadius'];
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculate);
            input.addEventListener('blur', function() {
                let value = this.value.trim();
                value = value.replace('мм', '').replace(',', '.').trim();
                
                if (value && !isNaN(parseFloat(value))) {
                    this.value = parseFloat(value).toString();
                    calculate();
                } else if (value) {
                    this.value = '';
                    calculate();
                }
            });
        }
    });
    
    // Кнопка обновления расчета
    document.getElementById('calculateBtn').addEventListener('click', calculate);
    
    // Кнопка очистки всех полей
    document.getElementById('refreshBtn').addEventListener('click', function() {
        // Очищаем все поля ввода
        document.getElementById('diameterD').value = '';
        document.getElementById('diameterD1').value = '';
        document.getElementById('angle').value = '';
        document.getElementById('lengthL1').value = '';
        document.getElementById('toolRadius').value = '0.4';
        
        // Сбрасываем тип угла к торцу
        document.querySelectorAll('.compact-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.compact-btn[data-type="face"]').classList.add('active');
        
        // Обновляем интерфейс
        showMessage('Введите параметры для расчета');
    });
    
    // Кнопка копирования G-кода
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
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            alert('Не удалось скопировать G-код');
        });
    });
    
    // Первоначальный расчет
    calculate();
});