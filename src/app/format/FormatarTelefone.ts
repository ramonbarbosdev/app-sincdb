export  function FormatTelefone(telefone: string | number): string {
  if (!telefone) return '';

  // Remove tudo que não for número
  const digits = telefone.toString().replace(/\D/g, '');

  // Formato para celulares e fixos brasileiros
  if (digits.length === 11) {
    // celular: (XX) XXXXX-XXXX
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (digits.length === 10) {
    // fixo: (XX) XXXX-XXXX
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone.toString(); // se não tiver 10 ou 11 dígitos, retorna como está
}
