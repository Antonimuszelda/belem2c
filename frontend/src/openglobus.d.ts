// frontend/src/openglobus.d.ts

// Declara o módulo para que o TypeScript o reconheça
declare module 'openglobus' {
    // Para simplificar, declaramos que o módulo exporta "qualquer coisa"
    // Isso resolve o erro de importação, mas não fornece tipagem forte.
    const og: any; 
    export = og;
}