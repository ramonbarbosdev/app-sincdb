export  function FormatCpfCnpj(value: string | number): string {
  if (!value) return '';

  const num = value.toString().replace(/\D/g, '');

  if (num.length === 11) {
    // Formatar CPF: 000.000.000-00
    return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (num.length === 14) {
    // Formatar CNPJ: 00.000.000/0000-00
    return num.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // Retorna sem formatação se não for 11 ou 14 dígitos
  return value.toString();
}

