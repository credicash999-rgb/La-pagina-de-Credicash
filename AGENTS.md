# Reglas Inquebrantables del Proyecto CrediCash

Este archivo contiene las directivas fundamentales para garantizar la estabilidad, seguridad y continuidad del sistema financiero **CrediCash**.

## 1. Protección Absoluta de la Información y Datos de Clientes
- **NUNCA** modificar, alterar, borrar o reemplazar la información real o existente de los clientes (`clientes`), operaciones (`operaciones`), cuotas (`cuotas`), pagos (`pagos`) o transacciones (`transacciones`).
- **NUNCA** reiniciar o sustituir `localStorage` o Firebase con datos semilla ficticios cuando el usuario ya tenga sus datos ingresados.
- Preservar siempre la compatibilidad de los tipos definidos en `/src/types.ts` (`Cliente`, `Operacion`, `Cuota`, `Pago`, `Configuracion`, etc.). No remover campos ni cambiar tipos existentes.

## 2. Preservación del Diseño, Estructura Visual y Experiencia de Usuario
- **NUNCA** deformar, rediseñar abruptamente ni destruir la maquetación visual existente (colores, fuentes, tablas, tarjetas, barras de navegación).
- Respetar los estilos Tailwind CSS con la paleta esmeralda/oscura corporativa de CrediCash (`bg-emerald-950`, `border-emerald-800`, etc.).
- Cada vista (`DashboardView`, `ClientesView`, `OperacionesView`, `PagosView`, `TesoreriaView`, `CobradorCampoView`, `LiquidacionesView`, `ClientesInactivosView`, `ConfiguracionView`, `UsuariosView`, `LoginView`) debe mantener su responsabilidad y estética intacta.

## 3. Protocolo de Verificación Obligatoria Antes de Entregar Cambios
- Antes de completar cualquier solicitud de cambio, el asistente **DEBE** ejecutar la herramienta de compilación (`compile_applet`) para verificar que el código compile sin ningún tipo de error sintáctico o de tipos TypeScript.
- Si una compilación falla, el asistente debe arreglar el error inmediatamente sin alterar la lógica de negocio ni el diseño.

## 4. Importación y Respaldo Seguro de Datos
- Proporcionar y mantener herramientas de importación/exportación masiva de datos (CSV, Excel, JSON) y sincronización con Firebase Firestore y Google Sheets para que el usuario pueda respaldar y restaurar la información de su empresa sin riesgos.
