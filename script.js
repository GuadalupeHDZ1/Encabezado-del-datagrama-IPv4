// Validación y conversión de números
class NumberValidator {
    static validateBinary(input, bits) {
        if (!input) return { valid: false, message: 'Campo requerido' };
        if (!/^[01]+$/.test(input)) return { valid: false, message: 'Solo se permiten 0 y 1' };
        if (input.length > bits) return { valid: false, message: `Máximo ${bits} bits` };
        return { valid: true, value: input };
    }

    static validateDecimal(input, bits) {
        if (!input) return { valid: false, message: 'Campo requerido' };
        if (!/^\d+$/.test(input)) return { valid: false, message: 'Solo se permiten números' };
        
        const maxValue = Math.pow(2, bits) - 1;
        const num = parseInt(input, 10);
        if (num > maxValue) return { valid: false, message: `Máximo valor: ${maxValue}` };
        
        return { valid: true, value: num };
    }

    static validateHexadecimal(input, bits) {
        if (!input) return { valid: false, message: 'Campo requerido' };
        
        // Remover espacios y caracteres inválidos automáticamente
        const cleanInput = input.replace(/[^0-9A-Fa-f]/g, '');
        if (cleanInput !== input) {
            // Si hubo caracteres inválidos, actualizar el campo
            setTimeout(() => {
                const field = document.getElementById('options_hex');
                if (field) field.value = cleanInput.toUpperCase();
            }, 0);
        }
        
        if (!/^[0-9A-Fa-f]+$/.test(cleanInput)) return { valid: false, message: 'Solo hexadecimal (0-9, A-F)' };
        
        const maxDigits = Math.ceil(bits / 4);
        if (cleanInput.length > maxDigits) return { valid: false, message: `Máximo ${maxDigits} dígitos` };
        
        return { valid: true, value: cleanInput.toUpperCase() };
    }

    static validateIP(input) {
        if (!input) return { valid: false, message: 'IP requerida' };
        
        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const match = input.match(ipRegex);
        
        if (!match) return { valid: false, message: 'Formato inválido (ej: 192.168.1.1)' };
        
        for (let i = 1; i <= 4; i++) {
            const octet = parseInt(match[i]);
            if (octet < 0 || octet > 255) {
                return { valid: false, message: 'Octetos deben ser 0-255' };
            }
        }
        
        return { valid: true, value: input };
    }

    // Conversiones
    static decToBin(dec, bits) {
        const num = parseInt(dec, 10);
        return num.toString(2).padStart(bits, '0');
    }

    static decToHex(dec, bits) {
        const num = parseInt(dec, 10);
        const hex = num.toString(16).toUpperCase();
        const maxDigits = Math.ceil(bits / 4);
        return hex.padStart(maxDigits, '0');
    }

    static binToDec(bin) {
        return parseInt(bin, 2);
    }

    static binToHex(bin, bits) {
        const dec = this.binToDec(bin);
        return this.decToHex(dec, bits);
    }

    static hexToDec(hex) {
        return parseInt(hex, 16);
    }

    static hexToBin(hex, bits) {
        const dec = this.hexToDec(hex);
        return this.decToBin(dec, bits);
    }
}

