// Função para validar e sugerir endereços usando ViaCEP
export const validateAddress = async (address: string): Promise<{
  isValid: boolean;
  suggestions: string[];
  error?: string;
}> => {
  try {
    // Extrair CEP do endereço (formato: XXXXX-XXX ou XXXXXXXX)
    const cepRegex = /(\d{5})-?(\d{3})/;
    const cepMatch = address.match(cepRegex);
    
    if (cepMatch) {
      const cep = cepMatch[1] + cepMatch[2];
      
      // Consultar ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        return {
          isValid: false,
          suggestions: [],
          error: 'CEP não encontrado'
        };
      }
      
      // Construir endereço completo
      const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
      
      return {
        isValid: true,
        suggestions: [fullAddress]
      };
    }
    
    // Se não tem CEP, fazer validação básica
    const hasStreet = /\b(rua|avenida|av|alameda|praça|travessa|beco|vila|conjunto|residencial)\b/i.test(address);
    const hasNumber = /\d+/.test(address);
    
    if (hasStreet && hasNumber) {
      return {
        isValid: true,
        suggestions: []
      };
    }
    
    return {
      isValid: false,
      suggestions: [],
      error: 'Endereço incompleto. Inclua o nome da rua e número.'
    };
    
  } catch (error) {
    return {
      isValid: false,
      suggestions: [],
      error: 'Erro ao validar endereço'
    };
  }
};
