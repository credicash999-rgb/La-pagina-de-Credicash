import { Cliente } from '../types';

/**
 * Parses a CSV string into a list of Cliente objects with automatic ID generation if needed.
 */
export function parseClientesCSV(csvContent: string, existingClientes: Cliente[]): {
  success: boolean;
  clientes: Cliente[];
  errors: string[];
} {
  const errors: string[] = [];
  const parsedClientes: Cliente[] = [];

  try {
    // Standardize line breaks
    const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');

    if (lines.length < 2) {
      return { success: false, clientes: [], errors: ['El archivo CSV no contiene suficientes líneas de datos.'] };
    }

    // Determine separator: comma or semicolon
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';

    const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    // Helper to find column index by keywords
    const findIndex = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const idxId = findIndex(['id', 'codigo', 'código']);
    const idxNombre = findIndex(['nombre', 'first_name']);
    const idxApellido = findIndex(['apellido', 'last_name']);
    const idxDni = findIndex(['dni', 'cedula', 'documento', 'cuit', 'cuil']);
    const idxTelefono = findIndex(['telefono', 'teléfono', 'celular', 'movil', 'móvil', 'phone']);
    const idxDireccion = findIndex(['direccion', 'dirección', 'domicilio', 'address']);
    const idxTrabajo = findIndex(['trabajo', 'ocupacion', 'ocupación', 'empleo']);
    const idxIngresos = findIndex(['ingreso', 'ingresos', 'sueldo', 'salary']);
    const idxEstado = findIndex(['estado', 'status']);
    const idxCaptador = findIndex(['captador', 'operador']);
    const idxAnalista = findIndex(['analista']);
    const idxObs = findIndex(['observacion', 'observaciones', 'notas', 'notes']);

    // Calculate next available ID number
    let nextNum = existingClientes.reduce((max, c) => {
      const match = c.id.match(/CLI-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line handling quotes
      const values: string[] = [];
      let currentVal = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === separator && !insideQuotes) {
          values.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^"|"$/g, ''));

      const getVal = (idx: number) => (idx >= 0 && idx < values.length) ? values[idx] : '';

      const nombreVal = getVal(idxNombre);
      const apellidoVal = getVal(idxApellido);
      const dniVal = getVal(idxDni);

      // Simple fallback if columns aren't named explicitly: assume col 0=nombre, 1=apellido, 2=dni, 3=telefono, 4=direccion
      const nombre = nombreVal || (values[0] || 'Cliente');
      const apellido = apellidoVal || (values[1] || `Num ${i}`);
      const dni = dniVal || (values[2] || `DNI-${Math.floor(10000000 + Math.random() * 89999999)}`);
      const telefono = getVal(idxTelefono) || (values[3] || '');
      const direccion = getVal(idxDireccion) || (values[4] || '');
      const trabajo = getVal(idxTrabajo) || (values[5] || 'Comerciante / Independiente');
      const ingresosRaw = getVal(idxIngresos) || values[6] || '0';
      const ingresos = parseFloat(ingresosRaw.replace(/[^0-9.]/g, '')) || 150000;
      const captador = getVal(idxCaptador) || 'Sistema Masivo';
      const analista = getVal(idxAnalista) || 'Sistema Masivo';
      const estadoRaw = getVal(idxEstado).toUpperCase();
      const observaciones = getVal(idxObs) || 'Importado masivamente';

      let estado: Cliente['estado'] = 'ACTIVO';
      if (['SOLICITANTE', 'EN_MORA', 'INACTIVO', 'FINALIZADO', 'SUSPENDIDO', 'CONGELADO', 'PROSPECTO'].includes(estadoRaw)) {
        estado = estadoRaw as Cliente['estado'];
      }

      let customId = getVal(idxId);
      if (!customId || existingClientes.some(c => c.id === customId) || parsedClientes.some(c => c.id === customId)) {
        customId = `CLI-${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }

      const newCliente: Cliente = {
        id: customId,
        nombre,
        apellido,
        dni,
        telefono,
        direccion,
        trabajo,
        ingresos,
        captador,
        analista,
        estado,
        fechaRegistro: todayStr,
        observaciones
      };

      parsedClientes.push(newCliente);
    }

    return { success: true, clientes: parsedClientes, errors };
  } catch (err: any) {
    return { success: false, clientes: [], errors: [`Error al procesar el archivo CSV: ${err.message}`] };
  }
}