// Manejo de eventos de entrada
document.addEventListener('DOMContentLoaded', function() {
    // Configurar event listeners para todos los campos de entrada editables
    const inputs = document.querySelectorAll('input[data-type]:not([readonly])');
    inputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
        input.addEventListener('blur', validateField);
    });

    // Bloquear caracteres no hexadecimales en el textarea de opciones
    const optionsHexTextarea = document.getElementById('options_hex');
    if (optionsHexTextarea) {
        optionsHexTextarea.addEventListener('input', function(e) {
            // Remover cualquier carácter que no sea hexadecimal y convertir a mayúsculas
            this.value = this.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
            updateOptionsInfo();
            updateTotalLengthPreview();
        });
        
        optionsHexTextarea.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            // Permitir solo caracteres hexadecimales
            if (!/[0-9A-Fa-f]/.test(char)) {
                e.preventDefault();
            }
        });

        // Validación en tiempo real del límite de opciones
        optionsHexTextarea.addEventListener('blur', function() {
            const ihl = parseInt(document.getElementById('ihl_select').value || 5);
            const maxOptionsBytes = (ihl * 4) - 20;
            const maxHexChars = maxOptionsBytes * 2; // 2 caracteres hex por byte
            
            const cleanHex = this.value.replace(/[^0-9A-Fa-f]/g, '');
            if (cleanHex.length > maxHexChars) {
                // Recortar automáticamente al máximo permitido
                this.value = cleanHex.substring(0, maxHexChars).toUpperCase();
                updateOptionsInfo();
                updateTotalLengthPreview();
            }
        });
    }

    // Configurar selects presets
    document.getElementById('tos_preset').addEventListener('change', function() {
        if (this.value) {
            const bits = 8;
            const decValue = this.value;
            updateFieldGroup('tos', decValue, bits);
        }
    });

    document.getElementById('protocol_preset').addEventListener('change', function() {
        if (this.value) {
            const bits = 8;
            const decValue = this.value;
            updateFieldGroup('protocol', decValue, bits);
        }
    });

    // Configurar select de IHL
    document.getElementById('ihl_select').addEventListener('change', function() {
        if (this.value) {
            const ihlValue = this.value;
            updateIHLFields(ihlValue);
            updateOptionsInfo();
            updateTotalLengthPreview();
        }
    });

    // Event listeners para campos que afectan cálculos
    document.getElementById('data_text').addEventListener('input', function() {
        updateDataInfo();
        updateTotalLengthPreview();
    });

    // Establecer valores por defecto
    setDefaultValues();
});

// Función para previsualizar la longitud total
function updateTotalLengthPreview() {
    const ihl = parseInt(document.getElementById("ihl_select").value || 5);
    const optionsHex = document.getElementById("options_hex").value;
    const dataText = document.getElementById("data_text").value;

    // Cálculo correcto del encabezado
    const headerBytes = ihl * 4;  // Total del encabezado según IHL

    // Opciones (cada 2 hex = 1 byte)
    const cleanHex = optionsHex.replace(/[^0-9A-Fa-f]/g, "");
    const optionsBytes = cleanHex.length / 2;

    // Datos
    const dataBytes = new TextEncoder().encode(dataText).length;

    // Longitud total = encabezado + datos
    const totalLength = headerBytes + dataBytes;

    // Vista previa
    const preview = document.getElementById("total_length_preview");
    preview.textContent =
        `Calculado automáticamente: ${totalLength} bytes ` +
        `(Encabezado: ${headerBytes} bytes + Datos: ${dataBytes} bytes)`;

    // Actualizar campo numérico
    updateFieldGroup("total_length", totalLength, 16);
}

// Validación de caracteres en inputs
document.querySelectorAll('input[data-type]:not([readonly])').forEach(input => {
    input.addEventListener('keypress', function(e) {
        const type = input.dataset.type;
        const char = String.fromCharCode(e.which);

        if (type === 'dec' && !/[0-9]/.test(char)) e.preventDefault();
        if (type === 'bin' && !/[01]/.test(char)) e.preventDefault();
        if (type === 'hex' && !/[0-9A-Fa-f]/.test(char)) e.preventDefault();
    });
});

function updateIHLFields(ihlValue) {
    const bits = 4;
    
    // Solo actualizar los campos de visualización
    const decInput = document.getElementById('ihl_dec');
    const binInput = document.getElementById('ihl_bin');
    const hexInput = document.getElementById('ihl_hex');
    
    if (decInput) decInput.value = ihlValue;
    if (binInput) binInput.value = NumberValidator.decToBin(ihlValue, bits);
    if (hexInput) hexInput.value = NumberValidator.decToHex(ihlValue, bits);
    
    updateOptionsInfo();
    updateTotalLengthPreview();
}

function updateOptionsInfo() {
    const ihlSelect = document.getElementById('ihl_select');
    const ihl = ihlSelect.value ? parseInt(ihlSelect.value) : 5;
    const optionsHex = document.getElementById('options_hex').value;
    
    // Cálculo correcto del espacio para opciones
    const totalHeaderBytes = ihl * 4;
    const fixedHeaderBytes = 20;
    const maxOptionsBytes = totalHeaderBytes - fixedHeaderBytes;
    
    // Limpiar espacios y caracteres no hexadecimales
    const cleanHex = optionsHex.replace(/[^0-9A-Fa-f]/g, '');
    const optionsBytes = cleanHex ? cleanHex.length / 2 : 0;
    
    const spaceElement = document.getElementById('options_space_info');
    const usedElement = document.getElementById('options_used_info');
    const warningElement = document.getElementById('options_warning');
    const detailedElement = document.getElementById('options_detailed_info');
    
    if (spaceElement) spaceElement.textContent = `${maxOptionsBytes} bytes`;
    if (usedElement) usedElement.textContent = `${optionsBytes} bytes`;
    
    if (optionsBytes > maxOptionsBytes) {
        if (spaceElement) spaceElement.style.color = '#e74c3c';
        if (usedElement) usedElement.style.color = '#e74c3c';
        if (warningElement) {
            warningElement.style.display = 'block';
            warningElement.textContent = `⚠️ Las opciones exceden el espacio disponible. Máximo: ${maxOptionsBytes} bytes`;
        }
    } else {
        if (spaceElement) spaceElement.style.color = '#27ae60';
        if (usedElement) usedElement.style.color = '#27ae60';
        if (warningElement) warningElement.style.display = 'none';
    }
    
    // Actualizar información detallada
    if (detailedElement) {
        detailedElement.innerHTML = `
            <strong>Desglose:</strong><br>
            • IHL: ${ihl} × 4 bytes = ${totalHeaderBytes} bytes totales del encabezado<br>
            • Encabezado fijo: ${fixedHeaderBytes} bytes<br>
            • Espacio para opciones: ${totalHeaderBytes} - ${fixedHeaderBytes} = <strong>${maxOptionsBytes} bytes</strong><br>
            • Opciones usadas: ${optionsBytes} bytes
        `;
    }
}

function updateDataInfo() {
    const dataText = document.getElementById('data_text').value;
    const dataBytes = new TextEncoder().encode(dataText).length;
    const infoElement = document.getElementById('data_length_info');
    if (infoElement) {
        infoElement.textContent = `${dataText.length} caracteres (${dataBytes} bytes)`;
    }
    updateTotalLengthPreview();
}

function handleInputChange(event) {
    const input = event.target;
    const bits = parseInt(input.dataset.bits);
    
    // Limpiar mensajes de error
    clearErrorMessages(input);
    
    // Validar según el tipo
    let validation;
    switch(input.dataset.type) {
        case 'bin':
            validation = NumberValidator.validateBinary(input.value, bits);
            break;
        case 'dec':
            validation = NumberValidator.validateDecimal(input.value, bits);
            break;
        case 'hex':
            validation = NumberValidator.validateHexadecimal(input.value, bits);
            break;
        case 'ip':
            validation = NumberValidator.validateIP(input.value);
            break;
    }
    
    if (validation.valid && input.value) {
        // Actualizar otros campos del mismo grupo
        updateRelatedFields(input, validation.value, bits);
        showSuccess(input, '✓ Válido');
    } else if (input.value) {
        showError(input, validation.message);
    }
}

function validateField(event) {
    const input = event.target;
    const bits = parseInt(input.dataset.bits);
    
    if (!input.value && !input.readOnly) {
        showError(input, 'Campo requerido');
        return;
    }
    
    handleInputChange(event);
}

function updateRelatedFields(sourceInput, value, bits) {
    const fieldName = sourceInput.id.split('_')[0];
    const sourceType = sourceInput.dataset.type;
    
    // No actualizar si el campo está vacío
    if (!value) return;
    
    let decValue;
    
    // Convertir a decimal primero
    switch(sourceType) {
        case 'dec':
            decValue = parseInt(value);
            break;
        case 'bin':
            decValue = NumberValidator.binToDec(value);
            break;
        case 'hex':
            decValue = NumberValidator.hexToDec(value);
            break;
        default:
            return;
    }
    
    // Actualizar otros campos del mismo grupo (solo si no son de solo lectura)
    const binInput = document.getElementById(`${fieldName}_bin`);
    const hexInput = document.getElementById(`${fieldName}_hex`);
    const decInput = document.getElementById(`${fieldName}_dec`);
    
    if (sourceType !== 'bin' && binInput && !binInput.readOnly) {
        binInput.value = NumberValidator.decToBin(decValue, bits);
    }
    if (sourceType !== 'hex' && hexInput && !hexInput.readOnly) {
        hexInput.value = NumberValidator.decToHex(decValue, bits);
    }
    if (sourceType !== 'dec' && decInput && !decInput.readOnly) {
        decInput.value = decValue.toString();
    }
}

function updateFieldGroup(fieldName, decValue, bits) {
    const binInput = document.getElementById(`${fieldName}_bin`);
    const hexInput = document.getElementById(`${fieldName}_hex`);
    const decInput = document.getElementById(`${fieldName}_dec`);
    
    // Solo actualizar campos que no son de solo lectura
    if (decInput && !decInput.readOnly) decInput.value = decValue;
    if (binInput && !binInput.readOnly) binInput.value = NumberValidator.decToBin(decValue, bits);
    if (hexInput && !hexInput.readOnly) hexInput.value = NumberValidator.decToHex(decValue, bits);
}

function generateRandom(fieldName) {
    const bitsMap = {
        'identification': 16,
        'flags': 3,
        'fragment': 13,
        'ttl': 8,
        'checksum': 16
    };
    
    const bits = bitsMap[fieldName];
    const maxValue = Math.pow(2, bits) - 1;
    const randomValue = Math.floor(Math.random() * (maxValue + 1));
    
    updateFieldGroup(fieldName, randomValue.toString(), bits);
}

// Mensajes de error/éxito
function showError(input, message) {
    clearErrorMessages(input);
    input.classList.add('input-error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
}

function showSuccess(input, message) {
    clearErrorMessages(input);
    input.classList.remove('input-error');
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    input.parentNode.appendChild(successDiv);
}

function clearErrorMessages(input) {
    const parent = input.parentNode;
    const errorMsg = parent.querySelector('.error-message');
    const successMsg = parent.querySelector('.success-message');
    
    if (errorMsg) errorMsg.remove();
    if (successMsg) successMsg.remove();
    input.classList.remove('input-error');
}

// Cálculo del datagrama
function calculateDatagram() {
    // Validar IHL seleccionado PRIMERO
    const ihlSelect = document.getElementById('ihl_select');
    if (!ihlSelect.value) {
        alert('❌ Por favor, seleccione la LONGITUD DEL ENCABEZADO (IHL)');
        ihlSelect.focus();
        return;
    }

    // Validar todos los campos requeridos
    const requiredFields = [
        'tos_dec', 'identification_dec', 
        'flags_dec', 'fragment_dec', 'ttl_dec', 'protocol_dec',
        'checksum_dec', 'src_ip', 'dst_ip'
    ];
    
    let allValid = true;
    let firstInvalidField = null;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        
        if (!field.value) {
            showError(field, 'Campo requerido');
            allValid = false;
            if (!firstInvalidField) firstInvalidField = field;
        } else {
            clearErrorMessages(field);
        }
    });
    
    if (!allValid) {
        alert('⚠️ Por favor, complete todos los campos requeridos marcados en rojo');
        if (firstInvalidField) firstInvalidField.focus();
        return;
    }

    // Obtener valores
    const ihl = parseInt(ihlSelect.value);
    const optionsHex = document.getElementById('options_hex').value;
    const dataText = document.getElementById('data_text').value;

    // Validar longitud de opciones
    const totalHeaderBytes = ihl * 4;
    const maxOptionsBytes = totalHeaderBytes - 20;
    const cleanOptionsHex = optionsHex.replace(/[^0-9A-Fa-f]/g, '');
    const optionsBytes = cleanOptionsHex ? cleanOptionsHex.length / 2 : 0;
    
    if (optionsBytes > maxOptionsBytes) {
        alert(`❌ Error: Las opciones exceden el espacio disponible.\n\n` +
              `IHL seleccionado: ${ihl} (${totalHeaderBytes} bytes totales)\n` +
              `Encabezado fijo: 20 bytes\n` +
              `Espacio disponible: ${maxOptionsBytes} bytes\n` +
              `Opciones ingresadas: ${optionsBytes} bytes\n\n` +
              `Solución: Seleccione un IHL mayor o reduzca las opciones.`);
        return;
    }
    
    // Calcular longitudes
    const headerBytes = ihl * 4;
    const dataBytes = new TextEncoder().encode(dataText).length;
    const totalLength = headerBytes + dataBytes;
    
    // Actualizar el campo de longitud total con el cálculo
    updateTotalLengthFields(totalLength, headerBytes, dataBytes);

    // Construir encabezado (usando el checksum ingresado por el usuario)
    const header = buildIPHeader(totalLength);

    // Convertir datos a hexadecimal
    const dataHex = textToHex(dataText);

    // Mostrar resultados
    displayResults(header, dataHex, totalLength, headerBytes, dataBytes, optionsBytes);
}

// Función para actualizar campos de longitud total
function updateTotalLengthFields(totalLength, headerBytes, dataBytes) {
    // Actualizar la previsualización en texto
    const previewElement = document.getElementById('total_length_preview');
    if (previewElement) {
        previewElement.textContent = `Calculado automáticamente: ${totalLength} bytes (Encabezado: ${headerBytes} bytes + Datos: ${dataBytes} bytes)`;
    }
    
    // Actualizar los campos numéricos (convertir a los formatos)
    updateFieldGroup('total_length', totalLength, 16);
}

function buildIPHeader(totalLength) {
    const ihlSelect = document.getElementById('ihl_select');
    const ihl = parseInt(ihlSelect.value);
    
    // Primera palabra (32 bits) - Versión siempre es 4
    const version = 4;
    const tos = parseInt(document.getElementById('tos_dec').value);
    
    const firstByte = (version << 4) | ihl;
    const firstWord = [
        firstByte.toString(16).padStart(2, '0').toUpperCase(), 
        tos.toString(16).padStart(2, '0').toUpperCase()
    ];
    
    // Longitud total - USAR EL VALOR CALCULADO
    const totalHex = totalLength.toString(16).padStart(4, '0').toUpperCase();
    firstWord.push(totalHex.substring(0, 2), totalHex.substring(2, 4));
    
    // Segunda palabra - Identificación
    const identification = parseInt(document.getElementById('identification_dec').value);
    const idHex = identification.toString(16).padStart(4, '0').toUpperCase();
    firstWord.push(idHex.substring(0, 2), idHex.substring(2, 4));
    
    // Tercera palabra (Flags + Fragment Offset)
    const flags = parseInt(document.getElementById('flags_dec').value);
    const fragment = parseInt(document.getElementById('fragment_dec').value);
    const flagsFragment = (flags << 13) | fragment;
    const ffHex = flagsFragment.toString(16).padStart(4, '0').toUpperCase();
    firstWord.push(ffHex.substring(0, 2), ffHex.substring(2, 4));
    
    // Cuarta palabra - TTL y Protocolo
    const ttl = parseInt(document.getElementById('ttl_dec').value);
    const protocol = parseInt(document.getElementById('protocol_dec').value);
    firstWord.push(
        ttl.toString(16).padStart(2, '0').toUpperCase(), 
        protocol.toString(16).padStart(2, '0').toUpperCase()
    );
    
    // Checksum - USAR EL VALOR INGRESADO POR EL USUARIO
    const checksum = parseInt(document.getElementById('checksum_dec').value);
    const checksumHex = checksum.toString(16).padStart(4, '0').toUpperCase();
    firstWord.push(checksumHex.substring(0, 2), checksumHex.substring(2, 4));
    
    // Direcciones IP
    const srcIP = ipToHex(document.getElementById('src_ip').value);
    const dstIP = ipToHex(document.getElementById('dst_ip').value);
    
    // Opciones
    const optionsHex = document.getElementById('options_hex').value;
    const optionsArray = [];
    if (optionsHex) {
        // Validar que la longitud sea par
        const cleanHex = optionsHex.replace(/[^0-9A-Fa-f]/g, '');
        for (let i = 0; i < cleanHex.length; i += 2) {
            const byte = cleanHex.substring(i, i + 2);
            if (byte.length === 2) {
                optionsArray.push(byte.toUpperCase());
            }
        }
    }
    
    // Rellenar opciones hasta completar el encabezado
    const totalHeaderBytes = ihl * 4;
    const currentBytes = 20 + optionsArray.length;
    const paddingBytes = totalHeaderBytes - currentBytes;
    
    for (let i = 0; i < paddingBytes; i++) {
        optionsArray.push('00');
    }
    
    // Combinar todo
    const headerArray = [...firstWord, ...srcIP, ...dstIP, ...optionsArray];
    
    return headerArray;
}

function ipToHex(ip) {
    return ip.split('.').map(octet => 
        parseInt(octet).toString(16).padStart(2, '0').toUpperCase()
    );
}

function textToHex(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return Array.from(bytes).map(byte => 
        byte.toString(16).padStart(2, '0').toUpperCase()
    );
}

function displayResults(header, data, totalLength, headerBytes, dataBytes, optionsBytes) {
    // Formatear salida en hexadecimal
    const headerHex = formatHex(header);
    const dataHex = formatHex(data);
    const completeHex = formatHex([...header, ...data]);
    
    // Mostrar resultados
    document.getElementById('header_hex').textContent = headerHex;
    document.getElementById('data_hex').textContent = dataHex;
    document.getElementById('complete_datagram').textContent = completeHex;
    
    // Actualizar estadísticas
    document.getElementById('header_bytes').textContent = headerBytes;
    document.getElementById('data_bytes').textContent = dataBytes;
    document.getElementById('total_bytes').textContent = totalLength;
    document.getElementById('basic_header_bytes').textContent = 20;
    document.getElementById('options_bytes').textContent = optionsBytes;
    document.getElementById('breakdown_data_bytes').textContent = dataBytes;
    document.getElementById('breakdown_total_bytes').textContent = totalLength;

    generateBreakdown(headerBytes, optionsBytes, dataBytes, totalLength);
    
    // Mostrar resultados
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('basic_header_bytes').textContent = 20;
}

function formatHex(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        // Asegurar que cada byte tenga 2 caracteres en mayúsculas
        const hexByte = bytes[i].toUpperCase().padStart(2, '0');
        result += hexByte + ' ';
        
        // Nueva línea cada 8 bytes para mejor legibilidad
        if ((i + 1) % 8 === 0) result += '\n';
    }
    return result.trim();
}

function resetForm() {
    if (confirm('¿Está seguro de que desea limpiar todo el formulario?')) {
        document.getElementById('ipForm').reset();
        document.getElementById('results').style.display = 'none';
        setDefaultValues();
        
        // Limpiar mensajes de error
        document.querySelectorAll('.error-message, .success-message').forEach(msg => msg.remove());
        document.querySelectorAll('.input-error').forEach(input => input.classList.remove('input-error'));
    }
}

function generateBreakdown(headerBytes, optionsBytes, dataBytes, totalBytes) {
    const version = "4";
    const ihl = document.getElementById("ihl_select").value;
    const tosHex = document.getElementById("tos_hex").value.padStart(2, "0").toUpperCase();
    const totalHex = document.getElementById("total_length_hex").value.padStart(4, "0").toUpperCase();
    const idHex = document.getElementById("identification_hex").value.padStart(4, "0").toUpperCase();
    const flagsHex = document.getElementById("flags_hex").value.padStart(1, "0").toUpperCase();
    const fragHex = document.getElementById("fragment_hex").value.padStart(3, "0").toUpperCase();
    const ttlHex = document.getElementById("ttl_hex").value.padStart(2, "0").toUpperCase();
    const protocolHex = document.getElementById("protocol_hex").value.padStart(2, "0").toUpperCase();
    const checksumHex = document.getElementById("checksum_hex").value.padStart(4, "0").toUpperCase();

    const srcIPHex = ipToHex(document.getElementById("src_ip").value).join("");
    const dstIPHex = ipToHex(document.getElementById("dst_ip").value).join("");

    const optionsHex = document.getElementById("options_hex").value.replace(/[^0-9A-Fa-f]/g, "");
    const dataHex = textToHex(document.getElementById("data_text").value).join("");

    // Primer byte → version + ihl
    const firstByte = ((4 << 4) | parseInt(ihl)).toString(16).padStart(2, "0").toUpperCase();
    const byte0_1 = firstByte + tosHex;
    
    const breakdown = `
Encabezado IP generado
Versión: ${version}
IHL: ${ihl} (${ihl * 4} bytes)
Tipo de servicio: ${parseInt(tosHex,16)} (0x${tosHex})
Longitud total: ${totalBytes} bytes (0x${totalHex})
Identificación: ${parseInt(idHex,16)} (0x${idHex})
Flags: ${parseInt(flagsHex,16)} (bin: ${parseInt(flagsHex,16).toString(2).padStart(3,"0")})
Desplazamiento: ${parseInt(fragHex,16)}
TTL: ${parseInt(ttlHex,16)}
Protocolo: ${parseInt(protocolHex,16)}
Checksum: 0x${checksumHex}
IP Origen: ${document.getElementById("src_ip").value}
IP Destino: ${document.getElementById("dst_ip").value}
Opciones: ${optionsBytes} bytes
Datos: ${dataBytes} bytes

Datagrama IPv4 completo (Hexadecimal)
${document.getElementById("complete_datagram").textContent}


Desglose del encabezado
Bytes 0-1:   Versión(${version}) + IHL(${ihl}) + TOS = ${byte0_1}
Bytes 2-3:   Longitud Total = ${totalHex}
Bytes 4-5:   Identificación = ${idHex}
Bytes 6-7:   Flags + Desplazamiento = ${(flagsHex + fragHex).toUpperCase()}
Bytes 8-9:   TTL + Protocolo = ${ttlHex}${protocolHex}
Bytes 10-11: Checksum = ${checksumHex}
Bytes 12-15: IP Origen = ${srcIPHex}
Bytes 16-19: IP Destino = ${dstIPHex}
Bytes 20-${headerBytes - 1}: Opciones = ${optionsHex || "(ninguna)"}
Bytes ${headerBytes}-${totalBytes - 1}: Datos = ${dataHex || "(sin datos)"}
`;

    document.getElementById("breakdown_text").textContent = breakdown;
}

// Función para establecer valores por defecto
function setDefaultValues() {
    // Establecer IHL por defecto
    if (!document.getElementById('ihl_select').value) {
        document.getElementById('ihl_select').value = '5';
        updateIHLFields(5);
    }
    
    // Inicializar información de opciones
    updateOptionsInfo();
    updateDataInfo();
    updateTotalLengthPreview();
}